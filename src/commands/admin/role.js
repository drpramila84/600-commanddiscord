const { ApplicationCommandOptionType, EmbedBuilder, PermissionFlagsBits } = require("discord.js");
const { EMBED_COLORS } = require("@root/config");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "role",
  description: "manage roles for members",
  category: "ADMIN",
  userPermissions: ["ManageRoles"],
  botPermissions: ["ManageRoles"],
  command: {
    enabled: true,
    usage: "<add|all> <role> [user|remove]",
    minArgsCount: 2,
    subcommands: [
      {
        trigger: "add <@user> <@role>",
        description: "add a role to a specific user",
      },
      {
        trigger: "all <@role>",
        description: "add a role to all members",
      },
    ],
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "add",
        description: "add a role to a specific user",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "user",
            description: "the user to give the role to",
            type: ApplicationCommandOptionType.User,
            required: true,
          },
          {
            name: "role",
            description: "the role to give",
            type: ApplicationCommandOptionType.Role,
            required: true,
          },
        ],
      },
      {
        name: "all",
        description: "add a role to all members",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "role",
            description: "the role to add to all members",
            type: ApplicationCommandOptionType.Role,
            required: true,
          },
        ],
      },
    ],
  },

  async messageRun(message, args) {
    const sub = args[0]?.toLowerCase();

    if (sub === "add") {
      const user = message.mentions.members.first() || (await message.guild.members.fetch(args[1]).catch(() => null));
      if (!user) return message.safeReply("❌ Could not find that user");

      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[2]) || message.guild.findMatchingRoles(args.slice(2).join(" "))[0];
      if (!role) return message.safeReply("❌ Could not find that role");

      const response = await addRoleToUser(message.guild, user, role);
      return message.safeReply(response);
    }

    if (sub === "all") {
      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]) || message.guild.findMatchingRoles(args.slice(1).join(" "))[0];
      if (!role) return message.safeReply("❌ Could not find that role");

      const response = await addRoleToAll(message.guild, role, "add");
      return message.safeReply(response);
    }

    return message.safeReply("❌ Invalid usage! Use `role add <user> <role>` or `role all <role> [add|remove]`");
  },

  async interactionRun(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "add") {
      const user = interaction.options.getMember("user");
      const role = interaction.options.getRole("role");

      if (!user) return interaction.followUp("❌ Could not find that user");
      if (!role) return interaction.followUp("❌ Could not find that role");

      const response = await addRoleToUser(interaction.guild, user, role);
      return interaction.followUp(response);
    }

    if (sub === "all") {
      const role = interaction.options.getRole("role");

      if (!role) return interaction.followUp("❌ Could not find that role");

      const response = await addRoleToAll(interaction.guild, role, "add");
      return interaction.followUp(response);
    }
  },
};

async function addRoleToUser(guild, member, role) {
  try {
    // Check if member already has the role
    if (member.roles.cache.has(role.id)) {
      return {
        embeds: [
          new EmbedBuilder()
            .setColor(EMBED_COLORS.WARNING)
            .setDescription(`⚠️ ${member} already has the ${role} role`),
        ],
      };
    }

    // Check role hierarchy
    if (role.position >= guild.members.me.roles.highest.position) {
      return {
        embeds: [
          new EmbedBuilder()
            .setColor(EMBED_COLORS.ERROR)
            .setDescription(`❌ I cannot give a role that's higher than my highest role`),
        ],
      };
    }

    // Add role
    await member.roles.add(role);

    return {
      embeds: [
        new EmbedBuilder()
          .setColor(EMBED_COLORS.SUCCESS)
          .setTitle("✅ Role Added")
          .setDescription(`Gave ${role} to ${member}`)
          .addFields(
            { name: "User", value: `${member.user.tag} (${member.id})`, inline: true },
            { name: "Role", value: `${role.name} (${role.id})`, inline: true }
          )
          .setTimestamp(),
      ],
    };
  } catch (error) {
    console.error("Role add error:", error);
    return {
      embeds: [
        new EmbedBuilder()
          .setColor(EMBED_COLORS.ERROR)
          .setDescription(`❌ Error: ${error.message}`),
      ],
    };
  }
}

async function addRoleToAll(guild, role, action) {
  try {
    // Check role hierarchy
    if (role.position >= guild.members.me.roles.highest.position) {
      return {
        embeds: [
          new EmbedBuilder()
            .setColor(EMBED_COLORS.ERROR)
            .setDescription(`❌ I cannot manage a role that's higher than my highest role`),
        ],
      };
    }

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.BOT_EMBED)
      .setTitle(`⏳ ${action === "add" ? "Adding" : "Removing"} Role ${role.name}`)
      .setDescription(`Processing all members...`)
      .setTimestamp();

    const message = await guild.channels.cache
      .find((ch) => ch.isTextBased() && ch.canSendEmbeds())
      ?.send({ embeds: [embed] })
      .catch(() => null);

    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;

    // Fetch all members
    const members = await guild.members.fetch();

    for (const member of members.values()) {
      try {
        if (action === "add") {
          // Skip if already has role
          if (member.roles.cache.has(role.id)) {
            skipCount++;
            continue;
          }
          await member.roles.add(role);
        } else {
          // Skip if doesn't have role
          if (!member.roles.cache.has(role.id)) {
            skipCount++;
            continue;
          }
          await member.roles.remove(role);
        }

        successCount++;
      } catch (error) {
        failCount++;
        console.error(`Failed to ${action} role for ${member.user.tag}:`, error.message);
      }
    }

    const resultEmbed = new EmbedBuilder()
      .setColor(EMBED_COLORS.SUCCESS)
      .setTitle(`✅ Role ${action === "add" ? "Added" : "Removed"} - Complete`)
      .setDescription(`Processed all members for ${role}`)
      .addFields(
        { name: "✅ Successful", value: `${successCount} members`, inline: true },
        { name: "⏭️ Skipped", value: `${skipCount} members`, inline: true },
        { name: "❌ Failed", value: `${failCount} members`, inline: true },
        { name: "Total Members", value: `${members.size}`, inline: true }
      )
      .setTimestamp();

    if (message) {
      await message.edit({ embeds: [resultEmbed] }).catch(() => {});
    }

    return { embeds: [resultEmbed] };
  } catch (error) {
    console.error("Role all error:", error);
    return {
      embeds: [
        new EmbedBuilder()
          .setColor(EMBED_COLORS.ERROR)
          .setDescription(`❌ Error: ${error.message}`),
      ],
    };
  }
}
