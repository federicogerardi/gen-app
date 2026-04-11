const FALLBACK_MODEL = 'openai/gpt-4-turbo';

export const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'openai/gpt-4-turbo': { input: 0.01, output: 0.03 },
  'anthropic/claude-3-opus': { input: 0.015, output: 0.075 },
  'mistralai/mistral-large': { input: 0.008, output: 0.024 },
};

/**
 * Calculate the USD cost for a completed generation using provider-reported token counts.
 * Input and output tokens are priced at separate per-model rates.
 * Falls back to FALLBACK_MODEL pricing for unrecognised models.
 */
export function calculateCostAccurate(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_COSTS[model] ?? MODEL_COSTS[FALLBACK_MODEL];
  return (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output;
}

/** @deprecated Use calculateCostAccurate — kept for backward compatibility. */
export const calculateCost = calculateCostAccurate;