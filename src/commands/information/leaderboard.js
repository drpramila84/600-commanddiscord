const { EmbedBuilder, escapeInlineCode, ApplicationCommandOptionType, AttachmentBuilder } = require("discord.js");
const { EMBED_COLORS, IMAGE } = require("@root/config");
const { getInvitesLb } = require("@schemas/Member");
const { getXpLb } = require("@schemas/MemberStats");
const { getReputationLb } = require("@schemas/User");
const { getBuffer } = require("@helpers/HttpUtils");
const canvacord = require("canvacord");
const path = require("path");

const leaderboardTypes = ["xp", "invite", "rep"];

/**
 * @type {import("@structures/Command")}
 */

module.exports = {
  name: "leaderboard",
  description: "display the XP, invite and rep leaderboard",
  category: "INFORMATION",
  botPermissions: ["EmbedLinks", "AttachFiles"],
  command: {
    enabled: true,
    aliases: ["lb"],
    minArgsCount: 1,
    usage: "<xp|invite|rep>",
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "type",
        description: "type of leaderboard to display",
        required: true,
        type: ApplicationCommandOptionType.String,
        choices: leaderboardTypes.map((type) => ({
          name: type,
          value: type,
        })),
      },
    ],
  },
  async messageRun(message, args, data) {
    const type = args[0].toLowerCase();
    let response;

    // Optional: defer if message.safeReply doesn't handle long waits well
    // but message commands usually don't have a strict 3s timeout like interactions.

    switch (type) {
      case "xp":
        response = await getXpLeaderboard(message, message.author, data.settings);
        break;
      case "invite":
        response = await getInviteLeaderboard(message, message.author, data.settings);
        break;
      case "rep":
        response = await getRepLeaderboard(message.author);
        break;
      default:
        response = "Invalid Leaderboard type. Choose either `xp`, `invite`or `rep`";
    }

    await message.safeReply(response);
  },

  async interactionRun(interaction, data) {
    try {
      await interaction.deferReply();
    } catch (e) {}
    const type = interaction.options.getString("type");
    let response;

    switch (type) {
      case "xp":
        response = await getXpLeaderboard(interaction, interaction.user, data.settings);
        break;
      case "invite":
        response = await getInviteLeaderboard(interaction, interaction.user, data.settings);
        break;
      case "rep":
        response = await getRepLeaderboard(interaction.user);
        break;
      default:
        response = "Invalid Leaderboard type. Choose either `xp`, `invite`or `rep`";
    }
    await interaction.followUp(response);
  },
};

// Create a Map object to store cache entries
const cache = new Map();

async function getXpLeaderboard({ guild, client }, author, settings) {
  const cacheKey = `${guild.id}:xp`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  if (!settings.stats.enabled) return "The leaderboard is disabled on this server";

  const lb = await getXpLb(guild.id, 10);
  if (lb.length === 0) return "There are no users in the leaderboard";

  const fs = require("fs");
  const leaderboard = new canvacord.LeaderboardBuilder()
    .setBackground(fs.readFileSync(path.join(process.cwd(), "attached_assets/first_leaderboard_1766936477215.png")))
    .setVariant("default")
    .setHeader({
      title: "XP Leaderboard",
      subtitle: guild.name,
      image: guild.iconURL({ extension: "png" }),
    });

  const players = await Promise.all(
    lb.map(async (user, index) => {
      const discordUser = await client.users.fetch(user.member_id).catch(() => null);
      return {
        avatar: discordUser ? discordUser.displayAvatarURL({ extension: "png" }) : null,
        username: discordUser ? discordUser.username : "Unknown",
        displayName: discordUser ? discordUser.username : "Unknown",
        level: user.level,
        xp: user.xp,
        rank: index + 1,
      };
    })
  );

  leaderboard.setPlayers(players);

  // Use a system font to prevent "No fonts are loaded" error
  try {
    const fs = require("fs");
    const fontPath = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf";
    if (fs.existsSync(fontPath)) {
      // In canvacord 6.x, fonts are registered using Font.fromFileSync or new Font()
      // which automatically adds them to the internal font manager.
      await canvacord.Font.fromFile(fontPath, "DejaVu Sans");
    }
  } catch (e) {
    console.error("Failed to load font:", e);
  }

  const data = await leaderboard.build();
  const attachment = new AttachmentBuilder(data, { name: "leaderboard.png" });

  const result = { content: `**XP Leaderboard for ${guild.name}**`, files: [attachment] };
  cache.set(cacheKey, result);
  return result;
}

async function getInviteLeaderboard({ guild, client }, author, settings) {
  const cacheKey = `${guild.id}:invite`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  if (!settings.invite.tracking) return "Invite tracking is disabled on this server";

  const lb = await getInvitesLb(guild.id, 10);
  if (lb.length === 0) return "There are no users in the leaderboard";

  let collector = "";
  for (let i = 0; i < lb.length; i++) {
    try {
      const memberId = lb[i].member_id;
      if (memberId === "VANITY") collector += `**#${(i + 1).toString()}** - Vanity URL [${lb[i].invites}]\n`;
      else {
        const user = await client.users.fetch(lb[i].member_id);
        collector += `**#${(i + 1).toString()}** - ${escapeInlineCode(user.tag)} [${lb[i].invites}]\n`;
      }
    } catch (ex) {
      collector += `**#${(i + 1).toString()}** - DeletedUser#0000 [${lb[i].invites}]\n`;
    }
  }

  const embed = new EmbedBuilder()
    .setAuthor({ name: "Invite Leaderboard" })
    .setColor(EMBED_COLORS.BOT_EMBED)
    .setDescription(collector)
    .setFooter({ text: `Requested by ${author.tag}` });

  const result = { embeds: [embed] };
  cache.set(cacheKey, result);
  return result;
}

async function getRepLeaderboard(author) {
  const cacheKey = `${author.id}:rep`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const lb = await getReputationLb(10);
  if (lb.length === 0) return "There are no users in the leaderboard";

  let collector = "";
  for (let i = 0; i < lb.length; i++) {
    try {
      const user = await author.client.users.fetch(lb[i].member_id);
      collector += `**#${(i + 1).toString()}** - ${escapeInlineCode(user.tag)} [${lb[i].rep}]\n`;
    } catch (ex) {
      collector += `**#${(i + 1).toString()}** - DeletedUser#0000 [${lb[i].rep}]\n`;
    }
  }

  const embed = new EmbedBuilder()
    .setAuthor({ name: "Reputation Leaderboard" })
    .setColor(EMBED_COLORS.BOT_EMBED)
    .setDescription(collector)
    .setFooter({ text: `Requested by ${author.tag}` });

  const result = { embeds: [embed] };
  cache.set(cacheKey, result);
  return result;
}
