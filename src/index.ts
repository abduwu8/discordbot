import './net.js';
import type { Server } from 'node:http';
import { env } from './config/env.js';
import { clientOptions } from './config/client.js';
import './database/supabase.js';
import { loadCommands } from './handlers/loadCommands.js';
import { loadEvents } from './handlers/loadEvents.js';
import { registerSlashCommands } from './handlers/registerCommands.js';
import { attachGatewayWatch } from './discord/gatewayWatch.js';
import { startHealthServer } from './http/server.js';
import { BellaClient } from './types/client.js';
import { logger } from './utils/logger.js';

const client = new BellaClient(clientOptions);
let httpServer: Server | undefined;
let shuttingDown = false;

async function bootstrap(): Promise<void> {
  logger.info(`Starting Bella (${env.NODE_ENV})`);
  logger.success(`Supabase client initialized (${env.SUPABASE_URL})`);

  httpServer = startHealthServer(env.PORT, client);

  await loadEvents(client);
  await loadCommands(client);
  attachGatewayWatch(client, () => shuttingDown);

  await probeDiscordToken(env.DISCORD_TOKEN);
  logger.info(`Logging in to Discord (token length ${env.DISCORD_TOKEN.length})`);
  await client.login(env.DISCORD_TOKEN);

  if (env.NODE_ENV === 'production') {
    try {
      await registerSlashCommands(client);
    } catch (error: unknown) {
      logger.error('Failed to register slash commands on startup:', error);
    }
  }
}

async function shutdown(signal: string): Promise<void> {
  shuttingDown = true;
  logger.info(`Received ${signal}; shutting down Bella`);

  try {
    client.destroy();
  } catch (error: unknown) {
    logger.error('Error while destroying the Discord client:', error);
  }

  if (httpServer) {
    await new Promise<void>((resolve) => {
      httpServer?.close(() => resolve());
    });
  }

  process.exit(0);
}

process.once('SIGINT', () => {
  void shutdown('SIGINT');
});
process.once('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled promise rejection:', reason);
});

void bootstrap().catch((error: unknown) => {
  logger.error('Bella failed to start:', error);
  process.exit(1);
});

async function probeDiscordToken(token: string): Promise<void> {
  try {
    const response = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bot ${token}` },
    });

    if (response.ok) {
      const user = (await response.json()) as { username?: string };
      logger.success(`Discord REST reachable as ${user.username ?? 'unknown'}`);
      return;
    }

    const body = await response.text();
    logger.error(`Discord REST rejected the token (HTTP ${response.status}): ${body.slice(0, 300)}`);
  } catch (error: unknown) {
    logger.error('Discord REST probe failed (network):', error);
  }
}
