import {
  Collection,
  Client as DiscordClient,
  type ClientOptions,
  type Snowflake,
} from 'discord.js';
import type { Command } from './command.js';

export class BellaClient extends DiscordClient {
  public readonly commands: Collection<Snowflake | string, Command>;

  public constructor(options: ClientOptions) {
    super(options);
    this.commands = new Collection();
  }
}
