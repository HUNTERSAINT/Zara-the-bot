const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { assertPermission } = require('../../utils/permissions');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Unlock a channel so members can send messages again')
    .addChannelOption(o => o.setName('channel').setDescription('Channel to unlock (defaults to current)'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute(interaction) {
    if (!(await assertPermission(interaction, PermissionFlagsBits.ManageChannels, 'Manage Channels'))) return;
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    const everyone = interaction.guild.roles.everyone;

    try {
      await channel.permissionOverwrites.edit(everyone, { SendMessages: null });
      await interaction.reply({ embeds: [embeds.success('Channel Unlocked', `${channel} has been unlocked.`, interaction.guild)] });
    } catch (err) {
      await interaction.reply({ embeds: [embeds.error('Failed', err.message, interaction.guild)], flags: MessageFlags.Ephemeral });
    }
  },
};
