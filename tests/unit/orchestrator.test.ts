/** @jest-environment node */

import { LLMOrchestrator } from '@/lib/llm/orchestrator';
import { OpenRouterProvider } from '@/lib/llm/providers/openrouter';

jest.mock('@/lib/llm/providers/openrouter');

const MockedProvider = OpenRouterProvider as jest.MockedClass<typeof OpenRouterProvider>;

const VALID_CONTENT_REQUEST = {
  type: 'content' as const,
  model: 'openai/gpt-4-turbo',
  input: { topic: 'Artificial Intelligence', tone: 'professional', length: 200, outputFormat: 'markdown' },
};

describe('LLMOrchestrator', () => {
  let mockGenerateText: jest.Mock;
  let mockGenerateStream: jest.Mock;
  let orchestrator: LLMOrchestrator;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGenerateText = jest.fn();
    mockGenerateStream = jest.fn();
    MockedProvider.mockImplementation(() => ({
      generateText: mockGenerateText,
      generateStream: mockGenerateStream,
    }));
    orchestrator = new LLMOrchestrator();
  });

  describe('getAgent', () => {
    it('returns content agent for type "content"', () => {
      const agent = orchestrator.getAgent('content');
      expect(agent.type).toBe('content');
    });

    it('returns seo agent for type "seo"', () => {
      const agent = orchestrator.getAgent('seo');
      expect(agent.type).toBe('seo');
    });

    it('returns code agent for type "code"', () => {
      const agent = orchestrator.getAgent('code');
      expect(agent.type).toBe('code');
    });

    it('throws for unknown artifact type', () => {
      expect(() => orchestrator.getAgent('unknown' as never)).toThrow('Unknown artifact type: unknown');
    });
  });

  describe('generate', () => {
    it('calls provider.generateText with built prompt and returns result', async () => {
      mockGenerateText.mockResolvedValue({
        content: 'Generated content',
        inputTokens: 100,
        outputTokens: 200,
      });

      const result = await orchestrator.generate(VALID_CONTENT_REQUEST);

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'openai/gpt-4-turbo' }),
      );
      expect(result.content).toBe('Generated content');
      expect(result.inputTokens).toBe(100);
      expect(result.outputTokens).toBe(200);
      expect(result.cost).toBeGreaterThan(0);
    });

    it('uses promptOverride when provided, skipping agent prompt build', async () => {
      mockGenerateText.mockResolvedValue({
        content: '  Override result  ',
        inputTokens: 50,
        outputTokens: 80,
      });

      const result = await orchestrator.generate({
        ...VALID_CONTENT_REQUEST,
        promptOverride: 'Use this exact prompt',
      });

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({ prompt: 'Use this exact prompt' }),
      );
      expect(result.content).toBe('Override result');
    });

    it('passes temperature to provider when specified', async () => {
      mockGenerateText.mockResolvedValue({ content: 'ok', inputTokens: 10, outputTokens: 10 });

      await orchestrator.generate({ ...VALID_CONTENT_REQUEST, temperature: 0.2 });

      expect(mockGenerateText).toHaveBeenCalledWith(
        expect.objectContaining({ temperature: 0.2 }),
      );
    });
  });

  describe('generateStream', () => {
    it('yields tokens from provider stream', async () => {
      async function* fakeStream() {
        yield { token: 'Hello', done: false };
        yield { token: ' world', done: false };
        yield { token: '!', done: true };
      }
      mockGenerateStream.mockReturnValue(fakeStream());

      const tokens: string[] = [];
      for await (const chunk of orchestrator.generateStream(VALID_CONTENT_REQUEST)) {
        tokens.push(chunk.token);
      }

      expect(tokens).toEqual(['Hello', ' world', '!']);
    });

    it('uses promptOverride in stream mode', async () => {
      async function* fakeStream() {
        yield { token: 'Streamed', done: true };
      }
      mockGenerateStream.mockReturnValue(fakeStream());

      const tokens: string[] = [];
      for await (const chunk of orchestrator.generateStream({
        ...VALID_CONTENT_REQUEST,
        promptOverride: 'Custom prompt',
      })) {
        tokens.push(chunk.token);
      }

      expect(mockGenerateStream).toHaveBeenCalledWith(
        expect.objectContaining({ prompt: 'Custom prompt' }),
      );
      expect(tokens).toEqual(['Streamed']);
    });
  });
});
