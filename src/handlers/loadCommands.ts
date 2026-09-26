import { relative } from 'node:path';
import type { RESTPostAPIApplicationCommandsJSONBody } from 'discord.js';
import type { BellaClient } from '../types/client.js';
import { isCommand } from '../types/command.js';
import { logger } from '../utils/logger.js';
import { collectFiles, importModule } from '../utils/modules.js';
import { commandsPath, srcRoot } from '../utils/paths.js';

export async function loadCommands(client: BellaClient): Promise<void> {
  const files = await collectFiles(commandsPath);

  for (const file of files) {
    const exported = await importModule(file);
    const candidate = exported.command ?? exported.default;

    if (!isCommand(candidate)) {
      logger.warn(`Skipped command file without a valid export: ${relative(srcRoot, file)}`);
      continue;
    }

    if (!candidate.public) {
      candidate.data.setDefaultMemberPermissions(0n);
    }
    client.commands.set(candidate.data.name, candidate);
    logger.info(`Loaded command /${candidate.data.name}`);
  }

  logger.success(`Commands ready (${client.commands.size})`);
}

export async function collectCommandData(): Promise<RESTPostAPIApplicationCommandsJSONBody[]> {
  const files = await collectFiles(commandsPath);
  const body: RESTPostAPIApplicationCommandsJSONBody[] = [];

  for (const file of files) {
    const exported = await importModule(file);
    const candidate = exported.command ?? exported.default;

    if (!isCommand(candidate)) {
      continue;
    }

    if (!candidate.public) {
      candidate.data.setDefaultMemberPermissions(0n);
    }
    body.push(candidate.data.toJSON());
  }

  return body;
}
