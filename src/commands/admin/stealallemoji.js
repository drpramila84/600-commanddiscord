const { ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");
const { EMBED_COLORS } = require("@root/config.js");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "stealallemoji",
  description: "Steal all emojis from a server",
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
        name: "server_id",
        description: "The ID of the server to steal emojis from",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },

  async interactionRun(interaction) {
    const serverId = interaction.options.getString("server_id");

    try {
      await interaction.followUp("⏳ Starting emoji theft... This may take a while!");

      // Try to fetch the guild
      let targetGuild;
      try {
        targetGuild = await interaction.client.guilds.fetch(serverId);
      } catch (error) {
        return interaction.editReply("❌ Could not find server with that ID. Make sure the bot is in that server!");
      }

      if (!targetGuild.emojis.cache.size) {
        return interaction.editReply("❌ That server has no emojis to steal!");
      }

      // Check emoji slots available
      const currentGuild = interaction.guild;
      const maxEmojis = currentGuild.premiumTier === 0 ? 50 : currentGuild.premiumTier === 1 ? 100 : currentGuild.premiumTier === 2 ? 150 : 250;
      const availableSlots = maxEmojis - currentGuild.emojis.cache.size;

      if (availableSlots <= 0) {
        return interaction.editReply(`❌ Your server has no emoji slots available! (Max: ${maxEmojis})`);
      }

      // Steal emojis
      const allEmojis = targetGuild.emojis.cache
        .filter(emoji => !emoji.managed) // Don't steal managed emojis
        .toJSON();

      const emojisToSteal = allEmojis.slice(0, availableSlots);

      let successful = 0;
      let failed = 0;
      const results = [];

      for (const emoji of emojisToSteal) {
        try {
          const newEmoji = await currentGuild.emojis.create({
            attachment: emoji.url,
            name: emoji.name,
          });
          successful++;
          results.push(`✅ ${emoji.name}`);
        } catch (error) {
          failed++;
          results.push(`❌ ${emoji.name}`);
        }
      }

      // Create result embed
      const embed = new EmbedBuilder()
        .setTitle("🎉 Emoji Heist Complete!")
        .setDescription(`Successfully stole emojis from **${targetGuild.name}**`)
        .addFields(
          { name: "✅ Successful", value: `${successful} emojis`, inline: true },
          { name: "❌ Failed", value: `${failed} emojis`, inline: true },
          { name: "📊 Total Available", value: `${availableSlots} slots`, inline: true }
        )
        .setColor(EMBED_COLORS.BOT_EMBED)
        .setThumbnail(targetGuild.iconURL());

      // Add emoji list if not too long
      if (results.length <= 25) {
        embed.addFields({
          name: "Added Emojis",
          value: results.join("\n"),
        });
      }

      return interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Steal all emoji error:", error);
      return interaction.editReply(`❌ Error: ${error.message}`);
    }
  },
};
