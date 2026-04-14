import {
  EXTRACTION_DEFAULT_ATTEMPT_TIMEOUTS_MS,
  EXTRACTION_FIRST_TOKEN_TIMEOUT_MS,
  EXTRACTION_FALLBACK_MODELS,
  EXTRACTION_JSON_PARSE_TIMEOUT_MS,
  EXTRACTION_JSON_START_TIMEOUT_MS,
  EXTRACTION_MAX_ATTEMPTS,
  EXTRACTION_PRIMARY_MODEL,
  EXTRACTION_TOKEN_IDLE_TIMEOUT_MS,
  EXTRACTION_TIMEOUT_MS,
  getExtractionAttemptPlan,
  getExtractionModelChain,
  resolveExtractionRuntimeModel,
  shouldEscalateExtractionAttempt,
} from '@/lib/llm/extraction-model-policy';

describe('extraction-model-policy', () => {
  it('returns a deterministic model chain', () => {
    expect(getExtractionModelChain()).toEqual([
      EXTRACTION_PRIMARY_MODEL,
      ...EXTRACTION_FALLBACK_MODELS,
    ]);
  });

  it('builds attempt plan with default timeout and fallback flags', () => {
    const plan = getExtractionAttemptPlan();

    expect(plan).toHaveLength(EXTRACTION_MAX_ATTEMPTS);
    expect(plan[0]).toEqual({
      attemptIndex: 1,
      model: EXTRACTION_PRIMARY_MODEL,
      isFallback: false,
      timeoutMs: EXTRACTION_DEFAULT_ATTEMPT_TIMEOUTS_MS[0],
    });
    expect(plan[1]).toEqual({
      attemptIndex: 2,
      model: EXTRACTION_FALLBACK_MODELS[0],
      isFallback: true,
      timeoutMs: EXTRACTION_DEFAULT_ATTEMPT_TIMEOUTS_MS[1],
    });
    expect(plan[2]?.timeoutMs).toBe(EXTRACTION_DEFAULT_ATTEMPT_TIMEOUTS_MS[2]);
  });

  it('caps attempt plan when maxAttempts override is provided', () => {
    const plan = getExtractionAttemptPlan({ maxAttempts: 2, timeoutMs: 12_000 });

    expect(plan).toEqual([
      {
        attemptIndex: 1,
        model: EXTRACTION_PRIMARY_MODEL,
        isFallback: false,
        timeoutMs: 12_000,
      },
      {
        attemptIndex: 2,
        model: EXTRACTION_FALLBACK_MODELS[0],
        isFallback: true,
        timeoutMs: 12_000,
      },
    ]);
  });

  it('uses single timeout override for all attempts when per-attempt values are provided explicitly', () => {
    const plan = getExtractionAttemptPlan({
      maxAttempts: 3,
      timeoutMs: 15_000,
      attemptTimeoutMs: [15_000, 15_000, 15_000],
    });

    expect(plan.map((item) => item.timeoutMs)).toEqual([15_000, 15_000, 15_000]);
  });

  it('exposes first-token timeout hardening constant', () => {
    expect(EXTRACTION_FIRST_TOKEN_TIMEOUT_MS).toBe(12_000);
    expect(EXTRACTION_TIMEOUT_MS).toBeGreaterThan(EXTRACTION_FIRST_TOKEN_TIMEOUT_MS);
    expect(EXTRACTION_JSON_START_TIMEOUT_MS).toBe(8_000);
    expect(EXTRACTION_JSON_PARSE_TIMEOUT_MS).toBe(7_000);
    expect(EXTRACTION_TOKEN_IDLE_TIMEOUT_MS).toBe(10_000);
    expect(EXTRACTION_FIRST_TOKEN_TIMEOUT_MS).toBeGreaterThanOrEqual(EXTRACTION_TOKEN_IDLE_TIMEOUT_MS);
    expect(EXTRACTION_TOKEN_IDLE_TIMEOUT_MS).toBeGreaterThan(EXTRACTION_JSON_START_TIMEOUT_MS);
    expect(EXTRACTION_JSON_START_TIMEOUT_MS).toBeGreaterThan(EXTRACTION_JSON_PARSE_TIMEOUT_MS);
  });

  it('always resolves primary runtime model independently from payload model', () => {
    expect(resolveExtractionRuntimeModel('openai/gpt-4o-mini')).toBe(EXTRACTION_PRIMARY_MODEL);
    expect(resolveExtractionRuntimeModel('openai/o3')).toBe(EXTRACTION_PRIMARY_MODEL);
  });

  it('escalates with parse_failed reason when json parse fails', () => {
    const decision = shouldEscalateExtractionAttempt(
      { success: false, parseOk: false },
      { attemptIndex: 1 },
    );

    expect(decision).toEqual({ escalate: true, reason: 'parse_failed' });
  });

  it('escalates with schema_failed reason when schema validation fails', () => {
    const decision = shouldEscalateExtractionAttempt(
      { success: false, parseOk: true, schemaOk: false },
      { attemptIndex: 1 },
    );

    expect(decision).toEqual({ escalate: true, reason: 'schema_failed' });
  });

  it('blocks escalation when max attempts is reached', () => {
    const decision = shouldEscalateExtractionAttempt(
      { success: false, providerError: true },
      { attemptIndex: EXTRACTION_MAX_ATTEMPTS },
    );

    expect(decision).toEqual({ escalate: false, reason: 'max_attempts_reached' });
  });
});
