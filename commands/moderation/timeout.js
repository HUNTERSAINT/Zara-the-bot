const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { assertPermission } = require('../../utils/permissions');
const { parseDuration } = require('../../utils/helpers');
const { sendLog } = require('../../utils/helpers');
const { getSettings } = require('../../database/database');
const embeds = require('../../utils/embeds');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Timeout a member (alias for mute with remove option)')
    .addUserOption(o => o.setName('user').setDescription('Member to timeout').setRequired(true))
    .addStringOption(o => o.setName('duration').setDescription('Duration e.g. 10m, 2h, 1d — leave blank to remove').setRequired(false))
    .addStringOption(o => o.setName('reason').setDescription('Reason'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!(await assertPermission(interaction, PermissionFlagsBits.ModerateMembers, 'Moderate Members'))) return;

    const target = interaction.options.getMember('user');
    const durationStr = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';
    const { guild } = interaction;

    if (!target) return interaction.reply({ embeds: [embeds.error('Not Found', 'Member not found.', guild)], flags: MessageFlags.Ephemeral });
    if (!target.moderatable) return interaction.reply({ embeds: [embeds.error('Cannot Timeout', 'I cannot timeout this member.', guild)], flags: MessageFlags.Ephemeral });

    try {
      if (!durationStr) {
        // Remove timeout
        await target.timeout(null, reason);
        const embed = embeds.modAction({ action: 'Timeout Removed', target: target.user, moderator: interaction.user, reason, guild });
        return interaction.reply({ embeds: [embed] });
      }

      const ms = parseDuration(durationStr);
      if (!ms || ms > 28 * 86400000) return interaction.reply({ embeds: [embeds.error('Invalid Duration', 'Use 10s/10m/2h/1d, max 28d.', guild)], flags: MessageFlags.Ephemeral });

      await target.timeout(ms, reason);
      const embed = embeds.modAction({ action: 'Timeout', target: target.user, moderator: interaction.user, reason, guild, extra: { Duration: durationStr } });
      await interaction.reply({ embeds: [embed] });
      const settings = getSettings(guild.id);
      await sendLog(guild, embed, settings?.log_channel ?? config.logChannel);
    } catch (err) {
      await interaction.reply({ embeds: [embeds.error('Failed', err.message, guild)], flags: MessageFlags.Ephemeral });
    }
  },
};
