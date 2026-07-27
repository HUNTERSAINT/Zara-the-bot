const config = require('../config.json');

/**
 * Check if a user is the configured bot owner (by Discord user ID)
 * The owner is always authorised regardless of server roles/permissions.
 * @param {import('discord.js').User | import('discord.js').GuildMember} userOrMember
 */
function isOwner(userOrMember) {
  const id = userOrMember.id ?? userOrMember.user?.id;
  return id === config.ownerId;
}

/**
 * Check if a member has a specific Discord permission OR is the bot owner
 * @param {import('discord.js').GuildMember} member
 * @param {bigint} permission  e.g. PermissionFlagsBits.BanMembers
 */
function hasPermission(member, permission) {
  return isOwner(member) || member.permissions.has(permission);
}

/**
 * Assert the interaction user is the bot owner.
 * Replies with an error embed and returns false if not.
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 */
async function assertOwner(interaction) {
  if (!isOwner(interaction.user)) {
    const { error } = require('./embeds');
    await interaction.reply({
      embeds: [error('Access Denied', 'Only the bot owner can use this command.', interaction.guild)],
      ephemeral: true,
    });
    return false;
  }
  return true;
}

/**
 * Assert the interaction member has a permission (or is owner).
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {bigint} permission
 * @param {string} permName  Human-readable permission name for the error message
 */
async function assertPermission(interaction, permission, permName) {
  if (!hasPermission(interaction.member, permission)) {
    const { error } = require('./embeds');
    await interaction.reply({
      embeds: [error('Missing Permission', `You need the **${permName}** permission to use this command.`, interaction.guild)],
      ephemeral: true,
    });
    return false;
  }
  return true;
}

module.exports = { isOwner, hasPermission, assertOwner, assertPermission };
