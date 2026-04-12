import { getModelPricing } from './models';

export function calculateCostWithPricing(pricing: { input: number; output: number }, inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output;
}

/**
 * Calculate the USD cost for a completed generation using provider-reported token counts.
 * Input and output tokens are priced at separate per-model rates.
 * Falls back to default model pricing for unrecognised models.
 */
export function calculateCostAccurate(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = getModelPricing(model);
  return calculateCostWithPricing(pricing, inputTokens, outputTokens);
}

// Re-export for backward compatibility and tests
export { MODEL_COSTS, DEFAULT_MODEL as FALLBACK_MODEL } from './models';

/** @deprecated Use calculateCostAccurate — kept for backward compatibility. */
export const calculateCost = calculateCostAccurate;