---
goal: Chiusura completa audit qualita e sicurezza con rollout incrementale
version: 1.0
date_created: 2026-04-12
last_updated: 2026-04-12
owner: Platform Team
status: 'Planned'
tags: [feature, security, quality, testing, architecture]
---

# Introduction

![Status: Planned](https://img.shields.io/badge/status-Planned-blue)

Piano esecutivo per risolvere tutti i rilievi del report copilot-audit-12042026 in ordine di impatto crescente: prima interventi incrementali a basso rischio, poi modifiche medie trasversali, infine refactor ad alto impatto su route legacy e controllo quota concorrente.

## 1. Requirements & Constraints

- **REQ-001**: Chiudere tutti i finding audit tracciati (SEC-1..SEC-5, QUA-1..QUA-9, TEST-1..TEST-3) con evidenza testabile.
- **REQ-002**: Eseguire gli interventi in ordine incrementale, lasciando l'ultima fase ai cambiamenti piu impattanti.
- **REQ-003**: Preservare il contratto errori API `{ error: { code, message } }` e codici standard progetto.
- **REQ-004**: Garantire compatibilita con Next.js 16, Prisma 7 e NextAuth v5 secondo linee guida repository.
- **SEC-001**: Applicare header HTTP di sicurezza minimi (CSP, X-Frame-Options, X-Content-Type-Options, HSTS) senza regressioni funzionali.
- **SEC-002**: Eliminare race condition quota/usage in endpoint di generazione legacy.
- **CON-001**: Nessuna lettura filesystem runtime per prompt nelle route di generazione.
- **CON-002**: Rate limit deve essere verificato prima di invocazioni LLM/OpenRouter.
- **CON-003**: Ogni modifica deve essere accompagnata da test unit/integration/e2e pertinenti.
- **GUD-001**: Mantenere route handler sottili delegando logica a moduli condivisi in `src/lib`.
- **PAT-001**: Riutilizzare guard condivisi (`enforceUsageGuards`, ownership checks) per evitare drift logico.

## 2. Implementation Steps

### Implementation Phase 1

- **GOAL-001**: Completare quick wins a basso impatto (coerenza contratti, env validation, efficienza query, logging) senza cambiare flussi core.

| Task | Description | Completed | Date |
| -------- | --------------------- | --------- | ---------- |
| TASK-001 | Aggiornare `src/lib/env.ts` per includere validazione `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN` nello schema Zod e fallire al boot in ambienti non-test quando assenti (SEC-2). |  |  |
| TASK-002 | Rendere `VERCEL_CRON_SECRET` obbligatoria in produzione in `src/lib/env.ts` con regola condizionale esplicita e messaggio errore deterministico (SEC-4). |  |  |
| TASK-003 | Uniformare il codice errore 409 in `src/app/api/artifacts/[id]/route.ts` usando helper tipizzato (`apiError`) ed estendendo eventuale union condivisa se necessario (SEC-3). |  |  |
| TASK-004 | Sostituire aggiornamenti N-per-artifact con `updateMany` in `src/app/api/cron/cleanup-stale-artifacts/route.ts` e mantenere reporting conteggi coerente (QUA-3). |  |  |
| TASK-005 | Sostituire `console.error` con logger strutturato in `src/app/api/admin/users/route.ts`, propagando `requestId` e metadati route (QUA-4). |  |  |
| TASK-006 | Aggiornare `src/lib/llm/streaming.ts` per rimuovere uso dell'alias deprecato `calculateCost` e usare API non deprecata in `src/lib/llm/costs.ts` (QUA-6). |  |  |
| TASK-007 | Aggiungere/aggiornare test di integrazione per cron cleanup, admin users route e gestione error code 409 in `tests/integration/` (copertura Phase 1). |  |  |

### Implementation Phase 2

- **GOAL-002**: Migliorare qualita dati, validazione schema e robustezza parsing con cambiamenti controllati su layer non critici.

| Task | Description | Completed | Date |
| -------- | --------------------- | --------- | ---- |
| TASK-008 | Rimuovere ridondanza di prompt in payload artifact aggiornando `src/app/api/tools/meta-ads/generate/route.ts` e `src/app/api/tools/funnel-pages/generate/route.ts` per non serializzare prompt completo in `input.topic` (QUA-5). |  |  |
| TASK-009 | Consolidare `extractionFieldDefinitionSchema` in modulo condiviso (`src/lib/tool-routes/schemas.ts` o nuovo file condiviso in `src/lib/schemas/`) e riutilizzarlo in `src/lib/llm/agents/extraction.ts` (QUA-7). |  |  |
| TASK-010 | Refactor `funnelPagesRequestSchema` in `src/lib/tool-routes/schemas.ts` introducendo discriminante esplicita (`schemaVersion`) e `z.discriminatedUnion` con mapping retrocompatibile (QUA-8). |  |  |
| TASK-011 | Sostituire parsing DOCX regex-based in `src/lib/document-parser.ts` con libreria robusta (preferenza: `mammoth`) mantenendo output testuale compatibile e normalizzazione entita (QUA-9). |  |  |
| TASK-012 | Aggiornare test unit in `tests/unit/` per schema funnel, extraction schema condiviso e parser DOCX con fixture edge-case (namespace complessi, entita HTML, tabelle) (copertura Phase 2). |  |  |

### Implementation Phase 3

- **GOAL-003**: Risolvere interventi medi trasversali su sicurezza HTTP, accuratezza metrica streaming e baseline test E2E.

| Task | Description | Completed | Date |
| -------- | --------------------- | --------- | ---- |
| TASK-013 | Definire e applicare security headers globali in `next.config.ts` (`Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security`) con eccezioni minime documentate (SEC-5). |  |  |
| TASK-014 | Rifinire stima token in `src/lib/llm/streaming.ts` usando conteggio provider-driven quando disponibile e fallback deterministico UTF-aware per input/output estimate (QUA-2). |  |  |
| TASK-015 | Aggiungere smoke E2E in `tests/e2e/` per flussi critici: generazione artifact, upload documento, aggiornamento quota admin (TEST-1). |  |  |
| TASK-016 | Aggiornare configurazione copertura in `jest.config.js` con target progressivo per moduli infrastrutturali prioritari e nuovi test integrazione su logger/db wrapper (TEST-2). |  |  |

### Implementation Phase 4

- **GOAL-004**: Concludere con refactor ad alto impatto sulla route legacy per eliminare race condition e allineare ai guard condivisi.

| Task | Description | Completed | Date |
| -------- | --------------------- | --------- | ---- |
| TASK-017 | Refactor completo di `src/app/api/artifacts/generate/route.ts` per riusare guard condivisi (`rateLimit` pre-LLM, `enforceUsageGuards`, ownership check progetto) e rimuovere logica duplicata (QUA-1). |  |  |
| TASK-018 | Garantire atomicita quota/usage in route legacy usando transazione/guard condiviso con incremento `monthlyUsed` nello stesso boundary di validazione (SEC-1). |  |  |
| TASK-019 | Aggiungere test concorrenza in `tests/integration/artifacts-generate-route.test.ts` con richieste parallele per verificare assenza TOCTOU e corretto blocco quota (TEST-3). |  |  |
| TASK-020 | Eseguire regression suite completa (`npm run lint`, `npm run typecheck`, `npm run test`, `npm run test:e2e`) e pubblicare report di chiusura in `docs/review/` con mapping finding->commit->test evidence. |  |  |

## 3. Alternatives

- **ALT-001**: Risolvere solo finding media severita e posticipare le basse priorita. Scartata perche non consente di marcare audit completamente risolto.
- **ALT-002**: Eseguire prima refactor route legacy (SEC-1/QUA-1). Scartata perche aumenta rischio regressioni iniziali e riduce velocita di chiusura incrementale.
- **ALT-003**: Introdurre nuovo gateway unificato per tutte le route di generazione in singolo step. Scartata perche scope troppo ampio rispetto obiettivo remediation audit.

## 4. Dependencies

- **DEP-001**: Libreria parsing DOCX robusto (`mammoth`) con lock su versione stabile.
- **DEP-002**: Infrastruttura Redis Upstash configurata e validata via env schema.
- **DEP-003**: Ambiente test con Prisma client generato (`npx prisma generate`) prima di typecheck/test.
- **DEP-004**: Fixture dati per test E2E/integration su artifact, project ownership, quote utente.

## 5. Files

- **FILE-001**: `src/lib/env.ts` - validazione env Redis e cron secret condizionale.
- **FILE-002**: `src/lib/rate-limit.ts` - eventuale allineamento a env tipizzato condiviso.
- **FILE-003**: `src/app/api/artifacts/[id]/route.ts` - uniformazione errore 409.
- **FILE-004**: `src/app/api/cron/cleanup-stale-artifacts/route.ts` - `updateMany`.
- **FILE-005**: `src/app/api/admin/users/route.ts` - logger strutturato.
- **FILE-006**: `src/lib/llm/streaming.ts` - accuratezza token e cost API.
- **FILE-007**: `src/lib/llm/costs.ts` - consumo API non deprecata.
- **FILE-008**: `src/lib/tool-routes/schemas.ts` - discriminated union funnel + schema condivisi.
- **FILE-009**: `src/lib/llm/agents/extraction.ts` - riuso schema condiviso.
- **FILE-010**: `src/lib/document-parser.ts` - parser DOCX robusto.
- **FILE-011**: `src/app/api/tools/meta-ads/generate/route.ts` - rimozione prompt ridondante da `input`.
- **FILE-012**: `src/app/api/tools/funnel-pages/generate/route.ts` - rimozione prompt ridondante da `input`.
- **FILE-013**: `src/app/api/artifacts/generate/route.ts` - refactor guard condivisi e atomicita.
- **FILE-014**: `next.config.ts` - security headers globali.
- **FILE-015**: `tests/integration/*.test.ts` - test route remediation.
- **FILE-016**: `tests/unit/*.test.ts` - schema/parser/token logic.
- **FILE-017**: `tests/e2e/*.spec.ts` - smoke dei flussi critici.
- **FILE-018**: `jest.config.js` - policy coverage aggiornata.

## 6. Testing

- **TEST-001**: Integration test env validation: avvio applicazione fallisce in produzione simulata con env Redis/cron mancanti.
- **TEST-002**: Integration test artifacts id route: status 409 emette codice conforme contratto tipizzato.
- **TEST-003**: Integration test cron cleanup: verifica singola query logica e conteggio update coerente.
- **TEST-004**: Unit test streaming token estimation: input multibyte/UTF e chunk variabili.
- **TEST-005**: Unit test schema funnel discriminato: errori leggibili per versione payload.
- **TEST-006**: Unit/integration parser DOCX: fixture con tabelle, entity HTML, namespace vari.
- **TEST-007**: E2E smoke artifact generation completo con utente autenticato.
- **TEST-008**: E2E smoke upload documento e pipeline parsing.
- **TEST-009**: E2E smoke admin quota update con autorizzazione ruolo.
- **TEST-010**: Integration test concorrenza route generate con richieste parallele e quota limite.
- **TEST-011**: Stress test rate-limit/stream interruption in ambiente test controllato (worker paralleli, abort client).

## 7. Risks & Assumptions

- **RISK-001**: CSP troppo restrittiva puo bloccare risorse frontend/SDK terze parti.
- **RISK-002**: Refactor route legacy puo introdurre regressioni su client esistenti se cambiano tempi/ordine errori.
- **RISK-003**: Migrazione parser DOCX puo alterare testo estratto su documenti storici.
- **RISK-004**: Test di concorrenza flakey senza isolamento DB e seed deterministico.
- **ASSUMPTION-001**: Tutti i test possono girare in CI con variabili ambiente richieste disponibili.
- **ASSUMPTION-002**: Le route tool moderne rappresentano baseline corretta da riusare nella route legacy.
- **ASSUMPTION-003**: Il team accetta aumento temporaneo effort test per chiusura audit completa.

## 8. Related Specifications / Further Reading

- `docs/copilot-audit-12042026.md`
- `docs/archive/implement-quality-audit.completed-2026-04-11.md`
- `docs/specifications/api-specifications.md`
- `docs/adrs/001-modular-llm-controller-architecture.md`
- `docs/adrs/002-streaming-vs-batch-responses.md`
- `docs/adrs/003-rate-limiting-quota-strategy.md`
- `docs/implement-index.md`

## 9. Historical Interventions (GitHub Merge Log)

Fonte primaria interventi: `docs/archive/implement-quality-audit.completed-2026-04-11.md`.
Fonte di verifica cronologica: output `gh pr list --state merged` filtrato per finestre `merged:2026-04-11` e `merged:2026-04-12`.

### 9.1 Merge timeline (ieri e oggi)

| Ref | Merged At (UTC) | PR | Title | Base <- Head | Merge Commit | Note operativa |
| -------- | --------------------- | --------- | ---------- | ---------- | ---------- | ---------- |
| GH-001 | 2026-04-11T22:36:30Z | #18 | fix(upload): remove PDF support from funnel uploader | main <- dev | d471887b9aad0e895e13ff88bcacac15e910350d | Hardening upload; riduce superficie parser non supportati. |
| GH-002 | 2026-04-11T21:01:00Z | #17 | feat(api): complete phase 4 hardening controls | dev <- feat/quality-audit-phase-4-hardening | 98e560be7e9e5f74e61e58f9ad39094a2e06ae21 | Intervento audit-oriented gia allineato a controlli API. |
| GH-003 | 2026-04-11T20:28:04Z | #16 | feat(scalability): complete phase 3 admin pagination and streaming | dev <- feat/quality-audit-phase-3-scalability | eb678bf48afa63c5d2a821e011a1deb9a117b068 | Migliorie streaming/admin, da verificare su QUA-2. |
| GH-004 | 2026-04-11T20:02:36Z | #15 | refactor(quality): phase 2 consistency-guards, models, and type centralization | dev <- feat/quality-audit-phase-2-consistency | 6e890dbd4dbd504434a3ab1cc58af767f8745c54 | Consolidamento coerente con obiettivi QUA-1/QUA-7/QUA-8. |
| GH-005 | 2026-04-11T17:45:11Z | #14 | fix(audit): Phase 1 complete - token accounting, atomic quota, artifact guards | dev <- fix/token-counting | 35e0bcfdf1c460a976b20be06dcc54d788308926 | Potenziale copertura parziale SEC-1 e QUA-2, da validare su codice attuale. |
| GH-006 | 2026-04-11T14:38:37Z | #13 | refactor(tool-prompts): split templates and orchestrator helpers | dev <- chore/tool-prompts-orchestrator-refactor | 811fcc4d050218167c5c644c1aa25312c17c133a | Riduzione coupling prompt/orchestrator, supporta fase incrementale. |
| GH-007 | 2026-04-11T02:06:45Z | #12 | chore(release): merge dev into main - prisma migrations + hl funnel | main <- dev | f3342c604081717e5bee3f8325cb352e24b681e2 | Release sync, non chiude finding audit da sola. |
| GH-008 | 2026-04-11T01:46:31Z | #11 | feat(ci): enforce prisma migrate deploy before build | dev <- feat/prisma-deploy-migrations | 8495bad3369fbe45b5b27e7e3db82074a5572da7 | Rafforza pipeline quality gates (supporto TEST-2). |
| GH-009 | 2026-04-11T01:19:14Z | #10 | feat(funnel): implement upload-first extraction workflow | dev <- feat/hl-funnel-form-v2 | c678986b5ef9b1bd5024a51644937a48ae509e23 | Base funzionale per interventi parser/schema fase 2. |

### 9.2 Merge oggi (2026-04-12)

- Nessun merge rilevato dalla query GH nella finestra `merged:2026-04-12`.

### 9.3 Impatto storico sul piano corrente

- **HIS-000**: La baseline ufficiale degli interventi gia completati e il documento archiviato `docs/archive/implement-quality-audit.completed-2026-04-11.md`; i log GH confermano timeline e merge commit.
- **HIS-001**: Alcuni task del piano potrebbero risultare parzialmente gia coperti da PR #14, #15, #16, #17; prima di esecuzione fase 1 eseguire una verifica diff puntuale finding->file.
- **HIS-002**: Il piano resta valido come remediation completa perché l'audit del 2026-04-12 segnala finding ancora aperti; i task non vengono marcati completati senza evidenza test aggiornata.
- **HIS-003**: In fase esecutiva, aggiornare colonna Completed/Date solo dopo validazione automatica (lint, typecheck, test unit/integration/e2e) e mapping a ID finding.