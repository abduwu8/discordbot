import { env } from './env.js';

export const extraGuildIds = ['1537131217558835303'] as const;

export function commandGuildIds(): string[] {
  const fromEnv = env.GUILD_ID.split(/[,\s]+/).filter(Boolean);
  return [...new Set([...fromEnv, ...extraGuildIds])];
}

export function botInviteUrl(guildId: string): string {
  const params = new URLSearchParams({
    client_id: env.CLIENT_ID,
    scope: 'bot applications.commands',
    permissions: '0',
    guild_id: guildId,
  });

  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}
