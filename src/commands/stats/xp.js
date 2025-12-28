const { ApplicationCommandOptionType, ChannelType, AttachmentBuilder } = require("discord.js");
const { getMemberStats, getXpLb } = require("@schemas/MemberStats");
const canvacord = require("canvacord");
const path = require("path");

/**
 * @type {import("@structures/Command")}
 */
module.exports = {
  name: "levelup",
  description: "configure the levelling system or test the level up message",
  category: "STATS",
  userPermissions: ["ManageGuild"],
  command: {
    enabled: true,
    minArgsCount: 1,
    subcommands: [
      {
        trigger: "message <new-message>",
        description: "set custom level up message",
      },
      {
        trigger: "channel <#channel|off>",
        description: "set the channel to send level up messages to",
      },
      {
        trigger: "test",
        description: "test the level up message configuration",
      },
      {
        trigger: "profile [@member|id]",
        description: "display a member's rank card",
      },
    ],
  },
  slashCommand: {
    enabled: true,
    options: [
      {
        name: "message",
        description: "set custom level up message",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "message",
            description: "message to display when a user levels up",
            type: ApplicationCommandOptionType.String,
            required: true,
          },
        ],
      },
      {
        name: "channel",
        description: "set the channel to send level up messages to",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "channel",
            description: "channel to send level up messages to",
            type: ApplicationCommandOptionType.Channel,
            channelTypes: [ChannelType.GuildText],
            required: true,
          },
        ],
      },
      {
        name: "test",
        description: "test the level up message configuration",
        type: ApplicationCommandOptionType.Subcommand,
      },
      {
        name: "profile",
        description: "display a member's rank card",
        type: ApplicationCommandOptionType.Subcommand,
        options: [
          {
            name: "user",
            description: "target user",
            type: ApplicationCommandOptionType.User,
            required: false,
          },
        ],
      },
    ],
  },

  async messageRun(message, args, data) {
    const sub = args[0];
    const subcommandArgs = args.slice(1);
    let response;

    // message
    if (sub === "message") {
      const msg = subcommandArgs.join(" ");
      response = await setMessage(msg, data.settings);
    }

    // channel
    else if (sub === "channel") {
      const input = subcommandArgs[0];
      let channel;

      if (input === "off") channel = "off";
      else {
        const match = message.guild.findMatchingChannels(input);
        if (match.length === 0) return message.safeReply("Invalid channel. Please provide a valid channel");
        channel = match[0];
      }
      response = await setChannel(channel, data.settings);
    }

    // test
    else if (sub === "test") {
      response = await testLevelUp(message.member, data.settings);
    }

    // profile
    else if (sub === "profile") {
      const member = (await message.guild.resolveMember(subcommandArgs[0])) || message.member;
      response = await getProfile(member, data.settings);
    }

    // invalid
    else response = "Invalid subcommand";
    await message.safeReply(response);
  },

  async interactionRun(interaction, data) {
    const sub = interaction.options.getSubcommand();
    let response;

    if (sub === "message") response = await setMessage(interaction.options.getString("message"), data.settings);
    else if (sub === "channel") response = await setChannel(interaction.options.getChannel("channel"), data.settings);
    else if (sub === "test") response = await testLevelUp(interaction.member, data.settings);
    else if (sub === "profile") {
      const user = interaction.options.getUser("user") || interaction.user;
      const member = await interaction.guild.members.fetch(user);
      response = await getProfile(member, data.settings);
    }
    else response = "Invalid subcommand";

    await interaction.followUp(response);
  },
};

async function setMessage(message, settings) {
  if (!message) return "Invalid message. Please provide a message";
  settings.stats.xp.message = message;
  await settings.save();
  return `Configuration saved. Level up message updated!`;
}

async function setChannel(channel, settings) {
  if (!channel) return "Invalid channel. Please provide a channel";

  if (channel === "off") settings.stats.xp.channel = null;
  else settings.stats.xp.channel = channel.id;

  await settings.save();
  return `Configuration saved. Level up channel updated!`;
}

async function testLevelUp(member, settings) {
  const { parse } = require("@handlers/stats");
  let lvlUpMessage = settings.stats.xp.message;
  lvlUpMessage = parse(lvlUpMessage, member, 100);

  const xpChannel = settings.stats.xp.channel && member.guild.channels.cache.get(settings.stats.xp.channel);
  const targetChannel = xpChannel || member.guild.systemChannel || member.guild.channels.cache.find(c => c.type === ChannelType.GuildText);

  if (!targetChannel) return "Could not find a channel to send the test message to.";

  const card = await generateRankCard(member, 100, 0, true);
  if (card) {
    await targetChannel.safeSend({ content: lvlUpMessage, files: [card] });
  } else {
    await targetChannel.safeSend(lvlUpMessage);
  }

  return `Test message sent to ${targetChannel.toString()}`;
}

async function getProfile(member, settings) {
  if (!settings.stats.enabled) return "Stats Tracking is disabled on this server";
  const memberStats = await getMemberStats(member.guild.id, member.id);
  
  const level = memberStats?.level || 1;
  const xp = memberStats?.xp || 0;

  const card = await generateRankCard(member, level, xp);
  if (!card) return "Failed to generate rank card";

  return { files: [card] };
}

async function generateRankCard(member, level, xp, isLevelUp = false) {
  const { user } = member;
  const lb = await getXpLb(member.guild.id, 100);
  let pos = -1;
  lb.forEach((doc, i) => {
    if (doc.member_id == user.id) {
      pos = i + 1;
    }
  });

  const xpNeeded = level * level * 100;
  const rank = pos !== -1 ? pos : 0;

  const bgPath = isLevelUp 
    ? path.join(process.cwd(), "attached_assets/levelup_1766934035446.png")
    : path.join(process.cwd(), "attached_assets/rankcard_1766934035390.png");

  const fs = require("fs");
  const rankCard = new canvacord.RankCardBuilder()
    .setAvatar(user.displayAvatarURL({ extension: "png", size: 512 }))
    .setCurrentXP(xp)
    .setRequiredXP(xpNeeded)
    .setStatus(member.presence?.status || "offline")
    .setUsername(user.username)
    .setRank(rank)
    .setLevel(level)
    .setBackground(fs.readFileSync(bgPath));

  const data = await rankCard.build();
  return new AttachmentBuilder(data, { name: "rank.png" });
  }
