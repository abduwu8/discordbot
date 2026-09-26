import { Events, type Client } from 'discord.js';
import { logger } from '../utils/logger.js';

export const gatewayState = {
  everReady: false,
};

/**
 * Discord allows only one gateway session per bot token. A local `npm run dev`
 * with the same token kicks Render off. After a stolen/invalidated session,
 * exiting lets Render start a clean login — but only after we have been ready
 * once, so startup health checks do not kill the process before login.
 */
export function attachGatewayWatch(client: Client, isShuttingDown: () => boolean): void {
  const recycle = (reason: string): void => {
    if (isShuttingDown()) {
      return;
    }

    logger.error(`Discord gateway unusable (${reason}); exiting so the host can restart`);
    process.exit(1);
  };

  client.on(Events.ClientReady, () => {
    gatewayState.everReady = true;
  });

  client.on(Events.Error, (error) => {
    logger.error('Discord client error:', error);
  });

  client.on(Events.Warn, (message) => {
    logger.warn(`Discord: ${message}`);
  });

  client.on(Events.Invalidated, () => {
    logger.error('Discord session invalidated (usually another process used this token)');
    recycle('invalidated');
  });

  client.on(Events.ShardDisconnect, (event, shardId) => {
    logger.warn(`Shard ${shardId} disconnected (code ${event.code}: ${event.reason || 'no reason'})`);
  });

  client.on(Events.ShardReconnecting, (shardId) => {
    logger.info(`Shard ${shardId} reconnecting`);
  });

  client.on(Events.ShardResume, (shardId, replayed) => {
    logger.success(`Shard ${shardId} resumed (${replayed} events replayed)`);
  });

  client.on(Events.ShardError, (error, shardId) => {
    logger.error(`Shard ${shardId} error:`, error);
  });

  client.on(Events.Debug, (message) => {
    if (gatewayState.everReady) {
      return;
    }

    logger.info(`[discord] ${message}`);
  });

  setTimeout(() => {
    if (isShuttingDown() || client.isReady()) {
      return;
    }

    logger.error(
      'Discord login still not ready after 90s. Check DISCORD_TOKEN, Server Members intent, and that no other host uses this token.',
    );
  }, 90_000);

  setInterval(() => {
    if (isShuttingDown() || !gatewayState.everReady || client.isReady()) {
      return;
    }

    recycle('disconnected after ready');
  }, 30_000);
}
