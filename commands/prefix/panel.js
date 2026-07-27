const {
  PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle,
} = require('discord.js');
const embeds = require('../../utils/embeds');
const config = require('../../config.json');

module.exports = {
  name:        'panel',
  aliases:     ['ticketpanel', 'tpanel'],
  description: 'Post a ticket panel in this channel (staff)',
  usage:       '!panel [title]',

  async execute(message, args) {
    const { guild, author, channel, member } = message;

    const isStaff = member.permissions.has(PermissionFlagsBits.ManageChannels) || author.id === config.ownerId;
    if (!isStaff) {
      return message.reply({
        embeds: [embeds.error('No Permission', 'You need **Manage Channels** to post a ticket panel.', guild)],
      });
    }

    const title = args.join(' ') || 'Support Tickets';

    const panelEmbed = embeds.base(guild)
      .setTitle(`🎫  ${title}`)
      .setDescription(
        'Need help? Open a support ticket and a staff member will assist you shortly.\n\n' +
        '> Click a button below to choose your ticket category.'
      )
      .setColor(config.colors.primary)
      .addFields(
        { name: '🛠️ General',     value: 'General questions & support', inline: true },
        { name: '💰 Billing',      value: 'Payment & subscription help', inline: true },
        { name: '🐛 Bug Report',   value: 'Report a bug or glitch',      inline: true },
        { name: '📝 Application',  value: 'Apply for a staff position',  inline: true },
        { name: '⚠️ Report',       value: 'Report a rule-breaking user', inline: true },
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_open_panel:general').setLabel('General').setStyle(ButtonStyle.Primary).setEmoji('🛠️'),
      new ButtonBuilder().setCustomId('ticket_open_panel:billing').setLabel('Billing').setStyle(ButtonStyle.Success).setEmoji('💰'),
      new ButtonBuilder().setCustomId('ticket_open_panel:bug').setLabel('Bug').setStyle(ButtonStyle.Danger).setEmoji('🐛'),
      new ButtonBuilder().setCustomId('ticket_open_panel:application').setLabel('Application').setStyle(ButtonStyle.Secondary).setEmoji('📝'),
      new ButtonBuilder().setCustomId('ticket_open_panel:report').setLabel('Report').setStyle(ButtonStyle.Danger).setEmoji('⚠️'),
    );

    await channel.send({ embeds: [panelEmbed], components: [row] });
    await message.reply({ embeds: [embeds.success('Panel Posted', 'Ticket panel has been posted in this channel.', guild)] });
  },
};
