const { MessageFlags } = require('discord.js');
const { getUserOpenTickets } = require('../../database/database');
const embeds = require('../../utils/embeds');
const { openTicket } = require('../../commands/tickets/ticket');

/**
 * Handle "Open Ticket" buttons from /ticket panel and !panel
 * customId format: ticket_open_panel:<category>
 */
module.exports = async function ticketOpenPanel(interaction, client) {
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  const { guild, user } = interaction;

  // Parse category from button customId (e.g. ticket_open_panel:bug)
  const category = interaction.customId.split(':')[1] ?? 'general';

  // Limit: max 2 open tickets per user
  const existing = getUserOpenTickets(guild.id, user.id);
  if (existing.length >= 2) {
    return interaction.editReply({
      embeds: [embeds.warning('Limit Reached', `You already have ${existing.length} open ticket(s). Please resolve them first.`, guild)],
    });
  }

  try {
    const result = await openTicket({ guild, user, category });
    return interaction.editReply({
      embeds: [embeds.success('Ticket Opened', `Your ticket has been created: ${result.channel}`, guild)],
    });
  } catch (err) {
    return interaction.editReply({
      embeds: [embeds.error('Failed', `Could not create ticket: ${err.message}`, guild)],
    });
  }
};
