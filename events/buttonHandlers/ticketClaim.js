const { PermissionFlagsBits, MessageFlags } = require('discord.js');
const { getTicket, updateTicket } = require('../../database/database');
const embeds = require('../../utils/embeds');
const config = require('../../config.json');

/**
 * Handle "Claim Ticket" button — assigns the ticket to a staff member
 */
module.exports = async function ticketClaim(interaction, client) {
  const ticket = getTicket(interaction.channel.id);
  if (!ticket) return interaction.reply({ embeds: [embeds.error('Not a Ticket', 'This channel is not a ticket.', interaction.guild)], flags: MessageFlags.Ephemeral });

  const hasPerms = interaction.member.permissions.has(PermissionFlagsBits.ManageChannels) || interaction.user.id === config.ownerId;
  if (!hasPerms) {
    return interaction.reply({ embeds: [embeds.error('No Permission', 'Only staff can claim tickets.', interaction.guild)], flags: MessageFlags.Ephemeral });
  }

  if (ticket.claimed_by) {
    return interaction.reply({
      embeds: [embeds.warning('Already Claimed', `This ticket is already claimed by <@${ticket.claimed_by}>.`, interaction.guild)],
      flags: MessageFlags.Ephemeral,
    });
  }

  updateTicket(interaction.channel.id, { claimed_by: interaction.user.id });

  await interaction.reply({
    embeds: [embeds.success('Ticket Claimed', `${interaction.user} has claimed this ticket and will assist you shortly.`, interaction.guild)],
  });
};
