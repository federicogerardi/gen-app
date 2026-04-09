/** @jest-environment node */

import { readFile } from 'node:fs/promises';
import { loadPromptSource, injectTemplateValues } from '@/lib/tool-prompts/loader';

jest.mock('node:fs/promises', () => ({
  readFile: jest.fn(),
}));

const mockedReadFile = readFile as jest.MockedFunction<typeof readFile>;

describe('loadPromptSource', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset module-level cache between tests by re-importing
    jest.resetModules();
  });

  it('reads file from disk and returns content', async () => {
    mockedReadFile.mockResolvedValue('# Prompt template\n{{topic}}' as never);

    const content = await loadPromptSource('tools/meta_ads/prompt_generation.md');

    expect(content).toBe('# Prompt template\n{{topic}}');
    expect(mockedReadFile).toHaveBeenCalledWith(
      expect.stringContaining('prompt_generation.md'),
      'utf8',
    );
  });

  it('throws for path traversal attempt', async () => {
    await expect(
      loadPromptSource('../../../etc/passwd' as never),
    ).rejects.toThrow('Invalid prompt path');
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
