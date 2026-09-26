import { Events } from 'discord.js';
import { syncDevGuildCommands } from '../handlers/syncGuildCommands.js';
import { BellaClient } from '../types/client.js';
import type { Event } from '../types/event.js';
import { logger } from '../utils/logger.js';

export const event: Event<Events.GuildCreate> = {
  name: Events.GuildCreate,
  async execute(guild) {
    logger.info(`Joined guild ${guild.name} (${guild.id})`);

    const client = guild.client;
    if (client instanceof BellaClient) {
      await syncDevGuildCommands(client, guild.id);
    }
  },
};
