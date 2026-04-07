import { calculateCost } from '@/lib/llm/costs';

describe('calculateCost', () => {
  it('calculates the GPT-4 Turbo price using input and output tokens', () => {
    expect(calculateCost('openai/gpt-4-turbo', 1000, 1000)).toBeCloseTo(0.04, 5);
  });

  it('falls back to GPT-4 Turbo pricing for unknown models', () => {
    expect(calculateCost('unknown-model', 500, 500)).toBeCloseTo(0.02, 5);
  });
});