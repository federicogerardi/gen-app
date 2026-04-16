---
goal: Hardening operativo API/LLM Tooling con stabilita contratto e lifecycle artifact
version: 1.0
date_created: 2026-04-15
last_updated: 2026-04-15
owner: Backend Platform
status: Planned
tags: [feature, hardening, api, llm, tool-routes, tool-prompts, tests]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Piano esecutivo per risolvere i gap operativi emersi nell'audit API/LLM tooling, con focus su error boundaries pre-stream, finalizzazione artifact extraction, coerenza reason taxonomy e allineamento specifiche API.

## 1. Requirements & Constraints

- **REQ-001**: Mantenere contratto errori API nel formato `{ error: { code, message } }` su tutti i rami di errore.
- **REQ-002**: Evitare risposte 500 non mappate nei fault pre-stream noti delle route tool.
- **REQ-003**: Garantire finalizzazione deterministica artifact extraction (`completed` o `failed`) senza stati orphan `generating`.
- **REQ-004**: Distinguere reason diagnostici ownership (`not_found` vs `forbidden`) senza alterare mapping HTTP lato client.
- **SEC-001**: Preservare auth obbligatoria via `auth()`/guard centralizzate.
- **SEC-002**: Preservare ownership check su accesso progetto e risorse user-owned.
- **CON-001**: Non introdurre runtime filesystem loading nei path route/tool-prompts.
- **CON-002**: Preservare ordine `rateLimit(userId)` prima di invocazioni LLM/provider.
- **CON-003**: Preservare validazione input con Zod prima di accessi DB e logica di generazione.
- **GUD-001**: Route handlers restano thin con logica riusabile in `src/lib/tool-routes/*` e `src/lib/llm/*`.
- **PAT-001**: Allineamento documentazione contrattuale in `docs/specifications/api-specifications.md` con comportamento runtime reale.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Consolidare hardening pre-stream su route Meta Ads e HotLead Funnel con fallback error mapping stabile.

| Task     | Description | Completed | Date |
| -------- | ----------- | --------- | ---- |
| TASK-001 | Aggiornare `src/app/api/tools/meta-ads/generate/route.ts` spostando prompt build e passaggi pre-stream dentro perimetro di gestione errori uniforme e risposta standard `apiError` su eccezioni inattese. |  |  |
| TASK-002 | Aggiornare `src/app/api/tools/funnel-pages/generate/route.ts` con stessa strategia di `TASK-001`, mantenendo invariati auth/ownership/rate-limit/validation ordering. |  |  |
| TASK-003 | Verificare che i branch di errore non alterino il contratto SSE per i path successful (`sseResponse` invariato). |  |  |

### Implementation Phase 2

- GOAL-002: Mettere in sicurezza il lifecycle artifact nella route extraction in caso di fault pre-stream.

| Task     | Description | Completed | Date |
| -------- | ----------- | --------- | ---- |
| TASK-004 | In `src/app/api/tools/extraction/generate/route.ts` introdurre finalizzazione esplicita artifact su eccezioni tra `artifact.create` e stream valido, persistendo `status: failed`, `failureReason` e `terminalState`. |  |  |
| TASK-005 | Garantire che il path di finalizzazione non produca doppia finalizzazione in presenza di fallback chain gia terminale. |  |  |
| TASK-006 | Aggiungere guard logici per preservare idempotenza di finalizzazione (`single-finalize`) e mantenere compatibilita con runbook extraction esistente. |  |  |

### Implementation Phase 3

- GOAL-003: Correggere reason taxonomy ownership e riallineare la specifica API ai codici runtime effettivi.

| Task     | Description | Completed | Date |
| -------- | ----------- | --------- | ---- |
| TASK-007 | Correggere mapping reason ownership in `src/app/api/tools/extraction/generate/route.ts` distinguendo in telemetria `not_found` e `forbidden` senza modificare status HTTP restituiti ai client. |  |  |
| TASK-008 | Aggiornare `docs/specifications/api-specifications.md` includendo `CONFLICT` (409) nella sezione Common Error Codes e confermando uso su collisione idempotency extraction. |  |  |
| TASK-009 | Aggiornare nota review collegata (`docs/review/operational-improvement-note-api-llm-tooling-2026-04-15.md`) con stato avanzamento e riferimento ai task chiusi. |  |  |

### Implementation Phase 4

- GOAL-004: Chiudere il piano con copertura test di regressione sui nuovi rami errore.

| Task     | Description | Completed | Date |
| -------- | ----------- | --------- | ---- |
| TASK-010 | Estendere `tests/integration/meta-ads-route.test.ts` con caso prompt-builder throw pre-stream e assert su status + envelope error standard. |  |  |
| TASK-011 | Estendere `tests/integration/funnel-pages-route.test.ts` con caso prompt-builder throw pre-stream e assert su status + envelope error standard. |  |  |
| TASK-012 | Estendere `tests/integration/extraction-route.test.ts` con caso failure pre-stream dopo artifact create e assert su finalizzazione artifact (`failed`) + `terminalState`. |  |  |
| TASK-013 | Eseguire validazione completa (`npm run test`, `npm run typecheck`, `npm run build`) e registrare esito nel tracker operativo docs. |  |  |

## 3. Alternatives

- **ALT-001**: Gestire i fault pre-stream solo con catch globale middleware. Non scelto: riduce controllo route-specific su artifact lifecycle e logging contestuale.
- **ALT-002**: Lasciare taxonomy reason aggregata su `forbidden`. Non scelto: degrada qualita diagnostica e allunga triage operativo.
- **ALT-003**: Aggiornare solo documentazione API senza toccare runtime. Non scelto: non risolve il rischio di 500 non mappati e artifact orphan.

## 4. Dependencies

- **DEP-001**: Guard e response helpers in `src/lib/tool-routes/guards.ts` e `src/lib/tool-routes/responses.ts`.
- **DEP-002**: Persistenza artifact/quota in `src/lib/llm/streaming.ts` e schema Prisma `prisma/schema.prisma` (modelli `Artifact`, `QuotaHistory`).
- **DEP-003**: Specifica contrattuale in `docs/specifications/api-specifications.md`.
- **DEP-004**: ADR di riferimento su architettura LLM e quota/rate-limit (`docs/adrs/001-modular-llm-controller-architecture.md`, `docs/adrs/003-rate-limiting-quota-strategy.md`).

## 5. Files

- **FILE-001**: `src/app/api/tools/meta-ads/generate/route.ts` — hardening error boundary pre-stream.
- **FILE-002**: `src/app/api/tools/funnel-pages/generate/route.ts` — hardening error boundary pre-stream.
- **FILE-003**: `src/app/api/tools/extraction/generate/route.ts` — lifecycle safety + taxonomy reason.
- **FILE-004**: `tests/integration/meta-ads-route.test.ts` — regressione pre-stream failure.
- **FILE-005**: `tests/integration/funnel-pages-route.test.ts` — regressione pre-stream failure.
- **FILE-006**: `tests/integration/extraction-route.test.ts` — regressione pre-stream failure + artifact finalization.
- **FILE-007**: `docs/specifications/api-specifications.md` — allineamento Common Error Codes.
- **FILE-008**: `docs/review/operational-improvement-note-api-llm-tooling-2026-04-15.md` — stato operativo e closure notes.

## 6. Testing

- **TEST-001**: Verificare che tutte le route tool in scope restituiscano error envelope standard su eccezioni pre-stream note.
- **TEST-002**: Verificare assenza di artifact `generating` orfani in extraction dopo failure pre-stream.
- **TEST-003**: Verificare reason telemetry ownership distinti e coerenti con i rami runtime.
- **TEST-004**: Verificare che i path successful SSE restino invariati (start/token/progress/complete).
- **TEST-005**: Validare regressione complessiva con suite integration + typecheck + build.

## 7. Risks & Assumptions

- **RISK-001**: Refactor dei blocchi pre-stream puo introdurre regressioni su logging o sequencing delle guard.
- **RISK-002**: Finalizzazione artifact duplicata se non viene mantenuto un gate di idempotenza clear.
- **RISK-003**: Disallineamento test mock DB se cambia forma payload `terminalState`.
- **ASSUMPTION-001**: Contratto API deve privilegiare codici standard gia adottati in `apiError` helper.
- **ASSUMPTION-002**: L'aggiornamento docs viene mantenuto nello stesso ciclo PR delle modifiche runtime.

## 8. Related Specifications / Further Reading

- `docs/review/operational-improvement-note-api-llm-tooling-2026-04-15.md`
- `docs/specifications/api-specifications.md`
- `docs/adrs/001-modular-llm-controller-architecture.md`
- `docs/adrs/003-rate-limiting-quota-strategy.md`
