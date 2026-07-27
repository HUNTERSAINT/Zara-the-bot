const { SlashCommandBuilder, version: djsVersion } = require('discord.js');
const embeds = require('../../utils/embeds');
const { version } = require('../../package.json');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Display information about the bot'),

  async execute(interaction) {
    const { client, guild } = interaction;
    const uptime = process.uptime();
    const days    = Math.floor(uptime / 86400);
    const hours   = Math.floor((uptime % 86400) / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = Math.floor(uptime % 60);
    const uptimeStr = `${days}d ${hours}h ${minutes}m ${seconds}s`;

    const memMB = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);

    const embed = embeds.base(guild)
      .setTitle(`🤖  ${client.user.tag}`)
      .setThumbnail(client.user.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '📦 Version',        value: `v${version}`,            inline: true },
        { name: '⚙️ discord.js',     value: `v${djsVersion}`,         inline: true },
        { name: '🟢 Node.js',        value: process.version,          inline: true },
        { name: '⏱️ Uptime',         value: uptimeStr,                 inline: true },
        { name: '🧠 Memory',         value: `${memMB} MB`,            inline: true },
        { name: '🏓 WS Ping',        value: `${client.ws.ping}ms`,    inline: true },
        { name: '🌐 Servers',        value: String(client.guilds.cache.size),  inline: true },
        { name: '👥 Users',          value: String(client.users.cache.size),   inline: true },
        { name: '⚡ Commands',       value: String(client.commands.size),      inline: true },
      );

    await interaction.reply({ embeds: [embed] });
  },
};
