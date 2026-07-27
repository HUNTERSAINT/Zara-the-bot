const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const { addSuggestion } = require('../../database/database');
const { getSettings } = require('../../database/database');
const { findChannel } = require('../../utils/helpers');
const embeds = require('../../utils/embeds');
const config = require('../../config.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('suggest')
    .setDescription('Submit a suggestion for the server')
    .addStringOption(o => o.setName('suggestion').setDescription('Your suggestion').setRequired(true).setMaxLength(1024)),

  async execute(interaction) {
    const content = interaction.options.getString('suggestion');
    const { guild, user } = interaction;
    const settings = getSettings(guild.id);

    const suggestionChannelName = settings?.suggestion_channel ?? config.suggestionsChannel;
    const suggestCh = findChannel(guild, suggestionChannelName);

    if (!suggestCh) {
      return interaction.reply({
        embeds: [embeds.error('No Suggestions Channel', `Could not find a channel named **${suggestionChannelName}**. Ask an admin to set one up.`, guild)],
        flags: MessageFlags.Ephemeral,
      });
    }

    const embed = embeds.base(guild)
      .setColor(config.colors.info)
      .setTitle('💡  New Suggestion')
      .setDescription(content)
      .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL({ dynamic: true }) })
      .addFields({ name: 'Status', value: '🟡 Pending' });

    const msg = await suggestCh.send({ embeds: [embed] });

    // Auto-react with thumbs up/down
    await msg.react('👍').catch(() => {});
    await msg.react('👎').catch(() => {});

    // Save to database
    addSuggestion(guild.id, msg.id, suggestCh.id, user.id, content);

    await interaction.reply({
      embeds: [embeds.success('Suggestion Submitted', `Your suggestion has been posted in ${suggestCh}!`, guild)],
      flags: MessageFlags.Ephemeral,
    });
  },
};
