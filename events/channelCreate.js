const { EmbedBuilder } = require('discord.js');
const { getSettings } = require('../database/database');
const { sendLog } = require('../utils/helpers');
const config = require('../config.json');
const logger = require('../utils/logger');

module.exports = {
  name: 'channelCreate',
  async execute(channel, client) {
    if (!channel.guild) return;
    try {
      const settings = getSettings(channel.guild.id);
      const embed = new EmbedBuilder()
        .setColor(config.colors.success)
        .setTitle('📁  Channel Created')
        .addFields(
          { name: 'Name', value: channel.name, inline: true },
          { name: 'Type', value: channel.type.toString(), inline: true },
          { name: 'Category', value: channel.parent?.name ?? 'None', inline: true },
        )
        .setTimestamp()
        .setFooter({ text: config.footer });
      await sendLog(channel.guild, embed, settings?.log_channel ?? config.logChannel);
    } catch (err) {
      logger.error('[EVT] channelCreate error:', err.message);
    }
  },
};
