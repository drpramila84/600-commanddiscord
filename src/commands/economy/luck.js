const { EmbedBuilder } = require("discord.js");
const { getUser } = require("@schemas/User");
const { EMBED_COLORS, ECONOMY } = require("@root/config.js");

function getLuckBar(percentage) {
  const filled = Math.floor(percentage / 10);
  const empty = 10 - filled;
  return "🍀".repeat(filled) + "⬜".repeat(empty);
}

function getLuckTitle(percentage) {
  if (percentage >= 90) return "🌟 LEGENDARY LUCK";
  if (percentage >= 70) return "✨ AMAZING LUCK";
  if (percentage >= 50) return "🍀 GOOD LUCK";
  if (percentage >= 30) return "🎲 MODERATE LUCK";
  if (percentage >= 10) return "😐 LOW LUCK";
  return "💀 NO LUCK";
}

function getLuckDescription(percentage) {
  if (percentage >= 90) return "The gods have blessed you! Fortune smiles upon you!";
  if (percentage >= 70) return "You're feeling very lucky today!";
  if (percentage >= 50) return "Lady luck is on your side!";
  if (percentage >= 30) return "You have a fair chance of winning.";
  if (percentage >= 10) return "Maybe try again tomorrow...";
  return "The odds are not in your favor today.";
}

module.exports = async (user) => {
  const userDb = await getUser(user);
  
  let luckData = userDb.luck || { percentage: 0, lastClaim: null };
  const now = new Date();
  const lastClaim = luckData.lastClaim ? new Date(luckData.lastClaim) : null;
  const hoursSinceLastClaim = lastClaim ? (now - lastClaim) / (1000 * 60 * 60) : 999;
  
  if (hoursSinceLastClaim >= 2) {
    const newLuck = Math.floor(Math.random() * 101);
    luckData.percentage = newLuck;
    luckData.lastClaim = now;
    
    userDb.luck = luckData;
    await userDb.save();
  }
  
  const percentage = luckData.percentage;
  const luckBar = getLuckBar(percentage);
  const luckTitle = getLuckTitle(percentage);
  const luckDesc = getLuckDescription(percentage);
  
  const nextRefresh = lastClaim && hoursSinceLastClaim < 2 
    ? `<t:${Math.floor((new Date(luckData.lastClaim).getTime() + 7200000) / 1000)}:R>`
    : "Available now!";

  const embed = new EmbedBuilder()
    .setAuthor({ name: `${user.username}'s Luck`, iconURL: user.displayAvatarURL() })
    .setColor(percentage >= 50 ? EMBED_COLORS.SUCCESS : percentage >= 25 ? EMBED_COLORS.WARNING : EMBED_COLORS.ERROR)
    .setDescription(`## ${luckTitle}\n\n${luckDesc}`)
    .addFields(
      { name: "🎰 Luck Meter", value: `${luckBar}\n**${percentage}%**`, inline: false },
      { name: "🔄 Next Refresh", value: nextRefresh, inline: true },
      { name: "💰 Current Balance", value: `${userDb.coins || 0}${ECONOMY.CURRENCY}`, inline: true }
    )
    .setFooter({ text: "Your luck affects your gambling odds! Higher luck = better chances!" })
    .setTimestamp();

  return { embeds: [embed] };
};
