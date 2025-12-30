 const { ApplicationCommandType, PermissionsBitField, ApplicationCommandOptionType, ButtonStyle, ButtonBuilder, ActionRowBuilder, EmbedBuilder, StringSelectMenuBuilder, ChannelType, AttachmentBuilder } = require('discord.js');
const { QuickDB } = require("quick.db");
const db = new QuickDB({ filePath: "./database/verify.sqlite" });
const { createCanvas } = require('canvas');

module.exports = {
    name: 'setup-verification',
    description: 'Set up the verification system for this server.',
    category: 'MODERATION',
    userPermissions: ['ManageGuild'],
    command: {
        enabled: true,
        usage: '<role> [channel]',
        minArgsCount: 1,
    },
    slashCommand: {
        enabled: true,
        ephemeral: true,
        options: [
            {
                name: 'role',
                description: 'The role you want to add to verified users.',
                type: ApplicationCommandOptionType.Role,
                required: true
            },
            {
                name: 'channel',
                description: 'The channel where the verification message will be sent.',
                type: ApplicationCommandOptionType.Channel,
                required: false,
                channelTypes: [ChannelType.GuildText], 
            }
        ],
    },

    async messageRun(message, args) {
        const role = message.mentions.roles.first() || message.guild.roles.cache.get(args[0]);
        const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[1]) || message.channel;

        if (!role) return message.reply("Please provide a valid role.");

        await db.set(`verification.${message.guild.id}`, { Role: role.id, Channel: channel.id, Verified: [] });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('verification_level')
            .setPlaceholder('Select verification level')
            .addOptions(
                { label: 'Low', value: 'low', emoji:'🔴', description: 'Click the button to verify' },
                { label: 'Medium', value: 'medium', emoji:'🟡', description: 'Verification with buttons Captcha' },
                { label: 'High', value: 'high', emoji:'🟢', description: 'Verification with Modal Captcha' }
            );

        const verify = new EmbedBuilder()
            .setColor('#20be30')
            .setTitle('• Verification Select verification level')
            .setAuthor({ name: `✅ Verification Process` })
            .setFooter({ text: `Powered by C4 Clan Community`, iconURL: message.guild.iconURL() });

        const msg = await message.reply({ content: `Your **verification system** has been set up!`, embeds: [verify], components: [new ActionRowBuilder().addComponents(selectMenu)] });
        
        const filter = (i) => i.customId === 'verification_level' && i.user.id === message.author.id;
        const collector = msg.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async (i) => {
            const level = i.values[0];
            const verifyEmbed = new EmbedBuilder()
                .setColor('#20be30')
                .setThumbnail(i.guild.iconURL())
                .setTimestamp()
                .setTitle('• Verification Message')
                .setDescription('Please click the button \`Verify\` below to verify.')
                .setAuthor({ name: `✅ Verification Process` })
                .setFooter({ text: `✅ Verification Prompt` });

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`verify${level}`).setLabel('✅ Verify').setStyle(ButtonStyle.Success)
            );

            await channel.send({ embeds: [verifyEmbed], components: [buttons] });
            await i.update({ content: `Your **verification system ${level}** has been set up!`, embeds: [], components: [] });
        });
    },

    async interactionRun(interaction) {
        const role = interaction.options.getRole('role');
        const channel = interaction.options.getChannel('channel') || interaction.channel;

        await db.set(`verification.${interaction.guild.id}`, { Role: role.id, Channel: channel.id, Verified: [] });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('verification_level')
            .setPlaceholder('Select verification level')
            .addOptions(
                { label: 'Low', value: 'low', emoji:'🔴', description: 'Click the button to verify' },
                { label: 'Medium', value: 'medium', emoji:'🟡', description: 'Verification with buttons Captcha' },
                { label: 'High', value: 'high', emoji:'🟢', description: 'Verification with Modal Captcha' }
            );

        const verify = new EmbedBuilder()
            .setColor('#20be30')
            .setTitle('• Verification Select verification level')
            .setAuthor({ name: `✅ Verification Process` })
            .setFooter({ text: `Powered by C4 Clan Community`, iconURL: interaction.guild.iconURL() });

        const msg = await interaction.reply({ content: `Your **verification system** has been set up!`, embeds: [verify], components: [new ActionRowBuilder().addComponents(selectMenu)], ephemeral: true, fetchReply: true });

        const filter = (i) => i.customId === 'verification_level' && i.user.id === interaction.user.id;
        const collector = msg.createMessageComponentCollector({ filter, time: 60000 });

        collector.on('collect', async (i) => {
            const level = i.values[0];
            const verifyEmbed = new EmbedBuilder()
                .setColor('#20be30')
                .setThumbnail(i.guild.iconURL())
                .setTimestamp()
                .setTitle('• Verification Message')
                .setDescription('Please click the button \`Verify\` below to verify.')
                .setAuthor({ name: `✅ Verification Process` })
                .setFooter({ text: `✅ Verification Prompt` });

            const buttons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`verify${level}`).setLabel('✅ Verify').setStyle(ButtonStyle.Success)
            );

            await channel.send({ embeds: [verifyEmbed], components: [buttons] });
            await i.update({ content: `Your **verification system ${level}** has been set up!`, embeds: [], components: [] });
        });
    }
};