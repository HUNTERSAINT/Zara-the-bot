const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { assertOwner } = require('../../utils/permissions');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addrole')
    .setDescription('Create a new role (owner only)')
    .addStringOption(o => o.setName('name').setDescription('Role name').setRequired(true))
    .addStringOption(o => o.setName('color').setDescription('Hex color e.g. #FF5733'))
    .addBooleanOption(o => o.setName('hoist').setDescription('Show role separately in member list'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!(await assertOwner(interaction))) return;
    const name = interaction.options.getString('name');
    const color = interaction.options.getString('color') ?? '#99AAB5';
    const hoist = interaction.options.getBoolean('hoist') ?? false;

    try {
      const role = await interaction.guild.roles.create({
        name, color, hoist, reason: `/addrole by ${interaction.user.tag}`,
      });
      await interaction.reply({
        embeds: [embeds.success('Role Created', `Role ${role} has been created.`, interaction.guild)],
        flags: MessageFlags.Ephemeral,
      });
    } catch (err) {
      await interaction.reply({ embeds: [embeds.error('Failed', err.message, interaction.guild)], flags: MessageFlags.Ephemeral });
    }
  },
};
