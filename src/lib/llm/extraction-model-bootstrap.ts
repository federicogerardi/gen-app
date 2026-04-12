import { getExtractionModelChain } from '@/lib/llm/extraction-model-policy';

export type ExtractionBootstrapModel = {
  modelId: string;
  name: string;
  inputCostPer1k: number;
  outputCostPer1k: number;
};

type LlmModelSnapshot = {
  modelId: string;
  isActive: boolean;
  isDefault: boolean;
};

type LlmModelDelegate = {
  findMany(args: {
    where: { modelId: { in: string[] } };
    select: {
      modelId: true;
      isActive: true;
      isDefault: true;
    };
  }): Promise<LlmModelSnapshot[]>;
  create(args: {
    data: {
      modelId: string;
      name: string;
      inputCostPer1k: number;
      outputCostPer1k: number;
      isActive: boolean;
      isDefault: boolean;
      pricingReviewedAt: Date;
    };
  }): Promise<unknown>;
  update(args: {
    where: { modelId: string };
    data: {
      isActive: boolean;
    };
  }): Promise<unknown>;
};

const EXTRACTION_BOOTSTRAP_PRICING: Record<string, { inputCostPer1k: number; outputCostPer1k: number }> = {
  'anthropic/claude-3.7-sonnet': { inputCostPer1k: 0.003, outputCostPer1k: 0.015 },
  'openai/gpt-4.1': { inputCostPer1k: 0.01, outputCostPer1k: 0.03 },
  'openai/o3': { inputCostPer1k: 0.04, outputCostPer1k: 0.16 },
};

function getModelDisplayName(modelId: string): string {
  if (modelId === 'anthropic/claude-3.7-sonnet') return 'Claude 3.7 Sonnet';
  if (modelId === 'openai/gpt-4.1') return 'GPT-4.1';
  if (modelId === 'openai/o3') return 'OpenAI o3';
  return modelId;
}

export function getExtractionBootstrapModels(): ExtractionBootstrapModel[] {
  return getExtractionModelChain().map((modelId) => {
    const pricing = EXTRACTION_BOOTSTRAP_PRICING[modelId] ?? { inputCostPer1k: 0.01, outputCostPer1k: 0.03 };
    return {
      modelId,
      name: getModelDisplayName(modelId),
      inputCostPer1k: pricing.inputCostPer1k,
      outputCostPer1k: pricing.outputCostPer1k,
    };
  });
}

export type ExtractionBootstrapResult = {
  requiredModelIds: string[];
  created: string[];
  reactivated: string[];
  alreadyActive: string[];
  preservedDefault: string[];
};

export async function bootstrapExtractionModels(
  llmModel: LlmModelDelegate,
  now: Date = new Date(),
): Promise<ExtractionBootstrapResult> {
  const requiredModels = getExtractionBootstrapModels();
  const requiredModelIds = requiredModels.map((item) => item.modelId);

  const existingRows = await llmModel.findMany({
    where: { modelId: { in: requiredModelIds } },
    select: {
      modelId: true,
      isActive: true,
      isDefault: true,
    },
  });

  const existingByModelId = new Map(existingRows.map((row) => [row.modelId, row]));
  const result: ExtractionBootstrapResult = {
    requiredModelIds,
    created: [],
    reactivated: [],
    alreadyActive: [],
    preservedDefault: [],
  };

  for (const model of requiredModels) {
    const existing = existingByModelId.get(model.modelId);

    if (!existing) {
      await llmModel.create({
        data: {
          modelId: model.modelId,
          name: model.name,
          inputCostPer1k: model.inputCostPer1k,
          outputCostPer1k: model.outputCostPer1k,
          isActive: true,
          isDefault: false,
          pricingReviewedAt: now,
        },
      });
      result.created.push(model.modelId);
      continue;
    }

    if (existing.isDefault) {
      result.preservedDefault.push(model.modelId);
    }

    if (!existing.isActive) {
      await llmModel.update({
        where: { modelId: model.modelId },
        data: { isActive: true },
      });
      result.reactivated.push(model.modelId);
      continue;
    }

    result.alreadyActive.push(model.modelId);
  }

  return result;
}