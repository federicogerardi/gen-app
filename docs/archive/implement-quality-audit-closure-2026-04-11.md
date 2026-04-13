# Implementation Plan: Quality & Security Audit Resolution — gen-app

**Data creazione**: 11 aprile 2026  
**Stato attuale**: ✅ Completato e chiuso (squash+merge su `dev`)  
**Archiviazione**: `docs/archive/implement-quality-audit-closure-2026-04-11.md`  
**Fonte**: Audit Globale di Qualità e Sicurezza  
**Durata stimata**: 4–5 settimane (92 ore)  
**Fasi**: 4 progressivi e incrementali  
**Target PR**: 14 PR indipendenti, Squash and Merge su `dev`

---

## Overview

Questo piano trasforma i **15 punti critici** del report di audit in un roadmap di implementazione **progressivo, autocontenuto, e production-safe**. Ogni fase è:

- **Logicamente indipendente** (minimizza dipendenze cross-fase)
- **Testata** (>70% coverage su linee modificate)
- **Merge-ready** (PR singole, Conventional Commits)
- **Non-bloccante** (nessun breaking change)

## Execution Decomposition

Questo documento resta la **fonte completa** di razionale, problemi, impatto e scope originale dell'audit.

Per l'esecuzione operativa il track è stato scomposto nei seguenti artefatti (ora archiviati in `docs/archive`):

- `docs/archive/feature-quality-audit-resolution-1.md`: piano operativo per fasi e workstream PR-sized
- `docs/archive/feature-quality-audit-resolution-tracker-1.md`: tracker di avanzamento, evidenze e blocchi
- `docs/archive/feature-quality-audit-resolution-sprint-ops-1.md`: runbook sessioni granulari con baseline di validazione per la Phase 1

La decomposizione mantiene il perimetro invariato: **4 fasi**, **15 finding**, **14 PR indipendenti**, nessun breaking change.

---

## Phase 1: CORRETTEZZA CRITICA (Settimane 1–2)

**Priorità**: 🔴 **MASSIMA** — Problemi #4, #5, #6, #7  
**Impatto**: Data integrity, financial accuracy, state reliability  
**Effort**: ~36 ore

### 1.1 Fix Token Counting (Problema #4)

**Problema**: `inputTokenCount = Math.ceil(accumulated.length / 4)` stima su **output** accumulato, non su **input prompt**.  
**Effetto**: Cost accounting sottostima il costo input → budget tracking impreciso.  
**File interessato**: [src/lib/llm/streaming.ts](../src/lib/llm/streaming.ts#L93)

**Soluzione**:
- Catturare `inputTokens` dal provider al momento della generazione
- Fallback accurato: serializzare prompt JSON + stimare su quello
- Invariant DB: input > 0 e output > 0 post-completion
- Provider response deve sempre includere inputTokens attestati

**Scope lavoro**:
1. [x] `src/lib/llm/streaming.ts`: refactor token estimation
2. [x] `src/lib/llm/costs.ts`: nuova funzione `calculateCostAccurate(model, inputTokens, outputTokens)`
3. [x] `tests/unit/costs.test.ts`: test accuracy vs tokenizer noto
4. [x] Prisma migration: add DB constraint su tokens positivi post-completion

**Acceptance Criteria**:
- Token estimate entro ±5% vs OpenAI tokenizer
- Costi calcolati correttamente per artifact
- Migration test verifies invariant

**Branch**: `fix/token-counting`  
**PR Title**: `fix(llm): use provider input token count instead of accumulated output estimate`

---

### 1.2 Fix Race Condition Quota (Problema #5)

**Problema**: Check quota e increment non atomici — due richieste parallele passano entrambe il check.  
**Effetto**: Sforamento quota in concorrenza.  
**File interessato**: [src/lib/tool-routes/guards.ts](../src/lib/tool-routes/guards.ts#L47-L91), [src/lib/llm/streaming.ts](../src/lib/llm/streaming.ts#L113-L128)

```typescript
// Sequenza non atomica (race condition):
if (user.monthlyUsed >= user.monthlyQuota) return LIMIT;  // Request A: pass
if (user.monthlyUsed >= user.monthlyQuota) return LIMIT;  // Request B: pass (data race!)
await db.user.update({ monthlyUsed: { increment: 1 } });  // Both write
// Result: monthlyUsed incremented twice, quota exceeded!
```

**Soluzione**: Transazione DB atomica con re-check inline.

```typescript
// Prisma v7: db.$transaction(callback)
const result = await db.$transaction(async (tx) => {
  const user = await tx.user.findUnique({ where: { id: userId } });
  if (user.monthlyUsed >= user.monthlyQuota) return { allowed: false };
  
  await tx.user.update({ where: { id: userId }, data: { monthlyUsed: { increment: 1 } } });
  return { allowed: true };
});
```

**Scope lavoro**:
1. [x] `src/lib/tool-routes/guards.ts`: refactor `enforceUsageGuards` con transaction
2. [x] `src/lib/llm/streaming.ts`: quota increment wrapped in transaction
3. [x] `tests/integration/race-condition-quota.test.ts`: test Promise.all x 50 concurrent requests
4. [x] `docs/adrs/003-rate-limiting-quota-strategy.md`: update atomicity guarantee

**Acceptance Criteria**:
- 100 concurrent requests: zero quota overages
- Transaction rolls back on quota exceeded
- quotaHistory logged pre-transaction commit

**Branch**: `fix/quota-race-condition`  
**PR Title**: `fix(quota): enforce atomic check+increment with db transaction`

---

### 1.3 Fix Artifact Stuck in Generating (Problema #6)

**Problema**: Client abbandona stream → server continua in background → artifact rimane `generating` indefinitamente.  
**Effetto**: DB sporco; admin non sa se job è completato o stuck.  
**File interessato**: [src/lib/llm/streaming.ts](../src/lib/llm/streaming.ts#L56-L90)

**Soluzione**:
- Cleanup on close: listener su stream close/error → mark artifact as `failed`
- Weekly cron: scan `generating` > 24h, mark `failed` con motivo 'stale'
- Graceful degradation: retry client-side fino a cron cleanup

**Scope lavoro**:
1. [x] `src/lib/llm/streaming.ts`: add stream close listener
2. [x] `src/app/api/cron/cleanup-stale-artifacts/route.ts`: weekly schedule (Vercel Crons)
3. [x] Prisma: add `failureReason` enum (client_abort, timeout, error, stale)
4. [x] `tests/unit/artifact-cleanup.test.ts`: verify cleanup logic

**Acceptance Criteria**:
- Stream close listener marks artifact failed
- Cron scans generating > 24h weekly
- failureReason logged for audit trail

**Branch**: `fix/artifact-cleanup`  
**PR Title**: `fix(streaming): clean up stale artifacts on client disconnect`

---

### 1.4 Fix PUT /api/artifacts/[id] Unconditional Status (Problema #7)

**Problema**: PUT su qualsiasi artifact setta `status: 'completed'` → failed/generating artifacts vengono "risanati".  
**Effetto**: State di artifact non affidabile.  
**File interessato**: [src/app/api/artifacts/[id]/route.ts](../src/app/api/artifacts/%5Bid%5D/route.ts)

**Soluzione**: Reject PUT se artifact non in stato terminale.

```typescript
if (['failed', 'generating'].includes(artifact.status)) {
  return apiError('CONFLICT', 'Cannot modify non-terminal artifact', 409);
}

const parsed = updateArtifactSchema.safeParse(body);
if (!parsed.success) return apiError('VALIDATION_ERROR', ..., 400);

await db.artifact.update({ where: { id }, data: { content: parsed.data.content } });
```

**Scope lavoro**:
1. [x] `src/app/api/artifacts/[id]/route.ts`: add status guard + Zod validation
2. [x] `tests/integration/artifacts-id-route.test.ts`: test 409 Conflict scenarios
3. [x] `docs/specifications/api-specifications.md`: document 409 response

**Acceptance Criteria**:
- PUT on failed/generating returns 409
- Zod validation on content payload
- Test coverage for all state transitions

**Branch**: `fix/artifact-put-status`  
**PR Title**: `fix(api): reject PUT on non-terminal artifact state`

---

**Phase 1 Acceptance Criteria**:
- ✅ Token counting: integrazione test vs OpenAI tokenizer (±5% accuracy)
- ✅ Race condition: 100 concurrent requests, quota mai sfondato
- ✅ Cleanup: cron scans generating > 24h, mark failed
- ✅ PUT conflict: 409 on failed/generating, Zod validation working
- ✅ Coverage >70% mantenuto su tutte le linee modificate
- ✅ CI green: typecheck, lint, test, build all passing

---

## Phase 2: CONSISTENZA INTERNA (Settimane 2–3)

**Priorità**: 🟠 **ALTA** — Problemi #1, #2, #3  
**Impatto**: Codice DRY, single source of truth, audit accuracy  
**Effort**: ~18 ore

### 2.1 Centralizzare Guard in artifacts/generate (Problema #1)

**Problema**: `artifacts/generate` duplica quota/ownership check inline → divergenza futura.  
**Effetto**: Logica diverge tra endpoint, difficile da manutenere.  
**File interessato**: [src/app/api/artifacts/generate/route.ts](../src/app/api/artifacts/generate/route.ts#L42-L70)

**Soluzione**: Usare `enforceUsageGuards` centralizzato.

```typescript
// PRIMA:
if (user.monthlyUsed >= user.monthlyQuota) { ... }
if (Number(user.monthlySpent) >= Number(user.monthlyBudget)) { ... }
const { allowed } = await rateLimit(userId);

// DOPO:
const guardResult = await enforceUsageGuards(userId, model, 'content');
if (!guardResult.ok) return guardResult.response;
```

**Scope lavoro**:
1. [x] `src/app/api/artifacts/generate/route.ts`: replace inline checks con guard call
2. [x] `src/lib/tool-routes/guards.ts`: ensure interface supports artifact context
3. [x] `tests/integration/artifacts-generate-route.test.ts`: consolidate + verify logic parity
4. [x] Verify no logic divergence via test coverage

**Acceptance Criteria**:
- Guard call replaces all inline checks
- Test coverage identical for both code paths
- No new error patterns introduced

**Branch**: `refactor/centralize-guards`  
**PR Title**: `refactor(api): centralize quota guards in artifacts/generate endpoint`

---

### 2.2 Unificare ALLOWED_MODELS (Problema #2)

**Problema**: ALLOWED_MODELS definito in 2 file con liste divergenti.  
**Effetto**: Possibili modelli accettati diversi tra endpoint.  
**File interessato**: [src/app/api/artifacts/generate/route.ts](../src/app/api/artifacts/generate/route.ts), [src/lib/tool-routes/schemas.ts](../src/lib/tool-routes/schemas.ts)

```typescript
// artifacts/generate/route.ts
['openai/gpt-4', 'openai/gpt-4-turbo', 'anthropic-claude']

// tool-routes/schemas.ts
['openai/gpt-4', 'openai/gpt-4-turbo', 'anthropic/claude-3-opus', 'mistralai/mistral-large']
```

**Soluzione**: Single source `src/lib/llm/models.ts`.

```typescript
// src/lib/llm/models.ts
export const ALLOWED_MODELS = [
  'openai/gpt-4-turbo',
  'openai/gpt-4o',
  'anthropic/claude-3-opus',
  'mistralai/mistral-large',
] as const;

export const MODEL_COSTS: Record<typeof ALLOWED_MODELS[number], { input: number; output: number }> = {
  'openai/gpt-4-turbo': { input: 0.01, output: 0.03 },
  'openai/gpt-4o': { input: 0.005, output: 0.015 },
  'anthropic/claude-3-opus': { input: 0.015, output: 0.075 },
  'mistralai/mistral-large': { input: 0.008, output: 0.024 },
};
```

**Scope lavoro**:
1. [x] `src/lib/llm/models.ts`: create con ALLOWED_MODELS + MODEL_COSTS
2. [x] `src/app/api/artifacts/generate/route.ts`: import ALLOWED_MODELS
3. [x] `src/lib/tool-routes/schemas.ts`: import ALLOWED_MODELS
4. [x] Verify typecheck: no hardcoded lists remaining
5. [x] Update tests per centralized definition

**Acceptance Criteria**:
- Single source of truth for models
- All imports aligned on centralized definition
- No hardcoded lists in route handlers
- typecheck passes

**Branch**: `refactor/unify-models`  
**PR Title**: `refactor(llm): centralize allowed models and pricing`

---

### 2.3 Parametrizzare artifactType negli Guard (Problema #3)

**Problema**: `enforceUsageGuards` hardcoda `artifactType: 'content'` anche per extraction.  
**Effetto**: quotaHistory dati incorretti per audit.  
**File interessato**: [src/lib/tool-routes/guards.ts](../src/lib/tool-routes/guards.ts#L67,79,91)

**Soluzione**: Guard accetta `artifactType` come parametro.

```typescript
export async function enforceUsageGuards(
  userId: string,
  model: string,
  artifactType: ArtifactType  // ✅ parametrizzato
): Promise<GuardResult<void>> {
  // ... use artifactType in quotaHistory.create
  await db.quotaHistory.create({
    data: { userId, artifactType, ... }
  });
}
```

**Scope lavoro**:
1. [x] `src/lib/tool-routes/guards.ts`: add artifactType param
2. [x] `src/app/api/artifacts/generate/route.ts`: pass 'content'
3. [x] `src/app/api/tools/*/generate/route.ts`: pass workflowType → artifactType mapping
4. [x] `tests/integration/guards.test.ts`: verify audit accuracy per type

**Acceptance Criteria**:
- Guard accepts artifactType parameter
- quotaHistory persisted with correct type
- Test coverage for each artifact type

**Branch**: `refactor/parametrize-artifact-type`  
**PR Title**: `refactor(guards): parametrize artifactType for accurate audit trail`

---

**Phase 2 Acceptance Criteria**:
- ✅ artifacts/generate: guard call, no inline duplication
- ✅ ALLOWED_MODELS: single source, tutti import allineati
- ✅ artifactType: persisted correctly in quotaHistory per type
- ✅ No circular imports
- ✅ Coverage >70% on all modified lines

---

## Phase 3: SCALABILITÀ (Settimana 3–4)

**Priorità**: 🟡 **MEDIA** — Problemi #8, #9  
**Impatto**: Query efficiency, DB throughput  
**Effort**: ~16 ore

### 3.1 Paginazione Admin GET /api/admin/users (Problema #8)

**Problema**: Nessun limite — `db.user.findMany()` O(N), rischio timeout/OOM.  
**Effetto**: Query lenta con 1000+ utenti.  
**File interessato**: [src/app/api/admin/users/route.ts](../src/app/api/admin/users/route.ts)

**Soluzione**: Pagination con query params + metadata.

```typescript
const limit = Math.min(parseInt(searchParams.limit ?? '20'), 100);
const page = Math.max(parseInt(searchParams.page ?? '1'), 1);
const skip = (page - 1) * limit;

const [users, total] = await Promise.all([
  db.user.findMany({ skip, take: limit, orderBy: { email: 'asc' } }),
  db.user.count(),
]);

return NextResponse.json({
  users,
  total,
  page,
  pageCount: Math.ceil(total / limit),
  pageSize: limit
});
```

**Scope lavoro**:
1. [x] `src/app/api/admin/users/route.ts`: add pagination query params
2. [x] `src/app/admin/AdminClientPage.tsx`: update UI to handle pagination
3. [x] `tests/integration/admin-routes.test.ts`: test pages/limits/edge cases
4. [x] `docs/specifications/api-specifications.md`: update schema

**Acceptance Criteria**:
- Pagination works with page/limit query params
- Invalid page/limit handled gracefully (clamped to valid range)
- Total + pageCount correct
- Query time < 200ms with 1000 users

**Branch**: `feat/admin-pagination`  
**PR Title**: `feat(admin): implement pagination on GET /api/admin/users endpoint`

---

### 3.2 Backpressure Streaming DB Update (Problema #9)

**Problema**: `db.artifact.update` ogni 20 token senza backpressure → alta pressure.  
**Effetto**: 5 token/sec × 100 utenti = ~800 writes/sec su DB.  
**File interessato**: [src/lib/llm/streaming.ts](../src/lib/llm/streaming.ts#L73-77)

**Soluzione**: Batch writes con queue + throttle.

```typescript
let pendingUpdate: Promise<void> | null = null;

if (outputTokenCount % 50 === 0) {
  pendingUpdate ??= (async () => {
    await db.artifact.update({
      where: { id: artifact.id },
      data: { content: accumulated, streamedAt: new Date() }
    });
    pendingUpdate = null;
  })();
}

// On completion: await pendingUpdate
await pendingUpdate;
```

**Scope lavoro**:
1. [x] `src/lib/llm/streaming.ts`: implement queue + batch update logic
2. [x] Load test: 50 concurrent streams, monitor DB connection pool/latency
3. [x] `tests/load/streaming-concurrency.test.ts`: verify throughput increase
4. [x] `docs/adrs/002-streaming-vs-batch-responses.md`: document backpressure strategy

**Acceptance Criteria**:
- 50 concurrent streams: zero DB timeout
- DB latency p95 stable (no spike)
- Connection pool stays below threshold

**Branch**: `perf/streaming-backpressure`  
**PR Title**: `perf(streaming): batch database writes to reduce pressure`

---

**Phase 3 Acceptance Criteria**:
- ✅ Admin GET: pagination works, invalid page/limit graceful
- ✅ 50 concurrent streams: no DB timeout, latency stable
- ✅ Query time < 200ms with 1000 users
- ✅ Coverage >70%

---

## Phase 4: SICUREZZA & OSSERVABILITÀ (Settimane 4–5)

**Priorità**: 🟢 **BASSA** — Problemi #10–15  
**Impatto**: Hardening, observability, maintainability  
**Effort**: ~22 ore

### 4.1 Verificare MIME Type File (Problema #10)

**Problema**: File MIME dichiarato dal client, non verificato.  
**Effetto**: Attaccante può caricare .exe come .png.  
**File interessato**: [src/app/api/tools/funnel-pages/upload/route.ts](../src/app/api/tools/funnel-pages/upload/route.ts)

**Soluzione**: Magic byte verification con libreria `file-type`.

```typescript
import { fileTypeFromBuffer } from 'file-type';

const detected = await fileTypeFromBuffer(fileBuffer);
const ALLOWED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'text/csv'];

if (!detected || !ALLOWED_TYPES.includes(detected.mime)) {
  return apiError('VALIDATION_ERROR', 'Invalid file type', 400);
}
```

**Scope lavoro**:
1. [x] Add `file-type` to package.json
2. [x] `src/app/api/tools/funnel-pages/upload/route.ts`: magic byte verification
3. [x] `tests/integration/funnel-pages-upload.test.ts`: test MIME spoofing rejection
4. [x] `docs/security/file-handling.md`: document safe file upload practice

**Acceptance Criteria**:
- MIME type verified via magic bytes
- Spoofed MIME rejected with 400
- Whitelist enforced

**Branch**: `security/mime-verification`  
**PR Title**: `security(upload): verify mime type via magic bytes not client-declared type`

---

### 4.2 Environment Variable Validation (Problema #11)

**Problema**: Non-null assertion su env var mancanti → crash senza messaggio chiaro.  
**Effetto**: Runtime error oscuro in produzione.  
**File interessato**: [src/lib/auth.ts](../src/lib/auth.ts)

**Soluzione**: Validazione Zod all'app boot.

```typescript
// src/lib/env.ts
import { z } from 'zod';

const envSchema = z.object({
  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET required'),
  OPENROUTER_API_KEY: z.string().min(1, 'OPENROUTER_API_KEY required'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL required'),
  // ... altri required
});

export const env = envSchema.parse(process.env);
```

**Scope lavoro**:
1. [x] `src/lib/env.ts`: create schema validator
2. [x] `src/lib/auth.ts`: import from env instead of process.env!
3. [x] All route handlers: use env typed object
4. [x] `tests/unit/env.test.ts`: schema validation test

**Acceptance Criteria**:
- Startup fails with clear message if env var missing
- env object fully typed
- All routes use centralized env

**Branch**: `chore/env-validation`  
**PR Title**: `chore(env): add typed environment variable schema validation`

---

### 4.3 Role Enum Database Constraint (Problema #12)

**Problema**: Role as String senza constraint.  
**Effetto**: Valori invalidi possono essere scritti direttamente.  
**File interessato**: [prisma/schema.prisma](../prisma/schema.prisma)

**Soluzione**: Prisma enum + migration.

```prisma
// prisma/schema.prisma
enum Role {
  USER
  ADMIN
}

model User {
  role Role @default(USER)  // ✅ tipizzato + constrainato
}
```

**Scope lavoro**:
1. [x] `prisma/schema.prisma`: add Role enum, update User.role
2. [x] `npx prisma migrate dev --name add_role_enum`
3. [x] `src/lib/auth.ts`: type session.user.role as Role enum
4. [x] `src/types/next-auth.d.ts`: update type augmentation
5. [x] `tests/unit/auth.test.ts`: verify role typing

**Acceptance Criteria**:
- Role enum in DB with constraint
- Code types session.user.role as Role
- Migration applies cleanly
- No type errors post-migration

**Branch**: `chore/role-enum`  
**PR Title**: `chore(db): enforce role enum constraint in user model`

---

### 4.4 Structured Logging Tool Routes (Problema #13)

**Problema**: Tool routes (meta-ads, funnel, extraction) senza logging strutturato.  
**Effetto**: Blind spot in produzione per debugging.  
**File interessato**: tool routes (meta-ads, funnel, extraction)

**Soluzione**: Pino context logger con userId/workflowType/model.

```typescript
const log = logger.child({ userId, workflowType: 'meta_ads', model });

log.info('generation started');
try {
  // ... generation
  log.info({ duration_ms, tokens_out }, 'generation completed');
} catch (error) {
  log.error({ error: error?.message }, 'generation failed');
  throw;
}
```

**Scope lavoro**:
1. [x] `src/app/api/tools/meta-ads/generate/route.ts`: add structured logging
2. [x] `src/app/api/tools/funnel-pages/generate/route.ts`: add logging
3. [x] `src/app/api/tools/extraction/route.ts`: add logging (if exists)
4. [x] Verify logs in test output + Sentry integration

**Acceptance Criteria**:
- Start/completion/error events logged with context
- Logs include userId, workflowType, model
- Sentry receives error events

**Branch**: `chore/tool-logging`  
**PR Title**: `chore(logging): add structured logging to tool generation routes`

---

### 4.5 Log serviceUnavailableError (Problema #14)

**Problema**: `serviceUnavailableError()` catch senza log.  
**Effetto**: Errori LLM silenziosi.  
**File interessato**: tool routes error handlers

**Soluzione**: Log error prima di return.

```typescript
catch (error) {
  const msg = error instanceof Error ? error.message : 'unknown';
  log.error(
    { error: msg, stack: error instanceof Error ? error.stack : undefined },
    'LLM service unavailable'
  );
  return serviceUnavailableError();
}
```

**Scope lavoro**:
1. [x] `src/app/api/tools/*/route.ts`: add error log in catches
2. [x] `src/lib/tool-routes/error-handlers.ts`: centralized error logging
3. [x] Test: verify error logged via logger mock

**Acceptance Criteria**:
- Errors logged before serviceUnavailable return
- Error message + stack included
- Logger mock captures event in test

**Branch**: `chore/service-error-logging`  
**PR Title**: `chore(logging): log errors in service unavailable handlers`

---

### 4.6 Dynamic Pricing Staleness Check (Problema #15)

**Problema**: MODEL_COSTS hardcodati, non riflettono variazioni OpenRouter.  
**Effetto**: Budget tracking sempre più impreciso nel tempo.  
**File interessato**: [src/lib/llm/costs.ts](../src/lib/llm/costs.ts)

**Soluzione** (progressiva):
1. **Phase 4**: Aggiungere `_lastUpdated` timestamp + warning se >30gg
2. **Sprint 2**: Webhook OpenRouter POST /api/webhooks/pricing-update

```typescript
// src/lib/llm/models.ts
export const MODEL_COSTS = {
  'openai/gpt-4-turbo': { input: 0.01, output: 0.03 },
  // ...
  _lastUpdated: new Date('2026-04-11').toISOString()
};

// Startup: log warning if _lastUpdated > 30 days
```

**Scope lavoro**:
1. [x] `src/lib/llm/models.ts`: add `_lastUpdated` timestamp
2. [x] `src/lib/llm/costs.ts`: staleness check on startup
3. [x] Startup log: warning if pricing stale
4. [x] `tests/unit/models.test.ts`: verify timestamp logic
5. [x] Documentation: pricing update SOP in README

**Acceptance Criteria**:
- `_lastUpdated` timestamp present
- Startup warning if >30 days
- SOP documented for manual pricing update

**Branch**: `chore/pricing-staleness`  
**PR Title**: `chore(pricing): add staleness check to model costs`

---

**Phase 4 Acceptance Criteria**:
- ✅ File upload: MIME spoofing rejected with 400
- ✅ Env var: schema validates, typed object exported, startup fails fast
- ✅ Role: enum in DB, code typed, migration clean
- ✅ Logging: all tool routes + errors logged with context + Sentry
- ✅ Pricing: staleness check present, warning logged
- ✅ Coverage >70%

---

## Summary & Timeline

| Settimana | Fase        | PR Count | Effort | Impact |
|-----------|-------------|----------|--------|--------|
| 1–2       | Phase 1     | 4 PR     | ~36h   | 🔴 **Critical** — data integrity |
| 2–3       | Phase 2     | 3 PR     | ~18h   | 🟠 **High** — consistency |
| 3–4       | Phase 3     | 2 PR     | ~16h   | 🟡 **Medium** — scalability |
| 4–5       | Phase 4     | 5 PR     | ~22h   | 🟢 **Low** — hardening |
| **Tot**   | **4 Fasi**  | **14 PR**| **92h**| ✅ **100% Audit Resolution** |

---

## Git & PR Workflow

### Branch Naming
```bash
# Phase 1
fix/token-counting
fix/quota-race-condition
fix/artifact-cleanup
fix/artifact-put-status

# Phase 2
refactor/centralize-guards
refactor/unify-models
refactor/parametrize-artifact-type

# Phase 3
feat/admin-pagination
perf/streaming-backpressure

# Phase 4
security/mime-verification
chore/env-validation
chore/role-enum
chore/tool-logging
chore/service-error-logging
chore/pricing-staleness
```

### PR Template
```markdown
## type(scope): subject

### Summary
- Bullet 1: what changed
- Bullet 2: why changed
- Bullet 3: side effects (if any)

### Files Modified
- src/...
- tests/...

### Testing
- ✅ All existing tests pass
- ✅ New test coverage added
- ✅ Manual testing verified

### Checklist
- [ ] CI green (typecheck, lint, test, build)
- [ ] Coverage >70% on modified lines
- [ ] No breaking changes
- [ ] Documentation updated (if needed)
```

### Merge Strategy
- Target: `dev` branch sempre
- Merge type: **Squash and Merge**
- Commit title: stesso formato PR title (Conventional Commits)
- PR title = commit title dopo squash

---

## Pre-Merge Gates (OBBLIGATORIO)

Ogni PR deve soddisfare:
1. ✅ CI verde: `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`
2. ✅ Coverage >70% su linee modificate
3. ✅ 0 open review conversations
4. ✅ 0 TODO introdotti senza issue associata

---

## Rollback Strategy

Ogni PR è indipendentemente rollbackable:
1. Revert commit su `dev` (o revert merge su `main` se necessario)
2. Redeploy build precedente
3. Fasi 1–3: backward-compatible, nessuna migration necessaria
4. Fase 4 (role enum): richiede rollback migration + revert code changes

```bash
# Di solito semplice:
git revert <commit-sha>
git push origin dev

# Redeploy Vercel auto-triggered
```

---

## Success Metrics (Post-Implementation)

| Metrica | Target | Validation |
|---------|--------|-----------|
| Token accuracy | ±5% vs tokenizer | Unit test vs OpenAI |
| Quota race condition | 0 overages x 100concurrent | Integration test |
| Artifact cleanup | 0 stale > 24h | Cron test |
| Admin paginate query | < 200ms (1000 users) | Load test |
| Streaming backpressure | 50 concurrent, no timeout | Concurrency test |
| MIME spoofing | 100% rejection | Security test |
| Env validation | Clear error on missing var | Unit test |
| Role enum | DB constraint enforced | Migration test |
| Logging coverage | 100% of tool routes | Test output verify |
| Pricing staleness | Warning if >30 days | Startup test |

---

## Document Updates (After Each Phase)

After completing each phase, update:

### Phase 1
- [x] `docs/ADRs/003-rate-limiting-quota-strategy.md`: atomicity guarantee note
- [x] `docs/adrs/002-streaming-vs-batch-responses.md`: cleanup strategy
- [x] `docs/specifications/api-specifications.md`: error codes for artifact PUT

### Phase 2
- [x] `docs/ADRs/001-modular-llm-controller-architecture.md`: guard layer centralization
- [x] `docs/implement-index.md`: mark Phase 2 complete

### Phase 3
- [x] `docs/adrs/002-streaming-vs-batch-responses.md`: backpressure strategy detail
- [x] `docs/implement-index.md`: query optimization notes

### Phase 4
- [x] `docs/security/file-handling.md`: MIME verification best practice
- [x] `README.md`: deployment checklist (env validation)
- [x] `docs/implement-index.md`: mark all complete

### Global
- [x] `CHANGELOG.md`: add section for each phase
- [x] `docs/implement-index.md`: update status per phase

---

## Implementation Notes

### Prisma v7 Specifics
- Import client da: `import { PrismaClient } from '@/generated/prisma'` (non '@prisma/client')
- Transazioni atomiche: `db.$transaction(async (tx) => { ... })`
- Migrations: `npx prisma migrate dev --name <name>`

### NextAuth v5 Specifics
- Use `auth()` function (not `getServerSession`)
- Type augmentation: `src/types/next-auth.d.ts`
- Providers: `import Google from 'next-auth/providers/google'`

### SSE Streaming
- Use `fetch` + `response.body.getReader()` (not EventSource, GET-only)
- Stream close listener: `response.on('close', handler)`

### Security Principles
- Always read userId from `session.user.id` (server-side), never from body
- Ownership check on every GET/PUT/DELETE de artifact
- Zod validation on all input before any Prisma query
- Rate limit check before OpenRouter call

---

## Questions & Escalation

Per problemi con:
- **Architecture**: escalare all'ADR file appropriato
- **Testing**: verificare coverage report, aggiungere test case
- **Scaling**: load test prima di merge su `dev`
- **Security**: security review prima di merge

---

## Contacts & Resources

- **Codebase**: gen-app Next.js 16 + Prisma 7 + NextAuth v5
- **CI/CD**: GitHub Actions (typecheck, lint, test, build)
- **Deployment**: Vercel (main=prod, dev=staging)
- **Database**: PostgreSQL (Neon)
- **Rate Limiting**: Upstash Redis

---

**Plan Version**: 1.1 (11 aprile 2026)  
**Last Updated**: 11 aprile 2026  
**Status**: ✅ COMPLETED AND ARCHIVED
