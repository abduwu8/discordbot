import { relative } from 'node:path';
import type { BellaClient } from '../types/client.js';
import { isEvent } from '../types/event.js';
import { logger } from '../utils/logger.js';
import { collectFiles, importModule } from '../utils/modules.js';
import { eventsPath, srcRoot } from '../utils/paths.js';

export async function loadEvents(client: BellaClient): Promise<void> {
  const files = await collectFiles(eventsPath);
  let loaded = 0;

  for (const file of files) {
    const exported = await importModule(file);
    const candidate = exported.event ?? exported.default;

    if (!isEvent(candidate)) {
      logger.warn(`Skipped event file without a valid export: ${relative(srcRoot, file)}`);
      continue;
    }

    const runner = (...args: Parameters<typeof candidate.execute>) => {
      void Promise.resolve(candidate.execute(...args)).catch((error: unknown) => {
        logger.error(`Unhandled error in event "${String(candidate.name)}":`, error);
      });
    };

    if (candidate.once) {
      client.once(candidate.name, runner);
    } else {
      client.on(candidate.name, runner);
    }

    loaded += 1;
    logger.info(`Loaded event ${String(candidate.name)}${candidate.once ? ' (once)' : ''}`);
  }

  logger.success(`Events ready (${loaded})`);
}
