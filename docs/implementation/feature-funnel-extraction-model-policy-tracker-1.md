---
goal: Operational tracker for static extraction model policy with deterministic fallback chain
version: 1.3
date_created: 2026-04-12
last_updated: 2026-04-12
owner: Platform AI / Tooling
status: Completed
tags: [process, tracker, extraction, llm, openrouter, reliability, cost]
---

# Introduction

![Status: Completed](https://img.shields.io/badge/status-Completed-brightgreen)

This tracker is the execution companion for docs/implementation/funnel-extraction-model-policy-plan.md.
It records baseline status, implementation progress, and evidence for each execution task.

## 1. Tracking Rules

- TRK-001: Mark a task as completed only when implementation, tests, and docs updates are all present.
- TRK-002: Keep extraction API contract stable: `{ error: { code, message } }`.
- TRK-003: Preserve route guard order and checks: auth -> validation -> rate limit/usage -> ownership -> LLM call.
- TRK-004: Each completed task must include at least one file-level evidence bullet.
- TRK-005: Do not use payload `model` to choose extraction runtime model.

## 2. Baseline Snapshot (2026-04-12)

Status legend:
- Gap: not implemented yet or materially divergent from plan.
- Partial: partially implemented with missing constraints/tests.
- Covered: implemented and validated.

### Phase 1 - Policy module and deterministic chain

| Task | Baseline Status | Evidence Snapshot |
| --- | --- | --- |
| TASK-001 | Gap | No dedicated module for static extraction model policy exists yet. |
| TASK-002 | Gap | No explicit attempt plan helper for extraction chain currently present. |
| TASK-003 | Gap | No dedicated reason mapper for fallback escalation currently present. |
| TASK-004 | Gap | Runtime model currently inherited from payload model in extraction route. |
| TASK-005 | Gap | No dedicated unit tests for extraction model policy in tests/unit. |

### Phase 2 - Route integration and fallback execution

| Task | Baseline Status | Evidence Snapshot |
| --- | --- | --- |
| TASK-006 | Gap | `src/app/api/tools/extraction/generate/route.ts` invokes stream with `model: payload.model`. |
| TASK-007 | Gap | Usage/model guard flow currently keyed by payload model only. |
| TASK-008 | Gap | Extraction route currently performs one-shot attempt (no deterministic fallback loop). |
| TASK-009 | Gap | No post-stream parse/schema/coherence gate that triggers model escalation. |
| TASK-010 | Gap | No dedicated terminal error code for exhausted extraction fallback chain. |
| TASK-011 | Partial | Request-level logs exist, attempt-level fallback telemetry is missing. |

### Phase 3 - Cost/usage accounting and persistence semantics

| Task | Baseline Status | Evidence Snapshot |
| --- | --- | --- |
| TASK-012 | Partial | Streaming stores model per call; multi-attempt behavior for extraction not implemented yet. |
| TASK-013 | Gap | No attempt metadata persisted in extraction artifact input. |
| TASK-014 | Gap | No explicit per-request extraction budget cap to stop further attempts. |
| TASK-015 | Gap | Retry semantics for `monthlyUsed` not yet normalized for policy-driven multi-attempt flow. |
| TASK-016 | Gap | No tests covering usage/cost semantics under extraction fallback retries. |

### Phase 4 - Docs and rollout

| Task | Baseline Status | Evidence Snapshot |
| --- | --- | --- |
| TASK-017 | Gap | API spec does not yet document extraction runtime model override behavior. |
| TASK-018 | Gap | implement-index does not yet include this active track. |
| TASK-019 | Gap | Extraction integration test suite does not yet assert chain stop-on-success behavior. |
| TASK-020 | Gap | Rollout gates/metrics not yet codified in an execution runbook artifact. |
| TASK-021 | Gap | No dedicated closure/runbook note under docs/review for this initiative yet. |

## 3. Execution Log

- 2026-04-12: Tracker created with baseline aligned to current repository state.
- 2026-04-12: `docs/implement-index.md` updated to include the active extraction policy initiative.
- 2026-04-12: Piano aggiornato con contribution block operativo (acceptance criteria, DoD, execution sequence).
- 2026-04-12: Phase 1 implemented in code (`extraction-model-policy.ts`) with dedicated unit tests passing.
- 2026-04-12: Phase 2 implemented in route (`fallback chain`, validation gates, `EXTRACTION_FAILED`, per-attempt telemetry) with updated integration tests passing.
- 2026-04-12: Phase 3 completed (`monthlyUsed` single increment across retries, attempt metadata persistence, budget cap stop) with integration + unit validations.
- 2026-04-12: Phase 4 completed (API spec update, implement-index realignment, rollout gates definition, runbook publication in review).

## 4. Current Phase Status

### Phase 1

| Task | Current Status | Date |
| --- | --- | --- |
| TASK-001 | Completed | 2026-04-12 |
| TASK-002 | Completed | 2026-04-12 |
| TASK-003 | Completed | 2026-04-12 |
| TASK-004 | Completed | 2026-04-12 |
| TASK-005 | Completed | 2026-04-12 |

### Phase 2

| Task | Current Status | Date |
| --- | --- | --- |
| TASK-006 | Completed | 2026-04-12 |
| TASK-007 | Completed | 2026-04-12 |
| TASK-008 | Completed | 2026-04-12 |
| TASK-009 | Completed | 2026-04-12 |
| TASK-010 | Completed | 2026-04-12 |
| TASK-011 | Completed | 2026-04-12 |

### Phase 3

| Task | Current Status | Date |
| --- | --- | --- |
| TASK-012 | Completed | 2026-04-12 |
| TASK-013 | Completed | 2026-04-12 |
| TASK-014 | Completed | 2026-04-12 |
| TASK-015 | Completed | 2026-04-12 |
| TASK-016 | Completed | 2026-04-12 |

### Phase 4

| Task | Current Status | Date |
| --- | --- | --- |
| TASK-017 | Completed | 2026-04-12 |
| TASK-018 | Completed | 2026-04-12 |
| TASK-019 | Completed | 2026-04-12 |
| TASK-020 | Completed | 2026-04-12 |
| TASK-021 | Completed | 2026-04-12 |

## 5. Evidence Register (to update during execution)

- EVID-001: docs index updated with extraction policy track entry in `docs/implement-index.md`
- EVID-002: plan enriched with execution gates and DoD in `docs/implementation/funnel-extraction-model-policy-plan.md`
- EVID-003: policy module added in `src/lib/llm/extraction-model-policy.ts`
- EVID-004: constants/helpers implemented and validated in `src/lib/llm/extraction-model-policy.ts`
- EVID-005: unit tests added in `tests/unit/extraction-model-policy.test.ts`
- EVID-006: route fallback chain implemented in `src/app/api/tools/extraction/generate/route.ts`
- EVID-007: pending
- EVID-008: pending
- EVID-009: pending
- EVID-010: pending
- EVID-011: pending
- EVID-012: pending
- EVID-013: pending
- EVID-014: pending
- EVID-015: pending
- EVID-016: pending
- EVID-017: pending

Phase 1 evidence log:
- EVID-004 (TASK-001..TASK-004): constants and pure helpers implemented in `src/lib/llm/extraction-model-policy.ts`.
- EVID-005 (TASK-005): new tests in `tests/unit/extraction-model-policy.test.ts`.
- EVID-006 (validation): `npx jest tests/unit/extraction-model-policy.test.ts` -> PASS (8 tests).

Phase 2 evidence log:
- EVID-007 (TASK-006..TASK-011): extraction route updated with deterministic attempts, runtime model enforcement, guard checks per attempt, post-output parse/schema/coherence validation, and per-attempt telemetry in `src/app/api/tools/extraction/generate/route.ts`.
- EVID-008 (TASK-010): API error code `EXTRACTION_FAILED` introduced in `src/lib/tool-routes/responses.ts`.
- EVID-009 (TASK-019 coverage subset): integration tests updated in `tests/integration/extraction-route.test.ts` for static first model, fallback to `openai/gpt-4.1`, and exhausted chain response.
- EVID-010 (validation): `npx jest tests/integration/extraction-route.test.ts tests/unit/extraction-model-policy.test.ts` -> PASS (14 tests).

Phase 3 evidence log:
- EVID-011 (TASK-015): usage guard option `incrementMonthlyUsed` added in `src/lib/tool-routes/guards.ts` and applied from extraction route to keep retries under a single request increment.
- EVID-012 (TASK-013/TASK-014): extraction route persists attempt metadata and applies cumulative budget stop in `src/app/api/tools/extraction/generate/route.ts`.
- EVID-013 (TASK-012/TASK-016): assertions expanded in `tests/unit/llm-streaming-events.test.ts` and `tests/integration/extraction-route.test.ts`; validation command `npx jest tests/integration/extraction-route.test.ts tests/unit/llm-streaming-events.test.ts tests/unit/extraction-model-policy.test.ts` -> PASS (17 tests).

Phase 4 evidence log:
- EVID-014 (TASK-017): API extraction contract updated in `docs/specifications/api-specifications.md` with deterministic runtime policy and `EXTRACTION_FAILED` semantics.
- EVID-015 (TASK-018): index status realigned in `docs/implement-index.md` from planned to implemented with rollout defined.
- EVID-016 (TASK-020/TASK-021): rollout gates and rollback criteria formalized in `docs/review/extraction-model-policy-rollout-runbook-2026-04-12.md`.
- EVID-017 (TASK-019): integration chain assertions already covered in `tests/integration/extraction-route.test.ts` and validated in prior phase command (`PASS`, 17 tests total).

## 6. Related Documents

- docs/implementation/funnel-extraction-model-policy-plan.md
- docs/specifications/api-specifications.md
- docs/adrs/001-modular-llm-controller-architecture.md
- docs/adrs/003-rate-limiting-quota-strategy.md
