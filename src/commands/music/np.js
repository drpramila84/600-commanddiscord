const { EMBED_COLORS } = require("@root/config");
const { EmbedBuilder } = require("discord.js");
const prettyMs = require("pretty-ms");
const { splitBar } = require("string-progressbar");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "np",
  description: "show's what track is currently being played",
  category: "MUSIC",
  botPermissions: ["EmbedLinks"],
  command: {
    enabled: true,
    aliases: ["nowplaying"],
  },
  slashCommand: {
    enabled: true,
  },

  async messageRun(message, args) {
    const response = nowPlaying(message);
    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const response = nowPlaying(interaction);
    await interaction.followUp(response);
  },
};

/**
 * @param {import("discord.js").CommandInteraction|import("discord.js").Message} arg0
 */
function nowPlaying({ client, guildId }) {
  const player = client.musicManager.getPlayer(guildId);
  if (!player || !player.queue.current) return "🚫 No music is being played!";

  const track = player.queue.current;
  const trackTitle = track.title || track.info?.title || "Unknown";
  const trackUri = track.uri || track.info?.uri || "";
  const trackLength = track.length || track.info?.length || 0;
  const end = trackLength > 6.048e8 ? "🔴 LIVE" : new Date(trackLength).toISOString().slice(11, 19);

  const embed = new EmbedBuilder()
    .setColor(EMBED_COLORS.BOT_EMBED)
    .setAuthor({ name: "Now playing" })
    .setDescription(`[${trackTitle}](${trackUri})`)
    .addFields(
      {
        name: "Song Duration",
        value: "`" + prettyMs(trackLength, { colonNotation: true }) + "`",
        inline: true,
      },
      {
        name: "Requested By",
        value: track.requester || "Unknown",
        inline: true,
      },
      {
        name: "\u200b",
        value:
          new Date(player.position).toISOString().slice(11, 19) +
          " [" +
          splitBar(trackLength > 6.048e8 ? player.position : trackLength, player.position, 15)[0] +
          "] " +
          end,
        inline: false,
      }
    );

  return { embeds: [embed] };
}
