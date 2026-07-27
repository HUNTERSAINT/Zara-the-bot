const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { assertPermission } = require('../../utils/permissions');
const { parseDuration } = require('../../utils/helpers');
const { sendLog, findRole } = require('../../utils/helpers');
const { getSettings } = require('../../database/database');
const embeds = require('../../utils/embeds');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Mute a member using Discord timeout')
    .addUserOption(o => o.setName('user').setDescription('Member to mute').setRequired(true))
    .addStringOption(o => o.setName('duration').setDescription('Duration e.g. 10m, 2h, 1d').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the mute'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute(interaction) {
    if (!(await assertPermission(interaction, PermissionFlagsBits.ModerateMembers, 'Moderate Members'))) return;

    const target = interaction.options.getMember('user');
    const durationStr = interaction.options.getString('duration');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';
    const { guild } = interaction;

    if (!target) return interaction.reply({ embeds: [embeds.error('Not Found', 'Member not found.', guild)], flags: MessageFlags.Ephemeral });
    if (!target.moderatable) return interaction.reply({ embeds: [embeds.error('Cannot Mute', 'I cannot mute this member.', guild)], flags: MessageFlags.Ephemeral });

    const ms = parseDuration(durationStr);
    if (!ms) return interaction.reply({ embeds: [embeds.error('Invalid Duration', 'Use format: `10m`, `2h`, `1d` (max 28d).', guild)], flags: MessageFlags.Ephemeral });
    if (ms > 28 * 24 * 60 * 60 * 1000) return interaction.reply({ embeds: [embeds.error('Too Long', 'Discord timeout max is 28 days.', guild)], flags: MessageFlags.Ephemeral });

    try {
      await target.timeout(ms, reason);
      const embed = embeds.modAction({ action: 'Mute', target: target.user, moderator: interaction.user, reason, guild, extra: { Duration: durationStr } });
      await interaction.reply({ embeds: [embed] });
      const settings = getSettings(guild.id);
      await sendLog(guild, embed, settings?.log_channel ?? config.logChannel);
    } catch (err) {
      await interaction.reply({ embeds: [embeds.error('Mute Failed', err.message, guild)], flags: MessageFlags.Ephemeral });
    }
  },
};
