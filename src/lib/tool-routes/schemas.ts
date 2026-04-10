import { z } from 'zod';

export const ALLOWED_MODELS = ['openai/gpt-4-turbo', 'anthropic/claude-3-opus', 'mistralai/mistral-large'] as const;

export const toneSchema = z.enum(['professional', 'casual', 'formal', 'technical']);

const modelSchema = z.string().refine((model) => ALLOWED_MODELS.includes(model as (typeof ALLOWED_MODELS)[number]), {
  message: 'Unsupported model',
});

const customerContextSchema = z.object({
  product: z.string().min(3),
  audience: z.string().min(3),
  offer: z.string().min(3),
});

const toolBaseSchema = z.object({
  projectId: z.string().cuid(),
  model: modelSchema,
  tone: toneSchema,
  customerContext: customerContextSchema,
});

const legacyTopLevelContextSchema = z.object({
  product: z.string().min(3),
  audience: z.string().min(3),
  offer: z.string().min(3),
});

function normalizeLegacyContext(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  const asRecord = value as Record<string, unknown>;
  if (asRecord.customerContext && typeof asRecord.customerContext === 'object' && !Array.isArray(asRecord.customerContext)) {
    return value;
  }

  const parsedLegacy = legacyTopLevelContextSchema.safeParse(asRecord);
  if (!parsedLegacy.success) {
    return value;
  }

  return {
    ...asRecord,
    customerContext: {
      product: parsedLegacy.data.product,
      audience: parsedLegacy.data.audience,
      offer: parsedLegacy.data.offer,
    },
  };
}

export const metaAdsRequestSchema = z.preprocess(
  normalizeLegacyContext,
  toolBaseSchema.extend({
    objective: z.string().min(3),
    angle: z.string().optional(),
  }),
);

const funnelStepSchema = z.enum(['optin', 'quiz', 'vsl']);

export const funnelPagesRequestSchema = z.preprocess(
  normalizeLegacyContext,
  toolBaseSchema
    .extend({
      step: funnelStepSchema,
      promise: z.string().min(3),
      notes: z.string().optional(),
      optinOutput: z.string().optional(),
      quizOutput: z.string().optional(),
    })
    .superRefine((value, ctx) => {
      if (value.step === 'quiz' && !value.optinOutput) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['optinOutput'],
          message: 'optinOutput is required for quiz step',
        });
      }

      if (value.step === 'vsl') {
        if (!value.optinOutput) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['optinOutput'],
            message: 'optinOutput is required for vsl step',
          });
        }

        if (!value.quizOutput) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['quizOutput'],
            message: 'quizOutput is required for vsl step',
          });
        }
      }
    }),
);

export type MetaAdsRequest = z.infer<typeof metaAdsRequestSchema>;
export type FunnelPagesRequest = z.infer<typeof funnelPagesRequestSchema>;

export function getLengthByFunnelStep(step: FunnelPagesRequest['step']): number {
  if (step === 'optin') return 1200;
  if (step === 'quiz') return 1400;
  return 3200;
}
