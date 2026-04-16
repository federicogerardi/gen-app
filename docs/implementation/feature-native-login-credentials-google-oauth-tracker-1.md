<!-- markdownlint-disable-file -->

# Changes Log: Native Login Credentials + Google OAuth

## References

- Plan: [feature-native-login-credentials-google-oauth-implementation-plan-1.md](feature-native-login-credentials-google-oauth-implementation-plan-1.md)
- Details: [feature-native-login-credentials-google-oauth-execution-plan-1.md](feature-native-login-credentials-google-oauth-execution-plan-1.md)
- Research: [../review/native-login-credentials-google-oauth-research-review-2026-04-16.md](../review/native-login-credentials-google-oauth-research-review-2026-04-16.md)

## Status Snapshot

- Date: 2026-04-16
- Overall Status: Planned
- Current Phase: Not started
- Risk Level: Medium (auth/session integration)

## Progress by Phase

### Phase 1: Decision Gate and Security Baseline

- [ ] Task 1.1: Lock S1.1 strategy and publish ADR
- [ ] Task 1.2: Lock hashing and generic error policy
- Notes:
  - pending

### Phase 2: Schema and Auth Flow

- [ ] Task 2.1: Add nullable passwordHash and migrate
- [ ] Task 2.2: Implement credentials sign-in flow preserving Google
- Notes:
  - pending

### Phase 3: Admin API Expansion

- [ ] Task 3.1: Implement POST /api/admin/users
- [ ] Task 3.2: Implement PATCH /api/admin/users/[userId]
- Notes:
  - pending

### Phase 4: UI and Test Hardening

- [ ] Task 4.1: Extend login/admin UI for credentials lifecycle
- [ ] Task 4.2: Complete unit/integration/e2e validation matrix
- Notes:
  - pending

## PR Execution Log

### PR1: ADR + Schema migration

- Owner: BE Auth
- Estimate: 3-4h
- Status: Not started
- Validation:
  - [ ] `npx prisma migrate dev --name add-password-hash`
  - [ ] `npx prisma generate`
  - [ ] `npm run typecheck`
- Notes:
  - pending

### PR2: Credentials sign-in backend flow

- Owner: BE Auth
- Estimate: 5-7h
- Status: Not started
- Validation:
  - [ ] `npm run test -- tests/unit`
  - [ ] `npm run test -- tests/integration`
  - [ ] `npm run typecheck`
- Notes:
  - pending

### PR3: Admin API create/reset user

- Owner: BE API
- Estimate: 4-6h
- Status: Not started
- Validation:
  - [ ] `npm run test -- tests/integration/admin-routes.test.ts`
  - [ ] `npm run test -- tests/integration/admin-user-routes.test.ts`
  - [ ] `npm run lint`
- Notes:
  - pending

### PR4: UI login + admin controls

- Owner: FE App
- Estimate: 5-7h
- Status: Not started
- Validation:
  - [ ] `npm run test -- tests/integration/admin-client-page.test.tsx`
  - [ ] `npm run test -- tests/integration/admin-quota-form.test.tsx`
  - [ ] `npm run dev`
- Notes:
  - pending

### PR5: Full regression and release gate

- Owner: QA/Platform
- Estimate: 3-5h
- Status: Not started
- Validation:
  - [ ] `npm run lint`
  - [ ] `npm run typecheck`
  - [ ] `npm run test`
  - [ ] `npm run test:e2e`
- Notes:
  - pending

## Go/No-Go Checklist

- [ ] Google OAuth flow unchanged and validated
- [ ] Credentials auth works for admin-provisioned users
- [ ] No leakage of `passwordHash` in API/UI/logs
- [ ] Admin guard behavior verified (401/403)
- [ ] Regression suite green

## Open Risks and Mitigations

- Risk: DB-session compatibility for credentials path
  - Mitigation: keep Google path untouched, isolate credentials flow, add focused integration tests
- Risk: Sensitive data exposure in admin responses
  - Mitigation: explicit Prisma `select` and response contract assertions in tests
- Risk: Env mismatch in non-prod/prod
  - Mitigation: explicit auth secret validation and route-level checks
