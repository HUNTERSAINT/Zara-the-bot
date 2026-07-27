const { getSettings } = require('../database/database');
const { upsertSettings } = require('../database/database');
const embeds = require('../utils/embeds');
const { findChannel, findRole, sendLog } = require('../utils/helpers');
const logger = require('../utils/logger');
const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');
const db = require('../database/database');

module.exports = {
  name: 'guildMemberAdd',
  async execute(member, client) {
    try {
      const { guild } = member;
      const settings = getSettings(guild.id);

      // ── Anti-Raid ────────────────────────────────────────────────────────────
      if (settings?.anti_raid) {
        const now = Math.floor(Date.now() / 1000);
        const tracker = db.getRaidTracker(guild.id);
        const WINDOW = 10; // seconds
        const THRESHOLD = 10; // joins in window

        const windowStart = now - tracker.window_start < WINDOW ? tracker.window_start : now;
        const joinCount = now - tracker.window_start < WINDOW ? tracker.join_count + 1 : 1;

        db.upsertRaidTracker(guild.id, joinCount, windowStart, tracker.raid_mode);

        if (joinCount >= THRESHOLD) {
          // Enable raid mode — kick the newcomer and alert
          db.upsertRaidTracker(guild.id, joinCount, windowStart, 1);
          try {
            await member.kick('Anti-Raid: mass join detected');
          } catch {}
          const logEmbed = new EmbedBuilder()
            .setColor(config.colors.error)
            .setTitle('🚨  Raid Detected')
            .setDescription(`${joinCount} members joined in under ${WINDOW}s. **${member.user.tag}** was kicked.`)
            .setTimestamp();
          await sendLog(guild, logEmbed, settings?.log_channel ?? config.logChannel);
          return;
        }
      }

      // ── Auto-assign Member role ───────────────────────────────────────────────
      const memberRole = findRole(guild, 'Member');
      if (memberRole) {
        await member.roles.add(memberRole).catch(() => {});
      }

      // ── Welcome message ───────────────────────────────────────────────────────
      const welcomeChannelName = settings?.welcome_channel ?? config.welcomeChannel;
      const welcomeCh = findChannel(guild, welcomeChannelName);
      if (welcomeCh) {
        const embed = embeds.welcome(member);
        if (settings?.welcome_message) {
          embed.setDescription(
            settings.welcome_message
              .replace('{user}', `${member}`)
              .replace('{server}', guild.name)
              .replace('{count}', guild.memberCount)
          );
        }
        await welcomeCh.send({ embeds: [embed] });
      }

      // ── Log join ─────────────────────────────────────────────────────────────
      const logEmbed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('📥  Member Joined')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: 'User', value: `${member.user.tag} (${member.id})` },
          { name: 'Account Created', value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>` },
          { name: 'Member Count', value: String(guild.memberCount) },
        )
        .setTimestamp()
        .setFooter({ text: config.footer });
      await sendLog(guild, logEmbed, settings?.log_channel ?? config.logChannel);
    } catch (err) {
      logger.error('[EVT] guildMemberAdd error:', err.message);
    }
  },
};
