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
    usage: "<prompt> [size]",
    minArgsCount: 1,
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "prompt",
        description: "The prompt to generate an image from.",
        type: ApplicationCommandOptionType.String,
        required: true,
        minLength: 5,
        maxLength: 1000,
      },
      {
        name: "size",
        description: "The size of the image to generate",
        type: ApplicationCommandOptionType.String,
        required: false,
        choices: [
          { name: "256x256", value: "256x256" },
          { name: "512x512", value: "512x512" },
          { name: "1024x1024", value: "1024x1024" },
        ],
      },
    ],
  },

  async messageRun(message, args) {
    const validSizes = ["256x256", "512x512", "1024x1024"];
    let size = "1024x1024";
    let promptArgs = args;
    
    // Check if last argument is a size
    if (validSizes.includes(args[args.length - 1])) {
      size = args[args.length - 1];
      promptArgs = args.slice(0, -1);
    }
    
    const prompt = promptArgs.join(" ");
    if (prompt.length < 5) {
      return message.safeReply("Prompt must be at least 5 characters long!");
    }
    const response = await generateImage(prompt, size);
    return message.safeReply(response);
  },

  async interactionRun(interaction) {
    const prompt = interaction.options.getString("prompt");
    const size = interaction.options.getString("size") || "1024x1024";
    const response = await generateImage(prompt, size);
    await interaction.followUp(response);
  },
};

async function generateImage(prompt, size = "1024x1024") {
  try {
    const apiKey = process.env.AI_INTEGRATIONS_GEMINI_API_KEY;
    const baseUrl = process.env.AI_INTEGRATIONS_GEMINI_BASE_URL;

    if (!apiKey || !baseUrl) {
      const embed = new EmbedBuilder()
        .setColor("#FF0000")
        .setTitle("❌ Gemini API Not Configured")
        .setDescription("The bot owner needs to set up the Gemini API to use this feature. Please contact them for more information.")
        .setTimestamp();
      return { embeds: [embed] };
    }

    const url = `${baseUrl}/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${prompt}\n\nGenerate at ${size} resolution`,
            },
          ],
        },
      ],
      generationConfig: {
        responseModalities: ["TEXT", "IMAGE"],
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Gemini API Error:", error);
      return { content: "Failed to generate image. Please check your API credentials and try again." };
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    if (!candidate) {
      return { content: "Failed to generate image. Please try again with a different prompt." };
    }

    const imagePart = candidate?.content?.parts?.find((part) => part.inlineData);

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
    return {
      content: `Error generating image: ${error.message || "Please try again later"}`,
    };
  }
}
