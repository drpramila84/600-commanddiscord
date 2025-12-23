const {
  ApplicationCommandOptionType,
  ChannelType,
  EmbedBuilder,
} = require("discord.js");
const { getSettings } = require("@schemas/Guild");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "boost",
  description: "Configure server boost settings",
  category: "ADMIN",
  userPermissions: ["ManageGuild"],
  command: {
    enabled: true,
    usage: "<setmessage|edit|role|setchannel|image|test|removechannel|display>",
    minArgsCount: 1,
  },
  slashCommand: {
    enabled: true,
    ephemeral: true,
    options: [
      {
        name: "setmessage",
        description: "Set the boost notification message",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "message",
            description: "The message to show when someone boosts",
            type: ApplicationCommandOptionType.String,
            required: true,
          },
        ],
      },
      {
        name: "edit",
        description: "Edit the current boost message",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "message",
            description: "The new boost message",
            type: ApplicationCommandOptionType.String,
            required: true,
          },
        ],
      },
      {
        name: "role",
        description: "Set the role that boosters get",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "role",
            description: "The role to give to boosters",
            type: ApplicationCommandOptionType.Role,
            required: true,
          },
        ],
      },
      {
        name: "setchannel",
        description: "Set the channel for boost notifications",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "channel",
            description: "The channel to send boost notifications",
            type: ApplicationCommandOptionType.Channel,
            channelTypes: [ChannelType.GuildText],
            required: true,
          },
        ],
      },
      {
        name: "image",
        description: "Set an image for boost notifications",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "image_url",
            description: "URL of the image to display",
            type: ApplicationCommandOptionType.String,
            required: true,
          },
        ],
      },
    ],
  },

  async messageRun(message, args) {
    const subcommand = args[0]?.toLowerCase();
    const settings = await getSettings(message.guild);

    if (subcommand === "setmessage") {
      const msg = args.slice(1).join(" ");
      if (!msg) return message.reply("Please provide a message");
      settings.boost.message = msg;
      await settings.save();
      return message.reply(`✅ Boost message set to: \`${msg}\``);
    }

    if (subcommand === "edit") {
      const msg = args.slice(1).join(" ");
      if (!msg) return message.reply("Please provide a message");
      if (!settings.boost.message) return message.reply("No boost message set yet. Use `boost setmessage` first");
      settings.boost.message = msg;
      await settings.save();
      return message.reply(`✅ Boost message updated to: \`${msg}\``);
    }

    if (subcommand === "role") {
      const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[1]);
      if (!role) return message.reply("Please provide a valid role");
      settings.boost.role = role.id;
      await settings.save();
      return message.reply(`✅ Boost role set to ${role}`);
    }

    if (subcommand === "setchannel") {
      const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]);
      if (!channel || channel.type !== ChannelType.GuildText) return message.reply("Please provide a valid text channel");
      settings.boost.channel = channel.id;
      await settings.save();
      return message.reply(`✅ Boost notification channel set to ${channel}`);
    }

    if (subcommand === "image") {
      const imageUrl = args[1];
      if (!imageUrl) return message.reply("Please provide an image URL");
      if (!imageUrl.startsWith("http")) return message.reply("Please provide a valid URL");
      settings.boost.image = imageUrl;
      await settings.save();
      return message.reply(`✅ Boost image set to: ${imageUrl}`);
    }

    if (subcommand === "test") {
      if (!settings.boost.message) return message.reply("❌ No boost message configured. Use `boost setmessage` first");
      
      const testChannel = settings.boost.channel ? message.guild.channels.cache.get(settings.boost.channel) : message.channel;
      if (!testChannel) return message.reply("❌ Configured boost channel not found");

      const embed = new EmbedBuilder()
        .setTitle("🎉 Server Boost Test")
        .setDescription(settings.boost.message)
        .setColor("#FF73FA");

      if (settings.boost.image) {
        embed.setImage(settings.boost.image);
      }

      const roleText = settings.boost.role ? `<@&${settings.boost.role}>` : "No role configured";
      embed.addFields({ name: "Role Reward", value: roleText, inline: true });

      await testChannel.send({ embeds: [embed] });
      return message.reply(`✅ Boost notification test sent to ${testChannel}`);
    }

    if (subcommand === "removechannel") {
      if (!settings.boost.channel) return message.reply("❌ No boost channel configured");
      settings.boost.channel = null;
      await settings.save();
      return message.reply(`✅ Boost notification channel removed`);
    }

    if (subcommand === "display") {
      const embed = new EmbedBuilder()
        .setTitle("🎉 Boost Settings")
        .setColor("#FF73FA");

      const message_text = settings.boost.message || "Not configured";
      const channel_text = settings.boost.channel ? `<#${settings.boost.channel}>` : "Not configured";
      const role_text = settings.boost.role ? `<@&${settings.boost.role}>` : "Not configured";
      const image_text = settings.boost.image ? "Configured" : "Not configured";

      embed.addFields(
        { name: "📝 Message", value: message_text, inline: false },
        { name: "📢 Channel", value: channel_text, inline: true },
        { name: "🎖️ Role", value: role_text, inline: true },
        { name: "🖼️ Image", value: image_text, inline: true }
      );

      return message.reply({ embeds: [embed] });
    }

    return message.reply("Invalid subcommand. Use: `setmessage`, `edit`, `role`, `setchannel`, `image`, `test`, `removechannel`, or `display`");
  },

  async interactionRun(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const settings = await getSettings(interaction.guild);

    if (subcommand === "setmessage") {
      const message = interaction.options.getString("message");
      settings.boost.message = message;
      await settings.save();
      return interaction.followUp(`✅ Boost message set to: \`${message}\``);
    }

    if (subcommand === "edit") {
      const message = interaction.options.getString("message");
      if (!settings.boost.message) return interaction.followUp("No boost message set yet. Use `/boost setmessage` first");
      settings.boost.message = message;
      await settings.save();
      return interaction.followUp(`✅ Boost message updated to: \`${message}\``);
    }

    if (subcommand === "role") {
      const role = interaction.options.getRole("role");
      settings.boost.role = role.id;
      await settings.save();
      return interaction.followUp(`✅ Boost role set to ${role}`);
    }

    if (subcommand === "setchannel") {
      const channel = interaction.options.getChannel("channel");
      settings.boost.channel = channel.id;
      await settings.save();
      return interaction.followUp(`✅ Boost notification channel set to ${channel}`);
    }

    if (subcommand === "image") {
      const imageUrl = interaction.options.getString("image_url");
      settings.boost.image = imageUrl;
      await settings.save();
      return interaction.followUp(`✅ Boost image set to: ${imageUrl}`);
    }
  },
};
