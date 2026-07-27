const { EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getSettings, getSpamRecord, upsertSpamRecord, resetSpamRecord } = require('../database/database');
const { sendLog } = require('../utils/helpers');
const config = require('../config.json');
const logger = require('../utils/logger');

// Known scam/phishing domains
const SCAM_DOMAINS = [
  'discord-nitro', 'discordnitro', 'free-nitro', 'steamgift',
  'discordapp.io', 'discordapp.net', 'nitro-gift', 'claimnitro',
];

// Invite link pattern
const INVITE_REGEX = /(discord\.gg|discord\.com\/invite|discordapp\.com\/invite)\/\S+/i;

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    // ── Prefix Commands ──────────────────────────────────────────────────────
    const prefix = config.prefix || '!';
    if (message.content.startsWith(prefix)) {
      const args        = message.content.slice(prefix.length).trim().split(/\s+/);
      const commandName = args.shift().toLowerCase();
      const command     = client.prefixCommands.get(commandName);

      if (command) {
        try {
          await command.execute(message, args, client);
        } catch (err) {
          logger.error(`[PREFIX] Error executing !${commandName}:`, err.message);
          message.reply({ content: '❌ An error occurred while executing that command.' }).catch(() => {});
        }
        return; // Never run automod on command invocations
      }
    }

    // ── AutoMod ──────────────────────────────────────────────────────────────
    try {
      const settings = getSettings(message.guild.id);
      if (!settings?.automod_enabled) return;

      // Bot owner and admins bypass automod
      if (
        message.member?.permissions.has(PermissionFlagsBits.Administrator) ||
        message.author.id === config.ownerId
      ) return;

      const content = message.content;
      const guildId = message.guild.id;
      const userId  = message.author.id;

      // ── Caps Filter ────────────────────────────────────────────────────────
      if (settings.caps_filter && content.length > 10) {
        const upperCount = content.replace(/[^A-Z]/g, '').length;
        if (upperCount / content.length > 0.7) {
          await message.delete().catch(() => {});
          const warn = await message.channel.send(`${message.author} ⚠️ Please avoid excessive capitals.`);
          setTimeout(() => warn.delete().catch(() => {}), 5000);
          return;
        }
      }

      // ── Anti Invite Links ──────────────────────────────────────────────────
      if (settings.anti_invite && INVITE_REGEX.test(content)) {
        await message.delete().catch(() => {});
        const warn = await message.channel.send(`${message.author} ⚠️ External invite links are not allowed.`);
        setTimeout(() => warn.delete().catch(() => {}), 5000);
        await logAutomod(message, 'Anti-Invite', 'Sent a Discord invite link');
        return;
      }

      // ── Anti Scam Links ────────────────────────────────────────────────────
      if (settings.anti_scam) {
        const lc = content.toLowerCase();
        if (SCAM_DOMAINS.some(d => lc.includes(d))) {
          await message.delete().catch(() => {});
          try { await message.member.timeout(10 * 60 * 1000, 'AutoMod: Suspected scam link'); } catch {}
          const warn = await message.channel.send(`${message.author} ⚠️ Suspected scam link removed. You have been timed out.`);
          setTimeout(() => warn.delete().catch(() => {}), 8000);
          await logAutomod(message, 'Anti-Scam', 'Sent a suspected scam/phishing link');
          return;
        }
      }

      // ── Bad Word Filter ────────────────────────────────────────────────────
      if (settings.bad_words) {
        const badWords = JSON.parse(settings.bad_words || '[]');
        const lc = content.toLowerCase();
        if (badWords.some(w => lc.includes(w.toLowerCase()))) {
          await message.delete().catch(() => {});
          const warn = await message.channel.send(`${message.author} ⚠️ That word is not allowed here.`);
          setTimeout(() => warn.delete().catch(() => {}), 5000);
          await logAutomod(message, 'Bad Word Filter', 'Used a prohibited word');
          return;
        }
      }

      // ── Anti Spam ──────────────────────────────────────────────────────────
      if (settings.anti_spam) {
        const now    = Math.floor(Date.now() / 1000);
        const record = getSpamRecord(guildId, userId);
        const SPAM_WINDOW = 5; // seconds
        const SPAM_LIMIT  = 5; // messages per window

        if (record && now - record.last_message < SPAM_WINDOW) {
          const newCount = record.count + 1;
          upsertSpamRecord(guildId, userId, newCount, now);

          if (newCount >= SPAM_LIMIT) {
            try { await message.member.timeout(60_000, 'AutoMod: Spam'); } catch {}
            await message.delete().catch(() => {});
            const warn = await message.channel.send(`${message.author} ⚠️ Stop spamming. You have been timed out for 1 minute.`);
            setTimeout(() => warn.delete().catch(() => {}), 8000);
            resetSpamRecord(guildId, userId);
            await logAutomod(message, 'Anti-Spam', `Sent ${newCount} messages in ${SPAM_WINDOW}s`);
            return;
          }
        } else {
          upsertSpamRecord(guildId, userId, 1, now);
        }
      }
    } catch (err) {
      logger.error('[AUTOMOD] Error:', err.message);
    }
  },
};

/**
 * Send automod action to log channel
 */
async function logAutomod(message, rule, detail) {
  const settings = getSettings(message.guild.id);
  const embed = new EmbedBuilder()
    .setColor(config.colors.warning)
    .setTitle(`🛡️  AutoMod — ${rule}`)
    .addFields(
      { name: 'User',    value: `${message.author.tag} (${message.author.id})`, inline: true },
      { name: 'Channel', value: `${message.channel}`,                           inline: true },
      { name: 'Action',  value: detail },
      { name: 'Content', value: message.content.slice(0, 512) || '*(empty)*' },
    )
    .setTimestamp()
    .setFooter({ text: config.footer });

  await sendLog(message.guild, embed, settings?.log_channel ?? config.logChannel);
}
