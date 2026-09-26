import { Events } from 'discord.js';
import { handleBattleReadyReaction } from '../features/battle/handler.js';
import type { Event } from '../types/event.js';
import { logger } from '../utils/logger.js';

export const event: Event<Events.MessageReactionAdd> = {
  name: Events.MessageReactionAdd,
  async execute(reaction, user) {
    try {
      await handleBattleReadyReaction(reaction, user, true);
    } catch (error: unknown) {
      logger.error('Failed to handle battle ready reaction:', error);
    }
  },
};
