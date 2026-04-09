import 'server-only';

import type { ToolPromptPath } from './registry';
import { PROMPT_TEMPLATES } from './templates';

const cache = new Map<string, string>();

export async function loadPromptSource(relativePath: ToolPromptPath): Promise<string> {
  if (cache.has(relativePath)) return cache.get(relativePath)!;

  const content = PROMPT_TEMPLATES[relativePath];
  cache.set(relativePath, content);
  return content;
}

export function injectTemplateValues(template: string, values: Record<string, string>) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, key: string) => values[key] ?? `{{${key}}}`);
}
