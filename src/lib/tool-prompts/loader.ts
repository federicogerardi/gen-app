import 'server-only';

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { PROMPT_SOURCE_ROOT, type ToolPromptPath } from './registry';

const cache = new Map<string, string>();

export async function loadPromptSource(relativePath: ToolPromptPath): Promise<string> {
  const normalized = relativePath.replace(/^\/+/, '');
  if (normalized.includes('..')) {
    throw new Error('Invalid prompt path');
  }
  if (cache.has(normalized)) return cache.get(normalized)!;

  const absolutePath = path.join(process.cwd(), ...PROMPT_SOURCE_ROOT, normalized);
  const content = await readFile(absolutePath, 'utf8');
  cache.set(normalized, content);
  return content;
}

export function injectTemplateValues(template: string, values: Record<string, string>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => values[key] ?? `{{${key}}}`);
}
