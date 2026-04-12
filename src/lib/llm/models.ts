/**
 * Static fallback catalog used when DB registry is not available.
 * Runtime model availability is managed dynamically through the admin CRUD.
 */
export const DEFAULT_MODELS = [
  {
    modelId: 'openai/gpt-4-turbo',
    name: 'GPT-4 Turbo',
    inputCostPer1k: 0.01,
    outputCostPer1k: 0.03,
    pricingReviewedAt: '2026-04-11T00:00:00.000Z',
  },
  {
    modelId: 'anthropic/claude-3-opus',
    name: 'Claude 3 Opus',
    inputCostPer1k: 0.015,
    outputCostPer1k: 0.075,
    pricingReviewedAt: '2026-04-11T00:00:00.000Z',
  },
  {
    modelId: 'mistralai/mistral-large',
    name: 'Mistral Large',
    inputCostPer1k: 0.008,
    outputCostPer1k: 0.024,
    pricingReviewedAt: '2026-04-11T00:00:00.000Z',
  },
] as const;

export type SupportedModel = (typeof DEFAULT_MODELS)[number]['modelId'];
export const SUPPORTED_MODELS = DEFAULT_MODELS.map((model) => model.modelId) as readonly SupportedModel[];

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
 * Verify if a model string is in the fallback list.
 * Runtime checks should use DB registry helpers.
 */
export function isSupportedModel(model: unknown): model is SupportedModel {
  return typeof model === 'string' && SUPPORTED_MODELS.includes(model as SupportedModel);
}

/**
 * Get fallback pricing for a model, defaulting to DEFAULT_MODEL.
 */
export function getModelPricing(model: string) {
  if (isSupportedModel(model)) {
    return MODEL_COSTS[model];
  }
  return MODEL_COSTS[DEFAULT_MODEL];
}

/**
 * Get fallback metadata for a model.
 */
export function getModelMetadata(model: string) {
  if (isSupportedModel(model)) {
    return MODEL_METADATA[model];
  }
  return MODEL_METADATA[DEFAULT_MODEL];
}

/** @deprecated Runtime availability is now dynamic via DB registry. */
export const ALLOWED_MODELS = SUPPORTED_MODELS;

export type ModelCatalogItem = {
  id: string;
  modelId: string;
  name: string;
  inputCostPer1k: number;
  outputCostPer1k: number;
  isActive: boolean;
  isDefault: boolean;
  pricingReviewedAt: Date;
  updatedAt: Date;
};

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
  return getPricingStalenessFromDate(lastReviewed, now);
}

export function getPricingStalenessFromDate(lastReviewed: Date, now: Date = new Date()): PricingStaleness {
  const ageMs = Math.max(0, now.getTime() - lastReviewed.getTime());
  const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));

  return {
    lastReviewedAt: lastReviewed.toISOString(),
    maxAgeDays: MODEL_PRICING_MAX_AGE_DAYS,
    ageDays,
    stale: ageDays > MODEL_PRICING_MAX_AGE_DAYS,
  };
}
