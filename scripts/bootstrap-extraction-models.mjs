import { PrismaClient } from '../src/generated/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const EXTRACTION_MODELS = [
  {
    modelId: 'anthropic/claude-3.7-sonnet',
    name: 'Claude 3.7 Sonnet',
    inputCostPer1k: 0.003,
    outputCostPer1k: 0.015,
  },
  {
    modelId: 'openai/gpt-4.1',
    name: 'GPT-4.1',
    inputCostPer1k: 0.01,
    outputCostPer1k: 0.03,
  },
  {
    modelId: 'openai/o3',
    name: 'OpenAI o3',
    inputCostPer1k: 0.04,
    outputCostPer1k: 0.16,
  },
];

async function bootstrapExtractionModels() {
  const connectionString = resolveDatabaseUrl();
  if (!connectionString) {
    throw new Error('DATABASE_URL is required for db:bootstrap:extraction-models');
  }

  const adapter = new PrismaPg({ connectionString });
  const db = new PrismaClient({ adapter });
  const requiredModelIds = EXTRACTION_MODELS.map((item) => item.modelId);

  try {
    const existingRows = await db.llmModel.findMany({
      where: { modelId: { in: requiredModelIds } },
      select: { modelId: true, isActive: true, isDefault: true },
    });

    const existingByModelId = new Map(existingRows.map((row) => [row.modelId, row]));
    const created = [];
    const reactivated = [];
    const alreadyActive = [];
    const preservedDefault = [];

    for (const model of EXTRACTION_MODELS) {
      const existing = existingByModelId.get(model.modelId);

      if (!existing) {
        await db.llmModel.create({
          data: {
            modelId: model.modelId,
            name: model.name,
            inputCostPer1k: model.inputCostPer1k,
            outputCostPer1k: model.outputCostPer1k,
            isActive: true,
            isDefault: false,
            pricingReviewedAt: new Date(),
          },
        });
        created.push(model.modelId);
        continue;
      }

      if (existing.isDefault) {
        preservedDefault.push(model.modelId);
      }

      if (!existing.isActive) {
        await db.llmModel.update({
          where: { modelId: model.modelId },
          data: { isActive: true },
        });
        reactivated.push(model.modelId);
        continue;
      }

      alreadyActive.push(model.modelId);
    }

    console.info(
      JSON.stringify(
        {
          event: 'extraction_models_bootstrap_completed',
          requiredModelIds,
          created,
          reactivated,
          alreadyActive,
          preservedDefault,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error(
      JSON.stringify(
        {
          event: 'extraction_models_bootstrap_failed',
          message: error instanceof Error ? error.message : 'Unknown bootstrap error',
        },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const envLocalPath = resolve(process.cwd(), '.env.local');
  if (!existsSync(envLocalPath)) {
    return undefined;
  }

  const raw = readFileSync(envLocalPath, 'utf8');
  const line = raw
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith('DATABASE_URL='));

  if (!line) {
    return undefined;
  }

  const value = line.slice('DATABASE_URL='.length).trim();
  if (!value) {
    return undefined;
  }

  return value.replace(/^['"]|['"]$/g, '');
}

await bootstrapExtractionModels();