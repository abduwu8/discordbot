import { Events } from 'discord.js';
import { handleBattleReadyReaction } from '../features/battle/handler.js';
import type { Event } from '../types/event.js';
import { logger } from '../utils/logger.js';

export const event: Event<Events.MessageReactionRemove> = {
  name: Events.MessageReactionRemove,
  async execute(reaction, user) {
    try {
      await handleBattleReadyReaction(reaction, user, false);
    } catch (error: unknown) {
      logger.error('Failed to handle battle ready reaction removal:', error);
    }
  },
};
