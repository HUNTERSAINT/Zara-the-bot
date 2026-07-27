const { EmbedBuilder } = require('discord.js');
const config = require('../config.json');

// Per-category colours and labels for ticket embeds
const CATEGORY_COLORS = {
  general:     '#5865F2',
  billing:     '#57F287',
  bug:         '#ED4245',
  application: '#FEE75C',
  report:      '#FF7B00',
};
const CATEGORY_LABELS = {
  general:     '🛠️ General Support',
  billing:     '💰 Billing',
  bug:         '🐛 Bug Report',
  application: '📝 Application',
  report:      '⚠️ Report Member',
};

/**
 * Build a base embed with consistent branding
 * @param {import('discord.js').Guild} [guild]
 */
function base(guild) {
  return new EmbedBuilder()
    .setColor(config.colors.primary)
    .setTimestamp()
    .setFooter({
      text: config.footer,
      iconURL: guild?.iconURL({ dynamic: true }) ?? undefined,
    });
}

const success = (title, description, guild) =>
  base(guild).setColor(config.colors.success).setTitle(`✅  ${title}`).setDescription(description);

const error = (title, description, guild) =>
  base(guild).setColor(config.colors.error).setTitle(`❌  ${title}`).setDescription(description);

const warning = (title, description, guild) =>
  base(guild).setColor(config.colors.warning).setTitle(`⚠️  ${title}`).setDescription(description);

const info = (title, description, guild) =>
  base(guild).setColor(config.colors.info).setTitle(`ℹ️  ${title}`).setDescription(description);

/**
 * Standard moderation action embed
 */
function modAction({ action, target, moderator, reason, guild, extra = {} }) {
  const embed = base(guild)
    .setColor(config.colors.error)
    .setTitle(`🔨  ${action}`)
    .addFields(
      { name: 'User',      value: `${target} (${target.id})`, inline: true },
      { name: 'Moderator', value: `${moderator}`,             inline: true },
      { name: 'Reason',    value: reason || 'No reason provided' },
    );
  for (const [k, v] of Object.entries(extra)) {
    embed.addFields({ name: k, value: String(v), inline: true });
  }
  return embed;
}

/**
 * Welcome embed for new members
 */
function welcome(member) {
  return new EmbedBuilder()
    .setColor(config.colors.success)
    .setTitle('👋  Welcome!')
    .setDescription(`Welcome to **${member.guild.name}**, ${member}!\nYou are member **#${member.guild.memberCount}**.`)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .setTimestamp()
    .setFooter({ text: config.footer, iconURL: member.guild.iconURL({ dynamic: true }) ?? undefined });
}

/**
 * Leave embed
 */
function leave(member) {
  return new EmbedBuilder()
    .setColor(config.colors.error)
    .setTitle('👋  Member Left')
    .setDescription(`**${member.user.tag}** has left the server.`)
    .setThumbnail(member.user.displayAvatarURL({ dynamic: true }))
    .addFields({ name: 'Member Since', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` })
    .setTimestamp()
    .setFooter({ text: config.footer, iconURL: member.guild.iconURL({ dynamic: true }) ?? undefined });
}

/**
 * Ticket opened embed — shown inside the ticket channel
 */
function ticketOpen(user, ticketNumber, category = 'general', guild) {
  const color = CATEGORY_COLORS[category] ?? config.colors.info;
  const label = CATEGORY_LABELS[category] ?? category;
  const num   = String(ticketNumber).padStart(4, '0');
  return new EmbedBuilder()
    .setColor(color)
    .setTitle(`🎫  Ticket #${num}`)
    .setDescription(
      `Hey ${user}, thanks for reaching out!\n` +
      `A staff member will be with you shortly.\n\n` +
      `> Please describe your issue in as much detail as possible.\n` +
      `> Use the buttons below to manage this ticket.`
    )
    .addFields(
      { name: 'Category',   value: label,                              inline: true },
      { name: 'Opened by',  value: `${user}`,                         inline: true },
      { name: 'Ticket ID',  value: `#${num}`,                         inline: true },
      { name: 'Opened',     value: `<t:${Math.floor(Date.now()/1000)}:R>`, inline: true },
    )
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .setTimestamp()
    .setFooter({ text: config.footer, iconURL: guild?.iconURL({ dynamic: true }) ?? undefined });
}

/**
 * Ticket closed embed
 */
function ticketClosed(ticket, closer, reason, guild) {
  return base(guild)
    .setColor(config.colors.error)
    .setTitle('🔒  Ticket Closed')
    .addFields(
      { name: 'Ticket',    value: `#${String(ticket.ticket_number ?? ticket.id).padStart(4,'0')}`, inline: true },
      { name: 'Closed by', value: `${closer}`,       inline: true },
      { name: 'Reason',    value: reason || 'No reason provided' },
    );
}

/**
 * Ticket list embed
 */
function ticketList(tickets, guild, status = 'open') {
  const embed = base(guild)
    .setColor(status === 'open' ? config.colors.info : config.colors.warning)
    .setTitle(`🎫  ${status === 'open' ? 'Open' : 'Closed'} Tickets (${tickets.length})`);

  if (tickets.length === 0) {
    embed.setDescription(`No ${status} tickets.`);
    return embed;
  }

  const lines = tickets.slice(0, 20).map(t => {
    const num = String(t.ticket_number ?? t.id).padStart(4, '0');
    const cat = CATEGORY_LABELS[t.category] ?? t.category;
    return `**#${num}** <#${t.channel_id}> — ${cat} — <@${t.user_id}>`;
  });

  if (tickets.length > 20) lines.push(`*…and ${tickets.length - 20} more*`);
  embed.setDescription(lines.join('\n'));
  return embed;
}

/**
 * Ticket statistics embed
 */
function ticketStats(stats, guild) {
  return base(guild)
    .setColor(config.colors.info)
    .setTitle('📊  Ticket Statistics')
    .addFields(
      { name: '🟢 Open',   value: String(stats.open),   inline: true },
      { name: '🔴 Closed', value: String(stats.closed), inline: true },
      { name: '📋 Total',  value: String(stats.total),  inline: true },
    );
}

/**
 * Prefix help embed — shows all ! commands
 */
function prefixHelp(guild) {
  const prefix = config.prefix || '!';
  return base(guild)
    .setColor(config.colors.primary)
    .setTitle(`📖  Prefix Commands  (${prefix})`)
    .setDescription(`Use \`${prefix}<command>\` to run a command.`)
    .addFields(
      {
        name: '🎫 Tickets',
        value: [
          `\`${prefix}ticket [reason]\` — Open a new ticket`,
          `\`${prefix}close [reason]\` — Close current ticket`,
          `\`${prefix}add @user\` — Add a user to the ticket`,
          `\`${prefix}remove @user\` — Remove a user from the ticket`,
          `\`${prefix}rename <name>\` — Rename the ticket channel`,
          `\`${prefix}transcript\` — Export ticket transcript`,
          `\`${prefix}panel [title]\` — Post a ticket panel (staff)`,
        ].join('\n'),
      },
      {
        name: '📦 General',
        value: `\`${prefix}help\` — Show this help menu`,
      },
    );
}

/**
 * Giveaway embed
 */
function giveaway({ prize, winners, endTime, host, guild }) {
  return new EmbedBuilder()
    .setColor('#FF73FA')
    .setTitle('🎉  GIVEAWAY!')
    .setDescription(`**${prize}**\n\nReact with 🎉 to enter!`)
    .addFields(
      { name: 'Winners',   value: String(winners),     inline: true },
      { name: 'Hosted by', value: `${host}`,            inline: true },
      { name: 'Ends',      value: `<t:${endTime}:R>`,  inline: true },
    )
    .setTimestamp(endTime * 1000)
    .setFooter({ text: `${winners} winner(s) • Ends`, iconURL: guild?.iconURL({ dynamic: true }) ?? undefined });
}

/**
 * Poll embed
 */
function poll({ question, options, author, guild }) {
  const letters = ['🇦','🇧','🇨','🇩','🇪','🇫','🇬','🇭','🇮','🇯'];
  const body = options.map((o, i) => `${letters[i]} ${o}`).join('\n');
  return base(guild)
    .setColor(config.colors.info)
    .setTitle(`📊  ${question}`)
    .setDescription(body)
    .setFooter({ text: `Poll by ${author.tag} • ${config.footer}`, iconURL: guild?.iconURL({ dynamic: true }) ?? undefined });
}

module.exports = {
  base, success, error, warning, info,
  modAction, welcome, leave,
  ticketOpen, ticketClosed, ticketList, ticketStats,
  prefixHelp,
  giveaway, poll,
  CATEGORY_COLORS, CATEGORY_LABELS,
};
