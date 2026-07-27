const { EmbedBuilder } = require('discord.js');
const { getSettings } = require('../database/database');
const { sendLog } = require('../utils/helpers');
const config = require('../config.json');
const logger = require('../utils/logger');

module.exports = {
  name: 'channelDelete',
  async execute(channel, client) {
    if (!channel.guild) return;
    try {
      const settings = getSettings(channel.guild.id);
      const embed = new EmbedBuilder()
        .setColor(config.colors.error)
        .setTitle('🗑️  Channel Deleted')
        .addFields(
          { name: 'Name', value: channel.name, inline: true },
          { name: 'Category', value: channel.parent?.name ?? 'None', inline: true },
        )
        .setTimestamp()
        .setFooter({ text: config.footer });
      await sendLog(channel.guild, embed, settings?.log_channel ?? config.logChannel);
    } catch (err) {
      logger.error('[EVT] channelDelete error:', err.message);
    }
  },
};
