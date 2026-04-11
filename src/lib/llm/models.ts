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

/** Pricing table maintenance metadata used for operational staleness checks. */
export const MODEL_PRICING_LAST_REVIEWED_AT = '2026-04-11T00:00:00.000Z';
export const MODEL_PRICING_MAX_AGE_DAYS = 90;

export type PricingStaleness = {
  lastReviewedAt: string;
  maxAgeDays: number;
  ageDays: number;
  stale: boolean;
};

/**
 * Compute if pricing metadata is stale relative to the configured review date.
 */
export function getPricingStaleness(now: Date = new Date()): PricingStaleness {
  const lastReviewed = new Date(MODEL_PRICING_LAST_REVIEWED_AT);
  const ageMs = Math.max(0, now.getTime() - lastReviewed.getTime());
  const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));

  return {
    lastReviewedAt: MODEL_PRICING_LAST_REVIEWED_AT,
    maxAgeDays: MODEL_PRICING_MAX_AGE_DAYS,
    ageDays,
    stale: ageDays > MODEL_PRICING_MAX_AGE_DAYS,
  };
}
