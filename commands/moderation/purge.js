const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { assertPermission } = require('../../utils/permissions');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Bulk delete messages from a channel')
    .addIntegerOption(o => o.setName('amount').setDescription('Number of messages to delete (1-100)').setRequired(true).setMinValue(1).setMaxValue(100))
    .addUserOption(o => o.setName('user').setDescription('Only delete messages from this user'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    if (!(await assertPermission(interaction, PermissionFlagsBits.ManageMessages, 'Manage Messages'))) return;

    const amount = interaction.options.getInteger('amount');
    const targetUser = interaction.options.getUser('user');
    const { channel, guild } = interaction;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      let messages = await channel.messages.fetch({ limit: 100 });
      // Filter to last 14 days (Discord bulk delete limit)
      messages = messages.filter(m => Date.now() - m.createdTimestamp < 14 * 24 * 60 * 60 * 1000);
      if (targetUser) messages = messages.filter(m => m.author.id === targetUser.id);
      messages = [...messages.values()].slice(0, amount);

      const deleted = await channel.bulkDelete(messages, true);
      await interaction.editReply({ embeds: [embeds.success('Purge Complete', `Deleted **${deleted.size}** message(s)${targetUser ? ` from ${targetUser.tag}` : ''}.`, guild)] });
    } catch (err) {
      await interaction.editReply({ embeds: [embeds.error('Purge Failed', err.message, guild)] });
    }
  },
};
