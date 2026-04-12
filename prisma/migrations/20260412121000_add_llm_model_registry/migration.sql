-- CreateTable
CREATE TABLE "LlmModel" (
  "id" TEXT NOT NULL,
  "modelId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "inputCostPer1k" DECIMAL(65,30) NOT NULL,
  "outputCostPer1k" DECIMAL(65,30) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "pricingReviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "LlmModel_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LlmModel_modelId_key" ON "LlmModel"("modelId");

-- CreateIndex
CREATE INDEX "LlmModel_isActive_idx" ON "LlmModel"("isActive");

-- CreateIndex
CREATE INDEX "LlmModel_isDefault_idx" ON "LlmModel"("isDefault");

-- Seed default models
INSERT INTO "LlmModel" (
  "id",
  "modelId",
  "name",
  "inputCostPer1k",
  "outputCostPer1k",
  "isActive",
  "isDefault",
  "pricingReviewedAt",
  "createdAt",
  "updatedAt"
) VALUES
  (
    'cm_default_openai_gpt4_turbo',
    'openai/gpt-4-turbo',
    'GPT-4 Turbo',
    0.01,
    0.03,
    true,
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'cm_default_claude_3_opus',
    'anthropic/claude-3-opus',
    'Claude 3 Opus',
    0.015,
    0.075,
    true,
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  ),
  (
    'cm_default_mistral_large',
    'mistralai/mistral-large',
    'Mistral Large',
    0.008,
    0.024,
    true,
    false,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  );
