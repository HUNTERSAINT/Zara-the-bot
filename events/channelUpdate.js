const { EmbedBuilder } = require('discord.js');
const { getSettings } = require('../database/database');
const { sendLog } = require('../utils/helpers');
const config = require('../config.json');
const logger = require('../utils/logger');

module.exports = {
  name: 'channelUpdate',
  async execute(oldChannel, newChannel, client) {
    if (!newChannel.guild) return;
    try {
      const settings = getSettings(newChannel.guild.id);
      const changes = [];
      if (oldChannel.name !== newChannel.name) changes.push(`Name: **${oldChannel.name}** → **${newChannel.name}**`);
      if (oldChannel.topic !== newChannel.topic) changes.push(`Topic changed`);
      if (oldChannel.rateLimitPerUser !== newChannel.rateLimitPerUser) changes.push(`Slowmode: **${oldChannel.rateLimitPerUser}s** → **${newChannel.rateLimitPerUser}s**`);
      if (!changes.length) return;

      const embed = new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle('✏️  Channel Updated')
        .addFields(
          { name: 'Channel', value: `${newChannel}`, inline: true },
          { name: 'Changes', value: changes.join('\n') },
        )
        .setTimestamp()
        .setFooter({ text: config.footer });
      await sendLog(newChannel.guild, embed, settings?.log_channel ?? config.logChannel);
    } catch (err) {
      logger.error('[EVT] channelUpdate error:', err.message);
    }
  },
};
