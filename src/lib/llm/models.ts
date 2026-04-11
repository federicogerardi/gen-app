/**
 * Single source of truth for LLM models, pricing, and metadata.
 * Consolidates model definitions across the app to ensure consistency.
 */

/** Enumeration of supported LLM models */
export const SUPPORTED_MODELS = ['openai/gpt-4-turbo', 'anthropic/claude-3-opus', 'mistralai/mistral-large'] as const;
export type SupportedModel = (typeof SUPPORTED_MODELS)[number];

/** Default model for fallback and pricing lookup */
export const DEFAULT_MODEL: SupportedModel = 'openai/gpt-4-turbo';

/** Pricing per 1K tokens (input and output rates, in USD) */
export const MODEL_COSTS: Record<SupportedModel, { input: number; output: number }> = {
  'openai/gpt-4-turbo': { input: 0.01, output: 0.03 },
  'anthropic/claude-3-opus': { input: 0.015, output: 0.075 },
  'mistralai/mistral-large': { input: 0.008, output: 0.024 },
};

/** Model metadata including UI display name and default indicator */
export const MODEL_METADATA: Record<SupportedModel, { name: string; default: boolean }> = {
  'openai/gpt-4-turbo': { name: 'GPT-4 Turbo', default: true },
  'anthropic/claude-3-opus': { name: 'Claude 3 Opus', default: false },
  'mistralai/mistral-large': { name: 'Mistral Large', default: false },
};

/**
 * Verify if a model string is in the supported list.
 * Type-safe compatibility check for string model parameters.
 */
export function isSupportedModel(model: unknown): model is SupportedModel {
  return typeof model === 'string' && SUPPORTED_MODELS.includes(model as SupportedModel);
}

/**
 * Get pricing for a model, falling back to default if unknown.
 */
export function getModelPricing(model: string) {
  if (isSupportedModel(model)) {
    return MODEL_COSTS[model];
  }
  return MODEL_COSTS[DEFAULT_MODEL];
}

/**
 * Get metadata (name, default status) for a model.
 */
export function getModelMetadata(model: string) {
  if (isSupportedModel(model)) {
    return MODEL_METADATA[model];
  }
  return MODEL_METADATA[DEFAULT_MODEL];
}

/**
 * Export as array for schema validation and API responses.
 * Compatible with Zod v4 array definitions and as-const patterns.
 */
export const ALLOWED_MODELS = SUPPORTED_MODELS;
