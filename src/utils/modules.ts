import { readdir } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { pathToFileURL } from 'node:url';

const MODULE_EXTENSIONS = new Set(['.js', '.ts']);

function isLoadableFile(name: string): boolean {
  if (name.startsWith('_') || name.endsWith('.d.ts') || name.endsWith('.map')) {
    return false;
  }

  return MODULE_EXTENSIONS.has(extname(name));
}

export async function collectFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await collectFiles(fullPath)));
      continue;
    }

    if (entry.isFile() && isLoadableFile(entry.name)) {
      files.push(fullPath);
    }
  }

  return files;
}

export async function importModule(filePath: string): Promise<Record<string, unknown>> {
  const href = pathToFileURL(filePath).href;
  return (await import(href)) as Record<string, unknown>;
}
