import fs from 'node:fs';
import path from 'node:path';
import { loadPromptSource } from '@/lib/tool-prompts/loader';
import { TOOL_PROMPT_REGISTRY, type ToolPromptPath } from '@/lib/tool-prompts/registry';

const PROMPTS_ROOT = path.join(process.cwd(), 'src/lib/tool-prompts/prompts');

const PROMPT_PATHS: ToolPromptPath[] = [
  TOOL_PROMPT_REGISTRY.metaAds.generation,
  TOOL_PROMPT_REGISTRY.funnel.optin,
  TOOL_PROMPT_REGISTRY.funnel.quiz,
  TOOL_PROMPT_REGISTRY.funnel.vsl,
];

function normalize(text: string): string {
  return text.replace(/\r\n/g, '\n').trimEnd();
}

function canonicalizeMarkdown(text: string): string {
  return normalize(text)
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

function extractHeadings(markdown: string): string[] {
  return canonicalizeMarkdown(markdown)
    .split('\n')
    .map((line) => line.match(/^#{1,6}\s+(.+)$/)?.[1]?.trim())
    .filter((value): value is string => Boolean(value));
}

describe('tool prompt parity', () => {
  it.each(PROMPT_PATHS)('keeps runtime template structurally aligned with source markdown for %s', async (relativePath) => {
    const sourcePath = path.join(PROMPTS_ROOT, relativePath);
    const markdownSource = canonicalizeMarkdown(fs.readFileSync(sourcePath, 'utf8'));
    const runtimeTemplate = canonicalizeMarkdown(await loadPromptSource(relativePath));

    const sourceHeadings = extractHeadings(markdownSource);
    const runtimeHeadings = extractHeadings(runtimeTemplate);

    expect(runtimeTemplate.length).toBeGreaterThan(0);
    expect(runtimeHeadings).toEqual(sourceHeadings);

    // Keep a coarse parity guard without failing on minor wording-only edits.
    expect(runtimeTemplate.length).toBeGreaterThanOrEqual(Math.floor(markdownSource.length * 0.7));
    expect(runtimeTemplate.length).toBeLessThanOrEqual(Math.ceil(markdownSource.length * 1.3));
  });

  it('enforces markdown output contract for Meta Ads and Funnel workflows', async () => {
    const [meta, optin, quiz] = await Promise.all([
      loadPromptSource(TOOL_PROMPT_REGISTRY.metaAds.generation),
      loadPromptSource(TOOL_PROMPT_REGISTRY.funnel.optin),
      loadPromptSource(TOOL_PROMPT_REGISTRY.funnel.quiz),
    ]);

    expect(meta).toContain('Restituisci solo markdown');
    expect(optin).toContain('Restituisci SOLO markdown');
    expect(quiz).toContain('Restituisci SOLO markdown');

    expect(meta).toContain('Non includere code fences');
    expect(optin).toContain('Non includere code fences');
    expect(quiz).toContain('Non includere code fences');
  });

  it('enforces markdown-only output contract for VSL workflow', async () => {
    const vsl = await loadPromptSource(TOOL_PROMPT_REGISTRY.funnel.vsl);

    expect(vsl).toContain('Restituisci SOLO markdown');
    expect(vsl).toContain('Niente JSON');
    expect(vsl).toContain('Niente code fences');
  });
});
