const { EmbedBuilder } = require('discord.js');
const { getSettings } = require('../database/database');
const { sendLog } = require('../utils/helpers');
const config = require('../config.json');
const logger = require('../utils/logger');

module.exports = {
  name: 'voiceStateUpdate',
  async execute(oldState, newState, client) {
    try {
      const guild = newState.guild;
      const settings = getSettings(guild.id);
      const member = newState.member ?? oldState.member;
      if (!member) return;

      let embed;

      if (!oldState.channelId && newState.channelId) {
        // Joined a voice channel
        embed = new EmbedBuilder()
          .setColor(config.colors.success)
          .setTitle('🔊  Voice Join')
          .addFields(
            { name: 'Member', value: `${member.user.tag}`, inline: true },
            { name: 'Channel', value: newState.channel.name, inline: true },
          )
          .setTimestamp()
          .setFooter({ text: config.footer });
      } else if (oldState.channelId && !newState.channelId) {
        // Left a voice channel
        embed = new EmbedBuilder()
          .setColor(config.colors.error)
          .setTitle('🔇  Voice Leave')
          .addFields(
            { name: 'Member', value: `${member.user.tag}`, inline: true },
            { name: 'Channel', value: oldState.channel.name, inline: true },
          )
          .setTimestamp()
          .setFooter({ text: config.footer });
      } else if (oldState.channelId !== newState.channelId) {
        // Moved channels
        embed = new EmbedBuilder()
          .setColor(config.colors.info)
          .setTitle('🔄  Voice Move')
          .addFields(
            { name: 'Member', value: `${member.user.tag}`, inline: true },
            { name: 'From', value: oldState.channel.name, inline: true },
            { name: 'To', value: newState.channel.name, inline: true },
          )
          .setTimestamp()
          .setFooter({ text: config.footer });
      }

      if (embed) await sendLog(guild, embed, settings?.log_channel ?? config.logChannel);
    } catch (err) {
      logger.error('[EVT] voiceStateUpdate error:', err.message);
    }
  },
};
