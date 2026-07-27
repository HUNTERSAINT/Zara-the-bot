const { PermissionFlagsBits } = require('discord.js');
const { getTicket, updateTicket, getSettings } = require('../../database/database');
const embeds = require('../../utils/embeds');
const { sendLog } = require('../../utils/helpers');
const config = require('../../config.json');

module.exports = {
  name:        'close',
  aliases:     ['closeticket'],
  description: 'Close the current ticket',
  usage:       '!close [reason]',

  async execute(message, args) {
    const { guild, author, channel, member } = message;

    const ticket = getTicket(channel.id);
    if (!ticket) {
      return message.reply({
        embeds: [embeds.error('Not a Ticket', 'This command must be used inside a ticket channel.', guild)],
      });
    }

    const isOwner = ticket.user_id === author.id;
    const isStaff = member.permissions.has(PermissionFlagsBits.ManageChannels) || author.id === config.ownerId;

    if (!isOwner && !isStaff) {
      return message.reply({
        embeds: [embeds.error('No Permission', 'Only the ticket owner or staff can close this ticket.', guild)],
      });
    }

    const reason = args.join(' ') || 'No reason provided';

    await message.reply({ embeds: [embeds.warning('Closing Ticket', `Archiving in 5 seconds… Reason: **${reason}**`, guild)] });

    updateTicket(channel.id, {
      status:       'closed',
      closed_at:    Math.floor(Date.now() / 1000),
      close_reason: reason,
    });

    const settings = getSettings(guild.id);
    const logEmbed = embeds.ticketClosed(ticket, author, reason, guild);
    await sendLog(guild, logEmbed, settings?.ticket_log_channel ?? settings?.log_channel ?? config.logChannel);

    setTimeout(async () => {
      await channel.permissionOverwrites.edit(ticket.user_id, { SendMessages: false }).catch(() => {});
      await channel.setName(`closed-${channel.name.replace(/^closed-/, '')}`).catch(() => {});
    }, 5000);
  },
};
