const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { assertPermission } = require('../../utils/permissions');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Set slowmode for a channel')
    .addIntegerOption(o => o.setName('seconds').setDescription('Seconds between messages (0 to disable, max 21600)').setRequired(true).setMinValue(0).setMaxValue(21600))
    .addChannelOption(o => o.setName('channel').setDescription('Channel (defaults to current)'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    if (!(await assertPermission(interaction, PermissionFlagsBits.ManageChannels, 'Manage Channels'))) return;
    const seconds = interaction.options.getInteger('seconds');
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;

    try {
      await channel.setRateLimitPerUser(seconds);
      const msg = seconds === 0
        ? `Slowmode disabled in ${channel}.`
        : `Slowmode set to **${seconds}s** in ${channel}.`;
      await interaction.reply({ embeds: [embeds.success('Slowmode Updated', msg, interaction.guild)] });
    } catch (err) {
      await interaction.reply({ embeds: [embeds.error('Failed', err.message, interaction.guild)], flags: MessageFlags.Ephemeral });
    }
  },
};
