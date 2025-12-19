const { EmbedBuilder } = require("discord.js");
const { getSettings } = require("@schemas/Guild");
const { EMBED_COLORS } = require("@root/config");

/**
 * @param {import('@src/structures').BotClient} client
 * @param {import('discord.js').Message|import('discord.js').PartialMessage} oldMessage
 * @param {import('discord.js').Message|import('discord.js').PartialMessage} newMessage
 */
module.exports = async (client, oldMessage, newMessage) => {
  try {
    // Handle partial messages
    if (oldMessage.partial) await oldMessage.fetch().catch(() => {});
    if (newMessage.partial) await newMessage.fetch().catch(() => {});

    // Validate messages
    if (!oldMessage.guild || !oldMessage.author) return;
    if (oldMessage.author.bot) return;
    if (oldMessage.content === newMessage.content) return;

    const settings = await getSettings(oldMessage.guild);
    if (!settings.message_log_channel) return;

    const logChannel = oldMessage.guild.channels.cache.get(settings.message_log_channel);
    if (!logChannel) return;

    const timestamp = Math.floor(Date.now() / 1000);

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.BOT_EMBED)
      .setDescription(
        `**Message edited in** <#${oldMessage.channelId}> • ❄️ ::**[BOT-UPDATE]**::\n🍷\n\n` +
        `**Before:** <#${oldMessage.channelId}> ${oldMessage.author.toString()}\n${oldMessage.content || "*No content*"}\n\n` +
        `**+After:** <#${oldMessage.channelId}> ${oldMessage.author.toString()}\n${newMessage.content || "*No content*"} 🎨\n\n` +
        `**ID:** ${oldMessage.id} | <t:${timestamp}:R>`
      )
      .setFooter({ text: `Author: ${oldMessage.author.tag}`, iconURL: oldMessage.author.displayAvatarURL() });

    await logChannel.send({ embeds: [embed] });
  } catch (err) {
    client.logger.error("Failed to log message edit", err);
  }
};
