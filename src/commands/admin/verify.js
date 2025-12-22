const { ApplicationCommandOptionType, EmbedBuilder, ChannelType } = require("discord.js");
const { EMBED_COLORS } = require("@root/config");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "verify",
  description: "manage server verification system",
  category: "ADMIN",
  userPermissions: ["Administrator"],
  command: {
    enabled: true,
    usage: "<setup [channel] [role] [text] [emoji]|remove|status>",
    minArgsCount: 1,
  },
  slashCommand: {
    enabled: true,
    ephemeral: true,
    options: [
      {
        name: "setup",
        description: "setup verification system for your server",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "channel",
            description: "the channel to send verification message",
            type: ApplicationCommandOptionType.Channel,
            channelTypes: [ChannelType.GuildText],
            required: true,
          },
          {
            name: "role",
            description: "the role to give when user verifies",
            type: ApplicationCommandOptionType.Role,
            required: true,
          },
          {
            name: "message",
            description: "the verification message content",
            type: ApplicationCommandOptionType.String,
            required: false,
          },
          {
            name: "emoji",
            description: "custom emoji to react with (use emoji or emoji ID)",
            type: ApplicationCommandOptionType.String,
            required: false,
          },
        ],
      },
      {
        name: "remove",
        description: "remove verification system from server",
        type: ApplicationCommandOptionType.Subcommand,
      },
      {
        name: "status",
        description: "view current verification settings",
        type: ApplicationCommandOptionType.Subcommand,
      },
    ],
  },

  async messageRun(message, args, data) {
    const sub = args[0]?.toLowerCase();

    if (sub === "setup") {
      if (args.length < 4) {
        return message.safeReply("Usage: `verify setup <channel> <role> <text> [emoji]`");
      }

      // Parse channel
      const channelMatch = args[1].match(/\d+/);
      if (!channelMatch) {
        return message.safeReply("Invalid channel. Please mention a channel.");
      }
      const channel = message.guild.channels.cache.get(channelMatch[0]);
      if (!channel || !channel.isTextBased()) {
        return message.safeReply("Channel not found or is not a text channel.");
      }

      // Parse role
      const roleMatch = args[2].match(/\d+/);
      if (!roleMatch) {
        return message.safeReply("Invalid role. Please mention a role.");
      }
      const role = message.guild.roles.cache.get(roleMatch[0]);
      if (!role) {
        return message.safeReply("Role not found.");
      }

      // Parse text (everything until emoji)
      let text = "";
      let emojiArg = null;
      let textEndIndex = args.length;

      // Check if last argument looks like an emoji (either emoji or ID)
      const lastArg = args[args.length - 1];
      if (args.length >= 5 && (/^\d+$/.test(lastArg) || /^<a?:[^:]+:\d+>$/.test(lastArg) || /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27BF}]/u.test(lastArg))) {
        emojiArg = lastArg;
        textEndIndex = args.length - 1;
      }

      text = args.slice(3, textEndIndex).join(" ");

      if (!text) {
        return message.safeReply("Please provide verification message text.");
      }

      // Validate emoji if provided
      let emojiId = null;
      if (emojiArg) {
        const emojiMatch = emojiArg.match(/\d+/);
        if (emojiMatch) {
          emojiId = emojiMatch[0];
          // Check if it's a valid emoji in the guild
          const emoji = message.guild.emojis.cache.get(emojiId);
          if (!emoji && !isUnicodeEmoji(emojiArg)) {
            return message.safeReply("Emoji not found in this server or invalid emoji.");
          }
        } else if (!isUnicodeEmoji(emojiArg)) {
          return message.safeReply("Invalid emoji format.");
        } else {
          emojiId = emojiArg;
        }
      }

      // Save settings
      if (!data.settings.verification) {
        data.settings.verification = {};
      }
      data.settings.verification.enabled = true;
      data.settings.verification.channel_id = channel.id;
      data.settings.verification.role_id = role.id;
      data.settings.verification.message = text;
      data.settings.verification.emoji = emojiId || "✓";
      await data.settings.save();

      // Create and send verification message
      const embed = new EmbedBuilder()
        .setAuthor({ name: "Server Verification", iconURL: message.guild.iconURL() })
        .setColor(EMBED_COLORS.BOT_EMBED)
        .setDescription(text)
        .setFooter({ text: "React with the emoji below to verify" });

      try {
        const sentMessage = await channel.send({ embeds: [embed] });
        
        // Save the message ID to settings
        data.settings.verification.message_id = sentMessage.id;
        await data.settings.save();
        
        // Add emoji reaction to the message
        const emoji = emojiId || "✓";
        if (/^\d+$/.test(emoji)) {
          const customEmoji = message.guild.emojis.cache.get(emoji);
          if (customEmoji) {
            await sentMessage.react(customEmoji);
          } else {
            await sentMessage.react("✓");
          }
        } else {
          await sentMessage.react(emoji);
        }
        
        return message.safeReply(`✅ Verification system has been set up in ${channel} with role ${role} and emoji ${emojiId || "✓"}`);
      } catch (error) {
        return message.safeReply(`❌ Failed to send verification message: ${error.message}`);
      }
    }

    if (sub === "remove") {
      if (!data.settings.verification?.enabled) {
        return message.safeReply("Verification system is not enabled");
      }

      data.settings.verification.enabled = false;
      await data.settings.save();
      return message.safeReply("✅ Verification system has been disabled");
    }

    if (sub === "status") {
      const embed = buildStatusEmbed(message.guild, data.settings);
      return message.safeReply({ embeds: [embed] });
    }

    return message.safeReply("Invalid usage. Use: `verify <setup [channel] [role] [text] [emoji]|remove|status>`");
  },

  async interactionRun(interaction, data) {
    const sub = interaction.options.getSubcommand();

    if (sub === "setup") {
      const channel = interaction.options.getChannel("channel");
      const role = interaction.options.getRole("role");
      const customMessage = interaction.options.getString("message") || "Click the button below to verify yourself and gain access to the server!";
      let emojiArg = interaction.options.getString("emoji");

      // Validate emoji if provided
      let emojiId = emojiArg || "✓";
      if (emojiArg) {
        const emojiMatch = emojiArg.match(/\d+/);
        if (emojiMatch) {
          emojiId = emojiMatch[0];
          const emoji = interaction.guild.emojis.cache.get(emojiId);
          if (!emoji && !isUnicodeEmoji(emojiArg)) {
            return interaction.followUp("❌ Emoji not found in this server or invalid emoji.");
          }
        } else if (!isUnicodeEmoji(emojiArg)) {
          return interaction.followUp("❌ Invalid emoji format.");
        } else {
          emojiId = emojiArg;
        }
      }

      // Save settings
      if (!data.settings.verification) {
        data.settings.verification = {};
      }
      data.settings.verification.enabled = true;
      data.settings.verification.channel_id = channel.id;
      data.settings.verification.role_id = role.id;
      data.settings.verification.message = customMessage;
      data.settings.verification.emoji = emojiId;
      await data.settings.save();

      // Create and send verification message
      const embed = new EmbedBuilder()
        .setAuthor({ name: "Server Verification", iconURL: interaction.guild.iconURL() })
        .setColor(EMBED_COLORS.BOT_EMBED)
        .setDescription(customMessage)
        .setFooter({ text: "React with the emoji below to verify" });

      try {
        const sentMessage = await channel.send({ embeds: [embed] });
        
        // Save the message ID to settings
        data.settings.verification.message_id = sentMessage.id;
        await data.settings.save();
        
        // Add emoji reaction to the message
        if (/^\d+$/.test(emojiId)) {
          const customEmoji = interaction.guild.emojis.cache.get(emojiId);
          if (customEmoji) {
            await sentMessage.react(customEmoji);
          } else {
            await sentMessage.react("✓");
          }
        } else {
          await sentMessage.react(emojiId);
        }
        
        return interaction.followUp(`✅ Verification system has been set up in ${channel} with role ${role} and emoji ${emojiId}`);
      } catch (error) {
        return interaction.followUp(`❌ Failed to send verification message: ${error.message}`);
      }
    }

    if (sub === "remove") {
      if (!data.settings.verification?.enabled) {
        return interaction.followUp("Verification system is not enabled");
      }

      data.settings.verification.enabled = false;
      await data.settings.save();
      return interaction.followUp("✅ Verification system has been disabled");
    }

    if (sub === "status") {
      const embed = buildStatusEmbed(interaction.guild, data.settings);
      return interaction.followUp({ embeds: [embed] });
    }
  },
};

function buildStatusEmbed(guild, settings) {
  const verification = settings.verification || {};
  const isEnabled = verification.enabled ? "✅ Enabled" : "❌ Disabled";
  const channel = verification.channel_id ? `<#${verification.channel_id}>` : "Not Set";
  const role = verification.role_id ? `<@&${verification.role_id}>` : "Not Set";
  const message = verification.message || "Not Set";
  const emoji = verification.emoji || "✓";

  const embed = new EmbedBuilder()
    .setAuthor({ name: "Verification Configuration", iconURL: guild.iconURL() })
    .setColor(EMBED_COLORS.BOT_EMBED)
    .addFields(
      { name: "Status", value: isEnabled, inline: true },
      { name: "Channel", value: channel, inline: true },
      { name: "Verification Role", value: role, inline: true },
      { name: "Emoji", value: emoji, inline: true },
      { name: "Message", value: message.length > 1024 ? message.substring(0, 1021) + "..." : message, inline: false }
    )
    .setTimestamp();

  return embed;
}

function isUnicodeEmoji(str) {
  return /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{27BF}]/u.test(str);
}