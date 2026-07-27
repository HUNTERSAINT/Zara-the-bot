const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { assertOwner } = require('../../utils/permissions');
const { getSettings, upsertSettings } = require('../../database/database');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Configure bot settings for this server (owner only)')
    .addSubcommand(sub => sub.setName('view').setDescription('View current bot configuration'))
    .addSubcommand(sub => sub.setName('setlog')
      .setDescription('Set the log channel name')
      .addStringOption(o => o.setName('channel').setDescription('Channel name (without #)').setRequired(true)))
    .addSubcommand(sub => sub.setName('setwelcome')
      .setDescription('Set the welcome channel name')
      .addStringOption(o => o.setName('channel').setDescription('Channel name (without #)').setRequired(true)))
    .addSubcommand(sub => sub.setName('welcomemsg')
      .setDescription('Set custom welcome message ({user}, {server}, {count})')
      .addStringOption(o => o.setName('message').setDescription('Welcome message text').setRequired(true)))
    .addSubcommand(sub => sub.setName('automod')
      .setDescription('Toggle automod on or off')
      .addBooleanOption(o => o.setName('enabled').setDescription('Enable or disable automod').setRequired(true)))
    .addSubcommand(sub => sub.setName('badword')
      .setDescription('Add a word to the bad word filter')
      .addStringOption(o => o.setName('word').setDescription('Word to filter').setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!(await assertOwner(interaction))) return;

    const sub = interaction.options.getSubcommand();
    const { guild } = interaction;
    const settings = getSettings(guild.id) ?? {};

    if (sub === 'view') {
      const embed = embeds.base(guild)
        .setTitle('⚙️  Bot Configuration')
        .addFields(
          { name: 'Log Channel',    value: settings.log_channel ?? 'Not set',     inline: true },
          { name: 'Welcome Channel', value: settings.welcome_channel ?? 'Not set', inline: true },
          { name: 'Automod',        value: settings.automod_enabled ? '✅ On' : '❌ Off', inline: true },
          { name: 'Anti-Spam',      value: settings.anti_spam ? '✅' : '❌',       inline: true },
          { name: 'Anti-Invite',    value: settings.anti_invite ? '✅' : '❌',     inline: true },
          { name: 'Anti-Scam',      value: settings.anti_scam ? '✅' : '❌',      inline: true },
          { name: 'Caps Filter',    value: settings.caps_filter ? '✅' : '❌',     inline: true },
          { name: 'Setup Done',     value: settings.setup_done ? '✅' : '❌',      inline: true },
        );
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    if (sub === 'setlog') {
      upsertSettings(guild.id, { log_channel: interaction.options.getString('channel') });
      return interaction.reply({ embeds: [embeds.success('Updated', 'Log channel updated.', guild)], flags: MessageFlags.Ephemeral });
    }

    if (sub === 'setwelcome') {
      upsertSettings(guild.id, { welcome_channel: interaction.options.getString('channel') });
      return interaction.reply({ embeds: [embeds.success('Updated', 'Welcome channel updated.', guild)], flags: MessageFlags.Ephemeral });
    }

    if (sub === 'welcomemsg') {
      upsertSettings(guild.id, { welcome_message: interaction.options.getString('message') });
      return interaction.reply({ embeds: [embeds.success('Updated', 'Welcome message updated.', guild)], flags: MessageFlags.Ephemeral });
    }

    if (sub === 'automod') {
      const val = interaction.options.getBoolean('enabled') ? 1 : 0;
      upsertSettings(guild.id, { automod_enabled: val, anti_spam: val, anti_invite: val, anti_scam: val, caps_filter: val });
      return interaction.reply({ embeds: [embeds.success('Updated', `Automod ${val ? 'enabled' : 'disabled'}.`, guild)], flags: MessageFlags.Ephemeral });
    }

    if (sub === 'badword') {
      const word = interaction.options.getString('word').toLowerCase();
      const current = JSON.parse(settings.bad_words ?? '[]');
      if (!current.includes(word)) {
        current.push(word);
        upsertSettings(guild.id, { bad_words: JSON.stringify(current) });
      }
      return interaction.reply({ embeds: [embeds.success('Updated', `"${word}" added to the bad word filter.`, guild)], flags: MessageFlags.Ephemeral });
    }
  },
};
