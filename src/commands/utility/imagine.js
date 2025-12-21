const { ApplicationCommandOptionType, AttachmentBuilder, EmbedBuilder } = require("discord.js");
const { EMBED_COLORS } = require("@root/config.js");

let ai = null;
let Modality = null;

async function initializeAI() {
  if (!ai) {
    const { GoogleGenAI, Modality: ModEnum } = await import("@google/genai");
    Modality = ModEnum;
    ai = new GoogleGenAI({
      apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
      httpOptions: {
        apiVersion: "",
        baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
      },
    });
  }
}

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
    await initializeAI();

    if (!process.env.AI_INTEGRATIONS_GEMINI_API_KEY || !process.env.AI_INTEGRATIONS_GEMINI_BASE_URL) {
      const embed = new EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("❌ Gemini API Not Configured")
        .setDescription("The bot owner needs to set up the Gemini API to use this feature. Please contact them for more information.")
        .setTimestamp();
      return { embeds: [embed] };
    }

    // Use gemini-2.5-flash-image for image generation
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [{
        role: "user",
        parts: [{ text: prompt }]
      }],
    });

    console.log("Image generation response:", response);

    const candidate = response.candidates?.[0];
    if (!candidate) {
      console.error("No candidates in response");
      return { content: "Failed to generate image. Please try again with a different prompt." };
    }

    // Look for image data in the response
    const imagePart = candidate?.content?.parts?.find((part) => part.inlineData);
    
    // If we have image data, return it
    if (imagePart?.inlineData?.data) {
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
    }

    // Fallback: if no image data, create a description-based response
    const textPart = candidate?.content?.parts?.find((part) => part.text);
    if (textPart?.text) {
      const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.BOT_EMBED)
        .setTitle("✨ Image Generation Result")
        .setDescription(textPart.text)
        .setTimestamp();
      return { embeds: [embed] };
    }

    return { content: "Failed to generate image. Please try again with a different prompt." };
  } catch (error) {
    console.error("Imagine command error:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      status: error.status,
      stack: error.stack,
    });
    return {
      content: `Error generating image: ${error.message || "Please try again later"}`,
    };
  }
}
