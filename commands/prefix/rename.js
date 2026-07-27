const { PermissionFlagsBits } = require('discord.js');
const { getTicket } = require('../../database/database');
const embeds = require('../../utils/embeds');
const config = require('../../config.json');

module.exports = {
  name:        'rename',
  aliases:     ['renameticket'],
  description: 'Rename the current ticket channel',
  usage:       '!rename <new-name>',

  async execute(message, args) {
    const { guild, author, channel, member } = message;

    const ticket = getTicket(channel.id);
    if (!ticket) {
      return message.reply({
        embeds: [embeds.error('Not a Ticket', 'This command must be used inside a ticket channel.', guild)],
      });
    }

    const isStaff = member.permissions.has(PermissionFlagsBits.ManageChannels) || author.id === config.ownerId;
    if (!isStaff && ticket.user_id !== author.id) {
      return message.reply({
        embeds: [embeds.error('No Permission', 'Only staff or the ticket owner can rename this ticket.', guild)],
      });
    }

    if (!args.length) {
      return message.reply({
        embeds: [embeds.warning('Usage', '`!rename <new-name>` — provide a new name for the ticket.', guild)],
      });
    }

    const name    = args.join('-').toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 50);
    const newName = `ticket-${name}`;

    await channel.setName(newName);
    await message.reply({
      embeds: [embeds.success('Renamed', `Channel renamed to **${newName}**.`, guild)],
    });
  },
};
