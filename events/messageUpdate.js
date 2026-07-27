const { EmbedBuilder } = require('discord.js');
const { getSettings } = require('../database/database');
const { sendLog } = require('../utils/helpers');
const config = require('../config.json');
const logger = require('../utils/logger');

module.exports = {
  name: 'messageUpdate',
  async execute(oldMessage, newMessage, client) {
    if (!newMessage.guild || newMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;
    try {
      const settings = getSettings(newMessage.guild.id);
      const embed = new EmbedBuilder()
        .setColor(config.colors.warning)
        .setTitle('✏️  Message Edited')
        .setURL(newMessage.url)
        .addFields(
          { name: 'Author', value: `${newMessage.author.tag} (${newMessage.author.id})`, inline: true },
          { name: 'Channel', value: `${newMessage.channel}`, inline: true },
          { name: 'Before', value: oldMessage.content?.slice(0, 512) || '*(unknown)*' },
          { name: 'After', value: newMessage.content?.slice(0, 512) || '*(empty)*' },
        )
        .setTimestamp()
        .setFooter({ text: config.footer });
      await sendLog(newMessage.guild, embed, settings?.log_channel ?? config.logChannel);
    } catch (err) {
      logger.error('[EVT] messageUpdate error:', err.message);
    }
  },
};
