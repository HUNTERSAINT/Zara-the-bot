const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { assertPermission } = require('../../utils/permissions');
const { addWarning, getWarnings } = require('../../database/database');
const { getSettings } = require('../../database/database');
const { sendLog } = require('../../utils/helpers');
const embeds = require('../../utils/embeds');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('warn')
    .setDescription('Issue a warning to a member')
    .addSubcommand(sub => sub.setName('add')
      .setDescription('Warn a member')
      .addUserOption(o => o.setName('user').setDescription('Member to warn').setRequired(true))
      .addStringOption(o => o.setName('reason').setDescription('Reason').setRequired(true)))
    .addSubcommand(sub => sub.setName('list')
      .setDescription('View warnings for a member')
      .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true)))
    .addSubcommand(sub => sub.setName('clear')
      .setDescription('Clear all warnings for a member')
      .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!(await assertPermission(interaction, PermissionFlagsBits.ModerateMembers, 'Moderate Members'))) return;

    const sub = interaction.options.getSubcommand();
    const target = interaction.options.getUser('user');
    const { guild } = interaction;

    if (sub === 'add') {
      const reason = interaction.options.getString('reason');
      addWarning(guild.id, target.id, interaction.user.id, reason);
      const total = getWarnings(guild.id, target.id).length;

      const embed = embeds.modAction({ action: 'Warning Issued', target, moderator: interaction.user, reason, guild, extra: { 'Total Warnings': String(total) } });
      await interaction.reply({ embeds: [embed] });

      const settings = getSettings(guild.id);
      await sendLog(guild, embed, settings?.log_channel ?? config.logChannel);
    }

    if (sub === 'list') {
      const warnings = getWarnings(guild.id, target.id);
      if (!warnings.length) {
        return interaction.reply({ embeds: [embeds.info('No Warnings', `${target.tag} has no warnings.`, guild)], flags: MessageFlags.Ephemeral });
      }
      const list = warnings.map((w, i) => `**${i + 1}.** ${w.reason} — by <@${w.moderator_id}> <t:${w.timestamp}:R>`).join('\n');
      await interaction.reply({
        embeds: [embeds.base(guild).setTitle(`⚠️  Warnings — ${target.tag}`).setDescription(list.slice(0, 4096))],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (sub === 'clear') {
      const { clearWarnings } = require('../../database/database');
      clearWarnings(guild.id, target.id);
      await interaction.reply({ embeds: [embeds.success('Warnings Cleared', `All warnings for ${target.tag} have been cleared.`, guild)], flags: MessageFlags.Ephemeral });
    }
  },
};
