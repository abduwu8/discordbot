# Bella

Production-ready Discord bot boilerplate built with **TypeScript**, **Node.js (ESM)**, **discord.js v14**, and **Supabase**.

This repository is the foundation only: client bootstrap, dynamic command/event loading, environment validation, logging, and a `/ping` example. Feature work (roadmaps, resources, AI, progress tracking) is intentionally left for later.

## Requirements

- Node.js 20 or later (Node 22 recommended on Render)
- A [Discord application](https://discord.com/developers/applications) with a bot user
- A [Supabase](https://supabase.com) project (URL + anon key)

## Install

```bash
cd bca-discord-bot
npm install
```

## Environment variables

Copy the example file and fill in real values:

```bash
cp .env.example .env
# Windows: copy .env.example .env
```

| Variable            | Description                                      |
| ------------------- | ------------------------------------------------ |
| `DISCORD_TOKEN`     | Bot token from the Discord Developer Portal      |
| `CLIENT_ID`         | Application ID                                   |
| `GUILD_ID`          | Development guild (server) ID                    |
| `SUPABASE_URL`      | Supabase project URL                             |
| `SUPABASE_ANON_KEY` | Supabase anonymous (public) API key              |
| `NODE_ENV`          | `development`, `production`, or `test`           |

The process exits on startup if any required value is missing or invalid.

Invite the bot with `applications.commands` and `bot` scopes. Privileged intents for **Server Members** should be enabled in the Developer Portal to match the default gateway setup.

## Register slash commands

Commands are loaded from `src/commands`. Register them with Discord before running the bot:

```bash
npm run commands:register
```

- **development** — guild commands (appear immediately in `GUILD_ID`)
- **production** — global application commands (can take up to an hour to propagate)

Re-run this script whenever you add, rename, or remove a command.

## Run locally

```bash
npm run dev
```

`tsx watch` restarts the process when source files change. You should see load logs, a Supabase init message, and `Bella is online as …` from the ready event. Use `/ping` in the development guild to verify slash command handling.

Production:

```bash
npm run build
npm start
```

The process also binds an HTTP server on `PORT` (default `10000`) and serves `GET /health`. Render’s free web service requires this public HTTP listener.

## Deploy on Render (free web service)

1. Push this folder to GitHub (the directory that contains `package.json` and `render.yaml`).
2. In [Render](https://dashboard.render.com), create a **Web Service** from that repo, or apply the Blueprint (`render.yaml`).
3. Use:
   - **Runtime:** Node
   - **Build command:** `npm ci --include=dev && npm run build`
   - **Start command:** `npm start`
   - **Health check path:** `/health`
   - **Instance type:** Free
4. Set environment variables (same names as `.env.example`). `NODE_ENV` must be `production`. Render injects `PORT`; do not hard-code it.
5. After the first deploy, open `https://<your-service>.onrender.com/health` and confirm it returns JSON.

Free web services sleep after about 15 minutes without inbound HTTP traffic, which drops the Discord gateway connection. Ping `/` every 5–10 minutes with an uptime monitor so the bot stays awake.

**Do not run the bot locally with the same `DISCORD_TOKEN` as Render.** Discord allows one gateway session per token. `npm run dev` on your PC steals the connection from Render; when you close the terminal, that session dies and Render’s process can be left with HTTP still “up” while the bot is offline in Discord. Stop the local process (or use a separate development bot application) and let only Render hold the production token.

`GET /` is a keep-alive (always HTTP 200). `GET /health` is ready only when the Discord gateway is connected (`ok: true`); otherwise it returns 503 so Render can restart.

Local JSON files under `data/` are ephemeral on Render (no persistent disk on the free tier). Cooldowns and introductions reset on every restart.

## Scripts

| Script                    | Purpose                         |
| ------------------------- | ------------------------------- |
| `npm run dev`             | Watch mode via `tsx`            |
| `npm run build`           | Compile TypeScript to `dist/`   |
| `npm start`               | Run the compiled bot            |
| `npm run lint`            | ESLint                          |
| `npm run format`          | Prettier                        |
| `npm run commands:register` | Push slash commands to Discord |

## Project structure

```
bca-discord-bot/
├── src/
│   ├── commands/      # Slash commands (nested folders supported)
│   ├── events/        # Gateway event listeners
│   ├── handlers/      # Dynamic command and event loaders
│   ├── services/      # Domain logic (empty by design)
│   ├── database/      # Supabase client
│   ├── types/         # Shared TypeScript contracts
│   ├── utils/         # Logger and module helpers
│   ├── config/        # Env validation and client options
│   └── index.ts       # Process entry, login, graceful shutdown
├── scripts/           # One-off tooling (command registration)
└── …
```

## Adding a command

1. Create a file under `src/commands/` (subfolders are fine).
2. Export a `command` object that satisfies `Command`:

```ts
import { SlashCommandBuilder } from 'discord.js';
import type { Command } from '../../types/command.js';

export const command: Command = {
  data: new SlashCommandBuilder().setName('example').setDescription('An example command.'),
  async execute(interaction) {
    await interaction.reply('Hello from Bella.');
  },
};
```

3. Register it: `npm run commands:register`

## Adding an event

Create a file under `src/events/` and export an `event` object:

```ts
import { Events } from 'discord.js';
import type { Event } from '../types/event.js';

export const event: Event<Events.ClientReady> = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    console.log(`Ready as ${client.user.tag}`);
  },
};
```

Loaders pick up new files automatically on the next process start.

## Architecture notes

- **ESM** throughout (`"type": "module"`, NodeNext). Use `.js` extensions in TypeScript imports.
- **Handlers stay thin.** Put future business logic in `src/services/`.
- **Supabase** is initialized in `src/database/supabase.ts` with no queries yet.
- **Graceful shutdown** listens for `SIGINT` and `SIGTERM` and destroys the Discord client.

## License

Private / unlicensed unless you add one.
