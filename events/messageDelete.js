const { EmbedBuilder } = require('discord.js');
const { getSettings } = require('../database/database');
const { sendLog } = require('../utils/helpers');
const config = require('../config.json');
const logger = require('../utils/logger');

module.exports = {
  name: 'messageDelete',
  async execute(message, client) {
    if (!message.guild || message.author?.bot) return;
    try {
      const settings = getSettings(message.guild.id);
      const embed = new EmbedBuilder()
        .setColor(config.colors.error)
        .setTitle('🗑️  Message Deleted')
        .addFields(
          { name: 'Author', value: message.author ? `${message.author.tag} (${message.author.id})` : 'Unknown', inline: true },
          { name: 'Channel', value: `${message.channel}`, inline: true },
          { name: 'Content', value: message.content?.slice(0, 1024) || '*(empty or attachment)*' },
        )
        .setTimestamp()
        .setFooter({ text: config.footer });
      await sendLog(message.guild, embed, settings?.log_channel ?? config.logChannel);
    } catch (err) {
      logger.error('[EVT] messageDelete error:', err.message);
    }
  },
};
