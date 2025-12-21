const { EmbedBuilder, AuditLogEvent } = require("discord.js");
const { getSettings } = require("@schemas/Guild");
const { EMBED_COLORS } = require("@root/config");

const actionTracker = new Map();
const raidTracker = new Map();

function getActionKey(guildId, userId, actionType) {
  return `${guildId}-${userId}-${actionType}`;
}

function getRaidKey(guildId) {
  return `raid-${guildId}`;
}

function trackAction(guildId, userId, actionType, timeWindow) {
  const key = getActionKey(guildId, userId, actionType);
  const now = Date.now();

  if (!actionTracker.has(key)) {
    actionTracker.set(key, []);
  }

  const actions = actionTracker.get(key);
  actions.push(now);

  const windowMs = timeWindow * 1000;
  const filtered = actions.filter((time) => now - time < windowMs);
  actionTracker.set(key, filtered);

  return filtered.length;
}

function clearActions(guildId, userId, actionType) {
  const key = getActionKey(guildId, userId, actionType);
  actionTracker.delete(key);
}

function trackRaidJoin(guildId, timeWindow = 10) {
  const key = getRaidKey(guildId);
  const now = Date.now();

  if (!raidTracker.has(key)) {
    raidTracker.set(key, []);
  }

  const joins = raidTracker.get(key);
  joins.push(now);

  const windowMs = timeWindow * 1000;
  const filtered = joins.filter((time) => now - time < windowMs);
  raidTracker.set(key, filtered);

  return filtered.length;
}

function clearRaidJoins(guildId) {
  const key = getRaidKey(guildId);
  raidTracker.delete(key);
}

async function sendLog(guild, settings, embed) {
  if (!settings.antinuke?.log_channel) return;

  try {
    const channel = guild.channels.cache.get(settings.antinuke.log_channel);
    if (channel && channel.canSendEmbeds()) {
      await channel.send({ embeds: [embed] });
    }
  } catch (error) {
    guild.client.logger.error("Antinuke log error:", error);
  }
}

async function punishUser(guild, userId, settings, reason) {
  const punishment = settings.antinuke?.punishment || "REMOVE_ROLES";
  const member = await guild.members.fetch(userId).catch(() => null);

  if (!member) return;

  try {
    if (punishment === "BAN") {
      await guild.members.ban(userId, { reason: `[Antinuke] ${reason}` });
      return "banned";
    } else if (punishment === "KICK") {
      await member.kick(`[Antinuke] ${reason}`);
      return "kicked";
    } else {
      const roles = member.roles.cache.filter((role) => role.id !== guild.id);
      await member.roles.remove(roles, `[Antinuke] ${reason}`);
      return "roles removed";
    }
  } catch (error) {
    guild.client.logger.error("Antinuke punishment error:", error);
    return "failed";
  }
}

function isWhitelisted(settings, userId, guild) {
  if (userId === guild.ownerId) return true;
  if (userId === guild.client.user.id) return true;
  return settings.antinuke?.whitelist?.includes(userId) || false;
}

async function getAuditExecutor(guild, eventType) {
  try {
    const auditLogs = await guild.fetchAuditLogs({
      limit: 1,
      type: eventType,
    });
    const entry = auditLogs.entries.first();
    if (entry && Date.now() - entry.createdTimestamp < 5000) {
      return entry.executor;
    }
  } catch (error) {
    guild.client.logger.error("Antinuke audit fetch error:", error);
  }
  return null;
}

module.exports = (client) => {
  client.on("guildBanAdd", async (ban) => {
    const settings = await getSettings(ban.guild);
    if (!settings.antinuke?.enabled || !settings.antinuke?.anti_ban) return;

    const executor = await getAuditExecutor(ban.guild, AuditLogEvent.MemberBanAdd);
    if (!executor || isWhitelisted(settings, executor.id, ban.guild)) return;

    const threshold = settings.antinuke?.ban_threshold || 3;
    const timeWindow = settings.antinuke?.time_window || 10;
    const count = trackAction(ban.guild.id, executor.id, "ban", timeWindow);

    if (count >= threshold) {
      const result = await punishUser(ban.guild, executor.id, settings, "Mass banning detected");
      clearActions(ban.guild.id, executor.id, "ban");

      const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.ERROR)
        .setTitle("Antinuke: Mass Ban Detected")
        .setDescription(`**${executor.tag}** was ${result} for mass banning members`)
        .addFields(
          { name: "Executor", value: `${executor.tag} (${executor.id})`, inline: true },
          { name: "Actions", value: `${count} bans in ${timeWindow}s`, inline: true }
        )
        .setTimestamp();

      await sendLog(ban.guild, settings, embed);
    }
  });

  client.on("guildMemberRemove", async (member) => {
    const settings = await getSettings(member.guild);
    if (!settings.antinuke?.enabled || !settings.antinuke?.anti_kick) return;

    const executor = await getAuditExecutor(member.guild, AuditLogEvent.MemberKick);
    if (!executor || isWhitelisted(settings, executor.id, member.guild)) return;

    const threshold = settings.antinuke?.kick_threshold || 3;
    const timeWindow = settings.antinuke?.time_window || 10;
    const count = trackAction(member.guild.id, executor.id, "kick", timeWindow);

    if (count >= threshold) {
      const result = await punishUser(member.guild, executor.id, settings, "Mass kicking detected");
      clearActions(member.guild.id, executor.id, "kick");

      const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.ERROR)
        .setTitle("Antinuke: Mass Kick Detected")
        .setDescription(`**${executor.tag}** was ${result} for mass kicking members`)
        .addFields(
          { name: "Executor", value: `${executor.tag} (${executor.id})`, inline: true },
          { name: "Actions", value: `${count} kicks in ${timeWindow}s`, inline: true }
        )
        .setTimestamp();

      await sendLog(member.guild, settings, embed);
    }
  });

  client.on("channelDelete", async (channel) => {
    if (!channel.guild) return;
    const settings = await getSettings(channel.guild);
    if (!settings.antinuke?.enabled || !settings.antinuke?.anti_channel_delete) return;

    const executor = await getAuditExecutor(channel.guild, AuditLogEvent.ChannelDelete);
    if (!executor || isWhitelisted(settings, executor.id, channel.guild)) return;

    const threshold = settings.antinuke?.channel_threshold || 3;
    const timeWindow = settings.antinuke?.time_window || 10;
    const count = trackAction(channel.guild.id, executor.id, "channel_delete", timeWindow);

    if (count >= threshold) {
      const result = await punishUser(channel.guild, executor.id, settings, "Mass channel deletion detected");
      clearActions(channel.guild.id, executor.id, "channel_delete");

      const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.ERROR)
        .setTitle("Antinuke: Mass Channel Delete Detected")
        .setDescription(`**${executor.tag}** was ${result} for mass deleting channels`)
        .addFields(
          { name: "Executor", value: `${executor.tag} (${executor.id})`, inline: true },
          { name: "Actions", value: `${count} deletions in ${timeWindow}s`, inline: true }
        )
        .setTimestamp();

      await sendLog(channel.guild, settings, embed);
    }
  });

  client.on("channelCreate", async (channel) => {
    if (!channel.guild) return;
    const settings = await getSettings(channel.guild);
    if (!settings.antinuke?.enabled || !settings.antinuke?.anti_channel_create) return;

    const executor = await getAuditExecutor(channel.guild, AuditLogEvent.ChannelCreate);
    if (!executor || isWhitelisted(settings, executor.id, channel.guild)) return;

    const threshold = settings.antinuke?.channel_threshold || 3;
    const timeWindow = settings.antinuke?.time_window || 10;
    const count = trackAction(channel.guild.id, executor.id, "channel_create", timeWindow);

    if (count >= threshold) {
      await channel.delete("[Antinuke] Mass channel creation").catch(() => {});
      const result = await punishUser(channel.guild, executor.id, settings, "Mass channel creation detected");
      clearActions(channel.guild.id, executor.id, "channel_create");

      const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.ERROR)
        .setTitle("Antinuke: Mass Channel Create Detected")
        .setDescription(`**${executor.tag}** was ${result} for mass creating channels`)
        .addFields(
          { name: "Executor", value: `${executor.tag} (${executor.id})`, inline: true },
          { name: "Actions", value: `${count} creations in ${timeWindow}s`, inline: true }
        )
        .setTimestamp();

      await sendLog(channel.guild, settings, embed);
    }
  });

  client.on("roleDelete", async (role) => {
    const settings = await getSettings(role.guild);
    if (!settings.antinuke?.enabled || !settings.antinuke?.anti_role_delete) return;

    const executor = await getAuditExecutor(role.guild, AuditLogEvent.RoleDelete);
    if (!executor || isWhitelisted(settings, executor.id, role.guild)) return;

    const threshold = settings.antinuke?.role_threshold || 3;
    const timeWindow = settings.antinuke?.time_window || 10;
    const count = trackAction(role.guild.id, executor.id, "role_delete", timeWindow);

    if (count >= threshold) {
      const result = await punishUser(role.guild, executor.id, settings, "Mass role deletion detected");
      clearActions(role.guild.id, executor.id, "role_delete");

      const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.ERROR)
        .setTitle("Antinuke: Mass Role Delete Detected")
        .setDescription(`**${executor.tag}** was ${result} for mass deleting roles`)
        .addFields(
          { name: "Executor", value: `${executor.tag} (${executor.id})`, inline: true },
          { name: "Actions", value: `${count} deletions in ${timeWindow}s`, inline: true }
        )
        .setTimestamp();

      await sendLog(role.guild, settings, embed);
    }
  });

  client.on("roleCreate", async (role) => {
    const settings = await getSettings(role.guild);
    if (!settings.antinuke?.enabled || !settings.antinuke?.anti_role_create) return;

    const executor = await getAuditExecutor(role.guild, AuditLogEvent.RoleCreate);
    if (!executor || isWhitelisted(settings, executor.id, role.guild)) return;

    const threshold = settings.antinuke?.role_threshold || 3;
    const timeWindow = settings.antinuke?.time_window || 10;
    const count = trackAction(role.guild.id, executor.id, "role_create", timeWindow);

    if (count >= threshold) {
      await role.delete("[Antinuke] Mass role creation").catch(() => {});
      const result = await punishUser(role.guild, executor.id, settings, "Mass role creation detected");
      clearActions(role.guild.id, executor.id, "role_create");

      const embed = new EmbedBuilder()
        .setColor(EMBED_COLORS.ERROR)
        .setTitle("Antinuke: Mass Role Create Detected")
        .setDescription(`**${executor.tag}** was ${result} for mass creating roles`)
        .addFields(
          { name: "Executor", value: `${executor.tag} (${executor.id})`, inline: true },
          { name: "Actions", value: `${count} creations in ${timeWindow}s`, inline: true }
        )
        .setTimestamp();

      await sendLog(role.guild, settings, embed);
    }
  });

  client.on("webhookUpdate", async (channel) => {
    if (!channel.guild) return;
    const settings = await getSettings(channel.guild);
    if (!settings.antinuke?.enabled || !settings.antinuke?.anti_webhook_create) return;

    const executor = await getAuditExecutor(channel.guild, AuditLogEvent.WebhookCreate);
    if (!executor || isWhitelisted(settings, executor.id, channel.guild)) return;

    const result = await punishUser(channel.guild, executor.id, settings, "Unauthorized webhook creation");

    const embed = new EmbedBuilder()
      .setColor(EMBED_COLORS.ERROR)
      .setTitle("Antinuke: Webhook Creation Detected")
      .setDescription(`**${executor.tag}** was ${result} for creating a webhook`)
      .addFields(
        { name: "Executor", value: `${executor.tag} (${executor.id})`, inline: true },
        { name: "Channel", value: `${channel.name}`, inline: true }
      )
      .setTimestamp();

    await sendLog(channel.guild, settings, embed);
  });

  client.on("guildMemberAdd", async (member) => {
    const settings = await getSettings(member.guild);
    if (!settings.antinuke?.enabled) return;

    // Anti-bot detection
    if (member.user.bot && settings.antinuke?.anti_bot_add) {
      const executor = await getAuditExecutor(member.guild, AuditLogEvent.BotAdd);
      if (executor && !isWhitelisted(settings, executor.id, member.guild)) {
        await member.kick("[Antinuke] Unauthorized bot addition").catch(() => {});
        const result = await punishUser(member.guild, executor.id, settings, "Unauthorized bot addition");

        const embed = new EmbedBuilder()
          .setColor(EMBED_COLORS.ERROR)
          .setTitle("🤖 Antinuke: Unauthorized Bot Addition")
          .setDescription(`**${executor.tag}** was ${result} for adding a bot without permission`)
          .addFields(
            { name: "Executor", value: `${executor.tag} (${executor.id})`, inline: true },
            { name: "Bot Added", value: `${member.user.tag} (${member.user.id})`, inline: true }
          )
          .setTimestamp();

        await sendLog(member.guild, settings, embed);
      }
      return;
    }

    // Raid detection (users joining quickly)
    if (settings.antinuke?.anti_raid) {
      const raidThreshold = settings.antinuke?.raid_threshold || 5;
      const raidTimeWindow = settings.antinuke?.raid_time_window || 10;
      const joinCount = trackRaidJoin(member.guild.id, raidTimeWindow);

      if (joinCount >= raidThreshold) {
        // Kick the new member
        await member.kick("[Antinuke] Raid detected").catch(() => {});
        
        const embed = new EmbedBuilder()
          .setColor(EMBED_COLORS.ERROR)
          .setTitle("⚠️ Antinuke: Raid Detected")
          .setDescription(`A potential raid is in progress! Users are joining too quickly.`)
          .addFields(
            { name: "Recent Joins", value: `${joinCount} users in ${raidTimeWindow}s`, inline: true },
            { name: "Last Joiner", value: `${member.user.tag} (kicked)`, inline: true }
          )
          .setTimestamp();

        await sendLog(member.guild, settings, embed);
      }
    }
  });

  client.logger.log("Antinuke handler initialized");
};
