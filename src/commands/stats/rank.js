const { AttachmentBuilder, ApplicationCommandOptionType } = require("discord.js");
const { getMemberStats, getXpLb } = require("@schemas/MemberStats");
const { createCanvas, loadImage, registerFont } = require("canvas");
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
  const xp = memberStats.xp;
  const needed = (level + 1) * (level + 1) * 100;
  const currentLevelXp = level * level * 100;
  const progress = xp - currentLevelXp;
  const required = needed - currentLevelXp;
  const rank = pos !== -1 ? pos : 0;

  try {
    const width = 900;
    const height = 300;
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");

    // Background - Dark theme based on Python logic
    ctx.fillStyle = "#030014";
    ctx.fillRect(0, 0, width, height);

    // Diagonal Gradient
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#4a90e2");
    gradient.addColorStop(1, "#50e3c2");
    ctx.fillStyle = gradient;
    ctx.globalAlpha = 0.3;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1.0;

    // Rounded Rectangle Overlay
    ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
    ctx.beginPath();
    ctx.roundRect(15, 15, width - 30, height - 30, 20);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Avatar
    const avatarUrl = user.displayAvatarURL({ extension: "png", size: 256 });
    const avatar = await loadImage(avatarUrl);
    ctx.save();
    ctx.beginPath();
    ctx.arc(100, 150, 70, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(avatar, 30, 80, 140, 140);
    ctx.restore();

    // Border for Avatar
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(100, 150, 72, 0, Math.PI * 2, true);
    ctx.stroke();

    // Text Content
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 36px Arial";
    ctx.fillText(user.username.toUpperCase(), 200, 80);

    ctx.font = "bold 24px Arial";
    ctx.fillStyle = "#ffd700";
    ctx.fillText(`LEVEL ${level}`, 200, 130);

    ctx.fillStyle = "#87cefa";
    ctx.fillText(`RANK #${rank}`, 200, 170);

    // Progress Bar
    const barX = 200;
    const barY = 210;
    const barWidth = 500;
    const barHeight = 30;

    ctx.fillStyle = "#202225";
    ctx.beginPath();
    ctx.roundRect(barX, barY, barWidth, barHeight, 15);
    ctx.fill();

    const progressWidth = Math.min(Math.max((progress / required) * barWidth, 20), barWidth);
    const barGradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
    barGradient.addColorStop(0, "#64e9ff");
    barGradient.addColorStop(1, "#ff69b4");
    
    ctx.fillStyle = barGradient;
    ctx.beginPath();
    ctx.roundRect(barX, barY, progressWidth, barHeight, 15);
    ctx.fill();

    // XP Text
    ctx.fillStyle = "#ffffff";
    ctx.font = "18px Arial";
    const xpText = `${progress.toLocaleString()} / ${required.toLocaleString()} XP`;
    const textWidth = ctx.measureText(xpText).width;
    ctx.fillText(xpText, barX + (barWidth - textWidth) / 2, barY + 22);

    // Stats on right
    ctx.font = "18px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("MESSAGES", 730, 100);
    ctx.fillStyle = "#00ff7f";
    ctx.font = "bold 22px Arial";
    ctx.fillText(memberStats.messages.toLocaleString(), 730, 130);

    ctx.font = "18px Arial";
    ctx.fillStyle = "#ffffff";
    ctx.fillText("TOTAL XP", 730, 170);
    ctx.fillStyle = "#ffa500";
    ctx.font = "bold 22px Arial";
    ctx.fillText(xp.toLocaleString(), 730, 200);

    const buffer = canvas.toBuffer();
    const attachment = new AttachmentBuilder(buffer, { name: "rank.png" });
    return { files: [attachment] };
  } catch (ex) {
    guild.client.logger.error("Rank Card Error", ex);
    return "Failed to generate rank-card";
  }
}
