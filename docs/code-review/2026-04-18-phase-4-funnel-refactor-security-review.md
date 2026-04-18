# Code Review: Phase 4 Funnel Refactor Plan (Predictive Security Audit)
**Ready for Production**: Yes
**Critical Issues**: 0
**Review Date**: 2026-04-18
**Scope**: Piano di refactor in [docs/implementation/funnel-pages-phase-4-refactor-plan.md](../implementation/funnel-pages-phase-4-refactor-plan.md)

## Status Update (Post-Plan Alignment)

- Decisione aggiornata a **GO for operations**.
- I requisiti P1/P2 sono stati integrati nel piano operativo in [docs/implementation/funnel-pages-phase-4-refactor-plan.md](../implementation/funnel-pages-phase-4-refactor-plan.md):
  - security regression gate esplicito (auth, ownership, rate-limit, error contract);
  - vincolo ordine guard server-side prima di chiamate LLM;
  - requirement su normalizzazione input e test su input ostile;
  - rischio sicurezza esplicitato in risk register e gate di uscita.

Questo documento resta come audit predittivo con remediation incorporate.

## Priority 1 (Must Fix) ⛔ (Resolved)

1. Missing explicit security invariants for API flow preservation (Auth, Ownership, Rate Limit)
- Status: Resolved in operational plan alignment.
- Evidence: [docs/implementation/funnel-pages-phase-4-refactor-plan.md](../implementation/funnel-pages-phase-4-refactor-plan.md#L28) and [docs/implementation/funnel-pages-phase-4-refactor-plan.md](../implementation/funnel-pages-phase-4-refactor-plan.md#L67)
- Risk: During UI refactor, request orchestration can regress and accidentally bypass mandatory protections in route handlers (A01 Broken Access Control and DoS amplification risk through missing throttling checks).
- Impact: Unauthorized artifact access or excessive upstream LLM requests if integration contracts are changed indirectly.
- Required fix:
  - Add an explicit non-regression checkpoint: preserve server-side auth(), ownership checks, and rateLimit(userId) order before any OpenRouter call.
  - Add test gate in Phase 4 validation: run integration tests covering UNAUTHORIZED, FORBIDDEN, RATE_LIMIT_EXCEEDED for funnel routes.

2. Missing input/output safety controls for LLM prompt path in refactor tasks
- Status: Resolved in operational plan alignment.
- Evidence: [docs/implementation/funnel-pages-phase-4-refactor-plan.md](../implementation/funnel-pages-phase-4-refactor-plan.md#L75) and [docs/implementation/funnel-pages-phase-4-refactor-plan.md](../implementation/funnel-pages-phase-4-refactor-plan.md#L97)
- Risk: Payload mapping and extraction content plumbing are planned without explicit guardrails against prompt injection or unsafe propagation of user-provided text (LLM01 Prompt Injection, LLM06 Information Disclosure).
- Impact: Malicious or malformed extracted text could alter downstream generation behavior, exfiltrate internal prompt intent, or produce unsafe outputs.
- Required fix:
  - Add a sanitization/normalization step requirement before prompt assembly.
  - Preserve strict output handling policy (bounded fields, known keys, no raw debug leakage to UI).
  - Add tests for hostile extraction input (instruction override attempts, delimiter injection, long-token abuse).

## Priority 2 (Should Fix) ⚠️ (Resolved)

1. Security validation is absent from Phase 4 quality gates
- Status: Resolved in operational plan alignment.
- Evidence: [docs/implementation/funnel-pages-phase-4-refactor-plan.md](../implementation/funnel-pages-phase-4-refactor-plan.md#L89)
- Risk: Type/lint/build/tests can pass while security behavior regresses.
- Recommendation:
  - Extend Step 5 with security regression checks:
    - auth negative path
    - ownership negative path
    - rate-limit enforcement path
    - standardized error contract path `{ error: { code, message } }`

2. Threat model coverage not represented in risk section
- Status: Resolved in operational plan alignment.
- Evidence: [docs/implementation/funnel-pages-phase-4-refactor-plan.md](../implementation/funnel-pages-phase-4-refactor-plan.md#L123)
- Risk: Existing risk list covers maintainability/perf but omits OWASP Top 10 and OWASP LLM top risks.
- Recommendation:
  - Add dedicated security risks in plan: access control regression, prompt-injection propagation, data exposure via error surfaces.

## Priority 3 (Nice to Have) ℹ️

1. Add runtime observability acceptance criteria for security-sensitive failures
- Recommendation:
  - Include structured log checks for denied requests and rate-limited requests in post-refactor verification.

## Suggested Plan Delta

- Add a new subsection in Step 5: Security Regression Gate.
- Add security items under Acceptance Criteria and Exit Criteria.
- Keep API error contract unchanged and test it explicitly.

## Go/No-Go

- Current status: Go (plan aligned, P1/P2 integrated).
- Operational condition: mantenere verde la test matrix obbligatoria di Phase 4.
