const { AttachmentBuilder, ApplicationCommandOptionType } = require("discord.js");
const { EMBED_COLORS } = require("@root/config");
const { getMemberStats, getXpLb } = require("@schemas/MemberStats");
const canvacord = require("canvacord");
const path = require("path");
const fs = require("fs");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "rank",
  description: "displays members rank in this server",
  cooldown: 5,
  category: "STATS",
  botPermissions: ["AttachFiles"],
  command: {
    enabled: true,
    usage: "[@member|id]",
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "user",
        description: "target user",
        type: ApplicationCommandOptionType.User,
        required: false,
      },
    ],
  },

  async messageRun(message, args, data) {
    const member = (await message.guild.resolveMember(args[0])) || message.member;
    const response = await getRank(message, member, data.settings);
    await message.safeReply(response);
  },

  async interactionRun(interaction, data) {
    const user = interaction.options.getUser("user") || interaction.user;
    const member = await interaction.guild.members.fetch(user);
    const response = await getRank(interaction, member, data.settings);
    await interaction.followUp(response);
  },
};

async function getRank({ guild }, member, settings) {
  const { user } = member;
  if (!settings.stats.enabled) return "Stats Tracking is disabled on this server";

  const memberStats = await getMemberStats(guild.id, user.id);
  if (!memberStats.xp) return `${user.username} is not ranked yet!`;

  const lb = await getXpLb(guild.id, 100);
  let pos = -1;
  lb.forEach((doc, i) => {
    if (doc.member_id == user.id) {
      pos = i + 1;
    }
  });

  const level = memberStats.level;
  const xpNeeded = level * level * 100;
  const rank = pos !== -1 ? pos : 0;

  const bgPath = path.join(process.cwd(), "attached_assets/levelup_1766934035446.png");
  
  try {
    const rankCard = new canvacord.RankCardBuilder()
      .setAvatar(user.displayAvatarURL({ extension: "png", size: 512 }))
      .setCurrentXP(memberStats.xp)
      .setRequiredXP(xpNeeded)
      .setStatus(member.presence?.status || "offline")
      .setUsername(user.username)
      .setRank(rank)
      .setLevel(level)
      .setProgressBar(EMBED_COLORS.BOT_EMBED, "COLOR");

    if (fs.existsSync(bgPath)) {
      rankCard.setBackground(fs.readFileSync(bgPath));
    }

    const data = await rankCard.build();
    const attachment = new AttachmentBuilder(data, { name: "rank.png" });
    return { files: [attachment] };
  } catch (ex) {
    guild.client.logger.error("Rank Card Error", ex);
    return "Failed to generate rank-card";
  }
}
