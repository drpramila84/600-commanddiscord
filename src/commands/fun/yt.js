const { ApplicationCommandOptionType } = require("discord.js");
const axios = require("axios");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "yt",
  description: "Search for a video on YouTube",
  category: "FUN",
  botPermissions: ["EmbedLinks"],
  command: {
    enabled: true,
    usage: "<search_query>",
    minArgsCount: 1,
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "query",
        description: "The search query",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },

  async messageRun(message, args) {
    const query = args.join(" ");
    const response = await getYoutubeVideo(query);
    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const query = interaction.options.getString("query");
    const response = await getYoutubeVideo(query);
    await interaction.followUp(response);
  },
};

async function getYoutubeVideo(query) {
  try {
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const { data } = await axios.get(searchUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });

    const regex = /watch\?v=(\S{11})/;
    const match = data.match(regex);

    if (match) {
      return `**▶ | Here are your search results:- https://www.youtube.com/watch?v=${match[1]} **`;
    } else {
      return "No search results found.";
    }
  } catch (error) {
    return "An error occurred while searching YouTube.";
  }
}
