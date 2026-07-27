const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check the bot\'s latency and API response time'),

  async execute(interaction) {
    const sent = await interaction.reply({ embeds: [embeds.info('Pinging...', '📡 Measuring latency...', interaction.guild)], fetchReply: true });
    const roundTrip = sent.createdTimestamp - interaction.createdTimestamp;
    const wsLatency = interaction.client.ws.ping;

    const status = roundTrip < 150 ? '🟢 Excellent' : roundTrip < 300 ? '🟡 Good' : '🔴 High';

    await interaction.editReply({
      embeds: [embeds.base(interaction.guild)
        .setTitle('🏓  Pong!')
        .addFields(
          { name: 'Round-trip', value: `${roundTrip}ms`, inline: true },
          { name: 'WebSocket',  value: `${wsLatency}ms`, inline: true },
          { name: 'Status',     value: status,           inline: true },
        )],
    });
  },
};
