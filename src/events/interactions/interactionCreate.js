const { getSettings } = require("@schemas/Guild");
const { commandHandler, contextHandler, statsHandler, suggestionHandler, ticketHandler } = require("@src/handlers");
const { InteractionType, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle, AttachmentBuilder, InteractionResponseFlags } = require("discord.js");
const { QuickDB } = require("quick.db");
const db = new QuickDB({ filePath: "./database/verify.sqlite" });
const { createCanvas } = require('canvas');

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
    // Handle Verification Buttons
    if (interaction.customId === "verifylow") {
      await interaction.deferReply({ ephemeral: true });
      const config = await db.get(`verification.${interaction.guild.id}`);
      if (!config) return interaction.followUp({ content: "Verification system not set up!" });
      
      const member = interaction.member;
      const role = interaction.guild.roles.cache.get(config.Role);
      if (!role) return interaction.followUp({ content: "Verification role not found!" });

      try {
        await member.roles.add(role);
        return interaction.followUp({ content: "You have been verified!" });
      } catch (err) {
        return interaction.followUp({ content: "Failed to verify. Check permissions!" });
      }
    }

    if (interaction.customId === "verifymedium") {
      const captcha = Math.random().toString(36).substring(2, 8).toUpperCase();
      await db.set(`captcha_${interaction.user.id}`, captcha);

      const canvas = createCanvas(400, 150);
      const ctx = canvas.getContext('2d');
      
      // Gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#1a1a1a');
      gradient.addColorStop(1, '#2c2f33');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Distraction lines (background)
      for (let i = 0; i < 20; i++) {
        ctx.strokeStyle = `rgba(${Math.random() * 255},${Math.random() * 255},${Math.random() * 255}, 0.3)`;
        ctx.lineWidth = Math.random() * 3;
        ctx.beginPath();
        ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
        ctx.stroke();
      }

      // Draw text with variations
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const chars = captcha.split('');
      const startX = 60;
      const spacing = (canvas.width - 120) / (chars.length - 1);

      chars.forEach((char, i) => {
        const x = startX + i * spacing;
        const y = 75 + (Math.random() - 0.5) * 30;
        const angle = (Math.random() - 0.5) * 0.4;
        
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        
        // Random color for each character
        const colors = ['#FF5555', '#55FF55', '#5555FF', '#FFFF55', '#FF55FF', '#55FFFF', '#FFFFFF'];
        ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
        ctx.font = `bold ${50 + Math.random() * 10}px sans-serif`;
        
        ctx.fillText(char, 0, 0);
        ctx.restore();
      });

      // Distraction dots/noise (foreground)
      for (let i = 0; i < 100; i++) {
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.5})`;
        ctx.beginPath();
        ctx.arc(Math.random() * canvas.width, Math.random() * canvas.height, Math.random() * 2, 0, Math.PI * 2);
        ctx.fill();
      }

      const attachment = new AttachmentBuilder(canvas.toBuffer(), { name: 'captcha.png' });
      const embed = new EmbedBuilder()
        .setTitle("Verification Captcha")
        .setDescription("Please click the button below and type the code shown in the image.")
        .setImage('attachment://captcha.png')
        .setColor("#20be30");

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("captcha_input_btn").setLabel("Enter Code").setStyle(ButtonStyle.Primary)
      );

      return interaction.reply({ embeds: [embed], files: [attachment], components: [row], flags: [InteractionResponseFlags.Ephemeral] });
    }

    if (interaction.customId === "captcha_input_btn") {
        const modal = new ModalBuilder().setCustomId("captcha_modal").setTitle("Verification");
        const input = new TextInputBuilder()
            .setCustomId("captcha_text")
            .setLabel("Enter the code from the image")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
            .setMinLength(6)
            .setMaxLength(6);
        modal.addComponents(new ActionRowBuilder().addComponents(input));
        return interaction.showModal(modal);
    }

    if (interaction.customId === "verifyhigh") {
      const modal = new ModalBuilder().setCustomId("verify_modal").setTitle("Verification");
      const input = new TextInputBuilder()
        .setCustomId("captcha_input")
        .setLabel("Type 'VERIFY' to continue")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);
      modal.addComponents(new ActionRowBuilder().addComponents(input));
      return interaction.showModal(modal);
    }

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
    if (interaction.customId === "captcha_modal") {
        const input = interaction.fields.getTextInputValue("captcha_text").toUpperCase();
        const captcha = await db.get(`captcha_${interaction.user.id}`);
        
        if (input === captcha) {
            await db.delete(`captcha_${interaction.user.id}`);
            const config = await db.get(`verification.${interaction.guild.id}`);
            const role = interaction.guild.roles.cache.get(config?.Role);
            if (role) await interaction.member.roles.add(role).catch(() => {});
            return interaction.reply({ content: "Verified successfully!", ephemeral: true });
        } else {
            return interaction.reply({ content: "Incorrect code! Please try again.", ephemeral: true });
        }
    }

    if (interaction.customId === "verify_modal") {
      const input = interaction.fields.getTextInputValue("captcha_input");
      if (input.toUpperCase() === "VERIFY") {
        const config = await db.get(`verification.${interaction.guild.id}`);
        const role = interaction.guild.roles.cache.get(config?.Role);
        if (role) await interaction.member.roles.add(role).catch(() => {});
        return interaction.reply({ content: "Verified!", ephemeral: true });
      }
      return interaction.reply({ content: "Incorrect input!", ephemeral: true });
    }

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
