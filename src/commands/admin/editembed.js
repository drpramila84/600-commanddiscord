const {
  ApplicationCommandOptionType,
  ModalBuilder,
  ActionRowBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  EmbedBuilder,
} = require("discord.js");
const { isValidColor, isHex } = require("@helpers/Utils");
const { EMBED_COLORS } = require("@root/config");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "editembed",
  description: "Edit an embed message",
  category: "ADMIN",
  userPermissions: ["ManageMessages"],
  command: {
    enabled: true,
    usage: "<messageID|reply>",
    minArgsCount: 0,
    aliases: ["embededit"],
  },
  slashCommand: {
    enabled: true,
    ephemeral: true,
    options: [
      {
        name: "message_id",
        description: "ID of the message with the embed to edit",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
    ],
  },

  async messageRun(message, args) {
    // Check if replying to a message
    if (message.reference) {
      const repliedTo = await message.channel.messages.fetch(message.reference.messageId).catch(() => null);
      if (!repliedTo) return message.reply("Could not find the message to edit");
      if (!repliedTo.embeds.length) return message.reply("That message doesn't have an embed");
      await editEmbedSetup(repliedTo, message.member, message.channel);
      return message.react("✅");
    }

    // Check if message ID provided
    if (args[0]) {
      const targetMsg = await message.channel.messages.fetch(args[0]).catch(() => null);
      if (!targetMsg) return message.reply("Could not find a message with that ID");
      if (!targetMsg.embeds.length) return message.reply("That message doesn't have an embed");
      await editEmbedSetup(targetMsg, message.member, message.channel);
      return message.react("✅");
    }

    return message.reply("Please reply to a message with an embed or provide a message ID");
  },

  async interactionRun(interaction) {
    const messageId = interaction.options.getString("message_id");

    let targetMsg;
    if (messageId) {
      targetMsg = await interaction.channel.messages.fetch(messageId).catch(() => null);
      if (!targetMsg) return interaction.followUp("Could not find a message with that ID");
    } else {
      return interaction.followUp("Please provide a message ID or reply to a message with an embed");
    }

    if (!targetMsg.embeds.length) return interaction.followUp("That message doesn't have an embed");
    
    await editEmbedSetup(targetMsg, interaction.member, interaction.channel);
    await interaction.followUp("Embed edit started ✅");
  },
};

/**
 * @param {import('discord.js').Message} targetMsg
 * @param {import('discord.js').GuildMember} member
 * @param {import('discord.js').TextChannel} channel
 */
async function editEmbedSetup(targetMsg, member, channel) {
  // Get the first embed from the target message
  const originalEmbed = targetMsg.embeds[0];
  let embed = EmbedBuilder.from(originalEmbed);

  // Send edit menu
  const sentMsg = await channel.send({
    content: "Choose what to edit:",
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("EDIT_TITLE").setLabel("Edit Title").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("EDIT_DESC").setLabel("Edit Description").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("EDIT_COLOR").setLabel("Edit Color").setStyle(ButtonStyle.Primary)
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("EDIT_AUTHOR").setLabel("Edit Author").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("EDIT_FOOTER").setLabel("Edit Footer").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("EDIT_FIELDS").setLabel("Edit Fields").setStyle(ButtonStyle.Primary)
      ),
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("EDIT_DONE").setLabel("✅ Done").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("EDIT_CANCEL").setLabel("❌ Cancel").setStyle(ButtonStyle.Danger)
      ),
    ],
  });

  const collector = channel.createMessageComponentCollector({
    componentType: ComponentType.Button,
    filter: (i) => i.member.id === member.id,
    time: 10 * 60 * 1000,
  });

  collector.on("collect", async (interaction) => {
    if (interaction.customId === "EDIT_TITLE") {
      await interaction.showModal(
        new ModalBuilder({
          customId: "EDIT_TITLE_MODAL",
          title: "Edit Title",
          components: [
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("title")
                .setLabel("Embed Title")
                .setStyle(TextInputStyle.Short)
                .setValue(embed.data.title || "")
                .setRequired(false)
            ),
          ],
        })
      );

      const modal = await interaction
        .awaitModalSubmit({ time: 5 * 60 * 1000, filter: (m) => m.member.id === member.id })
        .catch(() => null);

      if (modal) {
        const title = modal.fields.getTextInputValue("title");
        if (title) embed.setTitle(title);
        else embed.setTitle(null);
        modal.reply({ content: "Title updated ✅", ephemeral: true });
      }
    }

    if (interaction.customId === "EDIT_DESC") {
      await interaction.showModal(
        new ModalBuilder({
          customId: "EDIT_DESC_MODAL",
          title: "Edit Description",
          components: [
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("description")
                .setLabel("Embed Description")
                .setStyle(TextInputStyle.Paragraph)
                .setValue(embed.data.description || "")
                .setRequired(false)
            ),
          ],
        })
      );

      const modal = await interaction
        .awaitModalSubmit({ time: 5 * 60 * 1000, filter: (m) => m.member.id === member.id })
        .catch(() => null);

      if (modal) {
        const description = modal.fields.getTextInputValue("description");
        if (description) embed.setDescription(description);
        else embed.setDescription(null);
        modal.reply({ content: "Description updated ✅", ephemeral: true });
      }
    }

    if (interaction.customId === "EDIT_COLOR") {
      await interaction.showModal(
        new ModalBuilder({
          customId: "EDIT_COLOR_MODAL",
          title: "Edit Color",
          components: [
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("color")
                .setLabel("Color (hex: #FF5733 or name: red)")
                .setStyle(TextInputStyle.Short)
                .setValue(embed.data.color?.toString(16).padStart(6, "0") || "")
                .setRequired(false)
            ),
          ],
        })
      );

      const modal = await interaction
        .awaitModalSubmit({ time: 5 * 60 * 1000, filter: (m) => m.member.id === member.id })
        .catch(() => null);

      if (modal) {
        const color = modal.fields.getTextInputValue("color");
        if (color && (isValidColor(color) || isHex(color))) {
          embed.setColor(color);
          modal.reply({ content: "Color updated ✅", ephemeral: true });
        } else {
          modal.reply({ content: "Invalid color format! Use hex (#FF5733) or color names", ephemeral: true });
        }
      }
    }

    if (interaction.customId === "EDIT_AUTHOR") {
      await interaction.showModal(
        new ModalBuilder({
          customId: "EDIT_AUTHOR_MODAL",
          title: "Edit Author",
          components: [
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("author")
                .setLabel("Author Name")
                .setStyle(TextInputStyle.Short)
                .setValue(embed.data.author?.name || "")
                .setRequired(false)
            ),
          ],
        })
      );

      const modal = await interaction
        .awaitModalSubmit({ time: 5 * 60 * 1000, filter: (m) => m.member.id === member.id })
        .catch(() => null);

      if (modal) {
        const author = modal.fields.getTextInputValue("author");
        if (author) embed.setAuthor({ name: author });
        else embed.setAuthor(null);
        modal.reply({ content: "Author updated ✅", ephemeral: true });
      }
    }

    if (interaction.customId === "EDIT_FOOTER") {
      await interaction.showModal(
        new ModalBuilder({
          customId: "EDIT_FOOTER_MODAL",
          title: "Edit Footer",
          components: [
            new ActionRowBuilder().addComponents(
              new TextInputBuilder()
                .setCustomId("footer")
                .setLabel("Footer Text")
                .setStyle(TextInputStyle.Short)
                .setValue(embed.data.footer?.text || "")
                .setRequired(false)
            ),
          ],
        })
      );

      const modal = await interaction
        .awaitModalSubmit({ time: 5 * 60 * 1000, filter: (m) => m.member.id === member.id })
        .catch(() => null);

      if (modal) {
        const footer = modal.fields.getTextInputValue("footer");
        if (footer) embed.setFooter({ text: footer });
        else embed.setFooter(null);
        modal.reply({ content: "Footer updated ✅", ephemeral: true });
      }
    }

    if (interaction.customId === "EDIT_FIELDS") {
      const fieldRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("FIELD_ADD").setLabel("Add Field").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("FIELD_REMOVE").setLabel("Remove Field").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("FIELD_DONE").setLabel("Done").setStyle(ButtonStyle.Primary)
      );

      await interaction.reply({
        content: "Field management. Click buttons below:",
        components: [fieldRow],
        ephemeral: true,
      });

      const fieldCollector = channel.createMessageComponentCollector({
        componentType: ComponentType.Button,
        filter: (i) => i.member.id === member.id && (i.customId === "FIELD_ADD" || i.customId === "FIELD_REMOVE" || i.customId === "FIELD_DONE"),
        time: 5 * 60 * 1000,
      });

      fieldCollector.on("collect", async (fieldInteraction) => {
        if (fieldInteraction.customId === "FIELD_ADD") {
          await fieldInteraction.showModal(
            new ModalBuilder({
              customId: "FIELD_ADD_MODAL",
              title: "Add Field",
              components: [
                new ActionRowBuilder().addComponents(
                  new TextInputBuilder()
                    .setCustomId("name")
                    .setLabel("Field Name")
                    .setStyle(TextInputStyle.Short)
                    .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                  new TextInputBuilder()
                    .setCustomId("value")
                    .setLabel("Field Value")
                    .setStyle(TextInputStyle.Paragraph)
                    .setRequired(true)
                ),
                new ActionRowBuilder().addComponents(
                  new TextInputBuilder()
                    .setCustomId("inline")
                    .setLabel("Inline? (true/false)")
                    .setStyle(TextInputStyle.Short)
                    .setValue("true")
                    .setRequired(true)
                ),
              ],
            })
          );

          const modal = await fieldInteraction
            .awaitModalSubmit({ time: 5 * 60 * 1000, filter: (m) => m.member.id === member.id })
            .catch(() => null);

          if (modal) {
            const name = modal.fields.getTextInputValue("name");
            const value = modal.fields.getTextInputValue("value");
            let inline = modal.fields.getTextInputValue("inline").toLowerCase() === "true";

            const fields = embed.data.fields || [];
            fields.push({ name, value, inline });
            embed.setFields(fields);
            modal.reply({ content: "Field added ✅", ephemeral: true });
          }
        }

        if (fieldInteraction.customId === "FIELD_REMOVE") {
          const fields = embed.data.fields;
          if (fields && fields.length > 0) {
            fields.pop();
            embed.setFields(fields);
            fieldInteraction.reply({ content: "Last field removed ✅", ephemeral: true });
          } else {
            fieldInteraction.reply({ content: "No fields to remove", ephemeral: true });
          }
        }

        if (fieldInteraction.customId === "FIELD_DONE") {
          fieldCollector.stop();
          fieldInteraction.reply({ content: "Field editing complete ✅", ephemeral: true });
        }
      });
    }

    if (interaction.customId === "EDIT_DONE") {
      await targetMsg.edit({ embeds: [embed] });
      await sentMsg.edit({
        content: "✅ Embed updated successfully!",
        components: [],
      });
      collector.stop();
      return interaction.reply({ content: "Embed saved ✅", ephemeral: true });
    }

    if (interaction.customId === "EDIT_CANCEL") {
      await sentMsg.edit({
        content: "❌ Edit cancelled",
        components: [],
      });
      collector.stop();
      return interaction.reply({ content: "Edit cancelled", ephemeral: true });
    }

    // Update preview after edits
    await sentMsg.edit({ embeds: [embed] });
  });

  collector.on("end", async () => {
    try {
      await sentMsg.edit({ components: [] });
    } catch (e) {}
  });
}
