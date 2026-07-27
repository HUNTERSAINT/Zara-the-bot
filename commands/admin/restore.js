const { SlashCommandBuilder, ChannelType, PermissionFlagsBits, MessageFlags } = require('discord.js');
const { assertOwner } = require('../../utils/permissions');
const { getLatestBackup } = require('../../database/database');
const embeds = require('../../utils/embeds');
const logger = require('../../utils/logger');

module.exports = {
  cooldown: 60,
  data: new SlashCommandBuilder()
    .setName('restore')
    .setDescription('Restore the latest server backup (owner only — use with caution)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    if (!(await assertOwner(interaction))) return;
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const { guild } = interaction;
    const backup = getLatestBackup(guild.id);

    if (!backup) {
      return interaction.editReply({ embeds: [embeds.warning('No Backup', 'No backup found for this server. Run `/backup` first.', guild)] });
    }

    try {
      const data = backup.data;
      let created = 0;

      // Restore roles that don't exist
      for (const roleDef of data.roles) {
        const exists = guild.roles.cache.find(r => r.name === roleDef.name);
        if (!exists) {
          await guild.roles.create({
            name: roleDef.name,
            color: roleDef.color,
            hoist: roleDef.hoist,
            reason: '/restore — Server Architect',
          });
          created++;
        }
      }

      // Restore categories first, then channels
      const categories = data.channels.filter(c => c.type === ChannelType.GuildCategory);
      const categoryMap = new Map(); // old id -> new channel

      for (const cat of categories) {
        const exists = guild.channels.cache.find(c => c.name === cat.name && c.type === ChannelType.GuildCategory);
        if (!exists) {
          const newCat = await guild.channels.create({ name: cat.name, type: ChannelType.GuildCategory });
          categoryMap.set(cat.id, newCat.id);
          created++;
        } else {
          categoryMap.set(cat.id, exists.id);
        }
      }

      const textChannels = data.channels.filter(c => c.type !== ChannelType.GuildCategory);
      for (const ch of textChannels) {
        const exists = guild.channels.cache.find(c => c.name === ch.name);
        if (!exists) {
          const parentId = ch.parentId ? (categoryMap.get(ch.parentId) ?? null) : null;
          await guild.channels.create({ name: ch.name, type: ch.type, parent: parentId });
          created++;
        }
      }

      await interaction.editReply({
        embeds: [embeds.success('Restore Complete', `Restored ${created} missing channels/roles from the latest backup (${new Date(backup.created_at * 1000).toLocaleString()}).`, guild)],
      });
      logger.info(`[RESTORE] Restore completed for ${guild.name} by ${interaction.user.tag}`);
    } catch (err) {
      logger.error('[RESTORE] Error:', err.message);
      await interaction.editReply({ embeds: [embeds.error('Restore Failed', err.message, guild)] });
    }
  },
};
