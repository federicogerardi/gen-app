# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- CI/CD pipeline (GitHub Actions) with lint, typecheck, test, build steps
- Prisma 7 setup documentation in copilot-instructions.md
- CI/CD configuration details in blueprint.md and implementation-plan.md

### Fixed
- **Lint errors** (6 errors → 0 errors):
  - Removed `any` type annotations from `src/app/admin/page.tsx` (lines 66, 78)
  - Removed unused imports from `src/app/dashboard/page.tsx`
  - Removed `any` type annotation from `src/app/dashboard/projects/[id]/page.tsx`
  - Removed unused import `PrismaClientInstance` from `src/lib/db.ts`
  - Converted `require()` to ES6 import in `tailwind.config.js`

- **TypeCheck errors**:
  - Added `npx prisma generate` step in CI workflow (critical for TypeScript)
  - Fixed Prisma imports: `@/generated/prisma` (not `@prisma/client`)
  - Fixed Decimal import: `@prisma/client-runtime-utils`
  - Added correct type annotations using `typeof array[number]` pattern

- **Build errors**:
  - Added environment variables to CI workflow:
    - `OPENAI_API_KEY`
    - `UPSTASH_REDIS_REST_URL`
    - `UPSTASH_REDIS_REST_TOKEN`

### Changed
- Updated `.github/workflows/ci.yml` with proper environment setup
- Updated `tailwind.config.js` to use ES6 modules
- Enhanced type safety in multiple components

### Documentation
- Updated `.github/copilot-instructions.md` with Prisma 7 and CI/CD sections
- Updated `docs/blueprint.md` with detailed CI/CD workflow
- Updated `docs/implementation-plan.md` with CI/CD implementation status

## [0.1.0] - 2026-04-08

### Initial Release
- Next.js 16 + React 19 + TypeScript scaffold
- PostgreSQL 16 + Prisma 7 ORM
- NextAuth.js v5 + Google OAuth
- LLM orchestrator with OpenRouter integration
- Streaming SSE endpoints for artifact generation
- Admin dashboard with user quota management
- Tool-specific workflows (Meta Ads, Funnel Pages)
- Jest + Playwright test setup
- Render.com deployment ready

---

## Notes

### Prisma 7 Migration
- Database URL moved from `schema.prisma` to `prisma.config.ts`
- Client generated to `src/generated/prisma/`
- Requires `@prisma/adapter-pg` for PostgreSQL
- `npx prisma generate` must run before TypeScript compilation

### CI/CD Pipeline
- Runs on `push` to `main` and all `pull_request` events
- Node.js 22 LTS
- Environment variables required during build
- All tests must pass before merge

### Breaking Changes
- None yet (pre-1.0)
