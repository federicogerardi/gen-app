<!-- markdownlint-disable-file -->

# Task Checklist: Native Login Credentials + Google OAuth

## Overview

Add credentials-based native login alongside existing Google OAuth with admin-managed password lifecycle, preserving current security and database-session behavior.

## Objectives

- Enable admin-only provisioning and reset-password flows for native credentials users.
- Preserve existing Google OAuth sign-in, domain filtering, and session behavior without regressions.
- Deliver a test-backed rollout with explicit Go/No-Go quality gates.
- Define PR-by-PR execution ownership, time estimates, and validation commands.

## Research Summary

### Project Files

- src/lib/auth.ts - Current NextAuth v5 config, Google-only provider, and `session: { strategy: 'database' }`.
- src/app/page.tsx - Current login page server action using `signIn('google')`.
- src/lib/tool-routes/guards.ts - Admin authorization guard and standard error structure usage.
- src/app/api/admin/users/route.ts - Existing admin users GET endpoint and pagination/select pattern.
- src/app/admin/AdminClientPage.tsx - Existing admin UX and fetch patterns for user/admin operations.
- prisma/schema.prisma - `User` model shape and missing password hash field.
- src/lib/env.ts - Current env validation and missing explicit `AUTH_SECRET` enforcement.

### External References

- [../review/native-login-credentials-google-oauth-research-review-2026-04-16.md](../review/native-login-credentials-google-oauth-research-review-2026-04-16.md) - Verified workspace findings, Auth.js constraints, and implementation-ready decisions.
- #githubRepo:"nextauthjs/next-auth assert-config credentials database strategy" - Source-level evidence that credentials sign-in is not supported with database session strategy.
- #fetch:https://authjs.dev/getting-started/authentication/credentials - Credentials authorize and Zod validation guidance.
- #fetch:https://authjs.dev/concepts/session-strategies - Global JWT/database strategy behavior and tradeoffs.

### Standards References

- [.github/copilot-instructions.md](../../.github/copilot-instructions.md) - Project architecture, auth/env gotchas, and testing conventions.
- [.github/instructions/tool-routes.instructions.md](../../.github/instructions/tool-routes.instructions.md) - Route guard and error contract patterns for API handlers.
- [.github/instructions/git-commit-style.instructions.md](../../.github/instructions/git-commit-style.instructions.md) - Branch/PR/commit standards.

## Implementation Checklist

### [ ] Phase 1: Decision Gate and Security Baseline

- [ ] Task 1.1: Lock S1.1 strategy and publish ADR

  - Details: [feature-native-login-credentials-google-oauth-execution-plan-1.md](feature-native-login-credentials-google-oauth-execution-plan-1.md)

- [ ] Task 1.2: Lock hashing and generic error policy
  - Details: [feature-native-login-credentials-google-oauth-execution-plan-1.md](feature-native-login-credentials-google-oauth-execution-plan-1.md)

### [ ] Phase 2: Schema and Auth Flow

- [ ] Task 2.1: Add nullable passwordHash and migrate
  - Details: [feature-native-login-credentials-google-oauth-execution-plan-1.md](feature-native-login-credentials-google-oauth-execution-plan-1.md)

- [ ] Task 2.2: Implement credentials sign-in flow preserving Google
  - Details: [feature-native-login-credentials-google-oauth-execution-plan-1.md](feature-native-login-credentials-google-oauth-execution-plan-1.md)

### [ ] Phase 3: Admin API Expansion

- [ ] Task 3.1: Implement POST /api/admin/users
  - Details: [feature-native-login-credentials-google-oauth-execution-plan-1.md](feature-native-login-credentials-google-oauth-execution-plan-1.md)

- [ ] Task 3.2: Implement PATCH /api/admin/users/[userId]
  - Details: [feature-native-login-credentials-google-oauth-execution-plan-1.md](feature-native-login-credentials-google-oauth-execution-plan-1.md)

### [ ] Phase 4: UI and Test Hardening

- [ ] Task 4.1: Extend login/admin UI for credentials lifecycle
  - Details: [feature-native-login-credentials-google-oauth-execution-plan-1.md](feature-native-login-credentials-google-oauth-execution-plan-1.md)

- [ ] Task 4.2: Complete unit/integration/e2e validation matrix
  - Details: [feature-native-login-credentials-google-oauth-execution-plan-1.md](feature-native-login-credentials-google-oauth-execution-plan-1.md)

## Dependencies

- Prisma schema migration workflow (`npx prisma migrate dev`, `npx prisma generate`)
- `bcryptjs` dependency
- Existing admin guard and error response conventions
- Auth.js v5 current setup with Google and DB sessions

## Success Criteria

- Credentials auth works only for admin-created native users.
- Google OAuth and domain restrictions remain unchanged.
- No sensitive field leakage (`passwordHash`) in API/UI/logging.
- Route and UI tests cover auth/admin regressions and pass in CI.
- PR execution matrix (owner/stima/comandi) is available in details and ready for sprint kickoff.
