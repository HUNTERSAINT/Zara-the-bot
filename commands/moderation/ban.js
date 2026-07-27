const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { assertPermission } = require('../../utils/permissions');
const { sendLog } = require('../../utils/helpers');
const { getSettings } = require('../../database/database');
const embeds = require('../../utils/embeds');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .addUserOption(o => o.setName('user').setDescription('Member to ban').setRequired(true))
    .addStringOption(o => o.setName('reason').setDescription('Reason for the ban'))
    .addIntegerOption(o => o.setName('days').setDescription('Days of messages to delete (0-7)').setMinValue(0).setMaxValue(7))
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    if (!(await assertPermission(interaction, PermissionFlagsBits.BanMembers, 'Ban Members'))) return;

    const target = interaction.options.getUser('user');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';
    const days = interaction.options.getInteger('days') ?? 0;
    const { guild } = interaction;

    if (target.id === interaction.user.id) {
      return interaction.reply({ embeds: [embeds.error('Action Denied', 'You cannot ban yourself.', guild)], flags: MessageFlags.Ephemeral });
    }

    try {
      await guild.members.ban(target.id, { reason, deleteMessageSeconds: days * 86400 });

      const embed = embeds.modAction({ action: 'Ban', target, moderator: interaction.user, reason, guild });
      await interaction.reply({ embeds: [embed] });

      const settings = getSettings(guild.id);
      await sendLog(guild, embed, settings?.log_channel ?? config.logChannel);
    } catch (err) {
      await interaction.reply({ embeds: [embeds.error('Ban Failed', err.message, guild)], flags: MessageFlags.Ephemeral });
    }
  },
};
