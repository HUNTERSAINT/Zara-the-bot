const { getUserOpenTickets } = require('../../database/database');
const embeds = require('../../utils/embeds');
const { openTicket } = require('../tickets/ticket');

module.exports = {
  name:        'ticket',
  aliases:     ['newticket', 'open'],
  description: 'Open a support ticket',
  usage:       '!ticket [reason]',

  async execute(message, args) {
    const { guild, author } = message;

    const existing = getUserOpenTickets(guild.id, author.id);
    if (existing.length >= 2) {
      return message.reply({
        embeds: [embeds.warning('Limit Reached', `You already have ${existing.length} open ticket(s). Please resolve them first.`, guild)],
      });
    }

    const reason = args.join(' ');
    const msg = await message.reply({ embeds: [embeds.info('Opening…', 'Creating your ticket channel…', guild)] });

    try {
      const result = await openTicket({ guild, user: author, category: 'general', reason });
      await msg.edit({
        embeds: [embeds.success('Ticket Opened', `Your ticket has been created: ${result.channel}`, guild)],
      });
    } catch (err) {
      await msg.edit({
        embeds: [embeds.error('Failed', `Could not create ticket: ${err.message}`, guild)],
      });
    }
  },
};
