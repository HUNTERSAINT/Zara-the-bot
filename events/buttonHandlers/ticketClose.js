const { PermissionFlagsBits, MessageFlags } = require('discord.js');
const { getTicket, updateTicket, getSettings } = require('../../database/database');
const { sendLog } = require('../../utils/helpers');
const embeds = require('../../utils/embeds');
const config = require('../../config.json');

/**
 * Handle "Close Ticket" button
 */
module.exports = async function ticketClose(interaction, client) {
  const { guild, user, member, channel } = interaction;

  const ticket = getTicket(channel.id);
  if (!ticket) {
    return interaction.reply({
      embeds: [embeds.error('Not a Ticket', 'This channel is not a recognised ticket.', guild)],
      flags: MessageFlags.Ephemeral,
    });
  }

  const isOwner = ticket.user_id === user.id;
  const isStaff = member.permissions.has(PermissionFlagsBits.ManageChannels) || user.id === config.ownerId;

  if (!isOwner && !isStaff) {
    return interaction.reply({
      embeds: [embeds.error('No Permission', 'Only the ticket owner or staff can close this ticket.', guild)],
      flags: MessageFlags.Ephemeral,
    });
  }

  await interaction.reply({
    embeds: [embeds.warning('Closing Ticket', 'This ticket will be archived in 5 seconds…', guild)],
  });

  updateTicket(channel.id, {
    status:    'closed',
    closed_at: Math.floor(Date.now() / 1000),
  });

  const settings = getSettings(guild.id);
  const logEmbed = embeds.ticketClosed(ticket, user, 'Closed via button', guild);
  await sendLog(guild, logEmbed, settings?.ticket_log_channel ?? settings?.log_channel ?? config.logChannel);

  setTimeout(async () => {
    await channel.permissionOverwrites.edit(ticket.user_id, { SendMessages: false }).catch(() => {});
    await channel.setName(`closed-${channel.name.replace(/^closed-/, '')}`).catch(() => {});
  }, 5000);
};
