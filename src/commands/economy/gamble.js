const { ApplicationCommandOptionType } = require("discord.js");
const slot = require("./sub/slot");
const luck = require("./sub/luck");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "gamble",
  description: "try your luck by gambling",
  category: "ECONOMY",
  botPermissions: ["EmbedLinks"],
  command: {
    enabled: true,
    aliases: ["slot"],
    minArgsCount: 1,
    subcommands: [
      {
        trigger: "slot <amount>",
        description: "gamble your coins on the slot machine",
      },
      {
        trigger: "luck",
        description: "check your current luck percentage",
      },
    ],
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "slot",
        description: "gamble your coins on the slot machine",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "coins",
            description: "number of coins to bet",
            required: true,
            type: ApplicationCommandOptionType.Integer,
          },
        ],
      },
      {
        name: "luck",
        description: "check your current luck percentage",
        type: ApplicationCommandOptionType.Subcommand,
      },
    ],
  },

  async messageRun(message, args) {
    const sub = args[0]?.toLowerCase();
    let response;

    if (sub === "slot") {
      const betAmount = parseInt(args[1]);
      if (isNaN(betAmount)) return message.safeReply("Please provide a valid bet amount. Usage: `gamble slot <amount>`");
      response = await slot(message.author, betAmount);
    } else if (sub === "luck") {
      response = await luck(message.author);
    } else {
      const betAmount = parseInt(args[0]);
      if (!isNaN(betAmount)) {
        response = await slot(message.author, betAmount);
      } else {
        return message.safeReply("Invalid usage! Try `gamble slot <amount>` or `gamble luck`");
      }
    }

    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const sub = interaction.options.getSubcommand();
    let response;

    if (sub === "slot") {
      const betAmount = interaction.options.getInteger("coins");
      response = await slot(interaction.user, betAmount);
    } else if (sub === "luck") {
      response = await luck(interaction.user);
    }

    await interaction.followUp(response);
  },
};
