import { DiscordAPIError } from 'discord.js';
import { env } from '../src/config/env.js';
import { registerSlashCommands } from '../src/handlers/registerCommands.js';
import { logger } from '../src/utils/logger.js';

function inviteUrl(): string {
  const params = new URLSearchParams({
    client_id: env.CLIENT_ID,
    scope: 'bot applications.commands',
    permissions: '0',
    guild_id: env.GUILD_ID,
  });

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

void registerSlashCommands().catch((error: unknown) => {
  logger.error('Failed to register slash commands:', error);

  if (error instanceof DiscordAPIError && error.code === 50001) {
    logger.error(
      'Missing Access (50001): the bot is not in that guild, or it was invited without the applications.commands scope.',
    );
    logger.info(`Re-invite Bella with this URL, then run npm run commands:register again:\n${inviteUrl()}`);
  }

  process.exit(1);
});
