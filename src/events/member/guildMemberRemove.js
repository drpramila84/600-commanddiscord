const { inviteHandler, greetingHandler } = require("@src/handlers");
const { getSettings } = require("@schemas/Guild");
const { EmbedBuilder } = require("discord.js");
const { EMBED_COLORS } = require("@root/config");

/**
 * @param {import('@src/structures').BotClient} client
 * @param {import('discord.js').GuildMember|import('discord.js').PartialGuildMember} member
 */
module.exports = async (client, member) => {
  if (member.partial) await member.user.fetch();
  if (!member.guild) return;

  const { guild } = member;
  const settings = await getSettings(guild);

  // Check for counter channel
  if (settings.counters.find((doc) => ["MEMBERS", "BOTS", "USERS"].includes(doc.counter_type.toUpperCase()))) {
    if (member.user.bot) {
      settings.data.bots -= 1;
      await settings.save();
    }
    if (!client.counterUpdateQueue.includes(guild.id)) client.counterUpdateQueue.push(guild.id);
  }

  // Log member leave
  if (settings.member_log_channel) {
    const logChannel = guild.channels.cache.get(settings.member_log_channel);
    if (logChannel) {
      try {
        const memberCount = guild.memberCount;
        const joinedDate = member.joinedTimestamp ? new Date(member.joinedTimestamp) : new Date();
        const memberDays = Math.floor((Date.now() - member.joinedTimestamp) / 86400000);

        const embed = new EmbedBuilder()
          .setColor(EMBED_COLORS.ERROR)
          .setDescription(
            `**Member left**\n\n` +
            `${member.user.toString()}\n` +
            `Member for ${memberDays} days\n\n` +
            `<t:${Math.floor(Date.now() / 1000)}:f>`
          )
          .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
          .setFooter({ text: `Total Members: ${memberCount}` });

        await logChannel.send({ embeds: [embed] });
      } catch (err) {
        client.logger.error("Failed to log member leave", err);
      }
    }
  }

  // Invite Tracker
  const inviterData = await inviteHandler.trackLeftMember(guild, member.user);

  // Farewell message
  greetingHandler.sendFarewell(member, inviterData);
};
