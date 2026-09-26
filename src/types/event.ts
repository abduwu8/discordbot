import type { ClientEvents } from 'discord.js';

export interface Event<K extends keyof ClientEvents = keyof ClientEvents> {
  name: K;
  once?: boolean;
  execute(...args: ClientEvents[K]): Promise<void> | void;
}

export function isEvent(value: unknown): value is Event {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<Event>;
  return typeof candidate.name === 'string' && typeof candidate.execute === 'function';
}
