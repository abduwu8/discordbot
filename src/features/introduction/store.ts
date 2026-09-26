import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { introductionsPath } from '../../utils/paths.js';

export type IntroductionEntry = {
  name: string;
  university: string;
  course: string;
  hobbies: string;
  updatedAt: number;
};

export type IntroductionBoard = {
  channelId: string;
  messageId: string;
};

type GuildIntroductions = {
  board?: IntroductionBoard;
  entries: Record<string, IntroductionEntry>;
};

type IntroductionFile = Record<string, GuildIntroductions>;

let cache: IntroductionFile = {};
let loaded = false;

function load(): IntroductionFile {
  if (loaded) {
    return cache;
  }
  loaded = true;
  if (!existsSync(introductionsPath)) {
    cache = {};
    return cache;
  }
  try {
    const raw = JSON.parse(readFileSync(introductionsPath, 'utf8')) as IntroductionFile;
    cache = raw && typeof raw === 'object' ? raw : {};
  } catch {
    cache = {};
  }
  return cache;
}

function save(): void {
  mkdirSync(dirname(introductionsPath), { recursive: true });
  writeFileSync(introductionsPath, JSON.stringify(cache, null, 2));
}

function guildData(guildId: string): GuildIntroductions {
  const file = load();
  const existing = file[guildId];
  if (existing && existing.entries && typeof existing.entries === 'object') {
    return existing;
  }
  const created: GuildIntroductions = { entries: {} };
  file[guildId] = created;
  return created;
}

export function getIntroduction(guildId: string, userId: string): IntroductionEntry | undefined {
  return guildData(guildId).entries[userId];
}

export function listIntroductions(guildId: string): Array<{ userId: string; entry: IntroductionEntry }> {
  return Object.entries(guildData(guildId).entries)
    .map(([userId, entry]) => ({ userId, entry }))
    .sort((a, b) => a.entry.updatedAt - b.entry.updatedAt);
}

export function upsertIntroduction(
  guildId: string,
  userId: string,
  fields: Omit<IntroductionEntry, 'updatedAt'>,
): { created: boolean; entry: IntroductionEntry } {
  const data = guildData(guildId);
  const created = !data.entries[userId];
  const entry: IntroductionEntry = { ...fields, updatedAt: Date.now() };
  data.entries[userId] = entry;
  save();
  return { created, entry };
}

export function getBoard(guildId: string): IntroductionBoard | undefined {
  return guildData(guildId).board;
}

export function saveBoard(guildId: string, board: IntroductionBoard): void {
  const data = guildData(guildId);
  data.board = board;
  save();
}

export function deleteIntroduction(guildId: string, userId: string): boolean {
  const data = guildData(guildId);
  if (!data.entries[userId]) {
    return false;
  }
  delete data.entries[userId];
  save();
  return true;
}
