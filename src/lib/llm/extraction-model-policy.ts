export const EXTRACTION_POLICY_VERSION = '1.0.0';

export const EXTRACTION_PRIMARY_MODEL = 'anthropic/claude-3.7-sonnet';
export const EXTRACTION_FALLBACK_MODELS = ['openai/gpt-4.1', 'openai/o3'] as const;

export const EXTRACTION_MAX_ATTEMPTS = 3;
export const EXTRACTION_TIMEOUT_MS = 45_000;
export const EXTRACTION_FIRST_TOKEN_TIMEOUT_MS = 12_000;
export const EXTRACTION_TOKEN_IDLE_TIMEOUT_MS = 10_000;
export const EXTRACTION_JSON_START_TIMEOUT_MS = 8_000;
export const EXTRACTION_JSON_PARSE_TIMEOUT_MS = 7_000;
export const EXTRACTION_DEFAULT_ATTEMPT_TIMEOUTS_MS = [35_000, 25_000, 30_000] as const;

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
