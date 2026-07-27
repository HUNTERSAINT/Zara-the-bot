require('dotenv').config();
const { Client, GatewayIntentBits, Collection, Partials } = require('discord.js');
const { loadCommands }       = require('./handlers/commandHandler');
const { loadEvents }         = require('./handlers/eventHandler');
const { loadPrefixCommands } = require('./handlers/prefixHandler');
const { initDatabase }       = require('./database/database');
const logger = require('./utils/logger');

// Create Discord client with all necessary intents
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildPresences,
  ],
  partials: [
    Partials.Channel,
    Partials.Message,
    Partials.Reaction,
    Partials.GuildMember,
    Partials.User,
  ],
});

// Collections for commands and cooldowns
client.commands       = new Collection(); // slash commands
client.prefixCommands = new Collection(); // ! prefix commands
client.cooldowns      = new Collection();

/**
 * Main initialization function
 */
async function init() {
  try {
    // Initialize SQLite database
    initDatabase();
    logger.info('Database initialized successfully');

    // Load slash commands, prefix commands, and events
    await loadCommands(client);
    await loadPrefixCommands(client);
    await loadEvents(client);

    // Connect to Discord
    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    logger.error('Fatal error during initialization:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections — never crash
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Handle uncaught exceptions — never crash
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
});

init();

module.exports = client;
