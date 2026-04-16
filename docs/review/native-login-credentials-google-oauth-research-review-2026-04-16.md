<!-- markdownlint-disable-file -->

# Research: Native Login Credentials + Google OAuth

## Scope and objective

Define an implementation-ready plan to add Credentials login alongside current Google OAuth,
without breaking existing database session behavior, admin guards, or env guarantees.

## Tool usage log and verified findings

### Workspace inspection

- `read_file src/lib/auth.ts`: auth uses NextAuth v5 with PrismaAdapter, Google provider only, and `session.strategy = database`.
- `read_file src/lib/auth.ts`: sign-in callback currently allows only Google with verified email and allowed domain; non-google providers return `false`.
- `read_file src/app/page.tsx`: login UI is server-action based and currently only calls `signIn('google')`.
- `read_file src/lib/tool-routes/guards.ts`: `requireAdminUser()` is the guard pattern for admin endpoints and returns standard error payloads.
- `read_file src/app/api/admin/users/route.ts`: admin users list exists (GET only), includes pagination, and already excludes sensitive fields by explicit Prisma `select`.
- `read_file src/app/api/admin/users/[userId]/quota/route.ts`: admin update endpoint for quota/budget already exists using `PUT` and guard.
- `read_file src/app/admin/AdminClientPage.tsx`: admin UI currently consumes `/api/admin/users` and `/api/admin/users/:id/quota`.
- `read_file src/lib/env.ts`: no `AUTH_SECRET` explicit validation yet; auth-related env currently includes Google credentials and domain allowlist.
- `read_file prisma/schema.prisma`: `User` has no password field yet; schema currently supports OAuth accounts and DB sessions.
- `read_file tests/integration/admin-routes.test.ts` and `tests/integration/admin-user-routes.test.ts`: integration patterns already cover 401/403/404/400 and use jest db mock conventions.

### External references

- Auth.js docs, credentials provider: credentials must return user or `null`; server-side validation with Zod is recommended.
  - Source: https://authjs.dev/getting-started/authentication/credentials
- Auth.js session strategies docs: JWT and database strategies are global config choices.
  - Source: https://authjs.dev/concepts/session-strategies
- Auth.js core tests (nextauthjs/next-auth): explicit unsupported strategy check for credentials + database.
  - Evidence: `packages/core/test/assert-config.test.ts` includes error
    "Signing in with credentials only supported if JWT strategy is enabled".

## Project structure analysis (current patterns)

### Auth and session

- Central auth config in `src/lib/auth.ts`.
- Adapter: PrismaAdapter over generated Prisma client.
- Session callback enriches `session.user.id` and `session.user.role`.
- Current callback logic is provider-branch based and can be safely extended with explicit credentials branch.

### Admin APIs and guards

- Admin route guard pattern: `requireAdminUser()` from `src/lib/tool-routes/guards.ts`.
- Error contract pattern:
  - `{ error: { code, message, details? } }` from `apiError(...)` or equivalent JSON format.
  - Common codes already in codebase include `UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `VALIDATION_ERROR`, `CONFLICT`.
- Existing admin user routes:
  - `GET /api/admin/users`
  - `PUT /api/admin/users/[userId]/quota`
  - `GET /api/admin/users/[userId]/audit`

### UI patterns

- Login page is server-rendered and uses server actions with `signIn(...)`.
- Admin page is split between server page and client component (`AdminClientPage`) with fetch-based mutations.

### Testing patterns

- Node integration route tests use direct route handler imports.
- Auth is mocked with `jest.mock('@/lib/auth', ...)`.
- DB operations are mocked through shared db-mock helper.

## Technical decisions (implementable now)

### S1.1 Session strategy gate

Decision:

- Do not attempt mixed session strategies inside one NextAuth instance.
- Keep current strategy `database` for Google OAuth unchanged.
- Implement credentials login through dedicated server-side flow (custom endpoint + password verification + explicit session creation) for v1, while preserving Auth.js for Google.

Rationale:

- Auth.js evidence indicates credentials sign-in is supported with JWT strategy, not database strategy.
- Forcing JWT globally would risk regressions on current DB-session behavior.
- Dedicated flow minimizes blast radius and keeps Google branch untouched.

Alternative considered:

- Switch whole app to JWT strategy: rejected for v1 due migration risk and operational regression potential.

### S1.2 Password hashing

Decision:

- Use `bcryptjs` with cost factor 12.

Rationale:

- Compatible with Vercel/serverless constraints (no native addon requirement).
- Security/performance tradeoff acceptable for internal user scale.

### S1.3 Password reset scope

Decision:

- In scope v1: admin-driven reset only.
- Out of scope v1: self-service reset token flow.

Rationale:

- Aligns with "no public registration" and current admin-managed lifecycle.

## Implementation specification

### Database

- Add nullable `passwordHash` to `User` model:
  - `passwordHash String? @db.Text`
- Keep backward compatibility for existing OAuth users (`passwordHash = null`).

### Authentication

- Keep `src/lib/auth.ts` Google provider and domain checks unchanged.
- Add dedicated credentials sign-in endpoint (suggested: `POST /api/auth/credentials/signin`) that:
  - validates payload with Zod,
  - loads user by email,
  - rejects when `passwordHash` is null,
  - verifies via `bcrypt.compare`,
  - creates DB session record (`sessionToken`, `userId`, `expires`),
  - sets secure HttpOnly session cookie compatible with current Auth.js DB session retrieval.
- Login errors exposed as generic message only.

### Admin APIs

- Add `POST /api/admin/users`:
  - guard `requireAdminUser()`,
  - payload `{ email, name?, password, role? }`,
  - duplicate email -> `CONFLICT` 409,
  - hash password + create user with defaults,
  - response excludes `passwordHash`.
- Add `PATCH /api/admin/users/[userId]`:
  - guard `requireAdminUser()`,
  - payload `{ password?, role?, monthlyQuota?, monthlyBudget? }`,
  - optional password re-hash.

### UI

- Login page: add credentials form below Google button and keep Google CTA unchanged.
- Admin client page: add user creation form and reset-password action in existing management UI.

### Env and hardening

- Validate presence of `AUTH_SECRET` for production path in env handling.
- Ensure no logging of plaintext passwords or hashes.

## Rollout strategy and Go/No-Go

### Suggested PR sequence

1. PR1: Spike/ADR + schema migration.
2. PR2: Credentials server-side auth flow.
3. PR3: Admin create/reset APIs.
4. PR4: Login/admin UI updates.
5. PR5: Full test coverage and docs alignment.

### Go criteria

- Google sign-in unchanged and passing tests.
- Credentials login works for admin-provisioned users.
- Sensitive fields never exposed.
- Integration test matrix (401/403/400/404/409/201/200) green.

### No-Go criteria

- Any Google OAuth regression.
- Any session incompatibility in production-like config.
- Any sensitive data leakage in API/UI/logs.
