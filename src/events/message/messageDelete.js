const { EmbedBuilder } = require("discord.js");
const { getSettings } = require("@schemas/Guild");
const { EMBED_COLORS } = require("@root/config");

/**
 * @param {import('@src/structures').BotClient} client
 * @param {import('discord.js').Message|import('discord.js').PartialMessage} message
 */
module.exports = async (client, message) => {
  if (message.partial) return;
  if (!message.author || !message.guild) return;

  const settings = await getSettings(message.guild);

  // Log deleted message
  if (settings.message_log_channel) {
    const logChannel = message.guild.channels.cache.get(settings.message_log_channel);
    if (logChannel && !message.author.bot) {
      try {
        const timestamp = Math.floor(Date.now() / 1000);

        const embed = new EmbedBuilder()
          .setColor(EMBED_COLORS.ERROR)
          .setDescription(
            `**Message deleted in** <#${message.channelId}> • \n\n` +
            `${message.content || "*No content*"}\n\n` +
            `**Message ID:** ${message.id}\n\n` +
            `<t:${timestamp}:f>`
          )
          .setAuthor({ name: message.author.username, iconURL: message.author.displayAvatarURL() })
          .setFooter({ text: `User: ${message.author.id}` });

        await logChannel.send({ embeds: [embed] });
      } catch (err) {
        client.logger.error("Failed to log message deletion", err);
      }
    }
  }

  // Ghost ping detection
  if (message.author.bot) return;

  if (!settings.automod.anti_ghostping || !settings.modlog_channel) return;
  const { members, roles, everyone } = message.mentions;

  // Check message if it contains mentions
  if (members.size > 0 || roles.size > 0 || everyone) {
    const logChannel = message.guild.channels.cache.get(settings.modlog_channel);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setAuthor({ name: "Ghost ping detected" })
      .setDescription(
        `**Message:**\n${message.content}\n\n` +
          `**Author:** ${message.author.tag} \`${message.author.id}\`\n` +
          `**Channel:** ${message.channel.toString()}`
      )
      .addFields(
        {
          name: "Members",
          value: members.size.toString(),
          inline: true,
        },
        {
          name: "Roles",
          value: roles.size.toString(),
          inline: true,
        },
        {
          name: "Everyone?",
          value: everyone ? "Yes" : "No",
          inline: true,
        }
      )
      .setFooter({ text: `Sent at: ${message.createdAt}` });

    logChannel.safeSend({ embeds: [embed] });
  }
};
