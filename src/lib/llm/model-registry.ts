import { db } from '@/lib/db';
import { Decimal } from '@prisma/client-runtime-utils';
import { DEFAULT_MODEL, DEFAULT_MODELS, getPricingStalenessFromDate, type ModelCatalogItem } from './models';

function toNumber(value: number | string | Decimal): number {
  if (value instanceof Decimal) {
    return value.toNumber();
  }
  return Number(value);
}

function mapModel(row: {
  id: string;
  modelId: string;
  name: string;
  inputCostPer1k: number | string | Decimal;
  outputCostPer1k: number | string | Decimal;
  isActive: boolean;
  isDefault: boolean;
  pricingReviewedAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    modelId: row.modelId,
    name: row.name,
    inputCostPer1k: toNumber(row.inputCostPer1k),
    outputCostPer1k: toNumber(row.outputCostPer1k),
    isActive: row.isActive,
    isDefault: row.isDefault,
    pricingReviewedAt: row.pricingReviewedAt,
    updatedAt: row.updatedAt,
  };
}

function toPublicModel(item: ModelCatalogItem) {
  return {
    id: item.modelId,
    name: item.name,
    default: item.isDefault,
    active: item.isActive,
  };
}

function getFallbackCatalog(): ModelCatalogItem[] {
  return DEFAULT_MODELS.map((item) => ({
    id: `fallback_${item.modelId}`,
    modelId: item.modelId,
    name: item.name,
    inputCostPer1k: item.inputCostPer1k,
    outputCostPer1k: item.outputCostPer1k,
    isActive: true,
    isDefault: item.modelId === DEFAULT_MODEL,
    pricingReviewedAt: new Date(item.pricingReviewedAt),
    updatedAt: new Date(item.pricingReviewedAt),
  }));
}

export async function listModelCatalog(includeInactive = false): Promise<ModelCatalogItem[]> {
  const records = await db.llmModel.findMany({
    where: includeInactive ? undefined : { isActive: true },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });

  if (records.length === 0) {
    return getFallbackCatalog();
  }

  return records.map((record) => mapModel(record));
}

export async function listPublicModels() {
  const models = await listModelCatalog(false);
  return models.map(toPublicModel);
}

export async function isModelAvailable(modelId: string): Promise<boolean> {
  const model = await db.llmModel.findFirst({ where: { modelId, isActive: true }, select: { id: true } });
  if (model) {
    return true;
  }

  return DEFAULT_MODELS.some((item) => item.modelId === modelId);
}

export async function getModelPricingForRuntime(modelId: string) {
  const model = await db.llmModel.findFirst({
    where: { modelId, isActive: true },
    select: {
      inputCostPer1k: true,
      outputCostPer1k: true,
    },
  });

  if (model) {
    return {
      input: toNumber(model.inputCostPer1k),
      output: toNumber(model.outputCostPer1k),
    };
  }

  const fallback = DEFAULT_MODELS.find((item) => item.modelId === DEFAULT_MODEL)!;
  return {
    input: fallback.inputCostPer1k,
    output: fallback.outputCostPer1k,
  };
}

export async function getModelPricingStaleness() {
  const mostRecent = await db.llmModel.findFirst({
    orderBy: { pricingReviewedAt: 'desc' },
    select: { pricingReviewedAt: true },
  });

  if (!mostRecent) {
    const fallbackDate = new Date(DEFAULT_MODELS[0].pricingReviewedAt);
    return getPricingStalenessFromDate(fallbackDate);
  }

  return getPricingStalenessFromDate(mostRecent.pricingReviewedAt);
}
