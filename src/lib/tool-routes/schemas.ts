import { z } from 'zod';

export const toneSchema = z.enum(['professional', 'casual', 'formal', 'technical']);

const modelSchema = z.string().min(1);

const customerContextSchema = z.object({
  product: z.string().min(3),
  audience: z.string().min(3),
  offer: z.string().min(3),
});

const toolSharedSchema = z.object({
  projectId: z.string().cuid(),
  model: modelSchema,
  tone: toneSchema,
});

const toolBaseSchema = toolSharedSchema.extend({
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

const extractionFieldTypeSchema = z.enum(['text', 'textarea', 'number', 'boolean', 'select', 'email', 'url', 'object', 'array']);

export const extractionFieldDefinitionSchema = z.object({
  type: extractionFieldTypeSchema,
  required: z.boolean().optional().default(false),
  description: z.string().min(3),
});

export const extractionRequestSchema = toolSharedSchema.extend({
  rawContent: z.string().min(20),
  fieldMap: z
    .record(z.string(), extractionFieldDefinitionSchema)
    .refine((value) => Object.keys(value).length > 0, { message: 'fieldMap must contain at least one field' }),
  notes: z.string().optional(),
});

const funnelStepSchema = z.enum(['optin', 'quiz', 'vsl']);
export const funnelSchemaVersionSchema = z.enum(['v1', 'v2', 'v3']);

function normalizeFunnelSchemaVersion(value: unknown): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  const asRecord = value as Record<string, unknown>;
  if (asRecord.schemaVersion === 'v1' || asRecord.schemaVersion === 'v2' || asRecord.schemaVersion === 'v3') {
    return value;
  }

  if ('schemaVersion' in asRecord) {
    return value;
  }

  if ('extractedFields' in asRecord) {
    return { ...asRecord, schemaVersion: 'v3' };
  }

  if ('briefing' in asRecord) {
    return { ...asRecord, schemaVersion: 'v2' };
  }

  return { ...asRecord, schemaVersion: 'v1' };
}

const funnelPagesRequestSchemaV1Object = toolBaseSchema
  .extend({
    schemaVersion: z.literal('v1'),
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
  });

export const funnelPagesRequestSchemaV1 = z.preprocess(
  (value) => normalizeLegacyContext(normalizeFunnelSchemaVersion(value)),
  funnelPagesRequestSchemaV1Object,
);

const businessTypeSchema = z.enum(['B2B', 'B2C']);
const deliveryModelSchema = z.enum(['done-for-you', 'done-with-you', 'fai-da-te', 'corso']);
const promisedResultFormatSchema = z.enum(['video', 'pdf', 'analisi', 'report', 'altro']);
const leadMagnetFormatSchema = z.enum(['VSL', 'PDF', 'Case Study', 'Demo', 'Altro']);
const visualProofAssetTypeSchema = z.enum(['screenshot', 'report', 'dashboard', 'altro']);

const clusterProfileSchema = z.object({
  cluster_name: z.string().min(1),
  cluster_description: z.string().min(1),
  psychographic_profile: z.string().min(1),
});

const leadMagnetByClusterSchema = z.object({
  cluster_name: z.string().min(1),
  title: z.string().min(1),
  format: leadMagnetFormatSchema,
  hook: z.string().min(1),
  messaging: z.string().min(1),
  next_step: z.string().min(1),
});

const caseStudySchema = z.object({
  name: z.string().min(1),
  initial_problem: z.string().min(1),
  result_metrics: z.string().min(1),
  timeframe: z.string().optional(),
  source: z.string().min(1),
});

const testimonialSourceSchema = z.object({
  quote: z.string().min(1),
  source: z.string().min(1),
  timestamp: z.string().optional(),
});

const visualProofAssetSchema = z.object({
  asset_type: visualProofAssetTypeSchema,
  metric_highlight: z.string().min(1),
  source: z.string().optional(),
});

export const funnelUnifiedBriefingSchema = z.object({
  business_context: z.object({
    business_type: businessTypeSchema,
    sector_niche: z.string().min(1),
    offer_price_range: z.string().min(1),
    target_profile: z.string().min(1),
    operational_context: z.string().optional(),
  }),
  offer_context: z.object({
    core_problem: z.string().min(1),
    new_opportunity: z.string().min(1),
    old_method: z.string().min(1),
    delivery_model: deliveryModelSchema,
    client_involvement_required: z.string().optional(),
  }),
  qualification_context: z.object({
    must_have_criteria: z.string().min(1),
    nice_to_have_criteria: z.string().optional(),
    disqualification_criteria: z.string().min(1),
    minimum_operational_capabilities: z.string().min(1),
    disqualified_redirect_offer: z.string().optional(),
  }),
  optin_context: z.object({
    optin_title_promise: z.string().min(1),
    promised_benefit: z.string().min(1),
    promised_result_format: promisedResultFormatSchema,
    email_already_collected: z.boolean(),
  }),
  segmentation_context: z.object({
    primary_segmentation_basis: z.string().min(1),
    desired_cluster_count: z.number().int().min(3).max(5),
    cluster_profiles: z.array(clusterProfileSchema).optional().default([]),
    cluster_overlap_management: z.string().optional(),
    lead_magnets_by_cluster: z.array(leadMagnetByClusterSchema).optional().default([]),
  }),
  belief_context: z.object({
    false_belief_vehicle: z.string().min(1),
    false_belief_internal: z.string().min(1),
    false_belief_external: z.string().min(1),
  }),
  funnel_goals: z.object({
    funnel_primary_goal: z.string().min(1),
    success_metrics: z.string().min(1),
    next_customer_journey_step: z.string().min(1),
  }),
  proof_context: z.object({
    case_studies: z.array(caseStudySchema).optional().default([]),
    testimonials_sources: z.array(testimonialSourceSchema).optional().default([]),
    authority_assets: z.string().optional(),
    visual_proof_assets: z.array(visualProofAssetSchema).optional().default([]),
  }),
  generated_context: z.object({
    optin_output_context: z.string().optional(),
    quiz_output_context: z.string().optional(),
    funnel_context_notes: z.string().optional(),
  }),
  assumptions_and_constraints: z.object({
    assumptions_allowed: z.boolean(),
    assumption_notes: z.string().optional(),
    forbidden_terms_or_claims: z.string().optional(),
  }),
});

const funnelPagesRequestSchemaV2Object = toolSharedSchema
  .extend({
    schemaVersion: z.literal('v2'),
    step: funnelStepSchema,
    briefing: funnelUnifiedBriefingSchema,
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
  });

export const funnelPagesRequestSchemaV2 = z.preprocess(
  normalizeFunnelSchemaVersion,
  funnelPagesRequestSchemaV2Object,
);

const funnelPagesRequestSchemaV3Object = toolSharedSchema
  .extend({
    schemaVersion: z.literal('v3'),
    step: funnelStepSchema,
    extractedFields: z
      .record(z.string(), z.unknown())
      .refine((value) => Object.keys(value).length > 0, { message: 'extractedFields must contain at least one field' }),
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
  });

export const funnelPagesRequestSchemaV3 = z.preprocess(
  normalizeFunnelSchemaVersion,
  funnelPagesRequestSchemaV3Object,
);

export const funnelPagesRequestSchema = z.preprocess(
  (value) => normalizeLegacyContext(normalizeFunnelSchemaVersion(value)),
  z.discriminatedUnion('schemaVersion', [
    funnelPagesRequestSchemaV1Object,
    funnelPagesRequestSchemaV2Object,
    funnelPagesRequestSchemaV3Object,
  ]),
);

export type MetaAdsRequest = z.infer<typeof metaAdsRequestSchema>;
export type ExtractionRequest = z.infer<typeof extractionRequestSchema>;
export type ExtractionFieldDefinition = z.infer<typeof extractionFieldDefinitionSchema>;
export type FunnelPagesRequest = z.infer<typeof funnelPagesRequestSchema>;
export type FunnelPagesRequestV1 = z.infer<typeof funnelPagesRequestSchemaV1>;
export type FunnelPagesRequestV2 = z.infer<typeof funnelPagesRequestSchemaV2>;
export type FunnelPagesRequestV3 = z.infer<typeof funnelPagesRequestSchemaV3>;
export type FunnelUnifiedBriefing = z.infer<typeof funnelUnifiedBriefingSchema>;

export function getLengthByFunnelStep(step: FunnelPagesRequest['step']): number {
  if (step === 'optin') return 1200;
  if (step === 'quiz') return 1400;
  return 3200;
}
