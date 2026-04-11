---
goal: Operational tracker for deterministic Prisma migration deployment on Vercel
version: 1.1
date_created: 2026-04-11
last_updated: 2026-04-11
owner: Platform Team
status: In Progress
tags: [process, tracker, deployment, prisma, vercel]
---

# Introduction

![Status: In Progress](https://img.shields.io/badge/status-In%20Progress-yellow)

This tracker is the execution companion for docs/implementation/feature-prisma-deploy-migrations-1.md. It records completion status, evidence, and blockers for each task.

## 1. Requirements & Constraints

- **REQ-TRK-001**: Every completed task must include verifiable evidence (log snippet, screenshot path, or command output summary).
- **REQ-TRK-002**: Task status must be updated on the same day the task is executed.
- **REQ-TRK-003**: Blocked tasks must include explicit blocker ID and unblock action.
- **CON-TRK-001**: Do not mark deployment tasks complete without Vercel log verification.
- **CON-TRK-002**: Do not mark CI tasks complete without successful run on branch dev.

## 2. Implementation Steps

### Implementation Phase 1

- **GOAL-TRK-001**: Track script-level deployment hardening in repository files.

| Task | Description | Completed | Date |
| -------- | ----------- | --------- | ---- |
| TASK-TRK-001 | Add package.json scripts: db:migrate:deploy and deploy:vercel. | Yes | 2026-04-11 |
| TASK-TRK-002 | Validate script execution locally against empty PostgreSQL database. |  |  |
| TASK-TRK-003 | Record evidence path for local command outputs in this tracker. | Yes | 2026-04-11 |

Evidence log:
- **EVID-001**: Repository script evidence recorded in [package.json](../../package.json) (`db:migrate:deploy`, `deploy:vercel`).
- **EVID-001A**: Local execution validation (`TASK-TRK-002`) pending until empty PostgreSQL target is available in developer environment.

### Implementation Phase 2

- **GOAL-TRK-002**: Track Vercel configuration rollout for Preview and Production.

| Task | Description | Completed | Date |
| -------- | ----------- | --------- | ---- |
| TASK-TRK-004 | Set Vercel Preview Build Command to npm run deploy:vercel. | Yes | 2026-04-11 |
| TASK-TRK-005 | Set Vercel Production Build Command to npm run deploy:vercel. | Yes | 2026-04-11 |
| TASK-TRK-006 | Verify both environments have correct DATABASE_URL scope values. | Yes | 2026-04-11 |
| TASK-TRK-007 | Capture Vercel deploy log proof that prisma migrate deploy runs before build. | Yes | 2026-04-11 |

Evidence log:
- **EVID-002**: Vercel MCP discovery complete: team `team_GCm6Gr3bQsJMCE6KdKZvhDYZ`, project `prj_IAAS3fZQhZ8rwkhococ8Cc7PVztS` (`gen-app`), latest deployment `dpl_E4Ra44CGhMGt1cviNnpB5BCtHygy` from branch `dev` in READY state.
- **EVID-002A**: Current MCP tools allow project/deployment read operations used for verification, but no project-settings mutation endpoint is available in-session to set Build Command per environment; execute TASK-TRK-004/005 from Vercel dashboard and continue verification via MCP.
- **EVID-002B**: Build failure captured on 2026-04-11 after setting `npm run deploy:vercel` while branch `dev` was still on commit `c678986` (without new scripts): `npm error Missing script: "deploy:vercel"`. Unblock action: push migration-deploy scripts to branch under deployment target, then redeploy.
- **EVID-002C**: ✅ **Successful deployment** `dpl_Ee4jV5s25a9ZHojCWk6YXJPcTere` on 2026-04-11 (state READY, commit 8495bad from branch dev). Build log evidence: `Running "npm run deploy:vercel"` → `npx prisma migrate deploy` → Database: `neondb` → `1 migration found` → ✅ `No pending migrations to apply.` (idempotent) → `next build` completed successfully. **Phase 2 verified: idempotency confirmed, baseline applied to dev DB, schema available for application requests.**
- **EVID-002D**: ✅ **Neon MCP schema validation** (2026-04-11). Dev database (project `raspy-cloud-00514211`): baseline `20260408_baseline` applied 2026-04-11T01:43:09Z, all schema tables present (User, Account, Session, etc). Production database (project `fancy-lab-76956531`): baseline `20260408_baseline` already applied 2026-04-07T23:26:29Z, identical schema to dev. **Risk assessment: PRODUCTION SAFE** — baseline migration is pre-existing and documented in `_prisma_migrations` table on both environments. Production deploy will execute `prisma migrate deploy`, encounter "No pending" state, and proceed to build without schema conflicts.
- **EVID-002E**: ✅ **Production deployment successful** (2026-04-11 03:46-03:48 UTC). Build log from Vercel: Branch dev, Commit 8495bad. Sequence: `Running "npm run deploy:vercel"` → `npx prisma migrate deploy` → Database: `neondb` at `ep-polished-dawn-am42flj4-pooler.c-5.us-east-1.aws.neon.tech` (production Neon) → `1 migration found in prisma/migrations` → ✅ **`No pending migrations to apply.`** (idempotency confirmed on production) → `next build` completed 25.8s → deployment completed. **Phase 2 fully operational: both dev and production execute deterministic migration-first workflow without conflicts.**

### Implementation Phase 3

- **GOAL-TRK-003**: Track CI migration validation and branch quality gates.

| Task | Description | Completed | Date |
| -------- | ----------- | --------- | ---- |
| TASK-TRK-008 | Add postgres service container in .github/workflows/ci.yml. | Yes | 2026-04-11 |
| TASK-TRK-009 | Add prisma migrate deploy step before lint/typecheck/test/build. | Yes | 2026-04-11 |
| TASK-TRK-010 | Validate CI run is green on branch dev after workflow changes. |  |  |

Evidence log:
- **EVID-003**: Workflow updated in [.github/workflows/ci.yml](../../.github/workflows/ci.yml) with postgres service, `DATABASE_URL`, and `npx prisma migrate deploy` before quality gates.
- **EVID-003A**: CI run validation (`TASK-TRK-010`) pending remote pipeline execution.

### Implementation Phase 4

- **GOAL-TRK-004**: Track runbook publication and operational readiness.

| Task | Description | Completed | Date |
| -------- | ----------- | --------- | ---- |
| TASK-TRK-011 | Add DATABASE_URL switch procedure to README.md deployment section. | Yes | 2026-04-11 |
| TASK-TRK-012 | Add post-deploy checks for _prisma_migrations, auth tables, and login smoke test. | Yes | 2026-04-11 |
| TASK-TRK-013 | Add rollback guidance for migration/env failure scenarios. | Yes | 2026-04-11 |

Evidence log:
- **EVID-004**: Runbook content added in [README.md](../../README.md) under Deployment section (procedure, mandatory checks, rollback note).

### Implementation Phase 5

- **GOAL-TRK-005**: Track final rollout validation on dev then main.

| Task | Description | Completed | Date |
| -------- | ----------- | --------- | ---- |Yes | 2026-04-11 |
| TASK-TRK-015 | Execute authentication smoke test after dev deploy. | In Progress | 2026-04-11 |
| TASK-TRK-016 | Promote to main only after all prior tracker tasks are complete. |  |  |

Evidence log:
- **EVID-005**: Production database schema verified via Neon MCP and Vercel deployment log. Ready for smoke test validation
- **EVID-005**: Pending.

## 3. Alternatives

- **ALT-TRK-001**: Use issue tracker only without execution document. Rejected because evidence and sequencing become fragmented.
- **ALT-TRK-002**: Inline status updates directly in plan document only. Rejected because it mixes normative specification with mutable execution state.

## 4. Dependencies

- **DEP-TRK-001**: Access to Vercel project settings for Preview and Production.
- **DEP-TRK-002**: Access to Neon dashboard for schema verification.
- **DEP-TRK-003**: GitHub Actions permissions to modify and run workflow.

## 5. Files

- **FILE-TRK-001**: docs/implementation/feature-prisma-deploy-migrations-1.md - source implementation specification.
- **FILE-TRK-002**: docs/implementation/feature-prisma-deploy-migrations-tracker-1.md - execution tracker.
- **FILE-TRK-003**: package.json - deploy scripts tracked by TASK-TRK-001.
- **FILE-TRK-004**: .github/workflows/ci.yml - CI migration checks tracked by TASK-TRK-008 and TASK-TRK-009.
- **FILE-TRK-005**: README.md - runbook tasks tracked by TASK-TRK-011 to TASK-TRK-013.

## 6. Testing

- **TEST-TRK-001**: Local migration and build sequence passes against empty DB.
- **TEST-TRK-002**: CI pipeline passes with migration step enabled.
- **TEST-TRK-003**: Vercel Preview deploy logs show migration success.
- **TEST-TRK-004**: Login flow succeeds after deploy with no relation-not-found errors.
- **TEST-TRK-005**: Redeploy without new migration remains successful.

## 7. Risks & Assumptions

- **RISK-TRK-001**: Evidence collection may be skipped under time pressure; mitigated by REQ-TRK-001 gate.
- **RISK-TRK-002**: Parallel deploys can create ambiguous verification timing; mitigated by timestamped log evidence.
- **ASSUMPTION-TRK-001**: Team follows dev-to-main promotion policy.
- **ASSUMPTION-TRK-002**: Migration permissions are granted for all target databases.

## 8. Related Specifications / Further Reading

- docs/implementation/feature-prisma-deploy-migrations-1.md
- README.md
- prisma/migrations/20260408_baseline/migration.sql
