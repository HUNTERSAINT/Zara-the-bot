const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { assertPermission } = require('../../utils/permissions');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('lock')
    .setDescription('Lock a channel so members cannot send messages')
    .addChannelOption(o => o.setName('channel').setDescription('Channel to lock (defaults to current)'))
    .addStringOption(o => o.setName('reason').setDescription('Reason for locking'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    if (!(await assertPermission(interaction, PermissionFlagsBits.ManageChannels, 'Manage Channels'))) return;
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    const reason = interaction.options.getString('reason') ?? 'No reason provided';
    const everyone = interaction.guild.roles.everyone;

    try {
      await channel.permissionOverwrites.edit(everyone, { SendMessages: false }, { reason });
      await interaction.reply({ embeds: [embeds.warning('Channel Locked', `${channel} has been locked.\n**Reason:** ${reason}`, interaction.guild)] });
    } catch (err) {
      await interaction.reply({ embeds: [embeds.error('Failed', err.message, interaction.guild)], flags: MessageFlags.Ephemeral });
    }
  },
};
