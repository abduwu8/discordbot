import type {
  AutocompleteInteraction,
  ChatInputCommandInteraction,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
} from 'discord.js';
import type { BellaClient } from './client.js';

export interface Command {
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  cooldownSeconds?: number;
  public?: boolean;
  execute(interaction: ChatInputCommandInteraction, client: BellaClient): Promise<void>;
  autocomplete?(interaction: AutocompleteInteraction, client: BellaClient): Promise<void>;
}

export function isCommand(value: unknown): value is Command {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Partial<Command>;
  return (
    typeof candidate.data === 'object' &&
    candidate.data !== null &&
    typeof candidate.data.name === 'string' &&
    typeof candidate.execute === 'function'
  );
}
