import { env } from '../config/env.js';
import { BellaClient } from '../types/client.js';
import { logger } from '../utils/logger.js';

export async function syncDevGuildCommands(client: BellaClient, guildId: string): Promise<void> {
  if (env.NODE_ENV === 'production') {
    return;
  }

  const body = [...client.commands.values()].map((command) => command.data.toJSON());
  if (body.length === 0 || !client.application) {
    return;
  }

  await client.application.commands.set(body, guildId);
  logger.success(`Synced ${body.length} guild command(s) to ${guildId}`);
}

export async function syncDevCommandsForAllGuilds(client: BellaClient): Promise<void> {
  for (const guild of client.guilds.cache.values()) {
    await syncDevGuildCommands(client, guild.id);
  }
}
