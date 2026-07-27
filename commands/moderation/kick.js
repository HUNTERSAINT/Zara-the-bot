const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { assertPermission } = require('../../utils/permissions');
const { sendLog } = require('../../utils/helpers');
const { getSettings } = require('../../database/database');
const embeds = require('../../utils/embeds');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .addUserOption(o => o.setName('user').setDescription('Member to kick').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the kick'))
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),

  async execute(interaction) {
    if (!(await assertPermission(interaction, PermissionFlagsBits.KickMembers, 'Kick Members'))) return;

    const target = interaction.options.getMember('user');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';
    const { guild } = interaction;

    if (!target) return interaction.reply({ embeds: [embeds.error('Not Found', 'Member not found in this server.', guild)], flags: MessageFlags.Ephemeral });
    if (!target.kickable) return interaction.reply({ embeds: [embeds.error('Cannot Kick', 'I cannot kick this member. They may have a higher role.', guild)], flags: MessageFlags.Ephemeral });

    try {
      await target.kick(reason);
      const embed = embeds.modAction({ action: 'Kick', target: target.user, moderator: interaction.user, reason, guild });
      await interaction.reply({ embeds: [embed] });
      const settings = getSettings(guild.id);
      await sendLog(guild, embed, settings?.log_channel ?? config.logChannel);
    } catch (err) {
      await interaction.reply({ embeds: [embeds.error('Kick Failed', err.message, guild)], flags: MessageFlags.Ephemeral });
    }
  },
};
