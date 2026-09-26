import { Events } from 'discord.js';
import { syncDevCommandsForAllGuilds } from '../handlers/syncGuildCommands.js';
import { BellaClient } from '../types/client.js';
import type { Event } from '../types/event.js';
import { logger } from '../utils/logger.js';

let syncedGuildCommands = false;

export const event: Event<Events.ClientReady> = {
  name: Events.ClientReady,
  once: false,
  async execute(readyClient) {
    logger.success(`Bella is online as ${readyClient.user.tag}`);
    logger.info(`Serving ${readyClient.guilds.cache.size} guild(s)`);

    if (!syncedGuildCommands && readyClient instanceof BellaClient) {
      syncedGuildCommands = true;
      await syncDevCommandsForAllGuilds(readyClient);
    }
  },
};
