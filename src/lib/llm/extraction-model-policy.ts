export const EXTRACTION_POLICY_VERSION = '1.0.0';

export const EXTRACTION_PRIMARY_MODEL = 'anthropic/claude-3.7-sonnet';
export const EXTRACTION_FALLBACK_MODELS = ['openai/gpt-4.1', 'openai/o3'] as const;

export const EXTRACTION_MAX_ATTEMPTS = 3;
export const EXTRACTION_TIMEOUT_MS = 180_000;
export const EXTRACTION_FIRST_TOKEN_TIMEOUT_MS = 45_000;
export const EXTRACTION_TOKEN_IDLE_TIMEOUT_MS = 40_000;
export const EXTRACTION_JSON_START_TIMEOUT_MS = 35_000;
export const EXTRACTION_JSON_PARSE_TIMEOUT_MS = 30_000;
export const EXTRACTION_DEFAULT_ATTEMPT_TIMEOUTS_MS = [90_000, 120_000, 150_000] as const;
export const EXTRACTION_TEXT_ATTEMPT_TIMEOUTS_MS = [120_000, 150_000, 180_000] as const;

export const EXTRACTION_COMPLETION_OUTCOMES = ['completed_full', 'completed_partial', 'failed_hard'] as const;

export const EXTRACTION_COMPLETION_REASONS = [
  'known_fields_present',
  'critical_coverage_threshold_met',
  'no_critical_fields_defined',
  'no_known_keys_but_structured_signal',
  'partial_useful_output',
  'unauthorized',
  'forbidden',
  'validation_error',
  'no_signal_after_chain_exhausted',
] as const;

export type ExtractionCompletionOutcome = (typeof EXTRACTION_COMPLETION_OUTCOMES)[number];
export type ExtractionCompletionReason = (typeof EXTRACTION_COMPLETION_REASONS)[number];

export type ExtractionTerminalState = {
  outcome: ExtractionCompletionOutcome;
  reason: ExtractionCompletionReason;
  httpStatus: number;
  artifactStatus: 'completed' | 'failed';
};

type ExtractionRouteHardFailReason = 'unauthorized' | 'forbidden' | 'validation_error' | 'no_signal_after_chain_exhausted';

export type ExtractionEscalationReason =
  | 'parse_failed'
  | 'schema_failed'
  | 'consistency_failed'
  | 'timeout'
  | 'provider_error'
  | 'max_attempts_reached';

export type ExtractionAttemptPlanItem = {
  attemptIndex: number;
  model: string;
  isFallback: boolean;
  timeoutMs: number;
};

export type ExtractionAttemptResult = {
  success: boolean;
  parseOk?: boolean;
  schemaOk?: boolean;
  consistencyOk?: boolean;
  timedOut?: boolean;
  providerError?: boolean;
};

export type ExtractionPolicyState = {
  attemptIndex: number;
  maxAttempts?: number;
};

export function getExtractionModelChain(): readonly string[] {
  return [EXTRACTION_PRIMARY_MODEL, ...EXTRACTION_FALLBACK_MODELS];
}

export function getExtractionAttemptPlan(config?: {
  timeoutMs?: number;
  attemptTimeoutMs?: number[];
  maxAttempts?: number;
}): ExtractionAttemptPlanItem[] {
  const maxAttempts = Math.max(1, config?.maxAttempts ?? EXTRACTION_MAX_ATTEMPTS);
  const chain = getExtractionModelChain().slice(0, maxAttempts);
  const perAttemptTimeouts = config?.attemptTimeoutMs
    ?? (typeof config?.timeoutMs === 'number' ? undefined : [...EXTRACTION_DEFAULT_ATTEMPT_TIMEOUTS_MS]);
  const fallbackTimeoutMs = config?.timeoutMs ?? EXTRACTION_TIMEOUT_MS;

  return chain.map((model, index) => ({
    attemptIndex: index + 1,
    model,
    isFallback: index > 0,
    timeoutMs: perAttemptTimeouts?.[index] ?? fallbackTimeoutMs,
  }));
}

export function resolveExtractionRuntimeModel(payloadModel: string): string {
  void payloadModel;
  return EXTRACTION_PRIMARY_MODEL;
}

export function classifyExtractionCompletionOutcome(input: {
  success: boolean;
  acceptanceDecision?: 'hard_accept' | 'soft_accept' | 'reject';
  timedOut?: boolean;
}): ExtractionCompletionOutcome {
  if (!input.success) {
    return 'failed_hard';
  }

  if (input.timedOut) {
    return 'completed_partial';
  }

  if (input.acceptanceDecision === 'soft_accept') {
    return 'completed_partial';
  }

  return 'completed_full';
}

export function resolveExtractionCompletionReason(input: {
  outcome: ExtractionCompletionOutcome;
  acceptanceReason?: string;
  hardFailReason?: ExtractionRouteHardFailReason;
}): ExtractionCompletionReason {
  if (input.outcome === 'failed_hard') {
    return input.hardFailReason ?? 'no_signal_after_chain_exhausted';
  }

  if (input.outcome === 'completed_full') {
    return 'known_fields_present';
  }

  if (input.acceptanceReason === 'critical_coverage_threshold_met') {
    return 'critical_coverage_threshold_met';
  }

  if (input.acceptanceReason === 'no_critical_fields_defined') {
    return 'no_critical_fields_defined';
  }

  if (input.acceptanceReason === 'no_known_keys_but_structured_signal') {
    return 'no_known_keys_but_structured_signal';
  }

  return 'partial_useful_output';
}

export function mapExtractionTerminalState(input: {
  outcome: ExtractionCompletionOutcome;
  reason: ExtractionCompletionReason;
}): ExtractionTerminalState {
  if (input.outcome !== 'failed_hard') {
    return {
      outcome: input.outcome,
      reason: input.reason,
      httpStatus: 200,
      artifactStatus: 'completed',
    };
  }

  if (input.reason === 'unauthorized') {
    return {
      outcome: input.outcome,
      reason: input.reason,
      httpStatus: 401,
      artifactStatus: 'failed',
    };
  }

  if (input.reason === 'forbidden') {
    return {
      outcome: input.outcome,
      reason: input.reason,
      httpStatus: 403,
      artifactStatus: 'failed',
    };
  }

  if (input.reason === 'validation_error') {
    return {
      outcome: input.outcome,
      reason: input.reason,
      httpStatus: 400,
      artifactStatus: 'failed',
    };
  }

  return {
    outcome: input.outcome,
    reason: input.reason,
    httpStatus: 503,
    artifactStatus: 'failed',
  };
}

function resolveEscalationReason(result: ExtractionAttemptResult): ExtractionEscalationReason {
  if (result.timedOut) return 'timeout';
  if (result.providerError) return 'provider_error';
  if (result.parseOk === false) return 'parse_failed';
  if (result.schemaOk === false) return 'schema_failed';
  if (result.consistencyOk === false) return 'consistency_failed';
  return 'provider_error';
}

export function shouldEscalateExtractionAttempt(
  result: ExtractionAttemptResult,
  state: ExtractionPolicyState,
): { escalate: boolean; reason?: ExtractionEscalationReason } {
  if (result.success) {
    return { escalate: false };
  }

  const maxAttempts = state.maxAttempts ?? EXTRACTION_MAX_ATTEMPTS;

  if (state.attemptIndex >= maxAttempts) {
    return { escalate: false, reason: 'max_attempts_reached' };
  }

  return { escalate: true, reason: resolveEscalationReason(result) };
}
