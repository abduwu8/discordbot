import type { Server } from 'node:http';
import { env } from './config/env.js';
import { clientOptions } from './config/client.js';
import './database/supabase.js';
import { loadCommands } from './handlers/loadCommands.js';
import { loadEvents } from './handlers/loadEvents.js';
import { registerSlashCommands } from './handlers/registerCommands.js';
import { startHealthServer } from './http/server.js';
import { BellaClient } from './types/client.js';
import { logger } from './utils/logger.js';

const client = new BellaClient(clientOptions);
let httpServer: Server | undefined;

async function bootstrap(): Promise<void> {
  logger.info(`Starting Bella (${env.NODE_ENV})`);
  logger.success(`Supabase client initialized (${env.SUPABASE_URL})`);

  httpServer = startHealthServer(env.PORT, client);

  await loadEvents(client);
  await loadCommands(client);

  if (env.NODE_ENV === 'production') {
    try {
      await registerSlashCommands(client);
    } catch (error: unknown) {
      logger.error('Failed to register slash commands on startup:', error);
    }
  }

  await client.login(env.DISCORD_TOKEN);
}

async function shutdown(signal: string): Promise<void> {
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
