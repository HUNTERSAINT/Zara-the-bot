const { ActivityType } = require('discord.js');
const logger = require('../utils/logger');
const { getActiveGiveaways, endGiveaway } = require('../database/database');
const { collectReactionUsers, pickRandom } = require('../utils/helpers');
const embeds = require('../utils/embeds');

module.exports = {
  name: 'clientReady',
  once: true,
  async execute(client) {
    logger.info(`[BOT] Logged in as ${client.user.tag}`);
    logger.info(`[BOT] Serving ${client.guilds.cache.size} guild(s)`);

    // Set bot activity
    client.user.setPresence({
      activities: [{ name: '/setup | Server Architect', type: ActivityType.Watching }],
      status: 'online',
    });

    // Resume any active giveaway timers across all guilds
    for (const guild of client.guilds.cache.values()) {
      const active = getActiveGiveaways(guild.id);
      for (const gw of active) {
        const remaining = gw.end_time * 1000 - Date.now();
        if (remaining <= 0) {
          // Already expired — roll immediately
          await rollGiveaway(client, gw);
        } else {
          setTimeout(() => rollGiveaway(client, gw), remaining);
        }
      }
    }
  },
};

/**
 * Roll a giveaway and announce winners
 */
async function rollGiveaway(client, gw) {
  try {
    const guild = client.guilds.cache.get(gw.guild_id);
    if (!guild) return;
    const channel = guild.channels.cache.get(gw.channel_id);
    if (!channel) return;

    const message = await channel.messages.fetch(gw.message_id).catch(() => null);
    if (!message) return;

    endGiveaway(gw.message_id);

    const entrants = await collectReactionUsers(message, '🎉');
    const winners = pickRandom(entrants, gw.winners);

    if (winners.length === 0) {
      await channel.send({ embeds: [embeds.info('Giveaway Ended', `No valid entries for **${gw.prize}**. Nobody won.`, guild)] });
    } else {
      const winnerMentions = winners.map(u => `<@${u.id}>`).join(', ');
      await channel.send({
        content: `${winnerMentions}`,
        embeds: [embeds.base(guild)
          .setColor('#FF73FA')
          .setTitle('🎉  Giveaway Ended!')
          .setDescription(`Congratulations ${winnerMentions}!\nYou won **${gw.prize}**!`)],
      });
    }

    // Update original embed to show ended state
    await message.edit({
      embeds: [embeds.base(guild)
        .setColor('#747F8D')
        .setTitle('🎉  GIVEAWAY ENDED')
        .setDescription(`**${gw.prize}**\n\nWinner(s): ${winners.length ? winners.map(u => `<@${u.id}>`).join(', ') : 'No winners'}`)],
    }).catch(() => {});
  } catch (err) {
    logger.error('[GIVEAWAY] Error rolling giveaway:', err.message);
  }
}

module.exports.rollGiveaway = rollGiveaway;
