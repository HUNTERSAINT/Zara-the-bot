const { PermissionFlagsBits, MessageFlags } = require('discord.js');
const { getTicket, updateTicket } = require('../../database/database');
const { getSettings } = require('../../database/database');
const embeds = require('../../utils/embeds');
const { sendLog } = require('../../utils/helpers');
const config = require('../../config.json');

/**
 * Handle "Delete Ticket" button — permanently deletes the channel
 */
module.exports = async function ticketDelete(interaction, client) {
  const ticket = getTicket(interaction.channel.id);
  if (!ticket) return interaction.reply({ embeds: [embeds.error('Not a Ticket', 'This channel is not a ticket.', interaction.guild)], flags: MessageFlags.Ephemeral });

  const hasPerms = interaction.member.permissions.has(PermissionFlagsBits.ManageChannels) || interaction.user.id === config.ownerId;
  if (!hasPerms) {
    return interaction.reply({ embeds: [embeds.error('No Permission', 'Only staff can delete tickets.', interaction.guild)], flags: MessageFlags.Ephemeral });
  }

  await interaction.reply({ embeds: [embeds.warning('Deleting Ticket', 'This ticket channel will be deleted in 5 seconds...', interaction.guild)] });

  updateTicket(interaction.channel.id, { status: 'deleted', closed_at: Math.floor(Date.now() / 1000) });

  const settings = getSettings(interaction.guild.id);
  const logEmbed = embeds.base(interaction.guild)
    .setColor(config.colors.error)
    .setTitle('🗑️  Ticket Deleted')
    .addFields(
      { name: 'Channel', value: interaction.channel.name, inline: true },
      { name: 'Deleted by', value: interaction.user.tag, inline: true },
      { name: 'Original User', value: `<@${ticket.user_id}>`, inline: true },
    );
  await sendLog(interaction.guild, logEmbed, settings?.log_channel ?? config.logChannel);

  setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
};
