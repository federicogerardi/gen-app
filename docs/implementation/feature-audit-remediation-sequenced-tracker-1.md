---
goal: Operational tracker for feature-audit-remediation-sequenced-1 execution
version: 1.0
date_created: 2026-04-12
last_updated: 2026-04-12
owner: Platform Team
status: In Progress (Phase 1-2 Complete)
tags: [process, tracker, audit, remediation, security, quality, testing]
---

# Introduction

![Status: In Progress](https://img.shields.io/badge/status-In%20Progress-yellow)

This tracker is the execution companion for docs/implementation/feature-audit-remediation-sequenced-1.md.
It records baseline coverage, implementation progress, and evidence per task.

## 1. Tracking Rules

- TRK-001: Mark a task as complete only when code, tests, and docs evidence are all present.
- TRK-002: Keep API contract stable: { error: { code, message } }.
- TRK-003: Keep no-breaking-change and backward-compatible behavior for existing clients.
- TRK-004: Record one evidence bullet per completed task with file-level proof.

## 2. Baseline Snapshot (2026-04-12)

Status legend:
- Gap: not implemented yet or materially divergent from plan.
- Partial: partially implemented but missing required constraints/tests.
- Covered: implementation and tests aligned with plan.

### Phase 1

| Task | Finding | Baseline Status | Evidence Snapshot |
| --- | --- | --- | --- |
| TASK-001 | SEC-2 | Gap | src/lib/env.ts does not validate UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN. |
| TASK-002 | SEC-4 | Gap | src/lib/env.ts keeps VERCEL_CRON_SECRET optional with runtime check in cron route. |
| TASK-003 | SEC-3 | Gap | src/app/api/artifacts/[id]/route.ts returns 409 manually, not via typed apiError helper. |
| TASK-004 | QUA-3 | Gap | src/app/api/cron/cleanup-stale-artifacts/route.ts uses findMany + Promise.all(update) instead of updateMany. |
| TASK-005 | QUA-4 | Gap | src/app/api/admin/users/route.ts still uses console.error in catch path. |
| TASK-006 | QUA-6 | Gap | src/lib/llm/streaming.ts imports/uses calculateCost alias instead of non-deprecated API. |
| TASK-007 | Phase 1 tests | Partial | Integration tests exist for artifacts id and admin users; dedicated cron cleanup integration coverage is missing. |

### Phase 2

| Task | Finding | Baseline Status | Evidence Snapshot |
| --- | --- | --- | --- |
| TASK-008 | QUA-5 | Gap | meta-ads and funnel-pages routes still persist full prompt in input.topic. |
| TASK-009 | QUA-7 | Gap | extractionFieldDefinitionSchema duplicated in src/lib/tool-routes/schemas.ts and src/lib/llm/agents/extraction.ts. |
| TASK-010 | QUA-8 | Gap | funnelPagesRequestSchema uses z.union(V1,V2,V3), no explicit schemaVersion discriminant. |
| TASK-011 | QUA-9 | Gap | src/lib/document-parser.ts uses regex-based XML extraction, no robust DOCX parser library. |
| TASK-012 | Phase 2 tests | Partial | funnel schema unit tests exist; no dedicated shared extraction schema tests and no parser edge-case fixture suite. |

### Phase 3

| Task | Finding | Baseline Status | Evidence Snapshot |
| --- | --- | --- | --- |
| TASK-013 | SEC-5 | Gap | next.config.ts does not define security headers(). |
| TASK-014 | QUA-2 | Gap | streaming token/cost estimates are char-based and chunk-count based, no provider-driven token counting path. |
| TASK-015 | TEST-1 | Gap | tests/e2e contains only home.spec.ts; smoke tests for generation/upload/admin quota missing. |
| TASK-016 | TEST-2 | Gap | jest.config.js has global threshold 70%; no progressive infra-focused coverage targets and no logger/db-wrapper integration suite. |

### Phase 4

| Task | Finding | Baseline Status | Evidence Snapshot |
| --- | --- | --- | --- |
| TASK-017 | QUA-1 | Gap | src/app/api/artifacts/generate/route.ts duplicates guard logic instead of shared enforceUsageGuards + requireOwnedProject flow. |
| TASK-018 | SEC-1 | Gap | legacy route quota/budget checks not atomic with monthlyUsed increment boundary. |
| TASK-019 | TEST-3 | Gap | tests/integration/artifacts-generate-route.test.ts has no parallel-concurrency TOCTOU tests. |
| TASK-020 | Final validation | Gap | No session-specific closure report mapping finding -> commit -> test evidence yet. |

## 3. Execution Log

- 2026-04-12: Tracker created and baseline populated from current code and tests.
- 2026-04-12: Phase 1 implementation completed (TASK-001..TASK-007), with targeted typecheck and integration/unit validation passing.
- 2026-04-12: Phase 2 implementation completed (TASK-008..TASK-012), including schema discriminant migration (backward compatible), extraction schema consolidation, and DOCX parser refactor with dedicated tests.

## 4. Current Phase Status (Post-Implementation)

### Phase 1

| Task | Finding | Current Status | Date |
| --- | --- | --- | --- |
| TASK-001 | SEC-2 | Completed | 2026-04-12 |
| TASK-002 | SEC-4 | Completed | 2026-04-12 |
| TASK-003 | SEC-3 | Completed | 2026-04-12 |
| TASK-004 | QUA-3 | Completed | 2026-04-12 |
| TASK-005 | QUA-4 | Completed | 2026-04-12 |
| TASK-006 | QUA-6 | Completed | 2026-04-12 |
| TASK-007 | Phase 1 tests | Completed | 2026-04-12 |

Evidence log:
- EVID-001 (TASK-001, TASK-002): Updated env validation and typed Redis config in src/lib/env.ts and src/lib/rate-limit.ts with production rule for VERCEL_CRON_SECRET and non-test Redis fail-fast.
- EVID-002 (TASK-003): 409 conflict standardized through typed helper by extending ApiErrorCode and using apiError in src/lib/tool-routes/responses.ts and src/app/api/artifacts/[id]/route.ts.
- EVID-003 (TASK-004): Cron stale cleanup switched to single updateMany path with coherent cleaned count reporting in src/app/api/cron/cleanup-stale-artifacts/route.ts.
- EVID-004 (TASK-005): Structured route logging introduced in src/app/api/admin/users/route.ts with requestId + route metadata.
- EVID-005 (TASK-006): Deprecated cost alias removed from streaming usage in src/lib/llm/streaming.ts (now using calculateCostAccurate).
- EVID-006 (TASK-007): Added and updated integration tests in tests/integration/cleanup-stale-artifacts-route.test.ts, tests/integration/admin-routes.test.ts, tests/integration/artifacts-id-route.test.ts, and supporting mock update in tests/integration/db-mock.ts.
- EVID-007 (Phase 1 validation command): npm run typecheck && npx jest tests/unit/env.test.ts tests/integration/cleanup-stale-artifacts-route.test.ts tests/integration/admin-routes.test.ts tests/integration/artifacts-id-route.test.ts tests/unit/streaming.test.ts => 5 suites passed, 40 tests passed.

### Phase 2

| Task | Finding | Current Status | Date |
| --- | --- | --- | --- |
| TASK-008 | QUA-5 | Completed | 2026-04-12 |
| TASK-009 | QUA-7 | Completed | 2026-04-12 |
| TASK-010 | QUA-8 | Completed | 2026-04-12 |
| TASK-011 | QUA-9 | Completed | 2026-04-12 |
| TASK-012 | Phase 2 tests | Completed | 2026-04-12 |

Evidence log:
- EVID-008 (TASK-008): Prompt payload de-duplication completed by replacing full prompt persistence in input.topic with concise metadata in src/app/api/tools/meta-ads/generate/route.ts and src/app/api/tools/funnel-pages/generate/route.ts while keeping promptOverride for generation.
- EVID-009 (TASK-009): extractionFieldDefinitionSchema now shared from src/lib/tool-routes/schemas.ts and reused in src/lib/llm/agents/extraction.ts to prevent schema drift.
- EVID-010 (TASK-010): funnelPagesRequestSchema migrated to schemaVersion-based discriminated union with retrocompat preprocessing in src/lib/tool-routes/schemas.ts (auto-map legacy payloads to v1/v2/v3).
- EVID-011 (TASK-011): DOCX parsing switched from regex XML extraction to mammoth-based extraction in src/lib/document-parser.ts, with entity normalization preserved.
- EVID-012 (TASK-012): Added and updated tests in tests/unit/tool-routes-schemas.test.ts, tests/unit/extraction-agent-schema.test.ts, tests/unit/document-parser.test.ts, tests/integration/meta-ads-route.test.ts, tests/integration/funnel-pages-route.test.ts.
- EVID-013 (Phase 2 validation command): npm run typecheck && npx jest tests/unit/tool-routes-schemas.test.ts tests/unit/extraction-agent-schema.test.ts tests/unit/document-parser.test.ts tests/integration/meta-ads-route.test.ts tests/integration/funnel-pages-route.test.ts => 5 suites passed, 38 tests passed.

## 5. Evidence Register (to update during implementation)

- EVID-001: completed
- EVID-002: completed
- EVID-003: completed
- EVID-004: completed
- EVID-005: completed
- EVID-006: completed
- EVID-007: completed
- EVID-008: completed
- EVID-009: completed
- EVID-010: completed
- EVID-011: completed
- EVID-012: completed
- EVID-013: completed

## 6. Related Documents

- docs/implementation/feature-audit-remediation-sequenced-1.md
- docs/review/feature-audit-remediation-gap-analysis-2026-04-12.md
