const { SlashCommandBuilder } = require('discord.js');
const emojis = require('../../config/emojis');

module.exports = {
    name: 'say',
    data: new SlashCommandBuilder()
        .setName('say')
        .setDescription('Make the bot say a message.')
        .addStringOption(option =>
            option.setName('message')
                .setDescription('The message to send')
                .setRequired(true)
                .setMaxLength(2000)),

    async execute(interaction) {
        try {
            const message = interaction.options.getString('message');
            await interaction.channel.send(message);
            await interaction.reply({ content: `${emojis.success} Message sent!`, ephemeral: true });
        } catch (error) {
            console.error('Say command error:', error);
            await interaction.reply({ content: `${emojis.error} Failed to send message!`, ephemeral: true });
        }
    },

    async prefixRun(message, args) {
        try {
            const msg = args.join(' ');
            if (!msg) {
                return message.reply(`${emojis.warning} Please provide a message to send.`);
            }
            await message.channel.send(msg);
        } catch (error) {
            console.error('Say command error:', error);
            await message.reply(`${emojis.error} Failed to send message!`);
        }
    }
};
