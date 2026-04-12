import {
  EXTRACTION_FALLBACK_MODELS,
  EXTRACTION_MAX_ATTEMPTS,
  EXTRACTION_MAX_COST_USD,
  EXTRACTION_PRIMARY_MODEL,
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
      timeoutMs: EXTRACTION_TIMEOUT_MS,
    });
    expect(plan[1]?.isFallback).toBe(true);
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

  it('blocks escalation when budget cap is exceeded', () => {
    const decision = shouldEscalateExtractionAttempt(
      { success: false, providerError: true },
      { attemptIndex: 1, cumulativeCostUsd: EXTRACTION_MAX_COST_USD + 0.001 },
    );

    expect(decision).toEqual({ escalate: false, reason: 'budget_exceeded' });
  });

  it('blocks escalation when max attempts is reached', () => {
    const decision = shouldEscalateExtractionAttempt(
      { success: false, providerError: true },
      { attemptIndex: EXTRACTION_MAX_ATTEMPTS },
    );

    expect(decision).toEqual({ escalate: false, reason: 'max_attempts_reached' });
  });
});
