const { ApplicationCommandOptionType, AttachmentBuilder, EmbedBuilder } = require("discord.js");
const { EMBED_COLORS } = require("@root/config.js");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "imagine",
  description: "Generate an image using AI (Gemini)",
  cooldown: 10,
  category: "UTILITY",
  botPermissions: ["EmbedLinks", "AttachFiles"],
  command: {
    enabled: true,
    usage: "<prompt>",
    minArgsCount: 1,
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "prompt",
        description: "Describe the image you want to generate",
        type: ApplicationCommandOptionType.String,
        required: true,
        minLength: 5,
        maxLength: 1000,
      },
    ],
  },

  async messageRun(message, args) {
    const prompt = args.join(" ");
    if (prompt.length < 5) {
      return message.safeReply("Prompt must be at least 5 characters long!");
    }
    const response = await generateImage(prompt);
    return message.safeReply(response);
  },

  async interactionRun(interaction) {
    const prompt = interaction.options.getString("prompt");
    const response = await generateImage(prompt);
    await interaction.followUp(response);
  },
};

async function generateImage(prompt) {
  try {
    const { GoogleGenAI, Modality } = await import("@google/genai");
    
    const ai = new GoogleGenAI({
      apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
      httpOptions: {
        apiVersion: "",
        baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
      },
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.TEXT, Modality.IMAGE],
      },
    });

    const candidate = response.candidates?.[0];
    const imagePart = candidate?.content?.parts?.find((part) => part.inlineData);

    if (!imagePart?.inlineData?.data) {
      return { content: "Failed to generate image. Please try again with a different prompt." };
    }

    const imageBuffer = Buffer.from(imagePart.inlineData.data, "base64");
    const mimeType = imagePart.inlineData.mimeType || "image/png";
    const extension = mimeType.split("/")[1] || "png";

    const attachment = new AttachmentBuilder(imageBuffer, {
      name: `generated-image.${extension}`,
    });

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.BOT_EMBED)
      .setTitle("✨ Generated Image")
      .setDescription(prompt)
      .setImage(`attachment://generated-image.${extension}`)
      .setTimestamp();

    return { embeds: [embed], files: [attachment] };
  } catch (error) {
    console.error("Imagine command error:", error);
    return {
      content: `Error generating image: ${error.message || "Please try again later"}`,
    };
  }
}
