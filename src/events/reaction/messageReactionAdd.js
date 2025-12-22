const { translationHandler, reactionRoleHandler } = require("@src/handlers");
const { getSettings } = require("@schemas/Guild");
const { isValidEmoji } = require("country-emoji-languages");

/**
 * @param {import('@src/structures').BotClient} client
 * @param {import('discord.js').MessageReaction|import('discord.js').PartialMessageReaction} reaction
 * @param {import('discord.js').User|import('discord.js').PartialUser} user
 */
module.exports = async (client, reaction, user) => {
  if (reaction.partial) {
    try {
      await reaction.fetch();
    } catch (ex) {
      return; // Failed to fetch message (maybe deleted)
    }
  }
  if (user.partial) await user.fetch();
  const { message, emoji } = reaction;
  if (user.bot) return;

  const settings = await getSettings(message.guild);

  // Handle Verification Reactions
  if (settings.verification?.enabled) {
    if (message.id && settings.verification.message_id === message.id) {
      const verifyEmoji = settings.verification.emoji || "✓";
      
      // Check if the reaction matches the verification emoji
      const isVerifyEmoji = emoji.id ? emoji.id === verifyEmoji : emoji.name === verifyEmoji;
      
      if (isVerifyEmoji) {
        const roleId = settings.verification.role_id;
        const role = message.guild.roles.cache.get(roleId);
        
        if (!role) {
          return;
        }
        
        try {
          const member = await message.guild.members.fetch(user.id);
          await member.roles.add(roleId);
        } catch (error) {
          // Silent fail
        }
        return;
      }
    }
  }

  // Reaction Roles
  reactionRoleHandler.handleReactionAdd(reaction, user);

  // Handle Reaction Emojis
  if (!emoji.id) {
    // Translation By Flags
    if (message.content && settings.flag_translation.enabled) {
      if (isValidEmoji(emoji.name)) {
        translationHandler.handleFlagReaction(emoji.name, message, user);
      }
    }
  }
};
