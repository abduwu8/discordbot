export const ownerUserId = '735490149923815484';

export function isBotOwner(userId: string): boolean {
  return userId === ownerUserId;
}
