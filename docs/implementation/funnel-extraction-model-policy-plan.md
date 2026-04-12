---
goal: Static Extraction Model Policy with Deterministic Fallback Chain for Funnel Upload Flow
version: 1.5
date_created: 2026-04-12
last_updated: 2026-04-12
owner: Platform AI / Tooling
status: In Progress
tags: [feature, llm, extraction, openrouter, policy, reliability, cost, deploy, model-registry]
---

# Introduction

![Status: In progress](https://img.shields.io/badge/status-In%20progress-yellow)

Questo piano definisce l'implementazione di una policy runtime per la fase di estrazione dati nel flusso Funnel da file caricato utente, con modello statico e catena di fallback deterministica su OpenRouter. L'obiettivo e separare l'estrazione strutturata dalla scelta modello usata per la generazione creativa, migliorando affidabilita JSON, prevedibilita operativa e controllo costo.

## 1. Requirements & Constraints

- **REQ-001**: La route di estrazione deve ignorare il modello selezionato dall'utente per decidere il modello runtime.
- **REQ-002**: La catena modello per extraction deve essere deterministica: `anthropic/claude-3.7-sonnet` -> `openai/gpt-4.1` -> `openai/o3`.
- **REQ-003**: Numero massimo tentativi extraction fissato a 3 (nessun ciclo non limitato).
- **REQ-004**: Ogni tentativo deve richiedere output JSON puro e deve essere validato con parse + schema + coerenza campi.
- **REQ-005**: In caso di esaurimento tentativi, risposta API conforme al contratto errori `{ error: { code, message } }`.
- **REQ-006**: Il modello utente deve restare invariato per gli step Funnel creativi (`optin`, `quiz`, `vsl`).
- **REQ-007**: La contabilita costi e quota deve usare il modello effettivamente eseguito per ogni tentativo.
- **REQ-008**: La policy deve essere configurabile tramite costanti centralizzate, non hardcoded in route.
- **REQ-009**: Telemetria minima per tentativo: modello, indice tentativo, latenza, token, costo stimato, esito validazione.
- **REQ-010**: La soluzione deve essere retrocompatibile con payload corrente che include il campo `model`.
- **REQ-011**: In deploy, i model ID runtime fondamentali per extraction devono essere bootstrap/persistiti automaticamente nel registry DB se assenti.
- **REQ-012**: Il bootstrap deploy deve essere idempotente (nessuna duplicazione, safe su deploy ripetuti).
- **REQ-013**: Se pricing reale non disponibile, consentire pricing mock per garantire disponibilita operativa dei model ID.
- **SEC-001**: Nessun downgrade dei controlli esistenti: `auth()`, ownership progetto, rate-limit pre-LLM.
- **SEC-002**: Nessuna esposizione nel payload di dettagli interni sensibili (stack, prompt interni, policy chain completa).
- **SEC-003**: Mantenere la sanitizzazione e la validazione Zod prima delle chiamate LLM.
- **CON-001**: Applicare le guardrail architetturali Orchestrator -> Agent -> Provider senza accorpare responsabilita.
- **CON-002**: Non introdurre letture filesystem runtime nel path route extraction.
- **CON-003**: Mantenere i codici errore standard (`VALIDATION_ERROR`, `INTERNAL_ERROR`, `RATE_LIMIT_EXCEEDED`, ecc.).
- **CON-004**: Il budget per richiesta extraction non deve superare USD 0.08 salvo override esplicito futuro.
- **CON-005**: Il bootstrap non deve sovrascrivere in modo distruttivo i modelli gia gestiti da admin (soprattutto `isDefault`) salvo regole esplicite.
- **GUD-001**: Preferire funzioni pure e piccole per validazione tentativo e decisione fallback.
- **GUD-002**: Ogni decisione di fallback deve essere tracciabile nei log con reason machine-readable.
- **PAT-001**: Policy centralizzata in modulo dedicato, route sottile, reuse di `createArtifactStream`.
- **PAT-002**: Test-first su route integration e unit policy; nessun comportamento implicito non coperto da test.

## 2. Implementation Steps

### Implementation Phase 1

- **GOAL-001**: Definire policy statica extraction e contratto tecnico di fallback chain.

| Task | Description | Completed | Date |
| -------- | --------------------- | --------- | ---------- |
| TASK-001 | Creare `src/lib/llm/extraction-model-policy.ts` con costanti: `EXTRACTION_PRIMARY_MODEL='anthropic/claude-3.7-sonnet'`, `EXTRACTION_FALLBACK_MODELS=['openai/gpt-4.1','openai/o3']`, `EXTRACTION_MAX_ATTEMPTS=3`, `EXTRACTION_MAX_COST_USD=0.08`, `EXTRACTION_TIMEOUT_MS=45000`. | Yes | 2026-04-12 |
| TASK-002 | Implementare funzione pura `getExtractionAttemptPlan()` che ritorna sequenza ordinata tentativi con `attemptIndex`, `model`, `isFallback`, `timeoutMs`. | Yes | 2026-04-12 |
| TASK-003 | Implementare funzione pura `shouldEscalateExtractionAttempt(result, policyState)` con reason enum (`parse_failed`, `schema_failed`, `consistency_failed`, `timeout`, `provider_error`, `budget_exceeded`). | Yes | 2026-04-12 |
| TASK-004 | Implementare funzione `resolveExtractionRuntimeModel(payloadModel)` che ignora `payloadModel` e ritorna primario policy; mantenere `payloadModel` solo per audit/compatibilita input. | Yes | 2026-04-12 |
| TASK-005 | Aggiungere unit test in `tests/unit/extraction-model-policy.test.ts` per ordine chain, max attempts, budget cap, reason mapping. | Yes | 2026-04-12 |

### Implementation Phase 2

- **GOAL-002**: Integrare policy nella route extraction mantenendo guardrail auth/quota/ownership e contratto API.

| Task | Description | Completed | Date |
| -------- | --------------------- | --------- | ---------- |
| TASK-006 | Aggiornare `src/app/api/tools/extraction/generate/route.ts`: sostituire uso diretto `payload.model` nella chiamata stream con modello del tentativo corrente da policy. | Yes | 2026-04-12 |
| TASK-007 | In `src/app/api/tools/extraction/generate/route.ts` mantenere `requireAvailableModel` e `enforceUsageGuards` per ciascun tentativo usando il modello runtime del tentativo, non il payload model. | Yes | 2026-04-12 |
| TASK-008 | Introdurre loop deterministico massimo 3 tentativi nella route extraction; interrompere al primo tentativo valido. | Yes | 2026-04-12 |
| TASK-009 | Aggiungere validazione output extraction post-stream in route: parse JSON, shape `fields/missingFields/notes`, coerenza con `fieldMap`; in caso fallimento trigger fallback successivo. | Yes | 2026-04-12 |
| TASK-010 | Introdurre errore finale unificato `EXTRACTION_FAILED` con messaggio utente stabile dopo esaurimento fallback. | Yes | 2026-04-12 |
| TASK-011 | Garantire che i log includano `requestId`, `attemptIndex`, `runtimeModel`, `fallbackReason`, `duration_ms`, `costEstimate` per ogni tentativo. | Yes | 2026-04-12 |

### Implementation Phase 3

- **GOAL-003**: Allineare contabilita costi/usage e comportamento di persistenza ai tentativi multipli.

| Task | Description | Completed | Date |
| -------- | --------------------- | --------- | ---------- |
| TASK-012 | Verificare in `src/lib/llm/streaming.ts` che `artifact.model`, `quotaHistory.model` e `costUSD` riflettano sempre il modello effettivo del tentativo. | Yes | 2026-04-12 |
| TASK-013 | Aggiungere metadati tentativo a `artifact.input` per audit (`extractionAttempt`, `policyVersion`, `fallbackFromModel`) senza cambiare schema Prisma. | Yes | 2026-04-12 |
| TASK-014 | Definire regola operativa: se costo cumulato tentativi supera `EXTRACTION_MAX_COST_USD`, bloccare ulteriori tentativi e chiudere con errore policy. | Yes | 2026-04-12 |
| TASK-015 | Verificare che `monthlyUsed` non venga incrementato in modo incoerente nei retry; definire comportamento esplicito (1 richiesta utente = 1 incremento) e adeguare implementazione/guard. | Yes | 2026-04-12 |
| TASK-016 | Aggiornare test di costo/usage se il conteggio cambia: `tests/unit/costs.test.ts`, `tests/unit/llm-streaming-events.test.ts` e test integrazione route extraction. | Yes | 2026-04-12 |

### Implementation Phase 4

- **GOAL-004**: Aggiornare contratti, documentazione e rollout operativo.

| Task | Description | Completed | Date |
| -------- | --------------------- | --------- | ---------- |
| TASK-017 | Aggiornare spec API extraction in `docs/specifications/api-specifications.md`: chiarire che `model` nel payload e ignored for runtime extraction policy. | Yes | 2026-04-12 |
| TASK-018 | Aggiornare `docs/implement-index.md` con stato attivita, link al piano e stato rollout. | Yes | 2026-04-12 |
| TASK-019 | Aggiornare/aggiungere test integrazione in `tests/integration/extraction-route.test.ts` per chain `claude-3.7-sonnet -> gpt-4.1 -> o3` e stop al primo successo. | Yes | 2026-04-12 |
| TASK-020 | Definire rollout in 2 fasi: 20% shadow traffic 48h, poi 100% se metriche sopra soglia (`json_valid_rate`, `schema_pass_rate`, `p95_latency`, `mean_cost`). | Yes | 2026-04-12 |
| TASK-021 | Preparare runbook fallback operativo con query log e criteri rollback in `docs/review/` se la policy degrada metriche oltre soglia. | Yes | 2026-04-12 |

### Implementation Phase 5

- **GOAL-005**: Garantire disponibilita automatica in DB dei model ID extraction al deploy.

| Task | Description | Completed | Date |
| -------- | --------------------- | --------- | ---------- |
| TASK-022 | Creare bootstrap idempotente registry modelli extraction (`anthropic/claude-3.7-sonnet`, `openai/gpt-4.1`, `openai/o3`) con pricing mock fallback se assenti. | Yes | 2026-04-12 |
| TASK-023 | Integrare il bootstrap nella pipeline deploy (`db:migrate:deploy` -> bootstrap modelli -> build) senza rompere preview/prod. | Yes | 2026-04-12 |
| TASK-024 | Preservare semantica non distruttiva: non alterare `isDefault` esistente se gia definito da amministrazione. | Yes | 2026-04-12 |
| TASK-025 | Aggiungere test di integrazione/script su idempotenza bootstrap e presenza model ID post-bootstrap. | Yes | 2026-04-12 |
| TASK-026 | Aggiornare documentazione operativa deploy con regole bootstrap modelli e pricing mock policy. | Yes | 2026-04-12 |

## 3. Execution Log

- 2026-04-12: Piano iniziale creato con policy statica extraction e fallback chain deterministica.
- 2026-04-12: Tracker operativo creato in `docs/implementation/feature-funnel-extraction-model-policy-tracker-1.md`.
- 2026-04-12: Indicizzazione iniziativa completata in `docs/implement-index.md` con stato `PIANIFICATO (2026-04-12)`.
- 2026-04-12: Stato del piano aggiornato a `In Progress` dopo completamento allineamento documentale iniziale.
- 2026-04-12: Aggiunto contributo operativo con acceptance criteria, Definition of Done e sequenza di delivery per ridurre ambiguita implementative.
- 2026-04-12: Fase 1 implementata a codice con modulo policy dedicato e test unit verdi (`8/8`).
- 2026-04-12: Fase 2 implementata in route extraction con fallback deterministico, validazione post-output, errore unificato `EXTRACTION_FAILED`, telemetria per tentativo e test integrazione verdi.
- 2026-04-12: Fase 3 completata con metadati tentativo persistiti, policy budget enforcement sui retry, e normalizzazione quota (`monthlyUsed`) a singolo incremento per richiesta utente.
- 2026-04-12: Fase 4 completata con aggiornamento contratto API extraction, implement-index riallineato, rollout plan in 2 fasi e runbook operativo pubblicato in `docs/review/`.
- 2026-04-12: Aggiunto nuovo ramo di lavoro prioritario (Fase 5) per bootstrap deploy dei model ID extraction nel registry DB con pricing mock fallback.
- 2026-04-12: Inserito contribution block dedicato alla Fase 5 con blueprint tecnico deploy, acceptance gates e DoD extension per chiudere TASK-022..TASK-026.
- 2026-04-12: Avvio operativo Fase 5 con bootstrap idempotente implementato (`scripts/bootstrap-extraction-models.mjs`), integrazione pipeline (`deploy:vercel`) e test unitari dedicati (`tests/unit/extraction-model-bootstrap.test.ts`).
- 2026-04-12: Root cause delivery identificato in extraction chain: mismatch `notes` (prompt richiedeva array, schema route accettava string). Fix applicato con schema tolerant (`string | string[]`) e prompt riallineato.
- 2026-04-12: Validazione runtime dev completata su upload funnel: extraction riuscita al primo modello della chain (`anthropic/claude-3.7-sonnet`) con risposta endpoint `200` e stream inizializzato.

## 4. Contribution Added In This Iteration

Contributo pratico inserito nel piano per accelerare l'esecuzione tecnica e migliorare la verificabilita dei risultati.

### 4.1 Acceptance Criteria (gates di accettazione)

- **AC-001**: In extraction route il modello runtime del primo tentativo e sempre `anthropic/claude-3.7-sonnet`, indipendentemente da `payload.model`.
- **AC-002**: La fallback chain effettiva e ordinata e limitata a 3 tentativi totali: `anthropic/claude-3.7-sonnet` -> `openai/gpt-4.1` -> `openai/o3`.
- **AC-003**: Ogni tentativo fallito per parse/schema/coerenza produce reason machine-readable nei log applicativi.
- **AC-004**: Il flusso termina al primo tentativo valido senza eseguire tentativi successivi.
- **AC-005**: Se tutti i tentativi falliscono, l'API restituisce errore coerente col contratto standardizzato.
- **AC-006**: Il costo cumulato tentativi non supera la soglia policy (`EXTRACTION_MAX_COST_USD`) salvo esplicito override futuro non incluso in questa fase.
- **AC-007**: `artifact.model` e quota history riflettono il modello realmente usato nel tentativo registrato.
- **AC-008**: I workflow Funnel creativi continuano a usare il modello utente senza regressioni.
- **AC-009**: In `docs/specifications/api-specifications.md` e documentato che `model` nel payload extraction non determina la scelta runtime.
- **AC-010**: Tutti i test previsti nella sezione Testing passano in locale e in CI.

### 4.2 Definition of Done (DoD)

- **DOD-001**: Modulo policy extraction creato con costanti, helper piano tentativi e decisione escalation.
- **DOD-002**: Route extraction aggiornata con loop deterministico e validazione post-output per fallback.
- **DOD-003**: Logging per tentativo presente con almeno `attemptIndex`, `runtimeModel`, `fallbackReason`, `duration_ms`.
- **DOD-004**: Test unit e integration aggiunti/aggiornati con copertura dei casi successo, fallback e failure finale.
- **DOD-005**: Tracker aggiornato con task completati, data e almeno un'evidenza per milestone chiusa.
- **DOD-006**: Index implementativo aggiornato con stato iniziativa allineato allo stato reale del lavoro.
- **DOD-007**: Nessun breaking change sul contratto errori API o sui controlli di auth/ownership/rate-limit.

### 4.3 Recommended Delivery Sequence

- **SEQ-001**: Implementare prima `src/lib/llm/extraction-model-policy.ts` con test unit dedicati.
- **SEQ-002**: Integrare la route extraction con fallback chain mantenendo invariati i guard order.
- **SEQ-003**: Completare validazione output e mapping reason di fallback.
- **SEQ-004**: Chiudere test integrazione route extraction con casi deterministici di retry.
- **SEQ-005**: Allineare cost accounting, update tracker e aggiornamento spec API.

### 4.4 Phase 5 Delivery Blueprint (deploy bootstrap)

Contributo operativo aggiuntivo per chiudere la Fase 5 in modo deploy-safe, idempotente e verificabile.

- **P5-001 (single source of truth)**: Riutilizzare la chain da `src/lib/llm/extraction-model-policy.ts` come fonte canonica dei model ID da bootstrap per evitare drift da duplicazioni hardcoded.
- **P5-002 (idempotent upsert)**: Implementare `scripts/bootstrap-extraction-models.mjs` con create/reactivate idempotente su `LlmModel` via chiave univoca `modelId`.
- **P5-003 (non destructive semantics)**: In update, abilitare disponibilita minima (`isActive`) e fallback pricing solo quando mancante; non modificare `isDefault` gia impostato da admin.
- **P5-004 (mock pricing policy)**: Se pricing reale non disponibile, applicare valori mock stabili e tracciabili per permettere guard model/cost senza blocchi runtime.
- **P5-005 (deploy order)**: Forzare ordine pipeline `db:migrate:deploy` -> `db:bootstrap:extraction-models` -> `build`.
- **P5-006 (fail fast)**: Se bootstrap fallisce, uscita non-zero e deploy bloccato; vietato fallback silenzioso.
- **P5-007 (preview parity)**: Eseguire bootstrap anche in preview se `DATABASE_URL` e disponibile, mantenendo comportamento idempotente.
- **P5-008 (drift check)**: Aggiungere validazione startup/deploy che confronta model ID policy vs registry DB con log machine-readable (`missing_model_ids`).

### 4.5 Phase 5 Acceptance Gates

- **AC-011**: Dopo bootstrap, `anthropic/claude-3.7-sonnet`, `openai/gpt-4.1`, `openai/o3` risultano presenti e attivi in `LlmModel`.
- **AC-012**: Due esecuzioni consecutive del bootstrap non creano duplicati e non alterano campi non governati dalla policy (incluso `isDefault`).
- **AC-013**: In assenza pricing reale, i campi prezzo risultano valorizzati con fallback mock coerente e validato da test.
- **AC-014**: La pipeline deploy fallisce esplicitamente se bootstrap non completa, prevenendo release con registry incompleto.
- **AC-015**: Il drift check segnala mismatch tra policy runtime e registry DB con dettagli utili alla diagnosi.

### 4.6 Phase 5 Definition of Done Extension

- **DOD-008**: Script bootstrap implementato, documentato e invocabile tramite script npm dedicato.
- **DOD-009**: Pipeline deploy aggiornata con step bootstrap post-migrazione e pre-build.
- **DOD-010**: Test coprono create, update non distruttivo, idempotenza e fallback pricing mock.
- **DOD-011**: Tracker aggiornato con evidenze TASK-022..TASK-026 e output validazione.
- **DOD-012**: Documentazione operativa deploy aggiornata con run order, failure policy e rollback note.

## 5. Alternatives

- **ALT-001**: Continuare a usare il modello da payload utente anche per extraction; scartata per variabilita elevata e risultato meno predicibile.
- **ALT-002**: Usare un solo modello senza fallback; scartata per resilienza insufficiente su input rumorosi o ambigui.
- **ALT-003**: Usare modello minore low-cost come primario; scartata per richiesta esplicita di evitare modelli minori e rischio affidabilita JSON.
- **ALT-004**: Eseguire doppia inferenza in parallelo e votazione; scartata per costo troppo alto e complessita operativa non necessaria in v1.
- **ALT-005**: Spostare validazione JSON solo lato client; scartata per sicurezza/affidabilita e assenza di enforcement server-side.

## 6. Dependencies

- **DEP-001**: Catalogo modelli attivi in DB (`llmModel`) deve includere e attivare `anthropic/claude-3.7-sonnet`, `openai/gpt-4.1`, `openai/o3`.
- **DEP-002**: Provider OpenRouter raggiungibile e autorizzato con chiave valida (`OPENROUTER_API_KEY`).
- **DEP-003**: Moduli esistenti `src/lib/tool-routes/guards.ts` e `src/lib/llm/streaming.ts` devono restare compatibili con retry controllato.
- **DEP-004**: Prompt extraction corrente in `src/lib/tool-prompts/prompts/tools/extraction/prompt_generation.md` deve mantenere vincolo JSON-only.
- **DEP-005**: Test harness Jest per route e unit disponibile (`tests/integration`, `tests/unit`).

## 7. Files

- **FILE-001**: `src/lib/llm/extraction-model-policy.ts` - nuovo modulo policy statica extraction (chain, budget, timeout, reason).
- **FILE-002**: `src/app/api/tools/extraction/generate/route.ts` - integrazione fallback chain e validazione post-stream.
- **FILE-003**: `src/lib/tool-routes/guards.ts` - eventuale adattamento counting/usage per retry deterministico.
- **FILE-004**: `src/lib/llm/streaming.ts` - verifica/adeguamento contabilita per modello tentativo effettivo.
- **FILE-005**: `tests/unit/extraction-model-policy.test.ts` - nuovi test unit policy.
- **FILE-006**: `tests/integration/extraction-route.test.ts` - test integrazione chain fallback + esiti.
- **FILE-007**: `docs/specifications/api-specifications.md` - aggiornamento contratto endpoint extraction.
- **FILE-008**: `docs/implement-index.md` - registrazione stato e link piano.
- **FILE-009**: `scripts/bootstrap-extraction-models.mjs` - bootstrap idempotente dei model ID extraction nel registry DB.
- **FILE-010**: `package.json` - integrazione script bootstrap nella catena deploy.

Stato file documentali:
- `docs/implementation/funnel-extraction-model-policy-plan.md`: creato e aggiornato (v1.5).
- `docs/implementation/feature-funnel-extraction-model-policy-tracker-1.md`: creato.
- `docs/implement-index.md`: aggiornato con nuova iniziativa attiva.

Evidenze implementazione fase 1:
- `src/lib/llm/extraction-model-policy.ts`: aggiunto modulo policy con chain, limiti, helper pianificazione tentativi ed escalation.
- `tests/unit/extraction-model-policy.test.ts`: aggiunti test dedicati (8 casi) su ordine chain, max attempts, budget cap e reason mapping.
- Comando validazione eseguito: `npx jest tests/unit/extraction-model-policy.test.ts` -> `PASS`.

Evidenze implementazione fase 2:
- `src/app/api/tools/extraction/generate/route.ts`: integrata execution chain per tentativi con modello runtime policy-driven (`anthropic/claude-3.7-sonnet` -> fallback), parse/schema/coherence gate e stop al primo successo.
- `src/lib/tool-routes/responses.ts`: introdotto codice errore standardizzato `EXTRACTION_FAILED` per exhausted chain.
- `tests/integration/extraction-route.test.ts`: aggiunti scenari su modello statico, fallback al secondo tentativo e failure finale a 3 tentativi.
- Comando validazione eseguito: `npx jest tests/integration/extraction-route.test.ts tests/unit/extraction-model-policy.test.ts` -> `PASS`.

Evidenze implementazione fase 3:
- `src/lib/tool-routes/guards.ts`: introdotta opzione `incrementMonthlyUsed` per separare check quota/budget dall'incremento contatore richieste nei retry.
- `src/app/api/tools/extraction/generate/route.ts`: metadati audit tentativo in `artifact.input` (`extractionAttempt`, `policyVersion`, `fallbackFromModel`, `payloadModel`) e enforcement `EXTRACTION_MAX_COST_USD` con stop escalation.
- `tests/integration/extraction-route.test.ts`: coperti i casi retry con incremento `monthlyUsed` singolo e stop chain su superamento budget cumulato.
- `tests/unit/llm-streaming-events.test.ts`: assert su persistenza modello runtime in `artifact.create` / `quotaHistory.create` e su metadata extraction attempt.
- Comando validazione eseguito: `npx jest tests/integration/extraction-route.test.ts tests/unit/llm-streaming-events.test.ts tests/unit/extraction-model-policy.test.ts` -> `PASS`.

Evidenze implementazione fase 4:
- `docs/specifications/api-specifications.md`: documentata policy runtime extraction (payload `model` ignorato per runtime, chain deterministica, budget stop, `EXTRACTION_FAILED`).
- `docs/implement-index.md`: stato track aggiornato a implementato con rollout operativo definito.
- `tests/integration/extraction-route.test.ts`: copertura chain `claude-3.7-sonnet -> gpt-4.1 -> o3`, stop al primo successo e terminal failure policy.
- `docs/review/extraction-model-policy-rollout-runbook-2026-04-12.md`: rollout 20%/100%, soglie metriche, query operative, trigger rollback e procedura post-incident.

Evidenze implementazione fase 5:
- `scripts/bootstrap-extraction-models.mjs`: bootstrap deploy idempotente con adapter Prisma 7, fail-fast e fallback `.env.local` per `DATABASE_URL`.
- `package.json`: pipeline aggiornata con `db:bootstrap:extraction-models` tra migrate e build.
- `docs/review/extraction-model-policy-rollout-runbook-2026-04-12.md`: procedura operativa deploy bootstrap documentata (task 026).
- Runtime dev proof: log applicativo con `attemptIndex=1`, `runtimeModel=anthropic/claude-3.7-sonnet`, `parseOk=true`, `schemaOk=true`, `consistencyOk=true`, `POST /api/tools/extraction/generate 200`.

## 8. Testing

- **TEST-001**: Validare che il runtime model del primo tentativo sia sempre `anthropic/claude-3.7-sonnet` indipendentemente da `payload.model`.
- **TEST-002**: Simulare parse JSON failure al tentativo 1 e verificare fallback su `openai/gpt-4.1`.
- **TEST-003**: Simulare schema/coerenza failure al tentativo 2 e verificare fallback su `openai/o3`.
- **TEST-004**: Verificare stop immediato al primo tentativo valido senza consumare tentativi successivi.
- **TEST-005**: Verificare errore finale `EXTRACTION_FAILED` dopo 3 fallimenti.
- **TEST-006**: Verificare rispetto budget massimo USD 0.08 e blocco escalation quando superato.
- **TEST-007**: Verificare che `artifact.model` e `quotaHistory.model` coincidano con modello del tentativo eseguito.
- **TEST-008**: Verificare contratto API invariato su auth, ownership, rate-limit, validation error mapping.
- **TEST-009**: Verificare che il flusso Funnel creativo continui a usare il modello utente in `src/app/api/tools/funnel-pages/generate/route.ts`.
- **TEST-010**: Verificare logging minimo per tentativo con campi obbligatori (`attemptIndex`, `runtimeModel`, `fallbackReason`).
- **TEST-011**: Verificare che bootstrap deploy crei i 3 model ID extraction se assenti.
- **TEST-012**: Verificare idempotenza bootstrap su run multipli (nessun duplicato, stato coerente).
- **TEST-013**: Verificare che `isDefault` esistente non venga sovrascritto dal bootstrap.

## 9. Risks & Assumptions

- **RISK-001**: Incremento latenza media nei casi con fallback multipli.
- **RISK-002**: Incremento costo su richieste degradate che arrivano fino a `openai/o3`.
- **RISK-003**: Possibile regressione conteggio quota se i retry non sono normalizzati a una singola richiesta utente.
- **RISK-004**: Modelli policy non presenti/attivi nel catalogo runtime possono causare `Unsupported model`.
- **RISK-005**: Bootstrap deploy non idempotente puo introdurre drift nel registry modelli.
- **ASSUMPTION-001**: OpenRouter supporta stabilmente i model ID scelti in ambiente di produzione.
- **ASSUMPTION-002**: I prompt di extraction restano orientati a JSON deterministico e non includono output narrativo.
- **ASSUMPTION-003**: Le soglie iniziali (`45s`, `USD 0.08`, `3 attempts`) sono adeguate al carico corrente e verranno eventualmente tarate.
- **ASSUMPTION-004**: L'ambiente deploy dispone di `DATABASE_URL` e privilegi DB necessari per upsert su `LlmModel`.

## 10. Related Specifications / Further Reading

- [docs/adrs/001-modular-llm-controller-architecture.md](../adrs/001-modular-llm-controller-architecture.md)
- [docs/adrs/002-streaming-vs-batch-responses.md](../adrs/002-streaming-vs-batch-responses.md)
- [docs/adrs/003-rate-limiting-quota-strategy.md](../adrs/003-rate-limiting-quota-strategy.md)
- [docs/specifications/api-specifications.md](../specifications/api-specifications.md)
- [docs/implement-index.md](../implement-index.md)
- [docs/implementation/feature-funnel-extraction-model-policy-tracker-1.md](./feature-funnel-extraction-model-policy-tracker-1.md)
