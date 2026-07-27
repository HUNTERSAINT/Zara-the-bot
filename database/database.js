const Database = require('better-sqlite3');
const path = require('path');
const logger = require('../utils/logger');

let db;

/**
 * Initialize the SQLite database and create all required tables
 */
function initDatabase() {
  const dbPath = path.join(__dirname, 'serverarchitect.db');
  db = new Database(dbPath);

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS warnings (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id      TEXT NOT NULL,
      user_id       TEXT NOT NULL,
      moderator_id  TEXT NOT NULL,
      reason        TEXT NOT NULL,
      timestamp     INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS tickets (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id       TEXT NOT NULL,
      channel_id     TEXT NOT NULL,
      user_id        TEXT NOT NULL,
      claimed_by     TEXT,
      status         TEXT NOT NULL DEFAULT 'open',
      category       TEXT NOT NULL DEFAULT 'general',
      ticket_number  INTEGER NOT NULL DEFAULT 0,
      created_at     INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
      closed_at      INTEGER,
      close_reason   TEXT
    );

    CREATE TABLE IF NOT EXISTS ticket_counter (
      guild_id  TEXT PRIMARY KEY,
      count     INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS suggestions (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id    TEXT NOT NULL,
      message_id  TEXT NOT NULL,
      channel_id  TEXT NOT NULL,
      user_id     TEXT NOT NULL,
      content     TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'pending',
      created_at  INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS giveaways (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id    TEXT NOT NULL,
      channel_id  TEXT NOT NULL,
      message_id  TEXT NOT NULL,
      host_id     TEXT NOT NULL,
      prize       TEXT NOT NULL,
      winners     INTEGER NOT NULL DEFAULT 1,
      end_time    INTEGER NOT NULL,
      ended       INTEGER NOT NULL DEFAULT 0,
      created_at  INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      guild_id             TEXT PRIMARY KEY,
      log_channel          TEXT,
      welcome_channel      TEXT,
      welcome_message      TEXT,
      leave_message        TEXT,
      ticket_category      TEXT,
      ticket_log_channel   TEXT,
      ticket_support_role  TEXT,
      suggestion_channel   TEXT,
      automod_enabled      INTEGER DEFAULT 1,
      bad_words            TEXT DEFAULT '[]',
      anti_spam            INTEGER DEFAULT 1,
      anti_invite          INTEGER DEFAULT 1,
      anti_raid            INTEGER DEFAULT 1,
      caps_filter          INTEGER DEFAULT 1,
      anti_scam            INTEGER DEFAULT 1,
      setup_done           INTEGER DEFAULT 0,
      updated_at           INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS mutes (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id      TEXT NOT NULL,
      user_id       TEXT NOT NULL,
      moderator_id  TEXT NOT NULL,
      reason        TEXT,
      expires_at    INTEGER,
      created_at    INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS spam_tracker (
      guild_id      TEXT NOT NULL,
      user_id       TEXT NOT NULL,
      count         INTEGER DEFAULT 0,
      last_message  INTEGER DEFAULT 0,
      PRIMARY KEY (guild_id, user_id)
    );

    CREATE TABLE IF NOT EXISTS backups (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id    TEXT NOT NULL,
      label       TEXT,
      data        TEXT NOT NULL,
      created_at  INTEGER DEFAULT (strftime('%s', 'now'))
    );

    CREATE TABLE IF NOT EXISTS raid_tracker (
      guild_id      TEXT PRIMARY KEY,
      join_count    INTEGER DEFAULT 0,
      window_start  INTEGER DEFAULT 0,
      raid_mode     INTEGER DEFAULT 0
    );
  `);

  // Migrate existing tickets table — add columns if they don't exist yet
  for (const col of ['ticket_number INTEGER DEFAULT 0', 'close_reason TEXT']) {
    try { db.exec(`ALTER TABLE tickets ADD COLUMN ${col}`); } catch {}
  }
  for (const col of ['ticket_log_channel TEXT', 'ticket_support_role TEXT']) {
    try { db.exec(`ALTER TABLE settings ADD COLUMN ${col}`); } catch {}
  }

  logger.info('[DB] All tables created/verified');
  return db;
}

/** Return the database instance (must call initDatabase first) */
function getDb() {
  if (!db) throw new Error('Database not initialized. Call initDatabase() first.');
  return db;
}

// ─── Warnings ─────────────────────────────────────────────────────────────────

const addWarning = (guildId, userId, modId, reason) =>
  db.prepare('INSERT INTO warnings (guild_id, user_id, moderator_id, reason) VALUES (?, ?, ?, ?)').run(guildId, userId, modId, reason);

const getWarnings = (guildId, userId) =>
  db.prepare('SELECT * FROM warnings WHERE guild_id = ? AND user_id = ? ORDER BY timestamp DESC').all(guildId, userId);

const removeWarning = (id) =>
  db.prepare('DELETE FROM warnings WHERE id = ?').run(id);

const clearWarnings = (guildId, userId) =>
  db.prepare('DELETE FROM warnings WHERE guild_id = ? AND user_id = ?').run(guildId, userId);

// ─── Settings ─────────────────────────────────────────────────────────────────

function getSettings(guildId) {
  return db.prepare('SELECT * FROM settings WHERE guild_id = ?').get(guildId);
}

function upsertSettings(guildId, fields) {
  const existing = getSettings(guildId);
  if (existing) {
    const cols = Object.keys(fields).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE settings SET ${cols}, updated_at = strftime('%s','now') WHERE guild_id = ?`)
      .run(...Object.values(fields), guildId);
  } else {
    const keys = ['guild_id', ...Object.keys(fields)];
    const ph = keys.map(() => '?').join(', ');
    db.prepare(`INSERT INTO settings (${keys.join(', ')}) VALUES (${ph})`)
      .run(guildId, ...Object.values(fields));
  }
}

// ─── Tickets ──────────────────────────────────────────────────────────────────

/**
 * Get the next ticket number for a guild (guild-specific auto-increment)
 */
function getNextTicketNumber(guildId) {
  const existing = db.prepare('SELECT count FROM ticket_counter WHERE guild_id = ?').get(guildId);
  if (existing) {
    const next = existing.count + 1;
    db.prepare('UPDATE ticket_counter SET count = ? WHERE guild_id = ?').run(next, guildId);
    return next;
  }
  db.prepare('INSERT INTO ticket_counter (guild_id, count) VALUES (?, 1)').run(guildId);
  return 1;
}

function createTicket(guildId, channelId, userId, category = 'general') {
  const ticketNumber = getNextTicketNumber(guildId);
  return db.prepare(
    'INSERT INTO tickets (guild_id, channel_id, user_id, category, ticket_number) VALUES (?, ?, ?, ?, ?)'
  ).run(guildId, channelId, userId, category, ticketNumber);
}

const getTicket = (channelId) =>
  db.prepare('SELECT * FROM tickets WHERE channel_id = ?').get(channelId);

const getTicketById = (id) =>
  db.prepare('SELECT * FROM tickets WHERE id = ?').get(id);

function updateTicket(channelId, fields) {
  const cols = Object.keys(fields).map(k => `${k} = ?`).join(', ');
  db.prepare(`UPDATE tickets SET ${cols} WHERE channel_id = ?`).run(...Object.values(fields), channelId);
}

const getUserOpenTickets = (guildId, userId) =>
  db.prepare("SELECT * FROM tickets WHERE guild_id = ? AND user_id = ? AND status = 'open'").all(guildId, userId);

const getGuildOpenTickets = (guildId) =>
  db.prepare("SELECT * FROM tickets WHERE guild_id = ? AND status = 'open' ORDER BY created_at DESC").all(guildId);

const getGuildClosedTickets = (guildId, limit = 50) =>
  db.prepare("SELECT * FROM tickets WHERE guild_id = ? AND status = 'closed' ORDER BY closed_at DESC LIMIT ?").all(guildId, limit);

function getTicketStats(guildId) {
  const open   = db.prepare("SELECT COUNT(*) as c FROM tickets WHERE guild_id = ? AND status = 'open'").get(guildId)?.c ?? 0;
  const closed = db.prepare("SELECT COUNT(*) as c FROM tickets WHERE guild_id = ? AND status = 'closed'").get(guildId)?.c ?? 0;
  return { open, closed, total: open + closed };
}

// ─── Suggestions ──────────────────────────────────────────────────────────────

const addSuggestion = (guildId, messageId, channelId, userId, content) =>
  db.prepare('INSERT INTO suggestions (guild_id, message_id, channel_id, user_id, content) VALUES (?, ?, ?, ?, ?)').run(guildId, messageId, channelId, userId, content);

const getSuggestion = (messageId) =>
  db.prepare('SELECT * FROM suggestions WHERE message_id = ?').get(messageId);

// ─── Giveaways ────────────────────────────────────────────────────────────────

const createGiveaway = (guildId, channelId, messageId, hostId, prize, winners, endTime) =>
  db.prepare('INSERT INTO giveaways (guild_id, channel_id, message_id, host_id, prize, winners, end_time) VALUES (?, ?, ?, ?, ?, ?, ?)').run(guildId, channelId, messageId, hostId, prize, winners, endTime);

const getGiveaway = (messageId) =>
  db.prepare('SELECT * FROM giveaways WHERE message_id = ?').get(messageId);

const getActiveGiveaways = (guildId) =>
  db.prepare('SELECT * FROM giveaways WHERE guild_id = ? AND ended = 0').all(guildId);

const endGiveaway = (messageId) =>
  db.prepare('UPDATE giveaways SET ended = 1 WHERE message_id = ?').run(messageId);

// ─── Backups ──────────────────────────────────────────────────────────────────

const saveBackup = (guildId, data, label = null) =>
  db.prepare('INSERT INTO backups (guild_id, data, label) VALUES (?, ?, ?)').run(guildId, JSON.stringify(data), label);

function getLatestBackup(guildId) {
  const row = db.prepare('SELECT * FROM backups WHERE guild_id = ? ORDER BY created_at DESC LIMIT 1').get(guildId);
  if (row) row.data = JSON.parse(row.data);
  return row;
}

// ─── Spam Tracker ─────────────────────────────────────────────────────────────

const getSpamRecord = (guildId, userId) =>
  db.prepare('SELECT * FROM spam_tracker WHERE guild_id = ? AND user_id = ?').get(guildId, userId);

const upsertSpamRecord = (guildId, userId, count, lastMessage) =>
  db.prepare('INSERT INTO spam_tracker (guild_id, user_id, count, last_message) VALUES (?, ?, ?, ?) ON CONFLICT(guild_id, user_id) DO UPDATE SET count = ?, last_message = ?')
    .run(guildId, userId, count, lastMessage, count, lastMessage);

const resetSpamRecord = (guildId, userId) =>
  db.prepare('DELETE FROM spam_tracker WHERE guild_id = ? AND user_id = ?').run(guildId, userId);

// ─── Raid Tracker ─────────────────────────────────────────────────────────────

function getRaidTracker(guildId) {
  return db.prepare('SELECT * FROM raid_tracker WHERE guild_id = ?').get(guildId) ||
    { guild_id: guildId, join_count: 0, window_start: 0, raid_mode: 0 };
}

function upsertRaidTracker(guildId, joinCount, windowStart, raidMode) {
  db.prepare('INSERT INTO raid_tracker (guild_id, join_count, window_start, raid_mode) VALUES (?, ?, ?, ?) ON CONFLICT(guild_id) DO UPDATE SET join_count = ?, window_start = ?, raid_mode = ?')
    .run(guildId, joinCount, windowStart, raidMode, joinCount, windowStart, raidMode);
}

module.exports = {
  initDatabase, getDb,
  addWarning, getWarnings, removeWarning, clearWarnings,
  getSettings, upsertSettings,
  getNextTicketNumber,
  createTicket, getTicket, getTicketById, updateTicket,
  getUserOpenTickets, getGuildOpenTickets, getGuildClosedTickets, getTicketStats,
  addSuggestion, getSuggestion,
  createGiveaway, getGiveaway, getActiveGiveaways, endGiveaway,
  saveBackup, getLatestBackup,
  getSpamRecord, upsertSpamRecord, resetSpamRecord,
  getRaidTracker, upsertRaidTracker,
};
