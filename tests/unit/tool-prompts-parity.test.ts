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

describe('tool prompt parity', () => {
  it.each(PROMPT_PATHS)('keeps runtime template aligned with source markdown for %s', async (relativePath) => {
    const sourcePath = path.join(PROMPTS_ROOT, relativePath);
    const markdownSource = normalize(fs.readFileSync(sourcePath, 'utf8'));
    const runtimeTemplate = normalize(await loadPromptSource(relativePath));

    expect(runtimeTemplate).toBe(markdownSource);
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
