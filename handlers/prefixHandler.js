const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Load all prefix commands from commands/prefix/ and register them on the client.
 * Each file must export: { name, aliases?, description, usage?, execute }
 */
async function loadPrefixCommands(client) {
  const prefixDir = path.join(__dirname, '../commands/prefix');
  if (!fs.existsSync(prefixDir)) {
    logger.warn('[PREFIX] commands/prefix/ directory not found — skipping');
    return;
  }

  const files = fs.readdirSync(prefixDir).filter(f => f.endsWith('.js'));

  for (const file of files) {
    try {
      const command = require(path.join(prefixDir, file));

      if (!command.name || typeof command.execute !== 'function') {
        logger.warn(`[PREFIX] Skipping ${file} — missing name or execute`);
        continue;
      }

      client.prefixCommands.set(command.name.toLowerCase(), command);

      if (Array.isArray(command.aliases)) {
        for (const alias of command.aliases) {
          client.prefixCommands.set(alias.toLowerCase(), command);
        }
      }

      logger.info(`[PREFIX] Loaded: !${command.name}`);
    } catch (err) {
      logger.error(`[PREFIX] Failed to load ${file}:`, err.message);
    }
  }
}

module.exports = { loadPrefixCommands };
