const { SlashCommandBuilder, ChannelType } = require('discord.js');
const embeds = require('../../utils/embeds');

const typeNames = {
  [ChannelType.GuildText]: 'Text', [ChannelType.GuildVoice]: 'Voice',
  [ChannelType.GuildCategory]: 'Category', [ChannelType.GuildAnnouncement]: 'Announcement',
  [ChannelType.GuildForum]: 'Forum', [ChannelType.GuildStageVoice]: 'Stage',
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('channelinfo')
    .setDescription('Display information about a channel')
    .addChannelOption(o => o.setName('channel').setDescription('Channel to inspect (defaults to current)')),

  async execute(interaction) {
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    const { guild } = interaction;

    const embed = embeds.base(guild)
      .setTitle(`📁  #${channel.name}`)
      .addFields(
        { name: '🆔 Channel ID',  value: channel.id,                                                     inline: true },
        { name: '📋 Type',        value: typeNames[channel.type] ?? String(channel.type),                 inline: true },
        { name: '📁 Category',    value: channel.parent?.name ?? 'None',                                  inline: true },
        { name: '📅 Created',     value: `<t:${Math.floor(channel.createdTimestamp / 1000)}:D>`,          inline: true },
        ...(channel.isTextBased() ? [
          { name: '⏱️ Slowmode',  value: `${channel.rateLimitPerUser ?? 0}s`,                            inline: true },
          { name: '🔞 NSFW',      value: channel.nsfw ? 'Yes' : 'No',                                    inline: true },
          { name: '📌 Topic',     value: channel.topic ?? 'None' },
        ] : []),
        ...(channel.type === ChannelType.GuildVoice ? [
          { name: '👥 User Limit', value: channel.userLimit ? String(channel.userLimit) : 'Unlimited',   inline: true },
          { name: '🔊 Bitrate',   value: `${channel.bitrate / 1000}kbps`,                               inline: true },
        ] : []),
      );
    await interaction.reply({ embeds: [embed] });
  },
};
