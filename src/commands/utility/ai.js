const { ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");
const OpenAI = require("openai");
const { EMBED_COLORS } = require("@root/config");

let openaiClient = null;

function getOpenAIClient() {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "ai",
  description: "chat with AI assistant",
  category: "UTILITY",
  botPermissions: ["EmbedLinks"],
  command: {
    enabled: true,
    usage: "<message>",
    aliases: ["chat", "ask", "gpt"],
    minArgsCount: 1,
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "message",
        description: "your message to the AI",
        type: ApplicationCommandOptionType.String,
        required: true,
      },
    ],
  },

  async messageRun(message, args) {
    const query = args.join(" ");
    const response = await chatWithAI(query, message.author.username);
    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    await interaction.deferReply();
    const query = interaction.options.getString("message");
    const response = await chatWithAI(query, interaction.user.username);
    await interaction.editReply(response);
  },
};

async function chatWithAI(query, username) {
  if (!process.env.OPENAI_API_KEY) {
    return "The AI feature is not configured. Please contact the bot owner.";
  }

  const openai = getOpenAIClient();

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a helpful and friendly AI assistant in a Discord server. Keep your responses concise, informative, and under 2000 characters to fit Discord's message limits. Be conversational and engaging.",
        },
        {
          role: "user",
          content: query,
        },
      ],
      max_completion_tokens: 512,
      temperature: 0.7,
    });

    const aiResponse = response.choices[0].message.content;

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.BOT_EMBED)
      .setAuthor({ name: "AI Assistant" })
      .addFields(
        { name: "Question", value: query.length > 1024 ? query.substring(0, 1021) + "..." : query },
        { name: "Response", value: aiResponse.length > 1024 ? aiResponse.substring(0, 1021) + "..." : aiResponse }
      )
      .setFooter({ text: `Asked by ${username}` })
      .setTimestamp();

    return { embeds: [embed] };
  } catch (error) {
    console.error("AI Chat Error:", error);
    
    if (error.code === "insufficient_quota") {
      return "The AI service has reached its usage limit. Please try again later.";
    }
    
    if (error.code === "invalid_api_key") {
      return "The AI feature is not properly configured. Please contact the bot owner.";
    }

    if (error.message?.includes("429")) {
      return "The AI service is currently busy. Please try again in a moment.";
    }

    return "An error occurred while processing your request. Please try again later.";
  }
}
