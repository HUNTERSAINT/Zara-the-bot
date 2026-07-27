const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const {
  getGuildOpenTickets, getGuildClosedTickets, getTicketStats, upsertSettings, getSettings,
} = require('../../database/database');
const embeds = require('../../utils/embeds');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tickets')
    .setDescription('Ticket system management (staff)')

    // ── list ──
    .addSubcommand(sub => sub
      .setName('list')
      .setDescription('List tickets in this server')
      .addStringOption(o => o.setName('status').setDescription('Filter by status (default: open)')
        .addChoices(
          { name: 'Open',   value: 'open'   },
          { name: 'Closed', value: 'closed' },
        )))

    // ── stats ──
    .addSubcommand(sub => sub
      .setName('stats')
      .setDescription('Show ticket statistics'))

    // ── setup ──
    .addSubcommand(sub => sub
      .setName('setup')
      .setDescription('Configure the ticket system')
      .addRoleOption(o => o.setName('support_role').setDescription('Role that can see all tickets'))
      .addChannelOption(o => o.setName('log_channel').setDescription('Channel to send ticket logs'))
      .addStringOption(o => o.setName('category').setDescription('Category name for ticket channels'))),

  async execute(interaction) {
    const sub    = interaction.options.getSubcommand();
    const { guild, user, member } = interaction;

    const isStaff =
      member.permissions.has(PermissionFlagsBits.ManageChannels) ||
      user.id === config.ownerId;

    if (!isStaff) {
      return interaction.reply({
        embeds: [embeds.error('No Permission', 'You need the **Manage Channels** permission to use this.', guild)],
        flags: MessageFlags.Ephemeral,
      });
    }

    // ── /tickets list ─────────────────────────────────────────────────────────
    if (sub === 'list') {
      const status  = interaction.options.getString('status') ?? 'open';
      const tickets = status === 'open'
        ? getGuildOpenTickets(guild.id)
        : getGuildClosedTickets(guild.id, 50);

      await interaction.reply({
        embeds: [embeds.ticketList(tickets, guild, status)],
        flags: MessageFlags.Ephemeral,
      });
    }

    // ── /tickets stats ────────────────────────────────────────────────────────
    if (sub === 'stats') {
      const stats = getTicketStats(guild.id);
      await interaction.reply({
        embeds: [embeds.ticketStats(stats, guild)],
        flags: MessageFlags.Ephemeral,
      });
    }

    // ── /tickets setup ────────────────────────────────────────────────────────
    if (sub === 'setup') {
      const supportRole = interaction.options.getRole('support_role');
      const logChannel  = interaction.options.getChannel('log_channel');
      const category    = interaction.options.getString('category');

      const fields = {};
      if (supportRole) fields.ticket_support_role = supportRole.id;
      if (logChannel)  fields.ticket_log_channel  = logChannel.id;
      if (category)    fields.ticket_category     = category;

      if (Object.keys(fields).length === 0) {
        const settings = getSettings(guild.id);
        const role     = settings?.ticket_support_role ? `<@&${settings.ticket_support_role}>` : '*Not set*';
        const log      = settings?.ticket_log_channel  ? `<#${settings.ticket_log_channel}>`   : '*Not set*';
        const cat      = settings?.ticket_category     ?? '*Not set*';

        return interaction.reply({
          embeds: [
            embeds.base(guild)
              .setTitle('⚙️  Ticket System Config')
              .setColor(config.colors.info)
              .addFields(
                { name: 'Support Role', value: role, inline: true },
                { name: 'Log Channel',  value: log,  inline: true },
                { name: 'Category',     value: cat,  inline: true },
              ),
          ],
          flags: MessageFlags.Ephemeral,
        });
      }

      upsertSettings(guild.id, fields);

      const lines = [];
      if (supportRole) lines.push(`**Support Role:** ${supportRole}`);
      if (logChannel)  lines.push(`**Log Channel:** ${logChannel}`);
      if (category)    lines.push(`**Category:** ${category}`);

      await interaction.reply({
        embeds: [embeds.success('Ticket System Updated', lines.join('\n'), guild)],
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
