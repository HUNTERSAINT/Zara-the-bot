# Server Architect 🏗️

A professional, feature-rich Discord bot built with **Discord.js v14**, **Node.js**, and **SQLite**. Deploy it once and it automatically builds and manages your entire server structure with a single command.

---

## ✨ Features

| Category | Commands / Features |
|---|---|
| **Setup** | `/setup`, `/resetserver`, `/backup`, `/restore`, `/addchannel`, `/addrole`, `/config` |
| **Moderation** | `/ban`, `/kick`, `/warn`, `/mute`, `/timeout`, `/purge`, `/lock`, `/unlock`, `/slowmode`, `/nick` |
| **AutoMod** | Anti-spam, anti-invite, anti-scam/phishing, bad word filter, caps filter, anti-raid |
| **Tickets** | Button-based tickets with open/close/claim/transcript/delete |
| **Giveaways** | `/giveaway start/end/reroll` |
| **Polls** | `/poll` with up to 10 options and auto-reactions |
| **Suggestions** | `/suggest` with 👍/👎 auto-reactions |
| **Utility** | `/serverinfo`, `/userinfo`, `/avatar`, `/roleinfo`, `/channelinfo`, `/ping`, `/botinfo` |
| **Logging** | Message delete/edit, joins/leaves, role changes, voice, mod actions, nicknames |
| **Welcome** | Auto welcome embed, Member role assignment, leave messages |

---

## 🚀 Quick Start

### 1. Prerequisites

- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- A Discord bot application and token from the [Discord Developer Portal](https://discord.com/developers/applications)

### 2. Install Dependencies

```bash
cd artifacts/discord-bot
npm install
```

### 3. Configure

Edit `config.json` with your **Client ID** and **Owner ID** (already set if you used the Replit setup wizard).

Set your `DISCORD_TOKEN` environment variable:

```bash
# Linux / macOS
export DISCORD_TOKEN=your_token_here

# Windows PowerShell
$env:DISCORD_TOKEN = "your_token_here"
```

Or create a `.env` file:

```
DISCORD_TOKEN=your_token_here
```

### 4. Invite the Bot

Use this URL (replace `CLIENT_ID` with your Application ID):

```
https://discord.com/api/oauth2/authorize?client_id=CLIENT_ID&permissions=8&scope=bot%20applications.commands
```

> **Note:** Permission `8` = Administrator. The bot needs Administrator to create channels and roles. You can restrict this further once set up.

### 5. Run

```bash
node index.js
```

### 6. First Run in Your Server

Use `/setup` (owner only) to automatically build your entire server structure.

---

## 🌐 Deploy to Replit

1. Import this project into Replit (or use the existing workspace).
2. Add `DISCORD_TOKEN` to **Secrets** (the padlock icon in the left sidebar).
3. The **Server Architect** workflow starts the bot automatically.
4. Use **Always On** (paid) or **Deployments** to keep it running 24/7.

---

## 🚂 Deploy to Railway

1. Create a new project at [railway.app](https://railway.app)
2. Connect your GitHub repository (push this folder to GitHub first).
3. Add `DISCORD_TOKEN` as an environment variable in Railway's dashboard.
4. Set the **Start Command** to `node index.js`.
5. Railway auto-deploys on every push.

---

## 🖥️ Deploy to a VPS (Ubuntu/Debian)

```bash
# Install Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone / copy your project
git clone https://github.com/yourname/server-architect.git
cd server-architect

# Install dependencies
npm install

# Set environment variables
export DISCORD_TOKEN=your_token_here

# Run with PM2 for process management
npm install -g pm2
pm2 start index.js --name "server-architect"
pm2 save
pm2 startup   # follow the printed command to auto-start on reboot
```

---

## 🗂️ Project Structure

```
artifacts/discord-bot/
├── index.js                  # Entry point — creates client, loads handlers
├── config.json               # Client ID, owner ID, colours, channel names
├── package.json              # Dependencies
│
├── handlers/
│   ├── commandHandler.js     # Loads & registers slash commands
│   └── eventHandler.js       # Loads event files
│
├── database/
│   └── database.js           # SQLite schema + all DB helpers
│
├── utils/
│   ├── embeds.js             # Reusable embed builders
│   ├── helpers.js            # Duration parsing, logging, etc.
│   ├── logger.js             # Timestamped logger
│   └── permissions.js        # Owner/permission checks
│
├── events/
│   ├── ready.js              # Login handler + giveaway timer restore
│   ├── interactionCreate.js  # Slash command & button router
│   ├── messageCreate.js      # AutoMod (spam, invites, scam, bad words)
│   ├── guildMemberAdd.js     # Welcome message, member role, anti-raid
│   ├── guildMemberRemove.js  # Leave messages + log
│   ├── guildMemberUpdate.js  # Role changes + nickname logs
│   ├── messageDelete.js      # Deleted message log
│   ├── messageUpdate.js      # Edited message log
│   ├── channelCreate.js      # Channel create log
│   ├── channelDelete.js      # Channel delete log
│   ├── channelUpdate.js      # Channel update log
│   ├── voiceStateUpdate.js   # Voice join/leave/move log
│   └── buttonHandlers/       # Ticket button handlers
│
└── commands/
    ├── admin/                # Owner-only commands
    ├── moderation/           # Staff moderation commands
    ├── utility/              # Info commands (public)
    ├── tickets/              # Ticket system
    ├── giveaway/             # Giveaway system
    └── misc/                 # Poll + suggestion
```

---

## 🔐 Security Notes

- **Owner commands** are authorised by Discord User ID (configured in `config.json`), not by server permissions. The owner can run `/setup`, `/resetserver`, etc. regardless of their server roles.
- The **bot still requires Discord permissions** (e.g. Manage Channels, Manage Roles) granted via the bot's role in each server.
- AutoMod bypasses administrators and the bot owner to prevent accidental self-moderation.

---

## 🛢️ Database

SQLite database is stored at `database/serverarchitect.db`. Tables:

| Table | Stores |
|---|---|
| `warnings` | User warnings with moderator and reason |
| `tickets` | Open/closed ticket channels |
| `suggestions` | Submitted suggestions with message IDs |
| `giveaways` | Active and ended giveaways |
| `settings` | Per-server bot configuration |
| `mutes` | Mute records |
| `backups` | Server structure snapshots |
| `spam_tracker` | Per-user message rate tracking |
| `raid_tracker` | Join rate tracking per guild |

---

## 📋 Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DISCORD_TOKEN` | ✅ | Your bot token from the Discord Developer Portal |

All other configuration (client ID, owner ID, channel names, colours) lives in `config.json`.

---

## 📜 License

MIT — free to use, modify, and distribute.
