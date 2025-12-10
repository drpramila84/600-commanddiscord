const { 
  EmbedBuilder, 
  ApplicationCommandOptionType, 
  ActionRowBuilder, 
  ButtonBuilder, 
  ButtonStyle,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  RoleSelectMenuBuilder,
  MentionableSelectMenuBuilder,
  ChannelSelectMenuBuilder,
  ChannelType
} = require("discord.js");
const { EMBED_COLORS } = require("@root/config.js");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "buttons",
  description: "Add, remove, or edit buttons and components on messages",
  category: "UTILITY",
  botPermissions: ["ManageMessages"],
  userPermissions: ["ManageMessages"],
  command: {
    enabled: true,
    usage: "<add|remove> <message_link>",
    minArgsCount: 2,
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "add",
        description: "Add a component to a message",
        type: ApplicationCommandOptionType.SubcommandGroup,
        options: [
          {
            name: "button",
            description: "Add a button that gives/removes a role",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
              {
                name: "message",
                description: "Message link to add the button to",
                type: ApplicationCommandOptionType.String,
                required: true,
              },
              {
                name: "label",
                description: "Button label text",
                type: ApplicationCommandOptionType.String,
                required: true,
              },
              {
                name: "role",
                description: "Role to give/remove when clicked",
                type: ApplicationCommandOptionType.Role,
                required: true,
              },
              {
                name: "style",
                description: "Button style",
                type: ApplicationCommandOptionType.String,
                required: false,
                choices: [
                  { name: "Blue (Primary)", value: "Primary" },
                  { name: "Grey (Secondary)", value: "Secondary" },
                  { name: "Green (Success)", value: "Success" },
                  { name: "Red (Danger)", value: "Danger" },
                ],
              },
              {
                name: "emoji",
                description: "Button emoji",
                type: ApplicationCommandOptionType.String,
                required: false,
              },
            ],
          },
          {
            name: "link",
            description: "Add a link button",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
              {
                name: "message",
                description: "Message link to add the button to",
                type: ApplicationCommandOptionType.String,
                required: true,
              },
              {
                name: "label",
                description: "Button label text",
                type: ApplicationCommandOptionType.String,
                required: true,
              },
              {
                name: "url",
                description: "URL the button links to",
                type: ApplicationCommandOptionType.String,
                required: true,
              },
              {
                name: "emoji",
                description: "Button emoji",
                type: ApplicationCommandOptionType.String,
                required: false,
              },
            ],
          },
          {
            name: "role_select",
            description: "Add a role select menu",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
              {
                name: "message",
                description: "Message link to add the select menu to",
                type: ApplicationCommandOptionType.String,
                required: true,
              },
              {
                name: "placeholder",
                description: "Placeholder text for the select menu",
                type: ApplicationCommandOptionType.String,
                required: false,
              },
              {
                name: "max_values",
                description: "Maximum number of selections (default: 1)",
                type: ApplicationCommandOptionType.Integer,
                required: false,
              },
            ],
          },
          {
            name: "user_select",
            description: "Add a user select menu",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
              {
                name: "message",
                description: "Message link to add the select menu to",
                type: ApplicationCommandOptionType.String,
                required: true,
              },
              {
                name: "placeholder",
                description: "Placeholder text for the select menu",
                type: ApplicationCommandOptionType.String,
                required: false,
              },
              {
                name: "max_values",
                description: "Maximum number of selections (default: 1)",
                type: ApplicationCommandOptionType.Integer,
                required: false,
              },
            ],
          },
          {
            name: "channel_select",
            description: "Add a channel select menu",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
              {
                name: "message",
                description: "Message link to add the select menu to",
                type: ApplicationCommandOptionType.String,
                required: true,
              },
              {
                name: "placeholder",
                description: "Placeholder text for the select menu",
                type: ApplicationCommandOptionType.String,
                required: false,
              },
              {
                name: "max_values",
                description: "Maximum number of selections (default: 1)",
                type: ApplicationCommandOptionType.Integer,
                required: false,
              },
            ],
          },
          {
            name: "string_select",
            description: "Add a string select menu with custom options",
            type: ApplicationCommandOptionType.Subcommand,
            options: [
              {
                name: "message",
                description: "Message link to add the select menu to",
                type: ApplicationCommandOptionType.String,
                required: true,
              },
              {
                name: "placeholder",
                description: "Placeholder text for the select menu",
                type: ApplicationCommandOptionType.String,
                required: true,
              },
              {
                name: "options",
                description: "Options in format: label1:value1:emoji1,label2:value2:emoji2 (emoji optional)",
                type: ApplicationCommandOptionType.String,
                required: true,
              },
            ],
          },
        ],
      },
      {
        name: "remove",
        description: "Remove all components from a message",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "message",
            description: "Message link to remove components from",
            type: ApplicationCommandOptionType.String,
            required: true,
          },
        ],
      },
      {
        name: "clear_row",
        description: "Clear a specific row of components",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "message",
            description: "Message link",
            type: ApplicationCommandOptionType.String,
            required: true,
          },
          {
            name: "row",
            description: "Row number to clear (1-5)",
            type: ApplicationCommandOptionType.Integer,
            required: true,
            choices: [
              { name: "Row 1", value: 1 },
              { name: "Row 2", value: 2 },
              { name: "Row 3", value: 3 },
              { name: "Row 4", value: 4 },
              { name: "Row 5", value: 5 },
            ],
          },
        ],
      },
    ],
  },

  async messageRun(message, args) {
    return message.safeReply("Please use the slash command `/buttons` for this feature.");
  },

  async interactionRun(interaction) {
    const subGroup = interaction.options.getSubcommandGroup(false);
    const sub = interaction.options.getSubcommand();

    if (subGroup === "add") {
      const messageLink = interaction.options.getString("message");
      const { message, channel, error } = await fetchMessageFromLink(interaction.guild, messageLink);
      
      if (error) return interaction.followUp(error);

      let response;
      switch (sub) {
        case "button":
          response = await addRoleButton(interaction, message, channel);
          break;
        case "link":
          response = await addLinkButton(interaction, message, channel);
          break;
        case "role_select":
          response = await addRoleSelect(interaction, message, channel);
          break;
        case "user_select":
          response = await addUserSelect(interaction, message, channel);
          break;
        case "channel_select":
          response = await addChannelSelect(interaction, message, channel);
          break;
        case "string_select":
          response = await addStringSelect(interaction, message, channel);
          break;
        default:
          response = "Unknown component type!";
      }

      return interaction.followUp(response);
    }

    if (sub === "remove") {
      const messageLink = interaction.options.getString("message");
      const { message, channel, error } = await fetchMessageFromLink(interaction.guild, messageLink);
      
      if (error) return interaction.followUp(error);

      if (message.editable) {
        await message.edit({ components: [] });
        return interaction.followUp("All components removed from the message!");
      } else {
        await channel.send({
          content: "✅ Components cleared from the referenced message.",
          reply: { messageReference: message.id, failIfNotExists: false }
        });
        return interaction.followUp("Cleared - message cannot be edited, but notification sent!");
      }
    }

    if (sub === "clear_row") {
      const messageLink = interaction.options.getString("message");
      const rowNum = interaction.options.getInteger("row");
      const { message, channel, error } = await fetchMessageFromLink(interaction.guild, messageLink);
      
      if (error) return interaction.followUp(error);

      if (message.editable) {
        const components = [...message.components];
        if (rowNum > components.length) {
          return interaction.followUp(`This message only has ${components.length} rows!`);
        }

        components.splice(rowNum - 1, 1);
        await message.edit({ components });
        return interaction.followUp(`Row ${rowNum} cleared!`);
      } else {
        await channel.send({
          content: `✅ Row ${rowNum} would be cleared.`,
          reply: { messageReference: message.id, failIfNotExists: false }
        });
        return interaction.followUp("Cleared - message cannot be edited, but notification sent!");
      }
    }

    return interaction.followUp("Unknown command!");
  },
};

async function fetchMessageFromLink(guild, messageLink) {
  const linkRegex = /https:\/\/(?:ptb\.|canary\.)?discord\.com\/channels\/(\d+)\/(\d+)\/(\d+)/;
  const match = messageLink.match(linkRegex);

  if (!match) {
    return { error: "Invalid message link! Please provide a valid Discord message link." };
  }

  const [, guildId, channelId, messageId] = match;

  if (guildId !== guild.id) {
    return { error: "The message link must be from this server!" };
  }

  const channel = guild.channels.cache.get(channelId);
  if (!channel) {
    return { error: "Could not find the channel!" };
  }

  try {
    const message = await channel.messages.fetch(messageId);
    return { message, channel };
  } catch {
    return { error: "Could not find the message! Make sure the link is correct." };
  }
}

async function addRoleButton(interaction, message, channel) {
  try {
    const label = interaction.options.getString("label");
    const role = interaction.options.getRole("role");
    const style = interaction.options.getString("style") || "Primary";
    const emoji = interaction.options.getString("emoji");

    const button = new ButtonBuilder()
      .setCustomId(`role_${role.id}`)
      .setLabel(label)
      .setStyle(ButtonStyle[style]);

    if (emoji) button.setEmoji(emoji);

    if (message.editable) {
      const components = [...message.components];
      let addedToExisting = false;

      for (let i = 0; i < components.length; i++) {
        const row = ActionRowBuilder.from(components[i]);
        if (row.components.length < 5 && row.components[0]?.data?.type === 2) {
          row.addComponents(button);
          components[i] = row;
          addedToExisting = true;
          break;
        }
      }

      if (!addedToExisting) {
        if (components.length >= 5) {
          return "Cannot add more components! Maximum 5 rows reached.";
        }
        components.push(new ActionRowBuilder().addComponents(button));
      }

      await message.edit({ components });
      return `Role button for ${role} added successfully!`;
    } else {
      const row = new ActionRowBuilder().addComponents(button);
      await channel.send({
        content: `Click below to get/remove the ${role} role:`,
        components: [row],
        reply: { messageReference: message.id, failIfNotExists: false }
      });
      return `Role button for ${role} created as a new message!`;
    }
  } catch (error) {
    console.error("Add Button Error:", error);
    return `Failed to add button: ${error.message}`;
  }
}

async function addLinkButton(interaction, message, channel) {
  try {
    const label = interaction.options.getString("label");
    const url = interaction.options.getString("url");
    const emoji = interaction.options.getString("emoji");

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return "URL must start with http:// or https://";
    }

    const button = new ButtonBuilder()
      .setLabel(label)
      .setStyle(ButtonStyle.Link)
      .setURL(url);

    if (emoji) button.setEmoji(emoji);

    if (message.editable) {
      const components = [...message.components];
      let addedToExisting = false;

      for (let i = 0; i < components.length; i++) {
        const row = ActionRowBuilder.from(components[i]);
        if (row.components.length < 5 && row.components[0]?.data?.type === 2) {
          row.addComponents(button);
          components[i] = row;
          addedToExisting = true;
          break;
        }
      }

      if (!addedToExisting) {
        if (components.length >= 5) {
          return "Cannot add more components! Maximum 5 rows reached.";
        }
        components.push(new ActionRowBuilder().addComponents(button));
      }

      await message.edit({ components });
      return `Link button added successfully!`;
    } else {
      const row = new ActionRowBuilder().addComponents(button);
      await channel.send({
        components: [row],
        reply: { messageReference: message.id, failIfNotExists: false }
      });
      return `Link button created as a new message!`;
    }
  } catch (error) {
    console.error("Add Link Button Error:", error);
    return `Failed to add link button: ${error.message}`;
  }
}

async function addRoleSelect(interaction, message, channel) {
  try {
    const placeholder = interaction.options.getString("placeholder") || "Select a role";
    const maxValues = interaction.options.getInteger("max_values") || 1;

    const select = new RoleSelectMenuBuilder()
      .setCustomId(`roleselect_${Date.now()}`)
      .setPlaceholder(placeholder)
      .setMaxValues(maxValues);

    const row = new ActionRowBuilder().addComponents(select);

    if (message.editable) {
      const components = [...message.components];
      if (components.length >= 5) {
        return "Cannot add more components! Maximum 5 rows reached.";
      }
      components.push(row);
      await message.edit({ components });
      return "Role select menu added successfully!";
    } else {
      await channel.send({
        content: "Select a role below:",
        components: [row],
        reply: { messageReference: message.id, failIfNotExists: false }
      });
      return "Role select menu created as a new message!";
    }
  } catch (error) {
    console.error("Add Role Select Error:", error);
    return `Failed to add role select: ${error.message}`;
  }
}

async function addUserSelect(interaction, message, channel) {
  try {
    const placeholder = interaction.options.getString("placeholder") || "Select a user";
    const maxValues = interaction.options.getInteger("max_values") || 1;

    const select = new UserSelectMenuBuilder()
      .setCustomId(`userselect_${Date.now()}`)
      .setPlaceholder(placeholder)
      .setMaxValues(maxValues);

    const row = new ActionRowBuilder().addComponents(select);

    if (message.editable) {
      const components = [...message.components];
      if (components.length >= 5) {
        return "Cannot add more components! Maximum 5 rows reached.";
      }
      components.push(row);
      await message.edit({ components });
      return "User select menu added successfully!";
    } else {
      await channel.send({
        content: "Select a user below:",
        components: [row],
        reply: { messageReference: message.id, failIfNotExists: false }
      });
      return "User select menu created as a new message!";
    }
  } catch (error) {
    console.error("Add User Select Error:", error);
    return `Failed to add user select: ${error.message}`;
  }
}

async function addChannelSelect(interaction, message, channel) {
  try {
    const placeholder = interaction.options.getString("placeholder") || "Select a channel";
    const maxValues = interaction.options.getInteger("max_values") || 1;

    const select = new ChannelSelectMenuBuilder()
      .setCustomId(`channelselect_${Date.now()}`)
      .setPlaceholder(placeholder)
      .setMaxValues(maxValues);

    const row = new ActionRowBuilder().addComponents(select);

    if (message.editable) {
      const components = [...message.components];
      if (components.length >= 5) {
        return "Cannot add more components! Maximum 5 rows reached.";
      }
      components.push(row);
      await message.edit({ components });
      return "Channel select menu added successfully!";
    } else {
      await channel.send({
        content: "Select a channel below:",
        components: [row],
        reply: { messageReference: message.id, failIfNotExists: false }
      });
      return "Channel select menu created as a new message!";
    }
  } catch (error) {
    console.error("Add Channel Select Error:", error);
    return `Failed to add channel select: ${error.message}`;
  }
}

async function addStringSelect(interaction, message, channel) {
  try {
    const placeholder = interaction.options.getString("placeholder");
    const optionsStr = interaction.options.getString("options");

    const options = optionsStr.split(",").map((opt, index) => {
      const parts = opt.trim().split(":");
      const option = {
        label: parts[0] || `Option ${index + 1}`,
        value: parts[1] || `option_${index + 1}`,
      };
      if (parts[2]) option.emoji = parts[2];
      return option;
    });

    if (options.length > 25) {
      return "Maximum 25 options allowed!";
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId(`stringselect_${Date.now()}`)
      .setPlaceholder(placeholder)
      .addOptions(options);

    const row = new ActionRowBuilder().addComponents(select);

    if (message.editable) {
      const components = [...message.components];
      if (components.length >= 5) {
        return "Cannot add more components! Maximum 5 rows reached.";
      }
      components.push(row);
      await message.edit({ components });
      return "String select menu added successfully!";
    } else {
      await channel.send({
        components: [row],
        reply: { messageReference: message.id, failIfNotExists: false }
      });
      return "String select menu created as a new message!";
    }
  } catch (error) {
    console.error("Add String Select Error:", error);
    return `Failed to add string select: ${error.message}`;
  }
              }
