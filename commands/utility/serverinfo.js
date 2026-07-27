const { SlashCommandBuilder, ChannelType } = require('discord.js');
const embeds = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Display detailed information about this server'),

  async execute(interaction) {
    const { guild } = interaction;
    await guild.members.fetch();

    const textChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildText).size;
    const voiceChannels = guild.channels.cache.filter(c => c.type === ChannelType.GuildVoice).size;
    const categories = guild.channels.cache.filter(c => c.type === ChannelType.GuildCategory).size;
    const bots = guild.members.cache.filter(m => m.user.bot).size;
    const humans = guild.memberCount - bots;

    const embed = embeds.base(guild)
      .setTitle(`📊  ${guild.name}`)
      .setThumbnail(guild.iconURL({ dynamic: true }))
      .addFields(
        { name: '🆔 Server ID',      value: guild.id,                                  inline: true },
        { name: '👑 Owner',          value: `<@${guild.ownerId}>`,                     inline: true },
        { name: '📅 Created',        value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
        { name: '👥 Members',        value: `${guild.memberCount} (${humans} humans, ${bots} bots)`, inline: true },
        { name: '💬 Text Channels',  value: String(textChannels),                      inline: true },
        { name: '🔊 Voice Channels', value: String(voiceChannels),                     inline: true },
        { name: '📁 Categories',     value: String(categories),                        inline: true },
        { name: '🎭 Roles',          value: String(guild.roles.cache.size),            inline: true },
        { name: '🚀 Boost Level',    value: `Level ${guild.premiumTier} (${guild.premiumSubscriptionCount} boosts)`, inline: true },
        { name: '🌐 Region',         value: guild.preferredLocale,                     inline: true },
        { name: '🔒 Verification',   value: ['None','Low','Medium','High','Very High'][guild.verificationLevel], inline: true },
      );

    if (guild.bannerURL()) embed.setImage(guild.bannerURL({ size: 1024 }));

    await interaction.reply({ embeds: [embed] });
  },
};
