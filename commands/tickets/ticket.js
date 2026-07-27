const {
  SlashCommandBuilder, PermissionFlagsBits, MessageFlags,
  ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType,
} = require('discord.js');
const { assertPermission } = require('../../utils/permissions');
const {
  createTicket, getTicket, updateTicket,
  getUserOpenTickets, getGuildOpenTickets, getSettings,
} = require('../../database/database');
const embeds = require('../../utils/embeds');
const { findRole, sendLog } = require('../../utils/helpers');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Ticket management')

    // ── open ──
    .addSubcommand(sub => sub
      .setName('open')
      .setDescription('Open a support ticket')
      .addStringOption(o => o.setName('category').setDescription('Ticket category')
        .addChoices(
          { name: '🛠️ General Support', value: 'general'     },
          { name: '💰 Billing',          value: 'billing'     },
          { name: '🐛 Bug Report',       value: 'bug'         },
          { name: '📝 Application',      value: 'application' },
          { name: '⚠️ Report Member',    value: 'report'      },
        ))
      .addStringOption(o => o.setName('reason').setDescription('Brief reason for opening this ticket')))

    // ── panel ──
    .addSubcommand(sub => sub
      .setName('panel')
      .setDescription('Post a ticket panel in this channel (staff)')
      .addStringOption(o => o.setName('title').setDescription('Panel title').setRequired(true))
      .addStringOption(o => o.setName('description').setDescription('Panel description')))

    // ── close ──
    .addSubcommand(sub => sub
      .setName('close')
      .setDescription('Close the current ticket')
      .addStringOption(o => o.setName('reason').setDescription('Reason for closing')))

    // ── add ──
    .addSubcommand(sub => sub
      .setName('add')
      .setDescription('Add a user to the current ticket')
      .addUserOption(o => o.setName('user').setDescription('User to add').setRequired(true)))

    // ── remove ──
    .addSubcommand(sub => sub
      .setName('remove')
      .setDescription('Remove a user from the current ticket')
      .addUserOption(o => o.setName('user').setDescription('User to remove').setRequired(true)))

    // ── rename ──
    .addSubcommand(sub => sub
      .setName('rename')
      .setDescription('Rename the current ticket channel')
      .addStringOption(o => o.setName('name').setDescription('New channel name').setRequired(true)))

    // ── list ──
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('List all open tickets (staff)')
      .addStringOption(o => o.setName('status').setDescription('Filter by status')
        .addChoices(
          { name: 'Open',   value: 'open'   },
          { name: 'Closed', value: 'closed' },
        ))),

  async execute(interaction) {
    const sub    = interaction.options.getSubcommand();
    const { guild, user, member } = interaction;

    const isStaff = () =>
      member.permissions.has(PermissionFlagsBits.ManageChannels) ||
      user.id === config.ownerId;

    // ── /ticket open ──────────────────────────────────────────────────────────
    if (sub === 'open') {
      const category = interaction.options.getString('category') ?? 'general';
      const reason   = interaction.options.getString('reason')   ?? '';

      const existing = getUserOpenTickets(guild.id, user.id);
      if (existing.length >= 2) {
        return interaction.reply({
          embeds: [embeds.warning('Limit Reached', `You already have ${existing.length} open ticket(s). Please wait for them to be resolved.`, guild)],
          flags: MessageFlags.Ephemeral,
        });
      }

      await interaction.deferReply({ flags: MessageFlags.Ephemeral });

      try {
        const result  = await openTicket({ guild, user, category, reason });
        await interaction.editReply({
          embeds: [embeds.success('Ticket Opened', `Your ticket has been created: ${result.channel}`, guild)],
        });
      } catch (err) {
        await interaction.editReply({
          embeds: [embeds.error('Failed', `Could not create ticket: ${err.message}`, guild)],
        });
      }
    }

    // ── /ticket panel ─────────────────────────────────────────────────────────
    if (sub === 'panel') {
      if (!isStaff()) {
        return interaction.reply({
          embeds: [embeds.error('No Permission', 'You need Manage Channels to post a ticket panel.', guild)],
          flags: MessageFlags.Ephemeral,
        });
      }

      const title = interaction.options.getString('title');
      const desc  = interaction.options.getString('description') ??
        'Click a button below to open a support ticket.\nOur team will assist you as soon as possible.';

      const panelEmbed = embeds.base(guild)
        .setTitle(`🎫  ${title}`)
        .setDescription(desc)
        .setColor(config.colors.primary)
        .addFields(
          { name: '🛠️ General Support', value: 'General questions or issues',  inline: true },
          { name: '💰 Billing',          value: 'Payment or subscription help', inline: true },
          { name: '🐛 Bug Report',       value: 'Report a bug or glitch',       inline: true },
          { name: '📝 Application',      value: 'Apply for a role or position', inline: true },
          { name: '⚠️ Report Member',    value: 'Report a rule-breaking member',inline: true },
        );

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_open_panel:general').setLabel('General').setStyle(ButtonStyle.Primary).setEmoji('🛠️'),
        new ButtonBuilder().setCustomId('ticket_open_panel:billing').setLabel('Billing').setStyle(ButtonStyle.Success).setEmoji('💰'),
        new ButtonBuilder().setCustomId('ticket_open_panel:bug').setLabel('Bug Report').setStyle(ButtonStyle.Danger).setEmoji('🐛'),
        new ButtonBuilder().setCustomId('ticket_open_panel:application').setLabel('Application').setStyle(ButtonStyle.Secondary).setEmoji('📝'),
        new ButtonBuilder().setCustomId('ticket_open_panel:report').setLabel('Report').setStyle(ButtonStyle.Danger).setEmoji('⚠️'),
      );

      await interaction.channel.send({ embeds: [panelEmbed], components: [row] });
      await interaction.reply({
        embeds: [embeds.success('Panel Posted', 'Ticket panel has been posted in this channel.', guild)],
        flags: MessageFlags.Ephemeral,
      });
    }

    // ── /ticket close ─────────────────────────────────────────────────────────
    if (sub === 'close') {
      const ticket = getTicket(interaction.channel.id);
      if (!ticket) {
        return interaction.reply({
          embeds: [embeds.error('Not a Ticket', 'Run this command inside a ticket channel.', guild)],
          flags: MessageFlags.Ephemeral,
        });
      }

      const reason     = interaction.options.getString('reason') ?? 'No reason provided';
      const isOwner    = ticket.user_id === user.id;
      if (!isOwner && !isStaff()) {
        return interaction.reply({
          embeds: [embeds.error('No Permission', 'Only the ticket owner or staff can close this ticket.', guild)],
          flags: MessageFlags.Ephemeral,
        });
      }

      await interaction.reply({ embeds: [embeds.warning('Closing Ticket', `This ticket will be archived. Reason: **${reason}**`, guild)] });

      updateTicket(interaction.channel.id, {
        status:       'closed',
        closed_at:    Math.floor(Date.now() / 1000),
        close_reason: reason,
      });

      const settings  = getSettings(guild.id);
      const logEmbed  = embeds.ticketClosed(ticket, user, reason, guild);
      await sendLog(guild, logEmbed, settings?.ticket_log_channel ?? settings?.log_channel ?? config.logChannel);

      setTimeout(async () => {
        await interaction.channel.permissionOverwrites.edit(ticket.user_id, { SendMessages: false }).catch(() => {});
        await interaction.channel.setName(`closed-${interaction.channel.name.replace(/^closed-/, '')}`).catch(() => {});
      }, 3000);
    }

    // ── /ticket add ───────────────────────────────────────────────────────────
    if (sub === 'add') {
      const ticket = getTicket(interaction.channel.id);
      if (!ticket) {
        return interaction.reply({
          embeds: [embeds.error('Not a Ticket', 'Run this command inside a ticket channel.', guild)],
          flags: MessageFlags.Ephemeral,
        });
      }

      const target = interaction.options.getUser('user');
      await interaction.channel.permissionOverwrites.edit(target.id, {
        ViewChannel: true, SendMessages: true, ReadMessageHistory: true,
      });

      await interaction.reply({
        embeds: [embeds.success('User Added', `${target} has been added to this ticket.`, guild)],
      });
    }

    // ── /ticket remove ────────────────────────────────────────────────────────
    if (sub === 'remove') {
      const ticket = getTicket(interaction.channel.id);
      if (!ticket) {
        return interaction.reply({
          embeds: [embeds.error('Not a Ticket', 'Run this command inside a ticket channel.', guild)],
          flags: MessageFlags.Ephemeral,
        });
      }

      const target = interaction.options.getUser('user');
      if (target.id === ticket.user_id) {
        return interaction.reply({
          embeds: [embeds.error('Cannot Remove', 'You cannot remove the ticket owner.', guild)],
          flags: MessageFlags.Ephemeral,
        });
      }

      await interaction.channel.permissionOverwrites.delete(target.id).catch(() => {});
      await interaction.reply({
        embeds: [embeds.success('User Removed', `${target} has been removed from this ticket.`, guild)],
      });
    }

    // ── /ticket rename ────────────────────────────────────────────────────────
    if (sub === 'rename') {
      const ticket = getTicket(interaction.channel.id);
      if (!ticket) {
        return interaction.reply({
          embeds: [embeds.error('Not a Ticket', 'Run this command inside a ticket channel.', guild)],
          flags: MessageFlags.Ephemeral,
        });
      }

      if (!isStaff() && ticket.user_id !== user.id) {
        return interaction.reply({
          embeds: [embeds.error('No Permission', 'Only staff or the ticket owner can rename this ticket.', guild)],
          flags: MessageFlags.Ephemeral,
        });
      }

      const name    = interaction.options.getString('name').toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 50);
      const newName = `ticket-${name}`;
      await interaction.channel.setName(newName);
      await interaction.reply({
        embeds: [embeds.success('Ticket Renamed', `Channel renamed to **${newName}**.`, guild)],
      });
    }

    // ── /ticket list ──────────────────────────────────────────────────────────
    if (sub === 'list') {
      if (!isStaff()) {
        return interaction.reply({
          embeds: [embeds.error('No Permission', 'Only staff can list tickets.', guild)],
          flags: MessageFlags.Ephemeral,
        });
      }

      const status  = interaction.options.getString('status') ?? 'open';
      const tickets = getGuildOpenTickets(guild.id); // always returns open; filter below
      const filtered = status === 'open' ? tickets : [];

      await interaction.reply({
        embeds: [embeds.ticketList(filtered, guild, status)],
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

// ─── Shared ticket-creation helper ────────────────────────────────────────────
async function openTicket({ guild, user, category = 'general', reason = '' }) {
  const settings = getSettings(guild.id);

  // Find or create SUPPORT category
  let parentCategory = guild.channels.cache.find(
    c => c.name.toUpperCase().includes('SUPPORT') && c.type === ChannelType.GuildCategory
  );
  if (!parentCategory) {
    parentCategory = await guild.channels.create({ name: '📁 SUPPORT', type: ChannelType.GuildCategory });
  }

  const supportRole = findRole(guild, '🎫 Support') ??
    guild.roles.cache.find(r => r.name.toLowerCase().includes('support') || r.name.toLowerCase().includes('staff'));

  // Create ticket and get its guild-specific number
  const result       = createTicket(guild.id, 'placeholder', user.id, category);
  const ticketNumber = result.lastInsertRowid; // temp; real number assigned in DB

  // Create the channel
  const channel = await guild.channels.create({
    name: `ticket-${String(ticketNumber).padStart(4, '0')}`,
    type: ChannelType.GuildText,
    parent: parentCategory.id,
    topic: `Ticket #${String(ticketNumber).padStart(4, '0')} | ${user.tag} | Category: ${category}`,
    permissionOverwrites: [
      { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
      { id: user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
      ...(supportRole ? [{
        id: supportRole.id,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageMessages],
      }] : []),
    ],
    reason: `Ticket opened by ${user.tag}`,
  });

  // Update the DB row with the real channel ID
  updateTicket('placeholder', { channel_id: channel.id });

  // Fetch the real ticket number from the DB row
  const { getTicketById } = require('../../database/database');
  const dbTicket = getTicketById(result.lastInsertRowid);
  const numToUse = dbTicket?.ticket_number ?? result.lastInsertRowid;

  // Fix channel name to real ticket number
  await channel.setName(`ticket-${String(numToUse).padStart(4, '0')}`).catch(() => {});

  // Build embed + buttons
  const ticketEmbed = embeds.ticketOpen(user, numToUse, category, guild);
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('ticket_close').setLabel('Close').setStyle(ButtonStyle.Secondary).setEmoji('🔒'),
    new ButtonBuilder().setCustomId('ticket_claim').setLabel('Claim').setStyle(ButtonStyle.Primary).setEmoji('🎫'),
    new ButtonBuilder().setCustomId('ticket_transcript').setLabel('Transcript').setStyle(ButtonStyle.Secondary).setEmoji('📜'),
    new ButtonBuilder().setCustomId('ticket_delete').setLabel('Delete').setStyle(ButtonStyle.Danger).setEmoji('🗑️'),
  );

  const reasonLine = reason ? `\n**Reason:** ${reason}` : '';
  await channel.send({
    content: `${user}${supportRole ? ` | ${supportRole}` : ''}${reasonLine}`,
    embeds: [ticketEmbed],
    components: [row],
  });

  // Log
  const logEmbed = embeds.base(guild)
    .setColor(config.colors.success)
    .setTitle('🎫  Ticket Opened')
    .addFields(
      { name: 'User',     value: `${user.tag} (${user.id})`, inline: true },
      { name: 'Channel',  value: channel.toString(),          inline: true },
      { name: 'Category', value: category,                    inline: true },
      ...(reason ? [{ name: 'Reason', value: reason }] : []),
    );
  await sendLog(guild, logEmbed, settings?.ticket_log_channel ?? settings?.log_channel ?? config.logChannel);

  return { channel, ticketNumber: numToUse };
}

module.exports.openTicket = openTicket;
