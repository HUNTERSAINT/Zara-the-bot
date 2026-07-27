const { SlashCommandBuilder } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Get a user\'s avatar')
    .addUserOption(o => o.setName('user').setDescription('User (defaults to you)')),

  async execute(interaction) {
    const user = interaction.options.getUser('user') ?? interaction.user;
    const embed = embeds.base(interaction.guild)
      .setTitle(`🖼️  ${user.tag}'s Avatar`)
      .setImage(user.displayAvatarURL({ dynamic: true, size: 1024 }))
      .addFields(
        { name: 'PNG',  value: `[Link](${user.displayAvatarURL({ format: 'png',  size: 1024 })})`, inline: true },
        { name: 'JPG',  value: `[Link](${user.displayAvatarURL({ format: 'jpg',  size: 1024 })})`, inline: true },
        { name: 'WebP', value: `[Link](${user.displayAvatarURL({ format: 'webp', size: 1024 })})`, inline: true },
      );
    await interaction.reply({ embeds: [embed] });
  },
};
