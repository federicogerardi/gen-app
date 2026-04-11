import { calculateCost, calculateCostAccurate } from '@/lib/llm/costs';
import { MODEL_COSTS } from '@/lib/llm/models';

describe('calculateCostAccurate', () => {
  it('applies separate input and output rates for openai/gpt-4-turbo', () => {
    // input: 1000 × 0.01/1k = 0.01 ; output: 0 × 0.03/1k = 0
    expect(calculateCostAccurate('openai/gpt-4-turbo', 1000, 0)).toBeCloseTo(0.01, 6);
    // input: 0 ; output: 1000 × 0.03/1k = 0.03
    expect(calculateCostAccurate('openai/gpt-4-turbo', 0, 1000)).toBeCloseTo(0.03, 6);
  });

  it('applies separate input and output rates for anthropic/claude-3-opus', () => {
    expect(calculateCostAccurate('anthropic/claude-3-opus', 1000, 0)).toBeCloseTo(0.015, 6);
    expect(calculateCostAccurate('anthropic/claude-3-opus', 0, 1000)).toBeCloseTo(0.075, 6);
  });

  it('applies separate input and output rates for mistralai/mistral-large', () => {
    expect(calculateCostAccurate('mistralai/mistral-large', 1000, 0)).toBeCloseTo(0.008, 6);
    expect(calculateCostAccurate('mistralai/mistral-large', 0, 1000)).toBeCloseTo(0.024, 6);
  });

  it('calculates combined cost for all models', () => {
    // 1000 input (0.01/1k) + 500 output (0.03/1k) = 0.01 + 0.015 = 0.025
    expect(calculateCostAccurate('openai/gpt-4-turbo', 1000, 500)).toBeCloseTo(0.025, 6);
    // 2000 input (0.015/1k) + 1000 output (0.075/1k) = 0.03 + 0.075 = 0.105
    expect(calculateCostAccurate('anthropic/claude-3-opus', 2000, 1000)).toBeCloseTo(0.105, 6);
    // 500 input (0.008/1k) + 500 output (0.024/1k) = 0.004 + 0.012 = 0.016
    expect(calculateCostAccurate('mistralai/mistral-large', 500, 500)).toBeCloseTo(0.016, 6);
  });

  it('falls back to gpt-4-turbo pricing for unknown model', () => {
    const knownCost = calculateCostAccurate('openai/gpt-4-turbo', 1000, 1000);
    const unknownCost = calculateCostAccurate('unknown/model-xyz', 1000, 1000);
    expect(unknownCost).toBeCloseTo(knownCost, 6);
  });

  it('returns 0 for zero tokens', () => {
    expect(calculateCostAccurate('openai/gpt-4-turbo', 0, 0)).toBe(0);
  });

  it('input-rate is lower than output-rate for every model in MODEL_COSTS', () => {
    for (const [model, rates] of Object.entries(MODEL_COSTS)) {
      expect(rates.input).toBeLessThan(rates.output);
      // confirm the function respects this: same tokens → input cost < output cost
      expect(calculateCostAccurate(model, 1000, 0)).toBeLessThan(
        calculateCostAccurate(model, 0, 1000),
      );
    }
  });
});

describe('calculateCost (backward-compat alias)', () => {
  it('is identical to calculateCostAccurate', () => {
    expect(calculateCost).toBe(calculateCostAccurate);
  });

  it('calculates cost for openai/gpt-4-turbo', () => {
    expect(calculateCost('openai/gpt-4-turbo', 1000, 500)).toBeCloseTo(0.025, 6);
  });
});
