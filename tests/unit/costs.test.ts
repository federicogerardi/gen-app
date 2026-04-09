import { calculateCost } from '@/lib/llm/costs';

describe('calculateCost', () => {
  it('calculates cost for openai/gpt-4-turbo', () => {
    // 1000 input tokens (0.01/1k) + 500 output tokens (0.03/1k) = 0.01 + 0.015 = 0.025
    const cost = calculateCost('openai/gpt-4-turbo', 1000, 500);
    expect(cost).toBeCloseTo(0.025, 6);
  });

  it('calculates cost for anthropic/claude-3-opus', () => {
    // 2000 input (0.015/1k) + 1000 output (0.075/1k) = 0.03 + 0.075 = 0.105
    const cost = calculateCost('anthropic/claude-3-opus', 2000, 1000);
    expect(cost).toBeCloseTo(0.105, 6);
  });

  it('calculates cost for mistralai/mistral-large', () => {
    // 500 input (0.008/1k) + 500 output (0.024/1k) = 0.004 + 0.012 = 0.016
    const cost = calculateCost('mistralai/mistral-large', 500, 500);
    expect(cost).toBeCloseTo(0.016, 6);
  });

  it('falls back to gpt-4-turbo pricing for unknown model', () => {
    const knownCost = calculateCost('openai/gpt-4-turbo', 1000, 1000);
    const unknownCost = calculateCost('unknown/model-xyz', 1000, 1000);
    expect(unknownCost).toBeCloseTo(knownCost, 6);
  });

  it('returns 0 for zero tokens', () => {
    expect(calculateCost('openai/gpt-4-turbo', 0, 0)).toBe(0);
  });
});
