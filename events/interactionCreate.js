const { InteractionType, MessageFlags } = require('discord.js');
const logger = require('../utils/logger');
const embeds = require('../utils/embeds');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction, client) {
    // ── Slash Commands ─────────────────────────────────────────────────────────
    if (interaction.isChatInputCommand()) {
      const command = client.commands.get(interaction.commandName);
      if (!command) return;

      // Cooldown handling
      const { cooldowns } = client;
      if (!cooldowns.has(command.data.name)) cooldowns.set(command.data.name, new Map());
      const timestamps = cooldowns.get(command.data.name);
      const cooldownSecs = command.cooldown ?? 3;
      const now = Date.now();
      const expiry = (timestamps.get(interaction.user.id) ?? 0) + cooldownSecs * 1000;

      if (now < expiry && interaction.user.id !== require('../config.json').ownerId) {
        const remaining = ((expiry - now) / 1000).toFixed(1);
        return interaction.reply({
          embeds: [embeds.warning('Slow Down', `Please wait **${remaining}s** before using \`/${command.data.name}\` again.`, interaction.guild)],
          flags: MessageFlags.Ephemeral,
        });
      }
      timestamps.set(interaction.user.id, now);
      setTimeout(() => timestamps.delete(interaction.user.id), cooldownSecs * 1000);

      try {
        await command.execute(interaction, client);
      } catch (error) {
        logger.error(`[CMD] Error executing /${interaction.commandName}:`, error.message);
        const reply = {
          embeds: [embeds.error('Command Error', 'An unexpected error occurred. Please try again.', interaction.guild)],
          flags: MessageFlags.Ephemeral,
        };
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply).catch(() => {});
        } else {
          await interaction.reply(reply).catch(() => {});
        }
      }
    }

    // ── Button Interactions ────────────────────────────────────────────────────
    if (interaction.isButton()) {
      const [action, ...args] = interaction.customId.split(':');

      try {
        switch (action) {
          case 'ticket_open_panel':
            return require('./buttonHandlers/ticketOpenPanel')(interaction, client);
          case 'ticket_close':
            return require('./buttonHandlers/ticketClose')(interaction, client);
          case 'ticket_claim':
            return require('./buttonHandlers/ticketClaim')(interaction, client);
          case 'ticket_transcript':
            return require('./buttonHandlers/ticketTranscript')(interaction, client);
          case 'ticket_delete':
            return require('./buttonHandlers/ticketDelete')(interaction, client);
          default:
            break;
        }
      } catch (error) {
        logger.error(`[BTN] Error handling button ${action}:`, error.message);
      }
    }
  },
};
