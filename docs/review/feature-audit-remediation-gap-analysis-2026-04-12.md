---
goal: Gap analysis of feature-audit-remediation-sequenced-1 against current codebase
version: 1.0
date_created: 2026-04-12
last_updated: 2026-04-12
owner: Platform Team
status: Complete
tags: [review, gap-analysis, security, quality, testing]
---

# Scope

Compared plan tasks TASK-001..TASK-020 from docs/implementation/feature-audit-remediation-sequenced-1.md with current implementation in:
- src/lib/env.ts
- src/app/api/artifacts/[id]/route.ts
- src/app/api/cron/cleanup-stale-artifacts/route.ts
- src/app/api/admin/users/route.ts
- src/lib/llm/streaming.ts
- src/lib/llm/costs.ts
- src/lib/tool-routes/schemas.ts
- src/lib/llm/agents/extraction.ts
- src/lib/document-parser.ts
- src/app/api/tools/meta-ads/generate/route.ts
- src/app/api/tools/funnel-pages/generate/route.ts
- src/app/api/artifacts/generate/route.ts
- next.config.ts
- tests/integration/*
- tests/unit/*
- tests/e2e/*
- jest.config.js

Method: static code and test inspection only (no implementation changes in this step).

# Executive Summary

- Covered: 0 tasks
- Partial: 2 tasks (TASK-007, TASK-012)
- Gap: 18 tasks

High-risk open gaps:
- SEC-1 and QUA-1 remain open in legacy generation route (non-shared and non-atomic guard path).
- SEC-5 remains open (no global security headers in next.config.ts).
- QUA-2 remains open (token and cost estimates still approximation-based, no provider token path).

# Findings by Phase

## Phase 1

- TASK-001 (SEC-2): Gap
  - src/lib/env.ts validates core env vars but does not include UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN.
- TASK-002 (SEC-4): Gap
  - VERCEL_CRON_SECRET is optional in src/lib/env.ts; failure is deferred to cron route runtime.
- TASK-003 (SEC-3): Gap
  - src/app/api/artifacts/[id]/route.ts emits 409 CONFLICT inline, not via typed shared apiError helper.
- TASK-004 (QUA-3): Gap
  - src/app/api/cron/cleanup-stale-artifacts/route.ts does findMany + per-row update instead of updateMany.
- TASK-005 (QUA-4): Gap
  - src/app/api/admin/users/route.ts logs with console.error in catch path.
- TASK-006 (QUA-6): Gap
  - src/lib/llm/streaming.ts still imports/uses calculateCost alias.
- TASK-007 (Phase 1 tests): Partial
  - tests/integration/artifacts-id-route.test.ts covers 409 CONFLICT behavior.
  - tests/integration/admin-routes.test.ts covers admin users route.
  - Missing dedicated integration tests for cron cleanup route behavior and count consistency.

## Phase 2

- TASK-008 (QUA-5): Gap
  - meta-ads and funnel-pages generation routes still save full prompt in input.topic.
- TASK-009 (QUA-7): Gap
  - extraction field definition schema is duplicated between tool routes and extraction agent.
- TASK-010 (QUA-8): Gap
  - funnelPagesRequestSchema uses z.union across versions, without explicit schemaVersion discriminant.
- TASK-011 (QUA-9): Gap
  - DOCX parsing still regex-based in document-parser.ts; no robust library integration.
- TASK-012 (Phase 2 tests): Partial
  - tests/unit/tool-routes-schemas.test.ts covers multiple funnel schema payload shapes.
  - Missing specific tests for shared extraction schema reuse and DOCX parser edge fixtures.

## Phase 3

- TASK-013 (SEC-5): Gap
  - next.config.ts lacks headers() with CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, HSTS.
- TASK-014 (QUA-2): Gap
  - streaming uses character-length/4 estimation and chunk increments; no provider-reported token integration path for estimates.
- TASK-015 (TEST-1): Gap
  - tests/e2e only includes home.spec.ts; no smoke coverage for artifact generation, upload, admin quota update.
- TASK-016 (TEST-2): Gap
  - jest.config.js uses global threshold 70 without progressive infra-focused targets; logger/db wrapper integration evidence missing.

## Phase 4

- TASK-017 (QUA-1): Gap
  - legacy artifacts generate route keeps custom guard flow, not shared tool-route guard pattern.
- TASK-018 (SEC-1): Gap
  - route-level quota validation and monthlyUsed update are not in one shared atomic boundary.
- TASK-019 (TEST-3): Gap
  - no concurrency-focused integration tests in artifacts-generate route test suite.
- TASK-020 (Closure report): Gap
  - no finding->commit->test closure report published yet in docs/review.

# Recommended Execution Order (delta from baseline)

1. Implement Phase 1 tasks first (TASK-001..TASK-007) to close low-risk correctness and observability gaps.
2. Then Phase 2 schema/parser tasks (TASK-008..TASK-012) with backward-compat mapping and dedicated tests.
3. Apply Phase 3 security headers + token estimation + e2e smoke and coverage policy updates.
4. Finish with Phase 4 legacy route refactor + atomic quota enforcement + concurrency tests.
5. Publish closure report in docs/review with mapping to commits and test evidence.

# Artifacts Produced

- docs/implementation/feature-audit-remediation-sequenced-tracker-1.md
- docs/review/feature-audit-remediation-gap-analysis-2026-04-12.md
