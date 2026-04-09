import { SeoAgent } from '@/lib/llm/agents/seo';
import { CodeAgent } from '@/lib/llm/agents/code';

describe('SeoAgent', () => {
  let agent: SeoAgent;

  beforeEach(() => {
    agent = new SeoAgent();
  });

  it('has type "seo"', () => {
    expect(agent.type).toBe('seo');
  });

  it('validateInput passes for valid SEO input', async () => {
    await expect(
      agent.validateInput({ topic: 'AI Marketing', targetKeywords: ['AI', 'marketing'] }),
    ).resolves.toBeUndefined();
  });

  it('validateInput throws for missing targetKeywords', async () => {
    await expect(agent.validateInput({ topic: 'AI Marketing' })).rejects.toThrow();
  });

  it('validateInput throws for empty targetKeywords array', async () => {
    await expect(
      agent.validateInput({ topic: 'AI Marketing', targetKeywords: [] }),
    ).rejects.toThrow();
  });

  it('buildPrompt includes topic, keywords, and pageType', () => {
    const prompt = agent.buildPrompt({
      topic: 'React hooks',
      targetKeywords: ['react', 'hooks', 'useState'],
      pageType: 'blog',
      outputFormat: 'markdown',
    });

    expect(prompt).toContain('React hooks');
    expect(prompt).toContain('react, hooks, useState');
    expect(prompt).toContain('blog');
    expect(prompt).toContain('markdown');
  });

  it('buildPrompt uses default pageType "blog" if not provided', () => {
    const prompt = agent.buildPrompt({
      topic: 'Next.js features',
      targetKeywords: ['nextjs'],
    });

    expect(prompt).toContain('blog');
  });

  it('parseResponse trims whitespace', () => {
    expect(agent.parseResponse('  content  ')).toBe('content');
  });
});

describe('CodeAgent', () => {
  let agent: CodeAgent;

  beforeEach(() => {
    agent = new CodeAgent();
  });

  it('has type "code"', () => {
    expect(agent.type).toBe('code');
  });

  it('validateInput passes for valid code input', async () => {
    await expect(
      agent.validateInput({ description: 'Create a REST API endpoint', language: 'typescript' }),
    ).resolves.toBeUndefined();
  });

  it('validateInput throws for description shorter than 5 chars', async () => {
    await expect(agent.validateInput({ description: 'Hi' })).rejects.toThrow();
  });

  it('buildPrompt includes language, description, and framework when provided', () => {
    const prompt = agent.buildPrompt({
      description: 'Build a React component',
      language: 'typescript',
      framework: 'React',
      style: 'production',
    });

    expect(prompt).toContain('typescript');
    expect(prompt).toContain('Build a React component');
    expect(prompt).toContain('React');
    expect(prompt).toContain('production');
  });

  it('buildPrompt omits framework note when not provided', () => {
    const prompt = agent.buildPrompt({
      description: 'Sort an array of numbers',
      language: 'python',
    });

    expect(prompt).not.toContain('using');
  });

  it('parseResponse strips markdown code fences', () => {
    const input = '```typescript\nconst x = 1;\n```';
    expect(agent.parseResponse(input)).toBe('const x = 1;');
  });

  it('parseResponse returns clean code without fences', () => {
    const input = 'const y = 2;';
    expect(agent.parseResponse(input)).toBe('const y = 2;');
  });
});
