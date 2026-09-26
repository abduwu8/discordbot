import { supabase } from '../../database/supabase.js';
import { logger } from '../../utils/logger.js';
import { localRoadmapResources, type CatalogResource } from './catalog.js';
import {
  findTime,
  type GoalId,
  type LevelId,
  type TimeId,
} from './options.js';

const allowedLevels: Record<LevelId, LevelId[]> = {
  beg: ['beg'],
  some: ['beg', 'some'],
  int: ['some', 'int'],
};

type Row = {
  id: string;
  title: string;
  url: string;
  kind: string;
  tracks: string[] | null;
  level: string;
};

function asKind(value: string): CatalogResource['kind'] {
  if (value === 'course' || value === 'practice') {
    return value;
  }

  return 'docs';
}

function fromRow(row: Row): CatalogResource | undefined {
  if (!row.id || !row.title || !row.url) {
    return undefined;
  }

  const tracks = (row.tracks ?? []).filter(
    (track): track is GoalId =>
      track === 'aiml' || track === 'be' || track === 'fs' || track === 'ds' || track === 'ops',
  );
  if (tracks.length === 0) {
    return undefined;
  }

  const level: LevelId = row.level === 'int' || row.level === 'some' ? row.level : 'beg';

  return {
    id: String(row.id).slice(0, 12),
    title: row.title.slice(0, 60),
    url: row.url,
    kind: asKind(row.kind),
    tracks,
    level,
  };
}

function filterPool(
  pool: CatalogResource[],
  goal: GoalId,
  level: LevelId,
  cap: number,
): CatalogResource[] {
  const allowed = new Set(allowedLevels[level]);
  const matched = pool.filter((item) => item.tracks.includes(goal) && allowed.has(item.level));
  const ranked = matched.sort((a, b) => {
    if (a.level === level && b.level !== level) {
      return -1;
    }
    if (b.level === level && a.level !== level) {
      return 1;
    }
    return 0;
  });

  const seen = new Set<string>();
  const unique: CatalogResource[] = [];
  for (const item of ranked) {
    if (seen.has(item.id)) {
      continue;
    }
    seen.add(item.id);
    unique.push(item);
    if (unique.length >= cap) {
      break;
    }
  }

  return unique;
}

async function fromSupabase(goal: GoalId): Promise<CatalogResource[] | undefined> {
  const { data, error } = await supabase
    .from('resources')
    .select('id,title,url,kind,tracks,level')
    .contains('tracks', [goal])
    .limit(24);

  if (error) {
    logger.warn(`Roadmap resource query skipped: ${error.message}`);
    return undefined;
  }

  if (!data?.length) {
    return undefined;
  }

  return data
    .map((row) => fromRow(row as Row))
    .filter((item): item is CatalogResource => item !== undefined);
}

export async function retrieveRoadmapResources(
  goal: GoalId,
  level: LevelId,
  time: TimeId,
): Promise<CatalogResource[]> {
  const cap = findTime(time)?.weeks ?? 10;
  const remote = await fromSupabase(goal);
  const pool = remote?.length ? remote : localRoadmapResources;
  const picked = filterPool(pool, goal, level, cap);
  if (picked.length > 0) {
    return picked;
  }

  return filterPool(localRoadmapResources, goal, level, cap);
}
