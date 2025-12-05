const { ApplicationCommandOptionType, parseEmoji } = require("discord.js");
const { EMBED_COLORS } = require("@root/config");
const { EmbedBuilder } = require("discord.js");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "stealemoji",
  description: "steal an emoji from another server and add it to this server",
  category: "ADMIN",
  userPermissions: ["ManageEmojisAndStickers"],
  botPermissions: ["ManageEmojisAndStickers"],
  command: {
    enabled: true,
    usage: "<emoji> [name]",
    minArgsCount: 1,
    aliases: ["steal", "addemoji", "emojiadd"],
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "emoji",
        description: "the emoji to steal (paste the emoji)",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
      {
        name: "name",
        description: "custom name for the emoji (optional)",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
    ],
  },

  async messageRun(message, args) {
    const emojiInput = args[0];
    const customName = args.slice(1).join("_") || null;
    const response = await stealEmoji(message.guild, emojiInput, customName);
    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const emojiInput = interaction.options.getString("emoji");
    const customName = interaction.options.getString("name") || null;
    const response = await stealEmoji(interaction.guild, emojiInput, customName);
    await interaction.followUp(response);
  },
};

async function stealEmoji(guild, emojiInput, customName) {
  const emojiRegex = /<?(a)?:?(\w{2,32}):(\d{17,19})>?/;
  const match = emojiInput.match(emojiRegex);

  if (!match) {
    return {
      embeds: [
        new EmbedBuilder()
          .setColor(EMBED_COLORS.ERROR)
          .setDescription("Invalid emoji! Please provide a valid custom emoji from another server.")
      ]
    };
  }

  const animated = match[1] === "a";
  const emojiName = customName || match[2];
  const emojiId = match[3];

  const extension = animated ? "gif" : "png";
  const emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.${extension}?size=128&quality=lossless`;

  try {
    const emoji = await guild.emojis.create({
      attachment: emojiUrl,
      name: emojiName,
    });

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.SUCCESS)
      .setTitle("Emoji Stolen Successfully!")
      .setDescription(`Added ${emoji} with the name \`${emoji.name}\``)
      .setThumbnail(emoji.url)
      .addFields(
        { name: "Emoji", value: `${emoji}`, inline: true },
        { name: "Name", value: `\`:${emoji.name}:\``, inline: true },
        { name: "ID", value: `\`${emoji.id}\``, inline: true },
        { name: "Animated", value: animated ? "Yes" : "No", inline: true }
      );

    return { embeds: [embed] };
  } catch (error) {
    let errorMessage = "Failed to add the emoji.";
    
    if (error.code === 30008) {
      errorMessage = "This server has reached the maximum number of emojis!";
    } else if (error.code === 50035) {
      errorMessage = "Invalid emoji name or the emoji is too large!";
    } else if (error.code === 50013) {
      errorMessage = "I don't have permission to manage emojis in this server!";
    }

    return {
      embeds: [
        new EmbedBuilder()
          .setColor(EMBED_COLORS.ERROR)
          .setDescription(errorMessage)
      ]
    };
  }
}
