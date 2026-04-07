const MODEL_COSTS: Record<string, { input: number; output: number }> = {
  'openai/gpt-4-turbo': { input: 0.01, output: 0.03 },
  'anthropic/claude-3-opus': { input: 0.015, output: 0.075 },
  'mistralai/mistral-large': { input: 0.008, output: 0.024 },
};

export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_COSTS[model] ?? MODEL_COSTS['openai/gpt-4-turbo'];
  return (inputTokens / 1000) * pricing.input + (outputTokens / 1000) * pricing.output;
}