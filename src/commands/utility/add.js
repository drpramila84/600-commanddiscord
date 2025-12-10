const { ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");
const { EMBED_COLORS } = require("@root/config.js");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "add",
  description: "Add emojis, stickers, and other items to collections",
  category: "UTILITY",
  botPermissions: ["ManageEmojisAndStickers"],
  userPermissions: ["ManageGuild"],
  command: {
    enabled: false,
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "type",
        description: "The type of item to add (emoji or sticker)",
        type: ApplicationCommandOptionType.String,
        required: true,
        choices: [
          { name: "Emoji", value: "emoji" },
          { name: "Sticker", value: "sticker" },
        ],
      },
      {
        name: "id",
        description: "The ID or URL of the item to add",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },

  async interactionRun(interaction) {
    const type = interaction.options.getString("type");
    const id = interaction.options.getString("id");

    try {
      if (type === "emoji") {
        return await addEmoji(interaction, id);
      } else if (type === "sticker") {
        return await addSticker(interaction, id);
      }

      return interaction.followUp("❌ Invalid type specified!");
    } catch (error) {
      console.error("Add command error:", error);
      return interaction.followUp(`❌ Error: ${error.message}`);
    }
  },
};

async function addEmoji(interaction, idOrUrl) {
  try {
    let emojiUrl, emojiName;

    // Check if it's a Discord emoji format <:name:id>
    const emojiRegex = /<:([a-zA-Z0-9_]+):(\d+)>/;
    const match = idOrUrl.match(emojiRegex);

    if (match) {
      emojiName = match[1];
      const emojiId = match[2];
      emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.png`;
    } else if (idOrUrl.startsWith("http")) {
      // It's a URL
      emojiUrl = idOrUrl;
      emojiName = `custom_emoji_${Date.now()}`;
    } else {
      // Try as emoji ID
      const emojiId = idOrUrl.match(/\d+/)?.[0];
      if (!emojiId) {
        return interaction.followUp("❌ Invalid emoji format. Use Discord emoji format or URL.");
      }
      emojiUrl = `https://cdn.discordapp.com/emojis/${emojiId}.png`;
      emojiName = `emoji_${emojiId}`;
    }

    // Create the emoji
    const emoji = await interaction.guild.emojis.create({
      attachment: emojiUrl,
      name: emojiName,
    });

    const embed = new EmbedBuilder()
      .setTitle("✅ Emoji Added Successfully")
      .setDescription(`**Name:** ${emoji.name}\n**ID:** ${emoji.id}`)
      .setThumbnail(emoji.url)
      .setColor(EMBED_COLORS.BOT_EMBED);

    return interaction.followUp({ embeds: [embed] });
  } catch (error) {
    return interaction.followUp(`❌ Failed to add emoji: ${error.message}`);
  }
}

async function addSticker(interaction, idOrUrl) {
  try {
    let stickerUrl, stickerName;

    if (idOrUrl.startsWith("http")) {
      stickerUrl = idOrUrl;
      stickerName = `sticker_${Date.now()}`;
    } else {
      // Try to fetch existing sticker
      const sticker = await interaction.client.fetchSticker(idOrUrl);
      if (!sticker) {
        return interaction.followUp("❌ Could not find sticker with that ID.");
      }
      stickerUrl = sticker.url;
      stickerName = sticker.name || `sticker_${Date.now()}`;
    }

    // Create the sticker
    const newSticker = await interaction.guild.stickers.create({
      file: stickerUrl,
      name: stickerName,
      tags: "custom",
    });

    const embed = new EmbedBuilder()
      .setTitle("✅ Sticker Added Successfully")
      .setDescription(`**Name:** ${newSticker.name}\n**ID:** ${newSticker.id}`)
      .setColor(EMBED_COLORS.BOT_EMBED);

    return interaction.followUp({ embeds: [embed] });
  } catch (error) {
    return interaction.followUp(`❌ Failed to add sticker: ${error.message}`);
  }
}
