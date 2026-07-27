const { PermissionFlagsBits } = require('discord.js');
const { getTicket } = require('../../database/database');
const embeds = require('../../utils/embeds');
const config = require('../../config.json');

module.exports = {
  name:        'remove',
  aliases:     ['removeuser'],
  description: 'Remove a user from the current ticket',
  usage:       '!remove @user',

  async execute(message, args) {
    const { guild, author, channel, member, mentions } = message;

    const ticket = getTicket(channel.id);
    if (!ticket) {
      return message.reply({
        embeds: [embeds.error('Not a Ticket', 'This command must be used inside a ticket channel.', guild)],
      });
    }

    const isStaff = member.permissions.has(PermissionFlagsBits.ManageChannels) || author.id === config.ownerId;
    if (!isStaff) {
      return message.reply({
        embeds: [embeds.error('No Permission', 'Only staff can remove users from tickets.', guild)],
      });
    }

    const target = mentions.members.first();
    if (!target) {
      return message.reply({
        embeds: [embeds.warning('Usage', '`!remove @user` — mention the user you want to remove.', guild)],
      });
    }

    if (target.id === ticket.user_id) {
      return message.reply({
        embeds: [embeds.error('Cannot Remove', 'You cannot remove the ticket owner from their own ticket.', guild)],
      });
    }

    await channel.permissionOverwrites.delete(target.id).catch(() => {});
    await message.reply({
      embeds: [embeds.success('User Removed', `${target} has been removed from this ticket.`, guild)],
    });
  },
};
