const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Display information about a user')
    .addUserOption(o => o.setName('user').setDescription('User to inspect (defaults to you)')),

  async execute(interaction) {
    const user = interaction.options.getUser('user') ?? interaction.user;
    const member = interaction.guild.members.cache.get(user.id);
    const { guild } = interaction;

    const roles = member?.roles.cache
      .filter(r => r.id !== guild.id)
      .sort((a, b) => b.position - a.position)
      .map(r => `${r}`)
      .slice(0, 10)
      .join(', ') || 'None';

    const embed = embeds.base(guild)
      .setTitle(`👤  ${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        { name: '🆔 User ID',       value: user.id,                                                  inline: true },
        { name: '🤖 Bot',           value: user.bot ? 'Yes' : 'No',                                 inline: true },
        { name: '📅 Account Created', value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`,   inline: true },
        ...(member ? [
          { name: '📥 Joined Server', value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>`,  inline: true },
          { name: '🎭 Top Role',      value: `${member.roles.highest}`,                              inline: true },
          { name: '🎨 Display Color', value: member.displayHexColor,                                 inline: true },
          { name: '🎭 Roles',         value: roles.slice(0, 1024) },
          { name: '⏰ Timed Out',     value: member.communicationDisabledUntil ? `<t:${Math.floor(member.communicationDisabledUntilTimestamp / 1000)}:R>` : 'No', inline: true },
        ] : []),
      );

    await interaction.reply({ embeds: [embed] });
  },
};
