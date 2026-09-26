import { Agent } from 'undici';
import { GatewayIntentBits, Partials, type ClientOptions } from 'discord.js';

const ipv4Agent = new Agent({
  connect: {
    family: 4,
    timeout: 30_000,
  },
});

export const clientOptions = {
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.User],
  rest: {
    agent: ipv4Agent,
    timeout: 60_000,
  },
} as const satisfies ClientOptions;
