import { REST, Routes } from 'discord.js';
import { env } from '../config/env.js';
import { commandGuildIds } from '../config/guilds.js';
import type { BellaClient } from '../types/client.js';
import { collectCommandData } from './loadCommands.js';
import { logger } from '../utils/logger.js';

export async function registerSlashCommands(client?: BellaClient): Promise<void> {
  const body = client
    ? [...client.commands.values()].map((command) => command.data.toJSON())
    : await collectCommandData();

  if (body.length === 0) {
    logger.warn('No commands found to register.');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(env.DISCORD_TOKEN);

  logger.info(`Registering ${body.length} slash command(s) (${env.NODE_ENV})…`);

  if (env.NODE_ENV === 'production') {
    await rest.put(Routes.applicationCommands(env.CLIENT_ID), { body });
    logger.success('Registered global application commands.');
    return;
  }

  for (const guildId of commandGuildIds()) {
    await rest.put(Routes.applicationGuildCommands(env.CLIENT_ID, guildId), { body });
    logger.success(`Registered guild commands for ${guildId}.`);
  }
}
