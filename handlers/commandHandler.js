const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const config = require('../config.json');
const logger = require('../utils/logger');

/**
 * Recursively load all slash commands from /commands directory and register with Discord API
 * @param {import('discord.js').Client} client
 */
async function loadCommands(client) {
  const commands = [];
  const commandsPath = path.join(__dirname, '..', 'commands');

  // Walk each category subfolder (skip 'prefix' — those are loaded by prefixHandler)
  const categories = fs.readdirSync(commandsPath).filter(f =>
    f !== 'prefix' && fs.statSync(path.join(commandsPath, f)).isDirectory()
  );

  for (const category of categories) {
    const categoryPath = path.join(commandsPath, category);
    const commandFiles = fs.readdirSync(categoryPath).filter(f => f.endsWith('.js'));

    for (const file of commandFiles) {
      const filePath = path.join(categoryPath, file);
      try {
        // Clear require cache in dev so hot-reload works
        delete require.cache[require.resolve(filePath)];
        const command = require(filePath);

        if ('data' in command && 'execute' in command) {
          client.commands.set(command.data.name, command);
          commands.push(command.data.toJSON());
          logger.info(`[CMD] Loaded: ${command.data.name} (${category})`);
        } else {
          logger.warn(`[CMD] Skipped ${file} — missing 'data' or 'execute'`);
        }
      } catch (error) {
        logger.error(`[CMD] Error loading ${file}:`, error.message);
      }
    }
  }

  // Register all slash commands globally with Discord
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  try {
    logger.info(`[CMD] Registering ${commands.length} slash commands globally...`);
    await rest.put(
      Routes.applicationCommands(config.clientId),
      { body: commands }
    );
    logger.info(`[CMD] Successfully registered ${commands.length} slash commands`);
  } catch (error) {
    logger.error('[CMD] Failed to register slash commands:', error.message);
  }
}

module.exports = { loadCommands };
