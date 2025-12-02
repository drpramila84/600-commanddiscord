const { ApplicationCommandOptionType } = require("discord.js");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "say",
  description: "make the bot say something",
  category: "UTILITY",
  botPermissions: ["SendMessages"],
  command: {
    enabled: true,
    usage: "<text>",
    minArgsCount: 1,
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "text",
        description: "the text you want the bot to say",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },

  async messageRun(message, args) {
    const text = args.join(" ");
    await message.channel.send(text);
  },

  async interactionRun(interaction) {
    const text = interaction.options.getString("text");
    await interaction.followUp(text);
  },
};
