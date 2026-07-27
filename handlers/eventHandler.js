const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Load all event files from /events directory and bind them to the client
 * @param {import('discord.js').Client} client
 */
async function loadEvents(client) {
  const eventsPath = path.join(__dirname, '..', 'events');
  const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

  for (const file of eventFiles) {
    const filePath = path.join(eventsPath, file);
    try {
      delete require.cache[require.resolve(filePath)];
      const event = require(filePath);

      if (event.once) {
        client.once(event.name, (...args) => event.execute(...args, client));
      } else {
        client.on(event.name, (...args) => event.execute(...args, client));
      }
      logger.info(`[EVT] Loaded: ${event.name}`);
    } catch (error) {
      logger.error(`[EVT] Error loading ${file}:`, error.message);
    }
  }
}

module.exports = { loadEvents };
