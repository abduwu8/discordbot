import { DiscordAPIError } from 'discord.js';
import { botInviteUrl, commandGuildIds } from '../src/config/guilds.js';
import { registerSlashCommands } from '../src/handlers/registerCommands.js';
import { logger } from '../src/utils/logger.js';

void registerSlashCommands().catch((error: unknown) => {
  logger.error('Failed to register slash commands:', error);

  if (error instanceof DiscordAPIError && error.code === 50001) {
    logger.error(
      'Missing Access (50001): the bot is not in that guild, or it was invited without the applications.commands scope.',
    );
    for (const guildId of commandGuildIds()) {
      logger.info(`Invite Bella to ${guildId}:\n${botInviteUrl(guildId)}`);
    }
  }

  process.exit(1);
});
