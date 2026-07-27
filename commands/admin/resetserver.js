const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { assertOwner } = require('../../utils/permissions');
const embeds = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
  cooldown: 60,
  data: new SlashCommandBuilder()
    .setName('resetserver')
    .setDescription('Delete all channels and roles then re-run setup (owner only — DESTRUCTIVE)')
    .addBooleanOption(o => o.setName('confirm').setDescription('Set to true to confirm this destructive action').setRequired(true))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!(await assertOwner(interaction))) return;

    const confirm = interaction.options.getBoolean('confirm');
    if (!confirm) {
      return interaction.reply({
        embeds: [embeds.warning('Reset Cancelled', 'You must set `confirm: true` to proceed. This is a destructive action.', interaction.guild)],
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const { guild } = interaction;

    try {
      // Delete all non-essential channels
      const channels = guild.channels.cache.filter(c => c.deletable);
      for (const [, ch] of channels) {
        await ch.delete('resetserver — Server Architect').catch(() => {});
      }

      // Delete all non-managed, non-default roles
      const roles = guild.roles.cache.filter(r => !r.managed && r.name !== '@everyone' && r.editable);
      for (const [, role] of roles) {
        await role.delete('resetserver — Server Architect').catch(() => {});
      }

      await interaction.editReply({
        embeds: [embeds.success('Server Reset', 'All channels and roles have been deleted. Run `/setup` to rebuild the structure.', guild)],
      });
      logger.info(`[RESET] Server reset completed for ${guild.name} by ${interaction.user.tag}`);
    } catch (err) {
      logger.error('[RESET] Error:', err.message);
      await interaction.editReply({ embeds: [embeds.error('Reset Failed', err.message, guild)] });
    }
  },
};
