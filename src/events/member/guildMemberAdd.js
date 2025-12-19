const { inviteHandler, greetingHandler } = require("@src/handlers");
const { getSettings } = require("@schemas/Guild");
const { EmbedBuilder } = require("discord.js");
const { EMBED_COLORS } = require("@root/config");

/**
 * @param {import('@src/structures').BotClient} client
 * @param {import('discord.js').GuildMember} member
 */
module.exports = async (client, member) => {
  if (!member || !member.guild) return;

  const { guild } = member;
  const settings = await getSettings(guild);

  // Autorole
  if (settings.autorole) {
    const role = guild.roles.cache.get(settings.autorole);
    if (role) member.roles.add(role).catch((err) => {});
  }

  // Check for counter channel
  if (settings.counters.find((doc) => ["MEMBERS", "BOTS", "USERS"].includes(doc.counter_type.toUpperCase()))) {
    if (member.user.bot) {
      settings.data.bots += 1;
      await settings.save();
    }
    if (!client.counterUpdateQueue.includes(guild.id)) client.counterUpdateQueue.push(guild.id);
  }

  // Log member join
  if (settings.member_log_channel) {
    const logChannel = guild.channels.cache.get(settings.member_log_channel);
    if (logChannel) {
      try {
        const memberCount = guild.memberCount;
        const accountAge = Math.floor((Date.now() - member.user.createdTimestamp) / 1000);
        const months = Math.floor(accountAge / 2592000);
        const days = Math.floor((accountAge % 2592000) / 86400);
        const hours = Math.floor((accountAge % 86400) / 3600);

        const embed = new EmbedBuilder()
          .setColor(EMBED_COLORS.SUCCESS)
          .setDescription(
            `**Member joined**\n\n` +
            `${member.user.toString()}\n` +
            `<@${member.id}> ${memberCount}th to join\n` +
            `created ${months} months, ${days} days and ${hours} hours ago\n\n` +
            `<t:${Math.floor(Date.now() / 1000)}:f>`
          )
          .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
          .setFooter({ text: `Total Members: ${memberCount}` });

        await logChannel.send({ embeds: [embed] });
      } catch (err) {
        client.logger.error("Failed to log member join", err);
      }
    }
  }

  // Check if invite tracking is enabled
  const inviterData = settings.invite.tracking ? await inviteHandler.trackJoinedMember(member) : {};

  // Send welcome message
  greetingHandler.sendWelcome(member, inviterData);
};
