/**
 * Shared utility helpers used across commands and events
 */

/**
 * Parse a duration string like "10m", "2h", "7d" into milliseconds
 * Returns null if the format is invalid
 * @param {string} str
 * @returns {number|null}
 */
function parseDuration(str) {
  const match = str.match(/^(\d+)(s|m|h|d)$/i);
  if (!match) return null;
  const val = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const multipliers = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return val * multipliers[unit];
}

/**
 * Format milliseconds into a human-readable duration string
 * @param {number} ms
 */
function formatDuration(ms) {
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

/**
 * Truncate a string to maxLen characters
 * @param {string} str
 * @param {number} maxLen
 */
function truncate(str, maxLen = 1024) {
  return str.length > maxLen ? str.slice(0, maxLen - 3) + '...' : str;
}

/**
 * Find a text channel in a guild by name (case-insensitive)
 * @param {import('discord.js').Guild} guild
 * @param {string} name
 */
function findChannel(guild, name) {
  return guild.channels.cache.find(
    c => c.name.toLowerCase() === name.toLowerCase() && c.isTextBased()
  ) ?? null;
}

/**
 * Find a role in a guild by name (case-insensitive)
 * @param {import('discord.js').Guild} guild
 * @param {string} name
 */
function findRole(guild, name) {
  return guild.roles.cache.find(r => r.name.toLowerCase() === name.toLowerCase()) ?? null;
}

/**
 * Send a log embed to the configured log channel if it exists
 * @param {import('discord.js').Guild} guild
 * @param {import('discord.js').EmbedBuilder} embed
 * @param {string} logChannelName
 */
async function sendLog(guild, embed, logChannelName = 'bot-logs') {
  try {
    const ch = findChannel(guild, logChannelName);
    if (ch) await ch.send({ embeds: [embed] });
  } catch {
    // Silently ignore if log channel is inaccessible
  }
}

/**
 * Collect all emoji reactions on a message — used by giveaway roll
 * @param {import('discord.js').Message} message
 * @param {string} emoji
 */
async function collectReactionUsers(message, emoji) {
  try {
    const reaction = message.reactions.cache.get(emoji);
    if (!reaction) return [];
    const users = await reaction.users.fetch();
    return users.filter(u => !u.bot).map(u => u);
  } catch {
    return [];
  }
}

/**
 * Pick N random unique items from an array
 * @param {Array} arr
 * @param {number} n
 */
function pickRandom(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(n, arr.length));
}

module.exports = { parseDuration, formatDuration, truncate, findChannel, findRole, sendLog, collectReactionUsers, pickRandom };
