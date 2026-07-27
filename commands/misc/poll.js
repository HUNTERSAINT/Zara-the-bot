const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { assertPermission } = require('../../utils/permissions');
const embeds = require('../../utils/embeds');

const REACTION_LETTERS = ['🇦','🇧','🇨','🇩','🇪','🇫','🇬','🇭','🇮','🇯'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('poll')
    .setDescription('Create a poll with up to 10 options')
    .addStringOption(o => o.setName('question').setDescription('Poll question').setRequired(true))
    .addStringOption(o => o.setName('option1').setDescription('Option 1').setRequired(true))
    .addStringOption(o => o.setName('option2').setDescription('Option 2').setRequired(true))
    .addStringOption(o => o.setName('option3').setDescription('Option 3'))
    .addStringOption(o => o.setName('option4').setDescription('Option 4'))
    .addStringOption(o => o.setName('option5').setDescription('Option 5'))
    .addStringOption(o => o.setName('option6').setDescription('Option 6'))
    .addStringOption(o => o.setName('option7').setDescription('Option 7'))
    .addStringOption(o => o.setName('option8').setDescription('Option 8'))
    .addStringOption(o => o.setName('option9').setDescription('Option 9'))
    .addStringOption(o => o.setName('option10').setDescription('Option 10'))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute(interaction) {
    if (!(await assertPermission(interaction, PermissionFlagsBits.ManageMessages, 'Manage Messages'))) return;

    const question = interaction.options.getString('question');
    const options = [];
    for (let i = 1; i <= 10; i++) {
      const opt = interaction.options.getString(`option${i}`);
      if (opt) options.push(opt);
    }

    const embed = embeds.poll({ question, options, author: interaction.user, guild: interaction.guild });

    await interaction.reply({ embeds: [embed] });
    const msg = await interaction.fetchReply();

    // Add letter reactions for each option
    for (let i = 0; i < options.length; i++) {
      await msg.react(REACTION_LETTERS[i]).catch(() => {});
    }
  },
};
