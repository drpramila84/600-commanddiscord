# Discord.js v14 Multipurpose Bot

## Overview
This is a feature-rich Discord bot built with Discord.js v14. The bot includes admin commands, automod, anime, economy, fun, giveaways, image manipulation, invite tracking, moderation, music, and more.

**Current State**: Imported from GitHub and configured for Replit environment.

## Recent Changes
- **October 26, 2025**: 
  - Imported project from GitHub repository
  - Updated .gitignore to exclude .env and logs
  - Created .env.example template for environment variables
  - Configured workflow to run the Discord bot
  - Secured exposed credentials (removed from .env)

## Project Architecture

### Main Components
- **bot.js**: Entry point that initializes the Discord bot client
- **config.js**: Bot configuration (features, colors, plugins)
- **src/commands/**: Command modules organized by category
- **src/events/**: Discord event handlers
- **src/handlers/**: Feature handlers (automod, music, tickets, etc.)
- **src/database/**: MongoDB schemas and connection
- **dashboard/**: Optional web dashboard (currently disabled)

### Technology Stack
- **Language**: Node.js v18+
- **Discord Library**: discord.js v14
- **Database**: MongoDB (via Mongoose)
- **Optional Features**: Express dashboard, Lavalink music system

### Key Features (Configurable in config.js)
- Automod system
- Economy system
- Music player (Lavalink - currently disabled)
- Giveaway system
- Ticket system
- Statistics/leveling
- Suggestion system
- Dashboard (currently disabled)

## Environment Variables

### Required
- `BOT_TOKEN`: Discord bot token from [Discord Developer Portal](https://discord.com/developers/applications)
- `MONGO_CONNECTION`: MongoDB connection string (e.g., from MongoDB Atlas)

### Optional
- `WEATHERSTACK_KEY`: For weather command
- `STRANGE_API_KEY`: For image manipulation commands
- `SPOTIFY_CLIENT_ID` & `SPOTIFY_CLIENT_SECRET`: For Spotify music support (if music enabled)
- `ERROR_LOGS` & `JOIN_LEAVE_LOGS`: Discord webhook URLs for logging
- `BOT_SECRET` & `SESSION_PASSWORD`: For dashboard (if enabled)

## Configuration Notes

### Dashboard
Currently disabled in config.js. To enable:
1. Set `DASHBOARD.enabled: true` in config.js
2. Configure `DASHBOARD.baseURL` and port
3. Add `BOT_SECRET` and `SESSION_PASSWORD` to environment
4. Update workflow to use port 5000 for the dashboard

### Music System
Currently disabled in config.js. Requires Lavalink server setup.

## Running the Bot

The bot starts automatically via the configured workflow:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## User Preferences
None recorded yet.

## Setup Requirements

### Discord Bot Setup
1. Create application at https://discord.com/developers/applications
2. Create a bot and copy the token
3. Enable required intents (Guild Members, Message Content, etc.)
4. Generate invite URL with appropriate permissions

### MongoDB Setup
1. Create free cluster at https://www.mongodb.com/atlas
2. Create database user
3. Whitelist IP (0.0.0.0/0 for cloud environments)
4. Get connection string

## Dependencies
All npm packages are pre-installed. See package.json for complete list.
