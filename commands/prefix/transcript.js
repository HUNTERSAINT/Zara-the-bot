const { PermissionFlagsBits, AttachmentBuilder } = require('discord.js');
const { getTicket } = require('../../database/database');
const embeds = require('../../utils/embeds');
const config = require('../../config.json');

module.exports = {
  name:        'transcript',
  aliases:     ['log', 'save'],
  description: 'Export a transcript of the current ticket',
  usage:       '!transcript',

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
        embeds: [embeds.error('No Permission', 'Only staff or the ticket owner can export transcripts.', guild)],
      });
    }

    const msg = await message.reply({ embeds: [embeds.info('Generating…', 'Fetching messages…', guild)] });

    try {
      const messages = await channel.messages.fetch({ limit: 100 });
      const sorted   = [...messages.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);

      const ticketNum = String(ticket.ticket_number ?? ticket.id).padStart(4, '0');
      const header = [
        `Server Architect — Ticket Transcript`,
        `Ticket:   #${ticketNum}`,
        `Channel:  #${channel.name}`,
        `Guild:    ${guild.name} (${guild.id})`,
        `Opened:   <t:${ticket.created_at}> (${new Date(ticket.created_at * 1000).toUTCString()})`,
        `Exported: ${new Date().toUTCString()}`,
        `Messages: ${sorted.length}`,
        '─'.repeat(60),
        '',
      ].join('\n');

      const body = sorted.map(m => {
        const ts       = new Date(m.createdTimestamp).toISOString();
        const tag      = `${m.author.tag} (${m.author.id})`;
        const content  = m.content || '*(no text content)*';
        const attachs  = m.attachments.size ? `\n  📎 Attachments: ${[...m.attachments.values()].map(a => a.url).join(', ')}` : '';
        const embcount = m.embeds.length ? `\n  📋 [${m.embeds.length} embed(s)]` : '';
        return `[${ts}] ${tag}\n  ${content}${attachs}${embcount}`;
      }).join('\n\n');

      const full = header + body;
      const buf  = Buffer.from(full, 'utf8');
      const file = new AttachmentBuilder(buf, { name: `ticket-${ticketNum}-transcript.txt` });

      await msg.edit({
        embeds: [embeds.success('Transcript Ready', `${sorted.length} messages exported.`, guild)],
        files:  [file],
      });
    } catch (err) {
      await msg.edit({
        embeds: [embeds.error('Failed', `Could not generate transcript: ${err.message}`, guild)],
      });
    }
  },
};
