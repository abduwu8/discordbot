import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { resumeCooldownsPath } from '../../utils/paths.js';

export const resumeCooldownMs = 24 * 60 * 60 * 1000;

type ResumeLock = {
  usedAt: number;
};

let locks = new Map<string, ResumeLock>();
let loaded = false;

function loadLocks(): void {
  if (loaded) {
    return;
  }
  loaded = true;
  if (!existsSync(resumeCooldownsPath)) {
    return;
  }
  try {
    const raw = JSON.parse(readFileSync(resumeCooldownsPath, 'utf8')) as Record<string, ResumeLock>;
    locks = new Map(Object.entries(raw));
  } catch {
    locks = new Map();
  }
}

function saveLocks(): void {
  mkdirSync(dirname(resumeCooldownsPath), { recursive: true });
  writeFileSync(resumeCooldownsPath, JSON.stringify(Object.fromEntries(locks), null, 2));
}

function prune(now = Date.now()): void {
  loadLocks();
  let changed = false;
  for (const [userId, lock] of locks) {
    if (lock.usedAt + resumeCooldownMs <= now) {
      locks.delete(userId);
      changed = true;
    }
  }
  if (changed) {
    saveLocks();
  }
}

export function resumeCooldownLeftMs(userId: string): number {
  prune();
  const lock = locks.get(userId);
  if (!lock) {
    return 0;
  }
  return Math.max(0, lock.usedAt + resumeCooldownMs - Date.now());
}

export function saveResumeCooldown(userId: string): void {
  loadLocks();
  locks.set(userId, { usedAt: Date.now() });
  saveLocks();
}

export function formatResumeCooldown(ms: number): string {
  const totalMinutes = Math.max(1, Math.ceil(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) {
    return `${minutes}m`;
  }
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}
