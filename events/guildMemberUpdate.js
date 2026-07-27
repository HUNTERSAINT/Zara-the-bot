const { EmbedBuilder } = require('discord.js');
const { getSettings } = require('../database/database');
const { sendLog } = require('../utils/helpers');
const config = require('../config.json');
const logger = require('../utils/logger');

module.exports = {
  name: 'guildMemberUpdate',
  async execute(oldMember, newMember, client) {
    try {
      const settings = getSettings(newMember.guild.id);
      const logCh = settings?.log_channel ?? config.logChannel;

      // ── Role changes ────────────────────────────────────────────────────────
      const addedRoles = newMember.roles.cache.filter(r => !oldMember.roles.cache.has(r.id));
      const removedRoles = oldMember.roles.cache.filter(r => !newMember.roles.cache.has(r.id));

      if (addedRoles.size > 0 || removedRoles.size > 0) {
        const embed = new EmbedBuilder()
          .setColor(config.colors.info)
          .setTitle('🔄  Role Update')
          .addFields(
            { name: 'Member', value: `${newMember.user.tag} (${newMember.id})`, inline: true },
            ...(addedRoles.size > 0 ? [{ name: 'Added Roles', value: addedRoles.map(r => r.name).join(', ') }] : []),
            ...(removedRoles.size > 0 ? [{ name: 'Removed Roles', value: removedRoles.map(r => r.name).join(', ') }] : []),
          )
          .setTimestamp()
          .setFooter({ text: config.footer });
        await sendLog(newMember.guild, embed, logCh);
      }

      // ── Nickname changes ────────────────────────────────────────────────────
      if (oldMember.nickname !== newMember.nickname) {
        const embed = new EmbedBuilder()
          .setColor(config.colors.info)
          .setTitle('📝  Nickname Changed')
          .addFields(
            { name: 'Member', value: `${newMember.user.tag} (${newMember.id})`, inline: true },
            { name: 'Before', value: oldMember.nickname ?? '*None*', inline: true },
            { name: 'After', value: newMember.nickname ?? '*None*', inline: true },
          )
          .setTimestamp()
          .setFooter({ text: config.footer });
        await sendLog(newMember.guild, embed, logCh);
      }
    } catch (err) {
      logger.error('[EVT] guildMemberUpdate error:', err.message);
    }
  },
};
