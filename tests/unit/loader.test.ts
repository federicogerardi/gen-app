/** @jest-environment node */

import { TOOL_PROMPT_REGISTRY } from '@/lib/tool-prompts/registry';
import { PROMPT_TEMPLATES } from '@/lib/tool-prompts/templates';
import { loadPromptSource, injectTemplateValues } from '@/lib/tool-prompts/loader';

describe('loadPromptSource', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('returns the static template content for a registered prompt path', async () => {
    const path = TOOL_PROMPT_REGISTRY.metaAds.generation;
    const content = await loadPromptSource(path);

    expect(content).toBe(PROMPT_TEMPLATES[path]);
    expect(content).toContain('TASK: GENERA META ADS');
  });
});

describe('injectTemplateValues', () => {
  it('replaces template placeholders with provided values', () => {
    const template = 'Hello {{name}}, your topic is {{topic}}.';
    const result = injectTemplateValues(template, { name: 'Mario', topic: 'AI' });
    expect(result).toBe('Hello Mario, your topic is AI.');
  });

  it('leaves unresolved placeholders intact when key is missing', () => {
    const template = 'Hello {{name}}, your topic is {{topic}}.';
    const result = injectTemplateValues(template, { name: 'Mario' });
    expect(result).toBe('Hello Mario, your topic is {{topic}}.');
  });

  it('handles templates with no placeholders', () => {
    const template = 'No placeholders here.';
    const result = injectTemplateValues(template, { key: 'value' });
    expect(result).toBe('No placeholders here.');
  });

  it('handles placeholders with extra whitespace', () => {
    const template = 'Hello {{ name }}.';
    const result = injectTemplateValues(template, { name: 'Giulia' });
    expect(result).toBe('Hello Giulia.');
  });
});
