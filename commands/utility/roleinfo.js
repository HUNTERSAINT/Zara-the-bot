const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('roleinfo')
    .setDescription('Display information about a role')
    .addRoleOption(o => o.setName('role').setDescription('Role to inspect').setRequired(true)),

  async execute(interaction) {
    const role = interaction.options.getRole('role');
    const { guild } = interaction;
    const memberCount = guild.members.cache.filter(m => m.roles.cache.has(role.id)).size;

    const embed = embeds.base(guild)
      .setTitle(`🎭  ${role.name}`)
      .setColor(role.color || 0x5865F2)
      .addFields(
        { name: '🆔 Role ID',     value: role.id,                                                    inline: true },
        { name: '🎨 Color',       value: role.hexColor,                                               inline: true },
        { name: '👥 Members',     value: String(memberCount),                                         inline: true },
        { name: '📅 Created',     value: `<t:${Math.floor(role.createdTimestamp / 1000)}:D>`,         inline: true },
        { name: '📌 Hoisted',     value: role.hoist ? 'Yes' : 'No',                                  inline: true },
        { name: '💬 Mentionable', value: role.mentionable ? 'Yes' : 'No',                            inline: true },
        { name: '🤖 Managed',     value: role.managed ? 'Yes (integration)' : 'No',                  inline: true },
        { name: '📊 Position',    value: String(role.position),                                       inline: true },
      );
    await interaction.reply({ embeds: [embed] });
  },
};
