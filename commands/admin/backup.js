const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { assertOwner } = require('../../utils/permissions');
const { saveBackup } = require('../../database/database');
const embeds = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
  cooldown: 30,
  data: new SlashCommandBuilder()
    .setName('backup')
    .setDescription('Backup the current server structure to the database (owner only)')
    .addStringOption(o => o.setName('label').setDescription('Optional label for this backup'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!(await assertOwner(interaction))) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const { guild } = interaction;
    const label = interaction.options.getString('label') ?? null;

    try {
      // Capture channels
      const channels = guild.channels.cache.map(ch => ({
        id: ch.id,
        name: ch.name,
        type: ch.type,
        parentId: ch.parentId,
        position: ch.position,
      }));

      // Capture roles
      const roles = guild.roles.cache
        .filter(r => !r.managed && r.name !== '@everyone')
        .map(r => ({
          id: r.id,
          name: r.name,
          color: r.color,
          hoist: r.hoist,
          position: r.position,
          permissions: r.permissions.bitfield.toString(),
        }));

      const data = {
        guildName: guild.name,
        guildId: guild.id,
        backedUpAt: Date.now(),
        channels,
        roles,
      };

      saveBackup(guild.id, data, label);

      await interaction.editReply({
        embeds: [embeds.success('Backup Created',
          `Server backup saved successfully.\n\n` +
          `**Channels:** ${channels.length}\n**Roles:** ${roles.length}${label ? `\n**Label:** ${label}` : ''}`,
          guild)],
      });
      logger.info(`[BACKUP] Backup saved for ${guild.name} by ${interaction.user.tag}`);
    } catch (err) {
      logger.error('[BACKUP] Error:', err.message);
      await interaction.editReply({ embeds: [embeds.error('Backup Failed', err.message, guild)] });
    }
  },
};
