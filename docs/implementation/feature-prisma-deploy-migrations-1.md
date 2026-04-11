---
goal: Prevent post-login failures when DATABASE_URL points to an empty database by enforcing deterministic Prisma migration execution in Vercel deploys
version: 1.0
date_created: 2026-04-11
last_updated: 2026-04-11
owner: Platform Team
status: Planned
tags: [feature, deployment, prisma, vercel, reliability]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

This plan defines a deterministic deployment workflow that guarantees Prisma schema availability before application traffic reaches authentication and protected routes. The implementation targets Vercel Preview and Production environments and removes manual migration steps that currently cause failures after DATABASE_URL changes.

Operational tracker for execution updates: docs/implementation/feature-prisma-deploy-migrations-tracker-1.md.

## 1. Requirements & Constraints

- **REQ-001**: All deploys must apply pending Prisma migrations before serving requests.
- **REQ-002**: The solution must work for both Vercel Preview deployments (development flow) and Production deployments.
- **REQ-003**: The solution must be idempotent when migrations are already applied.
- **REQ-004**: The workflow must not run schema creation logic inside runtime API routes or login callbacks.
- **SEC-001**: Migration execution must use environment-scoped DATABASE_URL values only, with no hardcoded credentials.
- **REL-001**: CI must validate migration application on a clean PostgreSQL instance.
- **CON-001**: Existing Prisma migration history in prisma/migrations must remain the single source of truth.
- **CON-002**: Branch strategy remains unchanged: main for production, dev for development and preview flow.
- **GUD-001**: Keep Prisma generate before typecheck/build where required by Prisma 7 client generation.
- **PAT-001**: Use explicit deploy scripts in package.json and reference those scripts in Vercel commands.

## 2. Implementation Steps

### Implementation Phase 1

- **GOAL-001**: Create deterministic deploy scripts that separate migration and build responsibilities.

| Task     | Description | Completed | Date |
| -------- | ----------- | --------- | ---- |
| TASK-001 | Update package.json scripts with db:migrate:deploy = npx prisma migrate deploy and deploy:vercel = npm run db:migrate:deploy && npm run build. |  |  |
| TASK-002 | Keep existing postinstall prisma generate unchanged to preserve Prisma 7 compatibility in install/build environments. |  |  |
| TASK-003 | Add npm script documentation comments in README deploy section that explain script order and expected behavior. |  |  |

### Implementation Phase 2

- **GOAL-002**: Wire Vercel Preview and Production to run migration-before-build automatically.

| Task     | Description | Completed | Date |
| -------- | ----------- | --------- | ---- |
| TASK-004 | Set Vercel Build Command to npm run deploy:vercel for Preview environment and verify DATABASE_URL is set for Preview scope. |  |  |
| TASK-005 | Set Vercel Build Command to npm run deploy:vercel for Production environment and verify DATABASE_URL is set for Production scope. |  |  |
| TASK-006 | Validate Vercel deployment logs contain successful prisma migrate deploy execution before next build output. |  |  |

### Implementation Phase 3

- **GOAL-003**: Add CI validation to detect migration failures before merge.

| Task     | Description | Completed | Date |
| -------- | ----------- | --------- | ---- |
| TASK-007 | Update .github/workflows/ci.yml with a postgres service container and DATABASE_URL pointing to that service. |  |  |
| TASK-008 | Insert npx prisma migrate deploy step before lint, typecheck, test, and build. |  |  |
| TASK-009 | Ensure CI keeps npx prisma generate before typecheck/build in final step ordering. |  |  |

### Implementation Phase 4

- **GOAL-004**: Define operator runbook for DATABASE_URL switches and empty-database bootstrap.

| Task     | Description | Completed | Date |
| -------- | ----------- | --------- | ---- |
| TASK-010 | Update README deployment section with a dedicated subsection: DATABASE_URL change procedure. |  |  |
| TASK-011 | Add mandatory post-deploy checks: _prisma_migrations table exists, User/Account/Session tables exist, login smoke test passes. |  |  |
| TASK-012 | Add rollback note: on failed deploy, fix env or migration state and redeploy without runtime schema workarounds. |  |  |

## 3. Alternatives

- **ALT-001**: Run migrations manually from local machine before each deploy. Rejected because it is non-deterministic and error-prone.
- **ALT-002**: Run db push during build instead of migrate deploy. Rejected because it bypasses migration history and weakens schema governance.
- **ALT-003**: Add runtime table initialization in auth/login path. Rejected because it increases latency, risk, and operational unpredictability.
- **ALT-004**: Introduce a separate migration job outside Vercel. Rejected for now because it increases platform complexity without clear benefit at current scale.

## 4. Dependencies

- **DEP-001**: Prisma CLI v7.7.0 available in build environment.
- **DEP-002**: Valid DATABASE_URL configured in Vercel Preview and Production environment scopes.
- **DEP-003**: Existing migration baseline in prisma/migrations/20260408_baseline remains valid.
- **DEP-004**: GitHub Actions runners support postgres service containers.

## 5. Files

- **FILE-001**: package.json - add deploy-oriented migration scripts.
- **FILE-002**: .github/workflows/ci.yml - add postgres service and migrate deploy validation step.
- **FILE-003**: README.md - add DATABASE_URL switch runbook and deploy verification checklist.
- **FILE-004**: docs/implementation/feature-prisma-deploy-migrations-1.md - authoritative execution plan.
- **FILE-005**: docs/implementation/feature-prisma-deploy-migrations-tracker-1.md - operational execution tracker.

## 6. Testing

- **TEST-001**: Local dry run on empty database: npm run db:migrate:deploy then npm run build completes successfully.
- **TEST-002**: CI quality job succeeds with migrate deploy against ephemeral postgres service.
- **TEST-003**: Vercel Preview deploy on empty Neon database creates _prisma_migrations and auth tables.
- **TEST-004**: Authentication smoke test: Google login redirects to dashboard without server errors.
- **TEST-005**: Idempotency test: second deploy with no new migration succeeds and applies zero schema changes.

## 7. Risks & Assumptions

- **RISK-001**: Concurrent deploys can attempt migration simultaneously. Prisma locking should serialize, but long locks can delay builds.
- **RISK-002**: Missing or wrong DATABASE_URL in one Vercel scope causes migration failure and broken login.
- **RISK-003**: Future migration files with destructive changes can pass syntax checks but fail in live data conditions.
- **ASSUMPTION-001**: Team can edit Vercel project settings for both Preview and Production commands.
- **ASSUMPTION-002**: Neon roles grant DDL permissions required by prisma migrate deploy.
- **ASSUMPTION-003**: Current auth flow continues to rely on PrismaAdapter database strategy.

## 8. Related Specifications / Further Reading

- docs/adrs/001-modular-llm-controller-architecture.md
- docs/adrs/003-rate-limiting-quota-strategy.md
- docs/specifications/api-specifications.md
- README.md
- prisma/migrations/20260408_baseline/migration.sql
- docs/implementation/feature-prisma-deploy-migrations-tracker-1.md