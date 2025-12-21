const { ApplicationCommandOptionType, EmbedBuilder } = require("discord.js");
const { EMBED_COLORS } = require("@root/config");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "unlock",
  description: "Unlocks a channel to allow members to send messages",
  category: "MODERATION",
  botPermissions: ["ManageChannels"],
  userPermissions: ["ManageChannels"],
  command: {
    enabled: true,
    usage: "[channel] [reason]",
    minArgsCount: 0,
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "channel",
        description: "The channel to unlock (defaults to current channel)",
        type: ApplicationCommandOptionType.Channel,
        required: false,
      },
      {
        name: "reason",
        description: "Reason for unlocking the channel",
        type: ApplicationCommandOptionType.String,
        required: false,
      },
    ],
  },

  async messageRun(message, args) {
    let channel = message.mentions.channels.first() || message.channel;
    
    // Check if first arg is a channel mention/ID
    if (args[0]) {
      const mentioned = message.mentions.channels.first();
      if (mentioned) {
        channel = mentioned;
        args.shift();
      }
    }
    
    const reason = args.join(" ") || "No reason provided";
    const response = await unlockChannel(channel, reason, message.author);
    await message.safeReply(response);
  },

  async interactionRun(interaction) {
    const channel = interaction.options.getChannel("channel") || interaction.channel;
    const reason = interaction.options.getString("reason") || "No reason provided";
    const response = await unlockChannel(channel, reason, interaction.user);
    await interaction.followUp(response);
  },
};

async function unlockChannel(channel, reason, user) {
  try {
    const everyone = channel.guild.roles.everyone;
    
    // Check current permissions
    const currentOverwrite = channel.permissionOverwrites.cache.get(everyone.id);
    
    // If not locked, inform user
    if (!currentOverwrite?.deny?.has("SendMessages")) {
      return {
        embeds: [
          new EmbedBuilder()
            .setColor(EMBED_COLORS.WARNING)
            .setDescription(`🔓 ${channel} is already unlocked!`),
        ],
      };
    }

    // Unlock the channel - remove the deny permission
    await channel.permissionOverwrites.edit(everyone, {
      SendMessages: null, // Remove the deny permission
    });

    // Create embed response
    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.SUCCESS)
      .setDescription(`🔓 **${channel} has been unlocked!**`)
      .addFields(
        { name: "Reason", value: reason || "No reason provided", inline: false },
        { name: "Unlocked by", value: user.tag, inline: true },
        { name: "Timestamp", value: new Date().toLocaleString(), inline: true }
      )
      .setTimestamp();

    return { embeds: [embed] };
  } catch (error) {
    console.error("Unlock command error:", error);
    return {
      embeds: [
        new EmbedBuilder()
          .setColor(EMBED_COLORS.ERROR)
          .setDescription(`❌ Failed to unlock the channel: ${error.message}`),
      ],
    };
  }
}
