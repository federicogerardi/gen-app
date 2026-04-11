---
description: "Use when implementing or refactoring Next.js tool generation API routes in src/app/api/tools (POST/GET/PUT/DELETE handlers). Covers auth(), ownership checks, rateLimit ordering before OpenRouter calls, Zod request validation, and standard error mapping for UNAUTHORIZED/FORBIDDEN/VALIDATION_ERROR/RATE_LIMIT_EXCEEDED."
name: "Tool Routes Guardrails"
applyTo: "src/app/api/tools/**/*.ts"
---
# Tool Routes Guardrails

- Require authentication via auth() and treat session.user.id as the only trusted user identity.
- Enforce ownership checks on resource access paths whenever a user-owned entity is read or mutated.
- Run rateLimit(userId) before any OpenRouter or LLM provider invocation.
- Parse and validate request payloads with Zod before Prisma queries or generation logic.
- Keep the API error contract stable: { error: { code, message } } with project-standard codes.
- Keep route handlers thin; delegate orchestration and prompt composition to lib modules.
- When route behavior changes, update integration tests under tests/integration/*-route.test.ts.

Reference docs:
- docs/specifications/api-specifications.md
- docs/adrs/003-rate-limiting-quota-strategy.md
- docs/adrs/002-streaming-vs-batch-responses.md
