const { ApplicationCommandOptionType, ChannelType } = require("discord.js");
const { getSettings } = require("@schemas/Guild");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "log_member_channel",
  description: "Sets the channel where member events are logged",
  category: "UTILITY",
  userPermissions: ["Administrator"],
  botPermissions: ["EmbedLinks"],
  command: {
    enabled: true,
    usage: "[channel]",
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "channel",
        description: "the channel to log member events",
        type: ApplicationCommandOptionType.Channel,
        channelTypes: [ChannelType.GuildText],
        required: false,
      },
    ],
  },

  async messageRun(message, args) {
    const channel = message.mentions.channels.first() || message.guild.channels.cache.get(args[0]);

    if (!channel) {
      return message.safeReply("Please provide a valid channel to set as the member log channel");
    }

    const settings = await getSettings(message.guild);
    settings.member_log_channel = channel.id;
    await settings.save();

    return message.safeReply(`✅ Member log channel set to ${channel}`);
  },

  async interactionRun(interaction) {
    const channel = interaction.options.getChannel("channel");

    if (!channel) {
      return interaction.followUp("Please provide a valid channel to set as the member log channel");
    }

    const settings = await getSettings(interaction.guild);
    settings.member_log_channel = channel.id;
    await settings.save();

    return interaction.followUp({ content: `✅ Member log channel set to ${channel}` });
  },
};
