const { getSettings } = require("@schemas/Guild");
const { commandHandler, contextHandler, statsHandler, suggestionHandler, ticketHandler } = require("@src/handlers");
const { InteractionType } = require("discord.js");

/**
 * @param {import('@src/structures').BotClient} client
 * @param {import('discord.js').BaseInteraction} interaction
 */
module.exports = async (client, interaction) => {
  if (!interaction.guild) {
    return interaction
      .reply({ content: "Command can only be executed in a discord server", ephemeral: true })
      .catch(() => {});
  }

  // Slash Commands
  if (interaction.isChatInputCommand()) {
    await commandHandler.handleSlashCommand(interaction);
  }

  // Context Menu
  else if (interaction.isContextMenuCommand()) {
    const context = client.contextMenus.get(interaction.commandName);
    if (context) await contextHandler.handleContext(interaction, context);
    else return interaction.reply({ content: "An error has occurred", ephemeral: true }).catch(() => {});
  }

  // Buttons
  else if (interaction.isButton()) {
    // Handle role buttons from /buttons command
    if (interaction.customId.startsWith("role_")) {
      const roleId = interaction.customId.replace("role_", "");
      const role = interaction.guild.roles.cache.get(roleId);
      
      if (!role) {
        return interaction.reply({ content: "This role no longer exists!", ephemeral: true }).catch(() => {});
      }
      
      const member = interaction.member;
      try {
        if (member.roles.cache.has(roleId)) {
          await member.roles.remove(roleId);
          return interaction.reply({ content: `Removed role ${role.name}!`, ephemeral: true }).catch(() => {});
        } else {
          await member.roles.add(roleId);
          return interaction.reply({ content: `Added role ${role.name}!`, ephemeral: true }).catch(() => {});
        }
      } catch (error) {
        return interaction.reply({ content: "Failed to update your roles. I may not have permission.", ephemeral: true }).catch(() => {});
      }
    }

    switch (interaction.customId) {
      case "TICKET_CREATE":
        return ticketHandler.handleTicketOpen(interaction);

      case "TICKET_CLOSE":
        return ticketHandler.handleTicketClose(interaction);

      case "SUGGEST_APPROVE":
        return suggestionHandler.handleApproveBtn(interaction);

      case "SUGGEST_REJECT":
        return suggestionHandler.handleRejectBtn(interaction);

      case "SUGGEST_DELETE":
        return suggestionHandler.handleDeleteBtn(interaction);
    }
  }

  // Modals
  else if (interaction.type === InteractionType.ModalSubmit) {
    switch (interaction.customId) {
      case "SUGGEST_APPROVE_MODAL":
        return suggestionHandler.handleApproveModal(interaction);

      case "SUGGEST_REJECT_MODAL":
        return suggestionHandler.handleRejectModal(interaction);

      case "SUGGEST_DELETE_MODAL":
        return suggestionHandler.handleDeleteModal(interaction);
    }
  }

  const settings = await getSettings(interaction.guild);

  // track stats
  if (settings.stats.enabled) statsHandler.trackInteractionStats(interaction).catch(() => {});
};
