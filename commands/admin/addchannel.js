const { SlashCommandBuilder, ChannelType, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { assertOwner } = require('../../utils/permissions');
const embeds = require('../../utils/embeds');

const typeMap = { text: ChannelType.GuildText, voice: ChannelType.GuildVoice, forum: ChannelType.GuildForum };

module.exports = {
  data: new SlashCommandBuilder()
    .setName('addchannel')
    .setDescription('Create a new channel (owner only)')
    .addStringOption(o => o.setName('name').setDescription('Channel name').setRequired(true))
    .addStringOption(o => o.setName('type').setDescription('Channel type').setRequired(true)
      .addChoices({ name: 'Text', value: 'text' }, { name: 'Voice', value: 'voice' }))
    .addChannelOption(o => o.setName('category').setDescription('Category to place channel in'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!(await assertOwner(interaction))) return;
    const name = interaction.options.getString('name');
    const type = typeMap[interaction.options.getString('type')] ?? ChannelType.GuildText;
    const parent = interaction.options.getChannel('category') ?? null;

    try {
      const channel = await interaction.guild.channels.create({
        name, type, parent: parent?.id ?? null, reason: `/addchannel by ${interaction.user.tag}`,
      });
      await interaction.reply({ embeds: [embeds.success('Channel Created', `${channel} has been created.`, interaction.guild)], flags: MessageFlags.Ephemeral });
    } catch (err) {
      await interaction.reply({ embeds: [embeds.error('Failed', err.message, interaction.guild)], flags: MessageFlags.Ephemeral });
    }
  },
};
