const embeds = require('../../utils/embeds');

module.exports = {
  name:        'help',
  aliases:     ['h', 'commands'],
  description: 'Show all prefix commands',
  usage:       '!help',

  async execute(message) {
    await message.reply({ embeds: [embeds.prefixHelp(message.guild)] });
  },
};
