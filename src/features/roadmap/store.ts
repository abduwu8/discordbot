import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { roadmapLocksPath } from '../../utils/paths.js';
import type { RoadmapDraft } from './options.js';

const ttlMs = 15 * 60 * 1000;
export const roadmapCooldownMs = 24 * 60 * 60 * 1000;

export type RoadmapLock = {
  createdAt: number;
  title: string;
  meta: string;
  text: string;
};

const drafts = new Map<string, { draft: RoadmapDraft; expires: number }>();
let locks = new Map<string, RoadmapLock>();
let locksLoaded = false;

function emptyDraft(): RoadmapDraft {
  return { goal: undefined, time: undefined, level: undefined };
}

function prune(now = Date.now()): void {
  for (const [userId, entry] of drafts) {
    if (entry.expires <= now) {
      drafts.delete(userId);
    }
  }
}

function loadLocks(): void {
  if (locksLoaded) {
    return;
  }
  locksLoaded = true;
  if (!existsSync(roadmapLocksPath)) {
    return;
  }
  try {
    const raw = JSON.parse(readFileSync(roadmapLocksPath, 'utf8')) as Record<string, RoadmapLock>;
    locks = new Map(Object.entries(raw));
  } catch {
    locks = new Map();
  }
}

function saveLocks(): void {
  mkdirSync(dirname(roadmapLocksPath), { recursive: true });
  writeFileSync(roadmapLocksPath, JSON.stringify(Object.fromEntries(locks), null, 2));
}

function pruneLocks(now = Date.now()): void {
  loadLocks();
  let changed = false;
  for (const [userId, lock] of locks) {
    if (lock.createdAt + roadmapCooldownMs <= now) {
      locks.delete(userId);
      changed = true;
    }
  }
  if (changed) {
    saveLocks();
  }
}

export function getRoadmapLock(userId: string): RoadmapLock | undefined {
  pruneLocks();
  return locks.get(userId);
}

export function cooldownLeftMs(userId: string): number {
  const lock = getRoadmapLock(userId);
  if (!lock) {
    return 0;
  }
  return Math.max(0, lock.createdAt + roadmapCooldownMs - Date.now());
}

export function saveRoadmapLock(userId: string, lock: Omit<RoadmapLock, 'createdAt'>): void {
  loadLocks();
  locks.set(userId, { ...lock, createdAt: Date.now() });
  saveLocks();
}

export function formatCooldown(ms: number): string {
  const totalMinutes = Math.max(1, Math.ceil(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) {
    return `${minutes}m`;
  }
  return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
}

export function getDraft(userId: string): RoadmapDraft {
  prune();
  const entry = drafts.get(userId);
  if (!entry) {
    return emptyDraft();
  }

  return entry.draft;
}

export function patchDraft(userId: string, patch: Partial<RoadmapDraft>): RoadmapDraft {
  prune();
  const current = getDraft(userId);
  const draft: RoadmapDraft = {
    goal: 'goal' in patch ? patch.goal : current.goal,
    time: 'time' in patch ? patch.time : current.time,
    level: 'level' in patch ? patch.level : current.level,
  };
  drafts.set(userId, { draft, expires: Date.now() + ttlMs });
  return draft;
}

export function resetDraft(userId: string): RoadmapDraft {
  const draft = emptyDraft();
  drafts.set(userId, { draft, expires: Date.now() + ttlMs });
  return draft;
}

export function clearDraft(userId: string): void {
  drafts.delete(userId);
}
