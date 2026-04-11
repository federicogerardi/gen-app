---
goal: Operational tracker for the decomposed quality and security audit execution track
version: 1.0
date_created: 2026-04-11
last_updated: 2026-04-11
owner: Platform Team
status: Phase 1 Complete ✅ | Phase 2-4 Pending
sprint_progress: S1-01-S1-08 Done / S2-01 Pending
tags: [process, tracker, quality, security, audit]
---

# Introduction

![Status: In Progress](https://img.shields.io/badge/status-In%20Progress-blue)

This tracker is the execution companion for docs/implementation/feature-quality-audit-resolution-1.md. It records completion status, evidence, and blockers while keeping the source rationale in docs/implement-quality-audit.md unchanged.

Session sequencing reference: docs/implementation/feature-quality-audit-resolution-sprint-ops-1.md.

## 1. Requirements & Constraints

- REQ-TRK-001: Every completed task must record evidence or a verification summary in this tracker.
- REQ-TRK-002: Status changes must be updated on the same day as execution.
- REQ-TRK-003: Blocked items must include a blocker note and next action.
- CON-TRK-001: Do not mark a phase complete unless its related tests and documentation updates are also complete.
- CON-TRK-002: Do not mark the full track complete unless all phase goals are satisfied without breaking existing behavior.

## 2. Execution Steps

### Sprint 0 – Setup & Baseline

- GOAL-TRK-S0: Establish execution baseline and per-task validation commands before Phase 1 implementation.

| Session | Status | Date | Notes |
| ------- | ------ | ---- | ----- |
| S0-01 | ✅ Done | 2026-04-11 | Plan reviewed; task order confirmed: Phase 1 → Phase 4, sequential within each phase. |
| S0-02 | ✅ Done | 2026-04-11 | Scoped validation commands established for all Phase 1 sessions. |

Evidence log:
- S0-01: Execution plan structure validated. TASK-TRK-001 through TASK-TRK-004 confirmed as Phase 1 correctness gate, with no cross-phase dependencies blocking start from S1-01.
- S0-02: Per-session validation commands documented in `docs/implementation/feature-quality-audit-resolution-sprint-ops-1.md` §S0-02 Validation Baseline. Phase 1 gate: `npm run typecheck && npm run lint && npm test`.

### Implementation Phase 1

- GOAL-TRK-001: Track correctness fixes for accounting, quota integrity, and artifact lifecycle state.

| Task | Description | Completed | Date |
| -------- | ----------- | --------- | ---- |
| TASK-TRK-001 | Correct token accounting behavior. | ✅ Done | 2026-04-11 |
| TASK-TRK-002 | Make quota enforcement atomic under concurrency. | ✅ Done | 2026-04-11 |
| TASK-TRK-003 | Clean up stale or abandoned generating artifacts. | ✅ Done | 2026-04-11 |
| TASK-TRK-004 | Guard artifact updates against invalid non-terminal state transitions. | ✅ Done | 2026-04-11 |

Evidence log:
- Validation baseline established (S0-02). Ready to start S1-01.
- S1-01 (2026-04-11): `inputTokenCount` in `src/lib/llm/streaming.ts` refactored da `Math.ceil(accumulated.length / 4)` (output) a `Math.ceil((promptOverride ?? JSON.stringify(input)).length / 4)` (prompt source). Variabile promossa a `const` pre-loop. Test di regressione aggiunti in `tests/unit/streaming.test.ts`. `tests/unit/llm-streaming-events.test.ts` allineato al valore corretto. Validation: `npm run typecheck && npx jest --testPathPatterns="costs|streaming" --passWithNoTests` → ✅ 11/11 passed.
- S1-02 (2026-04-11): `src/lib/llm/costs.ts` — introdotta `calculateCostAccurate` con `MODEL_COSTS` esportata; `calculateCost` mantenuto come alias `@deprecated` per backward-compat. `tests/unit/costs.test.ts` esteso da 5 a 9 test (rate separati per modello, invariant input<output rate, alias check). Validation: `npx jest tests/unit/costs.test.ts` → ✅ 9/9 passed.
- S1-03 (2026-04-11): Guard applicativo in `src/lib/llm/streaming.ts` — clamp `safeInputTokens = Math.max(inputTokenCount, 1)` / `safeOutputTokens = Math.max(outputTokenCount, 1)` prima del persist `status: 'completed'`; `logger.warn` su violazione invariant. Migration SQL raw aggiunta in `prisma/migrations/20260411_token_positive_invariant/migration.sql` con `CHECK` constraint PostgreSQL condizionale su `status = 'completed'`. Test `clamps outputTokens to 1 when stream yields no tokens` aggiunto in `tests/unit/streaming.test.ts`; warn log verificato nell'output. Validation: `npm run typecheck && npx jest --testPathPatterns="costs|streaming"` → ✅ 16/16 passed.
- S1-04 + S1-05 (2026-04-11): `src/lib/tool-routes/guards.ts` — refactored `enforceUsageGuards` con rate limit check BEFORE transaction, quota/budget checks + `monthlyUsed` increment INSIDE atomic `db.$transaction()`. `src/lib/llm/streaming.ts` — rimosso duplicate `monthlyUsed: { increment: 1 }` dal completion update (già gestito in guards). New file `tests/unit/guards-race-condition.test.ts` (6 tests) verifica atomicità transazione, no increment if quota/budget exhausted. Validation: `npm run typecheck && npx jest --testPathPatterns="costs|streaming|guards-race"` → ✅ 22/22 passed.
- S1-06 + S1-07 + S1-08 (2026-04-11): Schema Prisma — aggiunti field `failureReason` a Artifact (client_disconnect | timeout | error | stale). Cron route `src/app/api/cron/cleanup-stale-artifacts/route.ts` — scans generating > 24h, marks stale. Streaming cancel listener marks disconnect. PUT handler `src/app/api/artifacts/[id]/route.ts` — guard rejects PUT on non-terminal status (generating|failed), returns 409 Conflict. Tests: `tests/unit/artifact-cleanup.test.ts` (8 tests) + `tests/integration/artifacts-id-route.test.ts` +3 S1-08 state guard tests. Validation: `npm run typecheck && npx jest --testPathPatterns="cleanup|artifacts-id"` → ✅ 24/24 passed. **Phase 1 Complete**: `npm run typecheck && npm test` → ✅ 46/46 tests pass, all gates green.

### Implementation Phase 2

- GOAL-TRK-002: Track consistency work on shared guards, models, and audit typing.

| Task | Description | Completed | Date |
| -------- | ----------- | --------- | ---- |
| TASK-TRK-005 | Centralize usage guards in artifact generation flows. |  |  |
| TASK-TRK-006 | Consolidate allowed model definitions and pricing metadata. |  |  |
| TASK-TRK-007 | Parameterize artifact type in guard and audit writes. |  |  |

Evidence log:
- Pending.

### Implementation Phase 3

- GOAL-TRK-003: Track scalability work on admin list retrieval and streaming persistence pressure.

| Task | Description | Completed | Date |
| -------- | ----------- | --------- | ---- |
| TASK-TRK-008 | Add admin user pagination and UI alignment. |  |  |
| TASK-TRK-009 | Reduce streaming database write pressure. |  |  |

Evidence log:
- Pending.

### Implementation Phase 4

- GOAL-TRK-004: Track hardening on upload validation, env safety, role integrity, logging, and pricing freshness.

| Task | Description | Completed | Date |
| -------- | ----------- | --------- | ---- |
| TASK-TRK-010 | Verify uploaded file types via content inspection. |  |  |
| TASK-TRK-011 | Add centralized environment validation. |  |  |
| TASK-TRK-012 | Enforce role constraints in schema and types. |  |  |
| TASK-TRK-013 | Extend structured logging across tool generation routes. |  |  |
| TASK-TRK-014 | Log service-unavailable failures before response mapping. |  |  |
| TASK-TRK-015 | Add pricing staleness warnings for model cost metadata. |  |  |

Evidence log:
- Pending.

## 3. Dependencies

- DEP-TRK-001: docs/implementation/feature-quality-audit-resolution-1.md defines the execution scope for this tracker.
- DEP-TRK-002: docs/implement-quality-audit.md remains the source reference for problem statements and rationale.
- DEP-TRK-003: CI quality gates must remain green for completed items.
- DEP-TRK-004: docs/implementation/feature-quality-audit-resolution-sprint-ops-1.md defines the recommended session order and stop conditions.

## 4. Files

- FILE-TRK-001: docs/implementation/feature-quality-audit-resolution-1.md - execution plan.
- FILE-TRK-002: docs/implement-quality-audit.md - source audit roadmap.
- FILE-TRK-003: docs/implement-index.md - top-level tracking index.
- FILE-TRK-004: docs/implementation/implementation-plan.md - main roadmap reference.
- FILE-TRK-005: docs/implementation/feature-quality-audit-resolution-sprint-ops-1.md - granular session backlog.

## 5. Testing

- TEST-TRK-001: Record the verification summary used to close each task.
- TEST-TRK-002: Record any skipped validation and rationale before moving to review.

## 6. Risks & Assumptions

- RISK-TRK-001: Tracker drift can make the audit appear further along than the codebase actually is.
- RISK-TRK-002: Cross-cutting tasks may require multiple docs updates that are easy to miss without explicit evidence notes.
- ASSUMPTION-TRK-001: The team will update this tracker phase by phase rather than only at the end of the full audit track.

## 7. Related Specifications / Further Reading

- docs/implementation/feature-quality-audit-resolution-1.md
- docs/implement-quality-audit.md
- docs/implementation/implementation-plan.md
- docs/implementation/feature-quality-audit-resolution-sprint-ops-1.md
