<!-- markdownlint-disable-file -->

# Task Details: Native Login Credentials + Google OAuth

## Research Reference

**Source Research**: [../review/native-login-credentials-google-oauth-research-review-2026-04-16.md](../review/native-login-credentials-google-oauth-research-review-2026-04-16.md)

## Phase 1: Decision Gate and Baseline

### Task 1.1: Finalize S1.1 auth strategy decision and ADR

Produce a short ADR that locks the v1 approach: keep Auth.js database sessions for Google,
introduce dedicated credentials server-side sign-in flow with explicit DB session creation,
and avoid global JWT migration in v1.

- **Files**:
  - docs/adrs/ - Add ADR note with decision and alternatives
  - src/lib/auth.ts - Keep Google branch behavior unchanged while aligning extension points
- **Success**:
  - ADR includes chosen option, rejected option, and risk mitigation
  - Team has explicit Go/No-Go decision before code rollout
- **Research References**:
  - [../review/native-login-credentials-google-oauth-research-review-2026-04-16.md](../review/native-login-credentials-google-oauth-research-review-2026-04-16.md) - S1.1 decision and rationale
  - #githubRepo:"nextauthjs/next-auth assert-config credentials database strategy" - Core test evidence on credentials + database limitation
- **Dependencies**:
  - None

### Task 1.2: Define password and error-message security baseline

Lock baseline rules used by all phases:

- `bcryptjs` with cost 12
- generic error on login failure
- no sensitive logging

- **Files**:
  - src/lib/auth.ts - Sign-in callback/flow behavior alignment
  - src/app/page.tsx - Generic UX error semantics for credentials
- **Success**:
  - Security baseline is explicit and shared
  - No endpoint returns email/password-specific auth failure clues
- **Research References**:
  - [../review/native-login-credentials-google-oauth-research-review-2026-04-16.md](../review/native-login-credentials-google-oauth-research-review-2026-04-16.md) - S1.2/S1.3 decisions
- **Dependencies**:
  - Task 1.1 completion

## Phase 2: Schema and Auth Implementation

### Task 2.1: Add nullable passwordHash and run migration

Introduce a backward-compatible schema change for native credentials support.

- **Files**:
  - prisma/schema.prisma - Add `passwordHash String? @db.Text` on `User`
  - prisma/migrations/ - Add migration `add-password-hash`
- **Success**:
  - Migration applies in dev
  - `npx prisma generate` succeeds
  - Existing OAuth users remain valid with `passwordHash = null`
- **Research References**:
  - [../review/native-login-credentials-google-oauth-research-review-2026-04-16.md](../review/native-login-credentials-google-oauth-research-review-2026-04-16.md) - DB specification
- **Dependencies**:
  - Phase 1 completion

### Task 2.2: Implement credentials sign-in server flow without breaking Google

Implement endpoint-driven credentials login with Zod validation, bcrypt verification, and
database session creation compatible with current auth session retrieval.

- **Files**:
  - src/app/api/auth/credentials/signin/route.ts - New credentials sign-in endpoint
  - src/lib/auth.ts - Preserve Google callback and session behavior
  - src/lib/env.ts - Ensure AUTH_SECRET/related env behavior is production-safe
- **Success**:
  - Google login behavior unchanged
  - Credentials login works for users with `passwordHash`
  - OAuth-only users (null hash) cannot sign in via credentials
- **Research References**:
  - [../review/native-login-credentials-google-oauth-research-review-2026-04-16.md](../review/native-login-credentials-google-oauth-research-review-2026-04-16.md) - Auth implementation specification
  - #fetch:https://authjs.dev/getting-started/authentication/credentials - authorize validation pattern
- **Dependencies**:
  - Task 2.1 completion

## Phase 3: Admin APIs for User Lifecycle

### Task 3.1: Add POST /api/admin/users for admin-managed provisioning

Create admin-only user creation endpoint with secure password hashing and conflict handling.

- **Files**:
  - src/app/api/admin/users/route.ts - Extend with POST handler
- **Success**:
  - 401/403/400/409/201 behavior implemented
  - Returned payload excludes `passwordHash`
  - Monthly quota/budget defaults remain consistent
- **Research References**:
  - [../review/native-login-credentials-google-oauth-research-review-2026-04-16.md](../review/native-login-credentials-google-oauth-research-review-2026-04-16.md) - Admin API POST requirements
- **Dependencies**:
  - Phase 2 completion

### Task 3.2: Add PATCH /api/admin/users/[userId] for reset password and role/quota edits

Introduce admin-only patch endpoint supporting selective updates, including password reset.

- **Files**:
  - src/app/api/admin/users/[userId]/route.ts - New PATCH route
  - src/app/api/admin/users/[userId]/quota/route.ts - Keep consistency and avoid semantic overlap
- **Success**:
  - 401/403/404/400/200 behavior implemented
  - Password is hashed only when provided
  - Existing quota route behavior is preserved
- **Research References**:
  - [../review/native-login-credentials-google-oauth-research-review-2026-04-16.md](../review/native-login-credentials-google-oauth-research-review-2026-04-16.md) - Admin API PATCH requirements
- **Dependencies**:
  - Task 3.1 completion

## Phase 4: UI and Validation Suite

### Task 4.1: Extend login and admin UI for credentials workflows

Add credentials form on login and admin UX for user creation/reset flows.

- **Files**:
  - src/app/page.tsx - Credentials form under Google CTA
  - src/app/admin/AdminClientPage.tsx - User creation and reset password actions
- **Success**:
  - End-to-end admin-to-user provisioning flow is executable
  - Error message remains generic on login failures
  - Existing Google login CTA remains functional
- **Research References**:
  - [../review/native-login-credentials-google-oauth-research-review-2026-04-16.md](../review/native-login-credentials-google-oauth-research-review-2026-04-16.md) - UI specification
- **Dependencies**:
  - Phase 3 completion

### Task 4.2: Add unit/integration/e2e coverage for auth-admin regression safety

Implement mandatory tests for credentials flow and admin endpoints,
including explicit sensitive field exclusion assertions.

- **Files**:
  - tests/unit/ - authorize/credentials verification tests
  - tests/integration/ - admin users POST/PATCH route tests
  - tests/e2e/ - credentials login positive/negative + Google regression
- **Success**:
  - Test matrix for 401/403/400/404/409/201/200 complete
  - `passwordHash` never appears in any response assertion
  - Build, lint, and typecheck pass
- **Research References**:
  - [../review/native-login-credentials-google-oauth-research-review-2026-04-16.md](../review/native-login-credentials-google-oauth-research-review-2026-04-16.md) - rollout and Go/No-Go criteria
- **Dependencies**:
  - Task 4.1 completion

## Execution Matrix (PR sequencing)

### PR1: ADR + Schema migration

- **Owner**: BE Auth
- **Estimate**: 3-4h
- **Scope**:
  - ADR decision for S1.1
  - `passwordHash` schema update + migration + Prisma generate
- **Validation Commands**:
  - `npx prisma migrate dev --name add-password-hash`
  - `npx prisma generate`
  - `npm run typecheck`

### PR2: Credentials sign-in backend flow

- **Owner**: BE Auth
- **Estimate**: 5-7h
- **Scope**:
  - credentials sign-in endpoint
  - DB session creation and secure cookie write
  - env hardening for auth secret checks
- **Validation Commands**:
  - `npm run test -- tests/unit`
  - `npm run test -- tests/integration`
  - `npm run typecheck`

### PR3: Admin API create/reset user

- **Owner**: BE API
- **Estimate**: 4-6h
- **Scope**:
  - `POST /api/admin/users`
  - `PATCH /api/admin/users/[userId]`
  - error mapping and sensitive field exclusion assertions
- **Validation Commands**:
  - `npm run test -- tests/integration/admin-routes.test.ts`
  - `npm run test -- tests/integration/admin-user-routes.test.ts`
  - `npm run lint`

### PR4: UI login + admin controls

- **Owner**: FE App
- **Estimate**: 5-7h
- **Scope**:
  - login credentials form and error UX
  - admin create user form + reset password actions
- **Validation Commands**:
  - `npm run test -- tests/integration/admin-client-page.test.tsx`
  - `npm run test -- tests/integration/admin-quota-form.test.tsx`
  - `npm run dev`

### PR5: Full regression and release gate

- **Owner**: QA/Platform
- **Estimate**: 3-5h
- **Scope**:
  - complete auth/admin regression matrix
  - final go/no-go verification
- **Validation Commands**:
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test`
  - `npm run test:e2e`

## Dependencies

- Next.js 16 + Auth.js v5 + Prisma 7 stack
- bcryptjs library
- Prisma migration and generate workflow
- Existing admin guard and response contract patterns

## Success Criteria

- Native credentials login is available only for admin-provisioned users.
- Google OAuth flow and domain filter remain unchanged.
- No sensitive data exposure in APIs/UI/logs.
- Full auth/admin validation matrix is automated and passing.
