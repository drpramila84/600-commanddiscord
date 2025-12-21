const { ApplicationCommandOptionType, EmbedBuilder, ChannelType } = require("discord.js");
const { EMBED_COLORS } = require("@root/config");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "antinuke",
  description: "configure antinuke settings to protect your server",
  category: "ADMIN",
  userPermissions: ["Administrator"],
  command: {
    enabled: true,
    usage: "<on|off|status|whitelist|config>",
    minArgsCount: 1,
  },
  slashCommand: {
    enabled: true,
    ephemeral: true,
    options: [
      {
        name: "toggle",
        description: "enable or disable antinuke protection",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "status",
            description: "enable or disable",
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
              { name: "ON", value: "ON" },
              { name: "OFF", value: "OFF" },
            ],
          },
        ],
      },
      {
        name: "status",
        description: "view current antinuke settings",
        type: ApplicationCommandOptionType.Subcommand,
      },
      {
        name: "logchannel",
        description: "set the antinuke log channel",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "channel",
            description: "the channel to log antinuke events",
            type: ApplicationCommandOptionType.Channel,
            channelTypes: [ChannelType.GuildText],
            required: true,
          },
        ],
      },
      {
        name: "whitelist",
        description: "manage whitelisted users",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "action",
            description: "add or remove from whitelist",
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
              { name: "Add", value: "ADD" },
              { name: "Remove", value: "REMOVE" },
              { name: "List", value: "LIST" },
            ],
          },
          {
            name: "user",
            description: "the user to whitelist",
            type: ApplicationCommandOptionType.User,
            required: false,
          },
        ],
      },
      {
        name: "config",
        description: "configure antinuke protection settings",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "protection",
            description: "the protection to configure",
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
              { name: "Anti Ban", value: "anti_ban" },
              { name: "Anti Kick", value: "anti_kick" },
              { name: "Anti Channel Delete", value: "anti_channel_delete" },
              { name: "Anti Channel Create", value: "anti_channel_create" },
              { name: "Anti Role Delete", value: "anti_role_delete" },
              { name: "Anti Role Create", value: "anti_role_create" },
              { name: "Anti Webhook Create", value: "anti_webhook_create" },
              { name: "Anti Bot Add", value: "anti_bot_add" },
            ],
          },
          {
            name: "status",
            description: "enable or disable this protection",
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
              { name: "ON", value: "ON" },
              { name: "OFF", value: "OFF" },
            ],
          },
        ],
      },
      {
        name: "punishment",
        description: "set the punishment for antinuke violations",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "action",
            description: "the punishment to apply",
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
              { name: "Ban", value: "BAN" },
              { name: "Kick", value: "KICK" },
              { name: "Remove Roles", value: "REMOVE_ROLES" },
            ],
          },
        ],
      },
      {
        name: "threshold",
        description: "set action thresholds before punishment",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "type",
            description: "the threshold type to set",
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
              { name: "Ban Threshold", value: "ban_threshold" },
              { name: "Kick Threshold", value: "kick_threshold" },
              { name: "Channel Threshold", value: "channel_threshold" },
              { name: "Role Threshold", value: "role_threshold" },
              { name: "Raid Threshold", value: "raid_threshold" },
            ],
          },
          {
            name: "amount",
            description: "number of actions before punishment (1-10)",
            type: ApplicationCommandOptionType.Integer,
            required: true,
            minValue: 1,
            maxValue: 10,
          },
        ],
      },
      {
        name: "raid",
        description: "configure raid protection settings",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "status",
            description: "enable or disable raid protection",
            type: ApplicationCommandOptionType.String,
            required: true,
            choices: [
              { name: "ON", value: "ON" },
              { name: "OFF", value: "OFF" },
            ],
          },
        ],
      },
    ],
  },

  async messageRun(message, args, data) {
    const sub = args[0]?.toLowerCase();

    if (sub === "on") {
      data.settings.antinuke.enabled = true;
      await data.settings.save();
      return message.safeReply("Antinuke protection has been **enabled**");
    }

    if (sub === "off") {
      data.settings.antinuke.enabled = false;
      await data.settings.save();
      return message.safeReply("Antinuke protection has been **disabled**");
    }

    if (sub === "status") {
      const embed = buildStatusEmbed(message.guild, data.settings);
      return message.safeReply({ embeds: [embed] });
    }

    return message.safeReply("Invalid usage. Use: `antinuke <on|off|status>`");
  },

  async interactionRun(interaction, data) {
    const sub = interaction.options.getSubcommand();

    if (sub === "toggle") {
      const status = interaction.options.getString("status");
      data.settings.antinuke.enabled = status === "ON";
      await data.settings.save();
      return interaction.followUp(`Antinuke protection has been **${status === "ON" ? "enabled" : "disabled"}**`);
    }

    if (sub === "status") {
      const embed = buildStatusEmbed(interaction.guild, data.settings);
      return interaction.followUp({ embeds: [embed] });
    }

    if (sub === "logchannel") {
      const channel = interaction.options.getChannel("channel");
      data.settings.antinuke.log_channel = channel.id;
      await data.settings.save();
      return interaction.followUp(`Antinuke log channel set to ${channel}`);
    }

    if (sub === "whitelist") {
      const action = interaction.options.getString("action");
      const user = interaction.options.getUser("user");

      if (action === "LIST") {
        const whitelist = data.settings.antinuke.whitelist || [];
        if (whitelist.length === 0) {
          return interaction.followUp("No users are whitelisted");
        }
        const users = whitelist.map((id) => `<@${id}>`).join(", ");
        return interaction.followUp(`**Whitelisted Users:**\n${users}`);
      }

      if (!user) {
        return interaction.followUp("Please provide a user to add/remove from whitelist");
      }

      if (action === "ADD") {
        if (!data.settings.antinuke.whitelist) data.settings.antinuke.whitelist = [];
        if (data.settings.antinuke.whitelist.includes(user.id)) {
          return interaction.followUp(`${user.tag} is already whitelisted`);
        }
        data.settings.antinuke.whitelist.push(user.id);
        await data.settings.save();
        return interaction.followUp(`${user.tag} has been added to the whitelist`);
      }

      if (action === "REMOVE") {
        if (!data.settings.antinuke.whitelist) data.settings.antinuke.whitelist = [];
        const index = data.settings.antinuke.whitelist.indexOf(user.id);
        if (index === -1) {
          return interaction.followUp(`${user.tag} is not whitelisted`);
        }
        data.settings.antinuke.whitelist.splice(index, 1);
        await data.settings.save();
        return interaction.followUp(`${user.tag} has been removed from the whitelist`);
      }
    }

    if (sub === "config") {
      const protection = interaction.options.getString("protection");
      const status = interaction.options.getString("status");
      data.settings.antinuke[protection] = status === "ON";
      await data.settings.save();
      const protectionName = protection.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      return interaction.followUp(`**${protectionName}** has been **${status === "ON" ? "enabled" : "disabled"}**`);
    }

    if (sub === "punishment") {
      const action = interaction.options.getString("action");
      data.settings.antinuke.punishment = action;
      await data.settings.save();
      return interaction.followUp(`Antinuke punishment set to **${action.replace(/_/g, " ")}**`);
    }

    if (sub === "threshold") {
      const type = interaction.options.getString("type");
      const amount = interaction.options.getInteger("amount");
      data.settings.antinuke[type] = amount;
      await data.settings.save();
      const typeName = type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      return interaction.followUp(`**${typeName}** set to **${amount}** actions`);
    }

    if (sub === "raid") {
      const status = interaction.options.getString("status");
      data.settings.antinuke.anti_raid = status === "ON";
      await data.settings.save();
      return interaction.followUp(`Raid protection has been **${status === "ON" ? "enabled" : "disabled"}**`);
    }
  },
};

function buildStatusEmbed(guild, settings) {
  const antinuke = settings.antinuke || {};
  const status = antinuke.enabled ? "✅ Enabled" : "❌ Disabled";
  const logChannel = antinuke.log_channel ? `<#${antinuke.log_channel}>` : "Not Set";
  const whitelist = antinuke.whitelist?.length || 0;
  const punishment = antinuke.punishment || "REMOVE_ROLES";

  const embed = new EmbedBuilder()
    .setAuthor({ name: "Antinuke Configuration", iconURL: guild.iconURL() })
    .setColor(EMBED_COLORS.BOT_EMBED)
    .addFields(
      { name: "Status", value: status, inline: true },
      { name: "Log Channel", value: logChannel, inline: true },
      { name: "Whitelisted Users", value: `${whitelist} users`, inline: true },
      { name: "Punishment", value: punishment.replace(/_/g, " "), inline: true },
      { name: "\u200b", value: "**Protections**", inline: false },
      { name: "Anti Ban", value: antinuke.anti_ban !== false ? "✅" : "❌", inline: true },
      { name: "Anti Kick", value: antinuke.anti_kick !== false ? "✅" : "❌", inline: true },
      { name: "Anti Channel Delete", value: antinuke.anti_channel_delete !== false ? "✅" : "❌", inline: true },
      { name: "Anti Channel Create", value: antinuke.anti_channel_create ? "✅" : "❌", inline: true },
      { name: "Anti Role Delete", value: antinuke.anti_role_delete !== false ? "✅" : "❌", inline: true },
      { name: "Anti Role Create", value: antinuke.anti_role_create ? "✅" : "❌", inline: true },
      { name: "Anti Webhook Create", value: antinuke.anti_webhook_create !== false ? "✅" : "❌", inline: true },
      { name: "Anti Bot Add", value: antinuke.anti_bot_add !== false ? "✅" : "❌", inline: true },
      { name: "Anti Raid", value: antinuke.anti_raid ? "✅" : "❌", inline: true },
      { name: "\u200b", value: "**Thresholds**", inline: false },
      { name: "Ban", value: `${antinuke.ban_threshold || 3} actions`, inline: true },
      { name: "Kick", value: `${antinuke.kick_threshold || 3} actions`, inline: true },
      { name: "Channel", value: `${antinuke.channel_threshold || 3} actions`, inline: true },
      { name: "Role", value: `${antinuke.role_threshold || 3} actions`, inline: true },
      { name: "Raid", value: `${antinuke.raid_threshold || 5} joins`, inline: true }
    )
    .setFooter({ text: `Time Window: ${antinuke.time_window || 10}s | Raid Window: ${antinuke.raid_time_window || 10}s` })
    .setTimestamp();

  return embed;
}
