const { EmbedBuilder } = require('discord.js');
const { getSettings } = require('../database/database');
const { findChannel, sendLog } = require('../utils/helpers');
const embeds = require('../utils/embeds');
const config = require('../config.json');
const logger = require('../utils/logger');

module.exports = {
  name: 'guildMemberRemove',
  async execute(member, client) {
    try {
      const { guild } = member;
      const settings = getSettings(guild.id);

      // ── Leave message ─────────────────────────────────────────────────────────
      const welcomeChannelName = settings?.welcome_channel ?? config.welcomeChannel;
      const welcomeCh = findChannel(guild, welcomeChannelName);
      if (welcomeCh) {
        const leaveMsg = settings?.leave_message
          ? settings.leave_message
              .replace('{user}', member.user.tag)
              .replace('{server}', guild.name)
          : null;

        const embed = leaveMsg
          ? embeds.base(guild).setColor(config.colors.error).setDescription(leaveMsg)
          : embeds.leave(member);

        await welcomeCh.send({ embeds: [embed] });
      }

      // ── Log leave ─────────────────────────────────────────────────────────────
      const logEmbed = new EmbedBuilder()
        .setColor(config.colors.error)
        .setTitle('📤  Member Left')
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
        .addFields(
          { name: 'User', value: `${member.user.tag} (${member.id})` },
          { name: 'Roles', value: member.roles.cache.filter(r => r.id !== guild.id).map(r => r.name).join(', ') || 'None' },
          { name: 'Member Since', value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : 'Unknown' },
        )
        .setTimestamp()
        .setFooter({ text: config.footer });

      await sendLog(guild, logEmbed, settings?.log_channel ?? config.logChannel);
    } catch (err) {
      logger.error('[EVT] guildMemberRemove error:', err.message);
    }
  },
};
