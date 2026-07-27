const { SlashCommandBuilder, ChannelType, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { assertOwner } = require('../../utils/permissions');
const { upsertSettings } = require('../../database/database');
const embeds = require('../../utils/embeds');
const logger = require('../../utils/logger');

// ── Server structure definition ────────────────────────────────────────────────
const SERVER_STRUCTURE = [
  {
    name: '📁 START',
    channels: [{ name: '👋┃welcome', type: ChannelType.GuildText }],
  },
  {
    name: '📁 IMPORTANT',
    channels: [{ name: '📕┃rules', type: ChannelType.GuildText }],
  },
  {
    name: '📁 SERVER',
    channels: [
      { name: '📢┃announcements', type: ChannelType.GuildText },
      { name: '📜┃updates', type: ChannelType.GuildText },
      { name: '📊┃polls', type: ChannelType.GuildText },
      { name: '🎁┃events', type: ChannelType.GuildText },
      { name: '🎉┃giveaways', type: ChannelType.GuildText },
      { name: '📢┃staff-movement', type: ChannelType.GuildText },
      { name: '💜┃boosters', type: ChannelType.GuildText },
    ],
  },
  {
    name: '📁 SERVER INFO',
    channels: [
      { name: '🌐┃server-ip', type: ChannelType.GuildText },
      { name: '👀┃sneak-peaks', type: ChannelType.GuildText },
      { name: '🛒┃shop', type: ChannelType.GuildText },
    ],
  },
  {
    name: '📁 GENERAL',
    channels: [
      { name: '💬┃general-chat', type: ChannelType.GuildText },
      { name: '📸┃media', type: ChannelType.GuildText },
      { name: '🌍┃teams', type: ChannelType.GuildText },
      { name: '💡┃suggestions', type: ChannelType.GuildText },
    ],
  },
  {
    name: '📁 SUPPORT',
    channels: [{ name: '🎫┃tickets', type: ChannelType.GuildText }],
  },
  {
    name: '📁 VOICE CHANNELS',
    channels: [
      { name: '🔊 Voice Chat 1', type: ChannelType.GuildVoice },
      { name: '🔊 Voice Chat 2', type: ChannelType.GuildVoice },
      { name: '🔊 Voice Chat 3', type: ChannelType.GuildVoice },
    ],
  },
];

// ── Role definitions ──────────────────────────────────────────────────────────
const ROLES_TO_CREATE = [
  { name: '👑 Owner',          color: 0xFFD700, hoist: true  },
  { name: '🛡 Co-Owner',       color: 0xC0C0C0, hoist: true  },
  { name: '⚙ Management',     color: 0xFF4500, hoist: true  },
  { name: '👨‍💼 Administrator',  color: 0xFF6347, hoist: true  },
  { name: '🔨 Moderator',      color: 0x4169E1, hoist: true  },
  { name: '🎫 Support',        color: 0x00BFFF, hoist: true  },
  { name: '🎉 Event Team',     color: 0xFF69B4, hoist: true  },
  { name: '💎 Booster',        color: 0xF47FFF, hoist: false },
  { name: '⭐ VIP',            color: 0xFFC0CB, hoist: false },
  { name: '👤 Member',         color: 0x2ECC71, hoist: false },
];

module.exports = {
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('Automatically build the full server structure (owner only)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    // Only the configured bot owner may run this command
    if (!(await assertOwner(interaction))) return;

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const { guild } = interaction;
    const results = { categories: 0, channels: 0, roles: 0, skipped: 0 };

    try {
      // ── Create roles ─────────────────────────────────────────────────────────
      for (const roleDef of ROLES_TO_CREATE) {
        const exists = guild.roles.cache.find(r => r.name === roleDef.name);
        if (!exists) {
          await guild.roles.create({
            name: roleDef.name,
            color: roleDef.color,
            hoist: roleDef.hoist,
            mentionable: false,
            reason: '/setup — Server Architect',
          });
          results.roles++;
        } else {
          results.skipped++;
        }
      }

      // ── Create categories and channels ────────────────────────────────────────
      for (const categoryDef of SERVER_STRUCTURE) {
        // Find or create category
        let category = guild.channels.cache.find(
          c => c.name === categoryDef.name && c.type === ChannelType.GuildCategory
        );
        if (!category) {
          category = await guild.channels.create({
            name: categoryDef.name,
            type: ChannelType.GuildCategory,
            reason: '/setup — Server Architect',
          });
          results.categories++;
        }

        // Create channels inside the category
        for (const chDef of categoryDef.channels) {
          const exists = guild.channels.cache.find(
            c => c.name === chDef.name && c.parentId === category.id
          );
          if (!exists) {
            await guild.channels.create({
              name: chDef.name,
              type: chDef.type,
              parent: category.id,
              reason: '/setup — Server Architect',
            });
            results.channels++;
          } else {
            results.skipped++;
          }
        }
      }

      // ── Save default settings to DB ───────────────────────────────────────────
      upsertSettings(guild.id, { setup_done: 1, log_channel: 'bot-logs', welcome_channel: '👋┃welcome' });

      await interaction.editReply({
        embeds: [
          embeds.base(guild)
            .setColor(0x57F287)
            .setTitle('✅  Server Setup Complete')
            .setDescription(`**${guild.name}** has been configured successfully!`)
            .addFields(
              { name: 'Categories Created', value: String(results.categories), inline: true },
              { name: 'Channels Created',   value: String(results.channels),   inline: true },
              { name: 'Roles Created',      value: String(results.roles),      inline: true },
              { name: 'Already Existed',    value: String(results.skipped),    inline: true },
            ),
        ],
      });

      logger.info(`[SETUP] Server setup completed for ${guild.name} by ${interaction.user.tag}`);
    } catch (error) {
      logger.error('[SETUP] Error:', error.message);
      await interaction.editReply({
        embeds: [embeds.error('Setup Failed', `An error occurred: ${error.message}\n\nMake sure the bot has Administrator permissions.`, guild)],
      });
    }
  },
};
