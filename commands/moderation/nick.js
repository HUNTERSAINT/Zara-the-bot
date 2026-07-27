const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { assertPermission } = require('../../utils/permissions');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nick')
    .setDescription('Change a member\'s nickname')
    .addUserOption(o => o.setName('user').setDescription('Member').setRequired(true))
    .addStringOption(o => o.setName('nickname').setDescription('New nickname (leave empty to reset)'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageNicknames),

  async execute(interaction) {
    if (!(await assertPermission(interaction, PermissionFlagsBits.ManageNicknames, 'Manage Nicknames'))) return;
    const target = interaction.options.getMember('user');
    const nickname = interaction.options.getString('nickname') ?? null;
    const { guild } = interaction;

    if (!target) return interaction.reply({ embeds: [embeds.error('Not Found', 'Member not found.', guild)], flags: MessageFlags.Ephemeral });
    if (!target.manageable) return interaction.reply({ embeds: [embeds.error('Cannot Edit', 'I cannot change this member\'s nickname.', guild)], flags: MessageFlags.Ephemeral });

    try {
      const old = target.nickname ?? target.user.username;
      await target.setNickname(nickname);
      await interaction.reply({
        embeds: [embeds.success('Nickname Changed',
          `**${target.user.tag}**\n**Before:** ${old}\n**After:** ${nickname ?? '*Reset*'}`, guild)],
      });
    } catch (err) {
      await interaction.reply({ embeds: [embeds.error('Failed', err.message, guild)], flags: MessageFlags.Ephemeral });
    }
  },
};
