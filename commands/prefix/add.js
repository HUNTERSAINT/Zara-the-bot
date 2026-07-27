const { PermissionFlagsBits } = require('discord.js');
const { getTicket } = require('../../database/database');
const embeds = require('../../utils/embeds');
const config = require('../../config.json');

module.exports = {
  name:        'add',
  aliases:     ['adduser'],
  description: 'Add a user to the current ticket',
  usage:       '!add @user',

  async execute(message, args) {
    const { guild, author, channel, member, mentions } = message;

    const ticket = getTicket(channel.id);
    if (!ticket) {
      return message.reply({
        embeds: [embeds.error('Not a Ticket', 'This command must be used inside a ticket channel.', guild)],
      });
    }

    const isStaff = member.permissions.has(PermissionFlagsBits.ManageChannels) || author.id === config.ownerId;
    if (!isStaff && ticket.user_id !== author.id) {
      return message.reply({
        embeds: [embeds.error('No Permission', 'Only staff or the ticket owner can add users.', guild)],
      });
    }

    const target = mentions.members.first();
    if (!target) {
      return message.reply({
        embeds: [embeds.warning('Usage', '`!add @user` — mention the user you want to add.', guild)],
      });
    }

    await channel.permissionOverwrites.edit(target.id, {
      ViewChannel: true, SendMessages: true, ReadMessageHistory: true,
    });

    await message.reply({
      embeds: [embeds.success('User Added', `${target} has been added to this ticket.`, guild)],
    });
  },
};
