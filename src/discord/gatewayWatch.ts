import { Events, type Client } from 'discord.js';
import { logger } from '../utils/logger.js';

export const gatewayState = {
  everReady: false,
  rateLimitedUntil: 0,
};

export function attachGatewayWatch(client: Client): void {
  client.on(Events.ClientReady, () => {
    gatewayState.everReady = true;
    gatewayState.rateLimitedUntil = 0;
  });

  client.on(Events.Error, (error) => {
    logger.error('Discord client error:', error);
  });

  client.on(Events.Warn, (message) => {
    logger.warn(`Discord: ${message}`);
  });

  client.on(Events.Invalidated, () => {
    logger.error('Discord session invalidated (usually another process used this token)');
  });

  client.on(Events.ShardDisconnect, (event, shardId) => {
    logger.warn(`Shard ${shardId} disconnected (code ${event.code}: ${event.reason || 'no reason'})`);
    if (event.code === 4014) {
      logger.error('Discord closed the gateway: enable Server Members Intent in the Developer Portal.');
    }
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
}
