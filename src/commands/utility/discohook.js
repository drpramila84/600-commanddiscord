const { EmbedBuilder, ApplicationCommandOptionType, PermissionFlagsBits } = require("discord.js");
const { EMBED_COLORS } = require("@root/config.js");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "discohook",
  description: "Send a custom embed message via webhook",
  category: "UTILITY",
  botPermissions: ["ManageWebhooks"],
  userPermissions: ["ManageWebhooks"],
  command: {
    enabled: true,
    usage: "<channel> <title> <description> [color] [image_url] [thumbnail_url]",
    minArgsCount: 3,
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "send",
        description: "Send a custom embed message via webhook",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "channel",
            description: "The channel to send the webhook message to",
            type: ApplicationCommandOptionType.Channel,
            required: true,
          },
          {
            name: "title",
            description: "The title of the embed",
            type: ApplicationCommandOptionType.String,
            required: true,
          },
          {
            name: "description",
            description: "The description/content of the embed",
            type: ApplicationCommandOptionType.String,
            required: true,
          },
          {
            name: "color",
            description: "The color of the embed (hex code like #FF0000)",
            type: ApplicationCommandOptionType.String,
            required: false,
          },
          {
            name: "image",
            description: "URL for the main image",
            type: ApplicationCommandOptionType.String,
            required: false,
          },
          {
            name: "thumbnail",
            description: "URL for the thumbnail image",
            type: ApplicationCommandOptionType.String,
            required: false,
          },
          {
            name: "footer",
            description: "Footer text for the embed",
            type: ApplicationCommandOptionType.String,
            required: false,
          },
          {
            name: "author",
            description: "Author name for the embed",
            type: ApplicationCommandOptionType.String,
            required: false,
          },
          {
            name: "webhook_name",
            description: "Custom name for the webhook (default: bot name)",
            type: ApplicationCommandOptionType.String,
            required: false,
          },
          {
            name: "webhook_avatar",
            description: "Custom avatar URL for the webhook",
            type: ApplicationCommandOptionType.String,
            required: false,
          },
        ],
      },
      {
        name: "raw",
        description: "Send a raw text message via webhook",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "channel",
            description: "The channel to send the webhook message to",
            type: ApplicationCommandOptionType.Channel,
            required: true,
          },
          {
            name: "message",
            description: "The message content to send",
            type: ApplicationCommandOptionType.String,
            required: true,
          },
          {
            name: "webhook_name",
            description: "Custom name for the webhook",
            type: ApplicationCommandOptionType.String,
            required: false,
          },
          {
            name: "webhook_avatar",
            description: "Custom avatar URL for the webhook",
            type: ApplicationCommandOptionType.String,
            required: false,
          },
        ],
      },
      {
        name: "separator",
        description: "Send a separator line via webhook",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "channel",
            description: "The channel to send the separator to",
            type: ApplicationCommandOptionType.Channel,
            required: true,
          },
          {
            name: "style",
            description: "Style of the separator line",
            type: ApplicationCommandOptionType.String,
            required: false,
            choices: [
              { name: "Single Line", value: "single" },
              { name: "Double Line", value: "double" },
              { name: "Thick Line", value: "thick" },
              { name: "Dashed Line", value: "dashed" },
              { name: "Dotted Line", value: "dotted" },
              { name: "Stars", value: "stars" },
            ],
          },
          {
            name: "color",
            description: "Color of the separator embed (hex code)",
            type: ApplicationCommandOptionType.String,
            required: false,
          },
        ],
      },
      {
        name: "edit",
        description: "Edit an existing webhook message",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "message_link",
            description: "The Discord message link to edit (right-click message > Copy Message Link)",
            type: ApplicationCommandOptionType.String,
            required: true,
          },
          {
            name: "title",
            description: "New title for the embed (leave empty to keep current)",
            type: ApplicationCommandOptionType.String,
            required: false,
          },
          {
            name: "description",
            description: "New description for the embed",
            type: ApplicationCommandOptionType.String,
            required: false,
          },
          {
            name: "color",
            description: "New color for the embed (hex code)",
            type: ApplicationCommandOptionType.String,
            required: false,
          },
          {
            name: "image",
            description: "New image URL",
            type: ApplicationCommandOptionType.String,
            required: false,
          },
          {
            name: "thumbnail",
            description: "New thumbnail URL",
            type: ApplicationCommandOptionType.String,
            required: false,
          },
          {
            name: "footer",
            description: "New footer text",
            type: ApplicationCommandOptionType.String,
            required: false,
          },
        ],
      },
    ],
  },

  async messageRun(message, args) {
    const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);
    if (!channel) {
      return message.safeReply("Please provide a valid channel!");
    }

    if (!channel.isTextBased()) {
      return message.safeReply("Please provide a text channel!");
    }

    const title = args[1];
    const description = args.slice(2).join(" ");

    if (!title || !description) {
      return message.safeReply("Please provide both a title and description!");
    }

    const response = await sendWebhookEmbed(channel, {
      title,
      description,
      color: EMBED_COLORS.BOT_EMBED,
      webhookName: message.client.user.username,
      webhookAvatar: message.client.user.displayAvatarURL(),
    });

    return message.safeReply(response);
  },

  async interactionRun(interaction) {
    const sub = interaction.options.getSubcommand();

    if (sub === "edit") {
      const messageLink = interaction.options.getString("message_link");
      const title = interaction.options.getString("title");
      const description = interaction.options.getString("description");
      const color = interaction.options.getString("color");
      const image = interaction.options.getString("image");
      const thumbnail = interaction.options.getString("thumbnail");
      const footer = interaction.options.getString("footer");

      const response = await editWebhookMessage(interaction.guild, messageLink, {
        title,
        description,
        color,
        image,
        thumbnail,
        footer,
      });

      return interaction.followUp(response);
    }

    const channel = interaction.options.getChannel("channel");

    if (!channel || !channel.isTextBased()) {
      return interaction.followUp("Please provide a valid text channel!");
    }

    if (sub === "send") {
      const title = interaction.options.getString("title");
      const description = interaction.options.getString("description");
      const color = interaction.options.getString("color") || EMBED_COLORS.BOT_EMBED;
      const image = interaction.options.getString("image");
      const thumbnail = interaction.options.getString("thumbnail");
      const footer = interaction.options.getString("footer");
      const author = interaction.options.getString("author");
      const webhookName = interaction.options.getString("webhook_name") || interaction.client.user.username;
      const webhookAvatar = interaction.options.getString("webhook_avatar") || interaction.client.user.displayAvatarURL();

      const response = await sendWebhookEmbed(channel, {
        title,
        description,
        color,
        image,
        thumbnail,
        footer,
        author,
        webhookName,
        webhookAvatar,
      });

      return interaction.followUp(response);
    }

    if (sub === "raw") {
      const message = interaction.options.getString("message");
      const webhookName = interaction.options.getString("webhook_name") || interaction.client.user.username;
      const webhookAvatar = interaction.options.getString("webhook_avatar") || interaction.client.user.displayAvatarURL();

      const response = await sendWebhookRaw(channel, {
        message,
        webhookName,
        webhookAvatar,
      });

      return interaction.followUp(response);
    }

    if (sub === "separator") {
      const style = interaction.options.getString("style") || "single";
      const color = interaction.options.getString("color") || "#2F3136";
      const webhookName = interaction.client.user.username;
      const webhookAvatar = interaction.client.user.displayAvatarURL();

      const response = await sendWebhookSeparator(channel, {
        style,
        color,
        webhookName,
        webhookAvatar,
      });

      return interaction.followUp(response);
    }
  },
};

async function sendWebhookEmbed(channel, options) {
  try {
    const webhooks = await channel.fetchWebhooks();
    let webhook = webhooks.find((wh) => wh.token);

    if (!webhook) {
      webhook = await channel.createWebhook({
        name: options.webhookName || "Discohook",
        avatar: options.webhookAvatar,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(options.title)
      .setDescription(options.description)
      .setColor(options.color);

    if (options.image) embed.setImage(options.image);
    if (options.thumbnail) embed.setThumbnail(options.thumbnail);
    if (options.footer) embed.setFooter({ text: options.footer });
    if (options.author) embed.setAuthor({ name: options.author });

    await webhook.send({
      username: options.webhookName,
      avatarURL: options.webhookAvatar,
      embeds: [embed],
    });

    return `Webhook message sent successfully to ${channel}!`;
  } catch (error) {
    console.error("Discohook Error:", error);
    return `Failed to send webhook message: ${error.message}`;
  }
}

async function sendWebhookRaw(channel, options) {
  try {
    const webhooks = await channel.fetchWebhooks();
    let webhook = webhooks.find((wh) => wh.token);

    if (!webhook) {
      webhook = await channel.createWebhook({
        name: options.webhookName || "Discohook",
        avatar: options.webhookAvatar,
      });
    }

    await webhook.send({
      username: options.webhookName,
      avatarURL: options.webhookAvatar,
      content: options.message,
    });

    return `Webhook message sent successfully to ${channel}!`;
  } catch (error) {
    console.error("Discohook Error:", error);
    return `Failed to send webhook message: ${error.message}`;
  }
}

async function sendWebhookSeparator(channel, options) {
  try {
    const webhooks = await channel.fetchWebhooks();
    let webhook = webhooks.find((wh) => wh.token);

    if (!webhook) {
      webhook = await channel.createWebhook({
        name: options.webhookName || "Discohook",
        avatar: options.webhookAvatar,
      });
    }

    const separatorStyles = {
      single: "─────────────────────────────────────────",
      double: "═════════════════════════════════════════",
      thick: "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
      dashed: "┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄",
      dotted: "·····································································",
      stars: "✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦ ✦",
    };

    const separatorLine = separatorStyles[options.style] || separatorStyles.single;

    const embed = new EmbedBuilder()
      .setDescription(separatorLine)
      .setColor(options.color);

    await webhook.send({
      username: options.webhookName,
      avatarURL: options.webhookAvatar,
      embeds: [embed],
    });

    return `Separator sent successfully to ${channel}!`;
  } catch (error) {
    console.error("Discohook Separator Error:", error);
    return `Failed to send separator: ${error.message}`;
  }
}

async function editWebhookMessage(guild, messageLink, options) {
  try {
    const linkRegex = /https:\/\/(?:ptb\.|canary\.)?discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/;
    const match = messageLink.match(linkRegex);

    if (!match) {
      return "Invalid message link! Please provide a valid Discord message link.";
    }

    const [, guildId, channelId, messageId] = match;

    if (guildId !== guild.id) {
      return "The message link must be from this server!";
    }

    const channel = guild.channels.cache.get(channelId);
    if (!channel) {
      return "Could not find the channel!";
    }

    const webhooks = await channel.fetchWebhooks();
    const webhook = webhooks.find((wh) => wh.token);

    if (!webhook) {
      return "No webhook found in that channel! The message must have been sent by a webhook.";
    }

    let message;
    try {
      message = await channel.messages.fetch(messageId);
    } catch {
      return "Could not find the message! Make sure the link is correct.";
    }

    if (message.webhookId !== webhook.id) {
      return "This message was not sent by the bot's webhook!";
    }

    const existingEmbed = message.embeds[0];
    const embed = new EmbedBuilder();

    if (options.title !== null && options.title !== undefined) {
      embed.setTitle(options.title);
    } else if (existingEmbed?.title) {
      embed.setTitle(existingEmbed.title);
    }

    if (options.description !== null && options.description !== undefined) {
      embed.setDescription(options.description);
    } else if (existingEmbed?.description) {
      embed.setDescription(existingEmbed.description);
    }

    if (options.color) {
      embed.setColor(options.color);
    } else if (existingEmbed?.color) {
      embed.setColor(existingEmbed.color);
    }

    if (options.image) {
      embed.setImage(options.image);
    } else if (existingEmbed?.image?.url) {
      embed.setImage(existingEmbed.image.url);
    }

    if (options.thumbnail) {
      embed.setThumbnail(options.thumbnail);
    } else if (existingEmbed?.thumbnail?.url) {
      embed.setThumbnail(existingEmbed.thumbnail.url);
    }

    if (options.footer) {
      embed.setFooter({ text: options.footer });
    } else if (existingEmbed?.footer?.text) {
      embed.setFooter({ text: existingEmbed.footer.text });
    }

    await webhook.editMessage(messageId, {
      embeds: [embed],
    });

    return `Message edited successfully!`;
  } catch (error) {
    console.error("Discohook Edit Error:", error);
    return `Failed to edit message: ${error.message}`;
  }
}
