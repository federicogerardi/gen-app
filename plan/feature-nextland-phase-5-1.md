---
goal: Refactor completo della tool page NextLand in architettura composabile allineata a Funnel Phase 4
version: 1.0
date_created: 2026-04-18
last_updated: 2026-04-18
owner: Federico / AI Coding Agent
status: 'In progress'
tags: [feature, refactor, nextland, architecture, phase-5]
---

# Introduction

![Status: In progress](https://img.shields.io/badge/status-In%20progress-yellow)

Piano operativo eseguibile per avviare e completare la Phase 5: decomposizione di src/app/tools/nextland/page.tsx in moduli composabili con parity funzionale rispetto al comportamento attuale e allineamento al pattern gia applicato in Funnel.

## 1. Requirements & Constraints

- REQ-001: Ridurre src/app/tools/nextland/page.tsx da 1308 righe a file wrapper <= 40 righe con Suspense + export default.
- REQ-002: Creare src/app/tools/nextland/NextLandToolContent.tsx <= 350 righe mantenendo l intero flusso upload, extraction, review, generation, resume e regenerate.
- REQ-003: Estrarre la logica NextLand in hook dedicati sotto src/app/tools/nextland/hooks/ con naming coerente a Funnel.
- REQ-004: Estrarre la UI in componenti dedicati sotto src/app/tools/nextland/components/ con responsabilita singola.
- REQ-005: Mantenere i contratti API invariati su endpoint /api/tools/nextland/extract e /api/tools/nextland/generate.
- REQ-006: Mantenere la semantica degli step NextLand: landing -> thank_you.
- REQ-007: Integrare i riferimenti del piano Phase 5 nella documentazione principale del lavoro (implement-index + ADR 004) con stato coerente.
- SEC-001: Preservare la gestione errori strutturata (error.code/error.message) senza leakage di dettagli interni.
- SEC-002: Preservare la logica di retry solo per codici retryable (500, 429, INTERNAL_ERROR, RATE_LIMIT_EXCEEDED).
- CON-001: Non introdurre modifiche in branch main; operare solo su branch dev o feature branch.
- CON-002: Non cambiare schema Prisma, route backend, o payload API in questa fase.
- CON-003: Non introdurre dipendenze npm aggiuntive.
- GUD-001: Riutilizzare pattern gia validato in Funnel hooks/components ove semanticamente equivalente.
- PAT-001: Pattern target: page wrapper minimale + content container + hook per dominio + componenti presentazionali.

## 2. Implementation Steps

### Implementation Phase 1

- GOAL-001: Definire baseline verificabile e scaffold NextLand modulare con file structure completa.

| Task | Description | Completed | Date |
| -------- | --------------------- | --------- | ---------- |
| TASK-001 | Eseguire baseline snapshot con comandi: wc -l src/app/tools/nextland/page.tsx e rg -n "^(function|async function|const )" src/app/tools/nextland/page.tsx; salvare output nel PR body per confronto finale. |  |  |
| TASK-002 | Creare file scaffold vuoti con export minimi: src/app/tools/nextland/NextLandToolContent.tsx, src/app/tools/nextland/config.ts, src/app/tools/nextland/types.ts. |  |  |
| TASK-003 | Creare directory e file hooks: src/app/tools/nextland/hooks/useNextLandExtraction.ts, src/app/tools/nextland/hooks/useNextLandGeneration.ts, src/app/tools/nextland/hooks/useNextLandRecovery.ts, src/app/tools/nextland/hooks/useNextLandUiState.ts. |  |  |
| TASK-004 | Creare directory e file componenti: src/app/tools/nextland/components/NextLandSetupCard.tsx, src/app/tools/nextland/components/NextLandStatusQuick.tsx, src/app/tools/nextland/components/NextLandStepCards.tsx. |  |  |

Completion Criteria Phase 1:
- CCR-001: Tutti i file target esistono e compilano con export placeholder senza errori TypeScript locali.
- CCR-002: Nessuna modifica a endpoint API o schema dati backend.

### Implementation Phase 2

- GOAL-002: Estrarre tipi, costanti e utility pure da page.tsx in moduli dedicati.

| Task | Description | Completed | Date |
| -------- | --------------------- | --------- | ---------- |
| TASK-005 | Spostare in src/app/tools/nextland/types.ts i tipi locali attuali: NextLandStepKey, NextLandStepState, Phase, NextLandIntent, NextLandUiState, StreamResult, ResumeCandidateArtifact, RetryMeta, ExtractionLifecycleState, ApiErrorPayload. |  |  |
| TASK-006 | Spostare in src/app/tools/nextland/config.ts le costanti attuali: TONES, TONE_HINTS, ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS, STEP_STATUS_BADGE_CLASS, STEP_STATUS_LABEL, initialSteps. |  |  |
| TASK-007 | Spostare o riscrivere come utility pure in hook dedicati: parseIntent (oggi linea ~118), parseTerminalOutcome (~291), mapOutcomeToLifecycle (~301), parseStepFromArtifactInput (~317). |  |  |
| TASK-008 | Ridurre duplicazione con Funnel confrontando firme e tipi di src/app/tools/funnel-pages/types.ts e src/app/tools/funnel-pages/config.ts per mantenere naming parallelo e onboarding uniforme. |  |  |

Completion Criteria Phase 2:
- CCR-003: page.tsx non contiene piu definizioni type alias/interfaces/costanti dominio NextLand.
- CCR-004: Import path coerenti e nessun ciclo di dipendenze fra config, types, hooks e components.

### Implementation Phase 3

- GOAL-003: Estrarre logica di workflow in hook composabili con side-effects isolati.

| Task | Description | Completed | Date |
| -------- | --------------------- | --------- | ---------- |
| TASK-009 | Implementare useNextLandExtraction.ts con stato extraction, upload file, gestione endpoint extract, retry messaging e mapping lifecycle; includere ALLOWED_MIME_TYPES/ALLOWED_EXTENSIONS via config import. |  |  |
| TASK-010 | Implementare useNextLandGeneration.ts includendo generateStream, stream parsing token, retry/backoff e orchestrazione step landing -> thank_you mantenendo contratti request correnti. |  |  |
| TASK-011 | Implementare useNextLandRecovery.ts con auto-resume da artifact list, parser checkpoint e ricostruzione stato step/artifactId coerente con intent resume/regenerate. |  |  |
| TASK-012 | Implementare useNextLandUiState.ts per determinare primary/secondary action in base a phase, intent, draft state, checkpoint e stato step. |  |  |
| TASK-013 | Spostare helper locali stream/retry (streamToText, getRetryMeta, withRetry, sleep, getBackoffDelayMs, getExtractionErrorMessage) dentro i hook appropriati o utility locali del dominio NextLand, evitando ritorno di monolite. |  |  |

Completion Criteria Phase 3:
- CCR-005: Ogni hook esporta API tipizzata e puo essere importato indipendentemente senza leggere dal DOM.
- CCR-006: Nessuna funzione di business rimane direttamente in page.tsx eccetto wrapper pagina.

### Implementation Phase 4

- GOAL-004: Estrarre UI presentazionale e comporre NextLandToolContent con responsabilita orchestrativa unica.

| Task | Description | Completed | Date |
| -------- | --------------------- | --------- | ---------- |
| TASK-014 | Implementare NextLandSetupCard.tsx riusando struttura di FunnelSetupCard con campi specifici NextLand (project, model, tone, notes, file upload, extraction context). |  |  |
| TASK-015 | Implementare NextLandStatusQuick.tsx per widget rapido di stato phase/extraction lifecycle/checkpoint pronto. |  |  |
| TASK-016 | Implementare NextLandStepCards.tsx per rendering card step con badge stato, preview contenuto e CTA apertura artifact. |  |  |
| TASK-017 | Implementare NextLandToolContent.tsx come orchestratore: wiring hooks, query project/model, routing query params intent/artifact, callback UI e side effects controllati. |  |  |
| TASK-018 | Ridurre src/app/tools/nextland/page.tsx a wrapper Suspense minimale che renderizza NextLandToolContent e mantiene metadata/page shell invariati. |  |  |

Completion Criteria Phase 4:
- CCR-007: src/app/tools/nextland/page.tsx <= 40 linee.
- CCR-008: src/app/tools/nextland/NextLandToolContent.tsx <= 350 linee.
- CCR-009: Zero regressioni UX su flow new/resume/regenerate verificate manualmente.

### Implementation Phase 5

- GOAL-005: Validare parity funzionale, test automatici e allineamento documentale.

| Task | Description | Completed | Date |
| -------- | --------------------- | --------- | ---------- |
| TASK-019 | Aggiungere test unit hook in tests/unit/tools/nextland/use-nextland-extraction.test.ts, tests/unit/tools/nextland/use-nextland-generation.test.ts, tests/unit/tools/nextland/use-nextland-recovery.test.ts, tests/unit/tools/nextland/use-nextland-ui-state.test.ts. |  |  |
| TASK-020 | Aggiungere test componenti in tests/unit/tools/nextland/nextland-setup-card.test.tsx e tests/unit/tools/nextland/nextland-step-cards.test.tsx per stati principali e callback. |  |  |
| TASK-021 | Aggiungere o aggiornare integration test route/page in tests/integration/nextland-page-flow.test.ts per path critici: upload->extract->generate, resume da checkpoint, regenerate da artifact esistente. |  |  |
| TASK-022 | Eseguire gate: npm run typecheck, npm run lint, npm run test; allegare esito sintetico in documento di tracking o PR. |  |  |
| TASK-023 | Aggiornare docs/adrs/004-tool-pages-composable-architecture.md marcando avanzamento da "Phase 5 Pending" a stato corrente, includendo il link al piano plan/feature-nextland-phase-5-1.md e correggendo metriche/claim non ancora completati. |  |  |
| TASK-024 | Aggiornare docs/implement-index.md nella sezione P1-CRITICO aggiungendo il riferimento a plan/feature-nextland-phase-5-1.md e distinguendo chiaramente metriche raggiunte vs metriche target post-Phase 5. |  |  |

Completion Criteria Phase 5:
- CCR-010: Tutti i gate CI locali sono verdi.
- CCR-011: Test aggiunti coprono i casi di errore retryable/non-retryable, resume e sequenza step.
- CCR-012: ADR 004 allineato allo stato reale repository.
- CCR-013: Implement-index e ADR 004 contengono entrambi il riferimento esplicito al piano Phase 5 e lo stesso stato operativo.

## 3. Alternatives

- ALT-001: Mantenere src/app/tools/nextland/page.tsx monolitico e fare solo cleanup locale. Scartata perche non risolve duplicazione, testabilita e AI-context overload.
- ALT-002: Creare shared layer completo in src/tools/shared prima di chiudere Phase 5. Scartata perche aumenta scope e rischio; in Phase 5 si privilegia parity con blueprint Funnel gia in produzione.
- ALT-003: Migrare entrambi i tool a un unico componente parametrico subito. Scartata per rischio regressioni incrociate e debugging piu complesso.

## 4. Dependencies

- DEP-001: Pattern Funnel completato in src/app/tools/funnel-pages/ (componenti + hooks) usato come riferimento strutturale.
- DEP-002: Endpoint backend esistenti /api/tools/nextland/extract e /api/tools/nextland/generate devono restare stabili.
- DEP-003: Utility UI comuni gia presenti in components/ui (card, badge, button, select, textarea, label).
- DEP-004: React Query useQuery e Next router/search params per caricamento dati e intent parsing.

## 5. Files

- FILE-001: src/app/tools/nextland/page.tsx - riduzione a wrapper Suspense minimale.
- FILE-002: src/app/tools/nextland/NextLandToolContent.tsx - nuovo container orchestratore.
- FILE-003: src/app/tools/nextland/config.ts - costanti dominio NextLand.
- FILE-004: src/app/tools/nextland/types.ts - tipi dominio NextLand.
- FILE-005: src/app/tools/nextland/hooks/useNextLandExtraction.ts - hook extraction/upload.
- FILE-006: src/app/tools/nextland/hooks/useNextLandGeneration.ts - hook generation/retry/stream.
- FILE-007: src/app/tools/nextland/hooks/useNextLandRecovery.ts - hook resume/checkpoint recovery.
- FILE-008: src/app/tools/nextland/hooks/useNextLandUiState.ts - hook state machine UI actions.
- FILE-009: src/app/tools/nextland/components/NextLandSetupCard.tsx - setup form component.
- FILE-010: src/app/tools/nextland/components/NextLandStatusQuick.tsx - quick status component.
- FILE-011: src/app/tools/nextland/components/NextLandStepCards.tsx - step cards component.
- FILE-012: tests/unit/tools/nextland/use-nextland-extraction.test.ts - unit tests extraction hook.
- FILE-013: tests/unit/tools/nextland/use-nextland-generation.test.ts - unit tests generation hook.
- FILE-014: tests/unit/tools/nextland/use-nextland-recovery.test.ts - unit tests recovery hook.
- FILE-015: tests/unit/tools/nextland/use-nextland-ui-state.test.ts - unit tests ui state hook.
- FILE-016: tests/unit/tools/nextland/nextland-setup-card.test.tsx - component tests setup card.
- FILE-017: tests/unit/tools/nextland/nextland-step-cards.test.tsx - component tests step cards.
- FILE-018: tests/integration/nextland-page-flow.test.ts - integration tests principali.
- FILE-019: docs/adrs/004-tool-pages-composable-architecture.md - aggiornamento stato di avanzamento phase 5.
- FILE-020: docs/implement-index.md - integrazione riferimento piano e stato avanzamento Phase 5.

## 6. Testing

- TEST-001: Verificare parse intent con input validi/invalidi in useNextLandUiState.
- TEST-002: Verificare retry policy in useNextLandGeneration: ritenta su 429/5xx, non ritenta su 4xx non retryable.
- TEST-003: Verificare parser stream SSE token/error in useNextLandGeneration.
- TEST-004: Verificare validate file extension e mime type in useNextLandExtraction.
- TEST-005: Verificare mapping outcome->lifecycle in useNextLandRecovery (in_progress, completed_partial, completed_full, failed_hard).
- TEST-006: Verificare sequenza step obbligatoria landing prima di thank_you.
- TEST-007: Verificare rendering badge stato e callback artifact open in NextLandStepCards.
- TEST-008: Verificare flusso integration completo new intent.
- TEST-009: Verificare flusso integration resume intent con checkpoint esistente.
- TEST-010: Verificare flusso integration regenerate intent con artifact precompilato.
- TEST-011: Verificare coerenza documentale: presenza link a plan/feature-nextland-phase-5-1.md in docs/implement-index.md e docs/adrs/004-tool-pages-composable-architecture.md.

## 7. Risks & Assumptions

- RISK-001: Regressione silente su resume/regenerate per differenze tra stato monolite e stato decomposto.
- RISK-002: Disallineamento firme hook/component rispetto a Funnel puo introdurre divergenza architetturale futura.
- RISK-003: Refactor rapido senza test dedicati aumenta rischio bug in produzione.
- RISK-004: Refactor UI puo alterare microcopy o affordance e impattare UX interna.
- ASSUMPTION-001: Gli endpoint /api/tools/nextland/extract e /api/tools/nextland/generate mantengono payload e codici errore correnti.
- ASSUMPTION-002: Le dipendenze UI e test environment nel repository sono gia configurate per nuovi file test.
- ASSUMPTION-003: Il pattern Funnel Phase 4 rappresenta baseline stabile e approvata per clonazione strutturale.

## 8. Related Specifications / Further Reading

- docs/adrs/004-tool-pages-composable-architecture.md
- docs/adrs/001-modular-llm-controller-architecture.md
- docs/adrs/002-streaming-vs-batch-responses.md
- docs/implementation/funnel-pages-phase-4-refactor-plan.md