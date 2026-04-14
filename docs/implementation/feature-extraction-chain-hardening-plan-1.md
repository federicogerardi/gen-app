---
goal: Hardening della chain di estrazione per latenza, affidabilita e first-pass success
version: 1.0
date_created: 2026-04-14
last_updated: 2026-04-14
owner: Platform Engineering
status: In Progress
tags: [feature, hardening, extraction, reliability, latency]
---

# Introduction

![Status: In Progress](https://img.shields.io/badge/status-In%20Progress-yellow)

Piano operativo per hardening della chain di estrazione `POST /api/tools/extraction/generate` con focus su latenza, affidabilita e riduzione dei fallback non necessari. Il piano esclude ottimizzazioni di costo e definisce task eseguibili con criteri di verifica misurabili.

## 1. Requirements & Constraints

- **REQ-001**: Mantenere il contratto API errori `{ error: { code, message } }` senza breaking changes.
- **REQ-002**: Preservare il pattern di orchestrazione attuale della chain a tentativi (`primary + fallback`) con policy esplicita.
- **REQ-003**: Ridurre la latenza p95 della route di extraction sotto 45s senza degradare il tasso di successo complessivo.
- **REQ-004**: Aumentare il first-attempt success rate oltre 80% su workload reale equivalente ai documenti upload funnel.
- **REQ-005**: Introdurre telemetria diagnostica per il gate di consistency con motivazioni deterministiche.
- **SEC-001**: Non loggare testo utente raw completo; consentiti solo metadati aggregati, conteggi e sample di chiavi.
- **SEC-002**: Non indebolire auth/ownership/rate-limit gia presenti nella route.
- **CON-001**: Escludere dall'intervento qualsiasi logica di ottimizzazione economica o budget policy.
- **CON-002**: Non modificare il payload client richiesto per avviare extraction.
- **GUD-001**: Applicare hardening in step incrementali con rollout canary e rollback semplice.
- **GUD-002**: Ogni nuova regola di acceptance deve avere test unit/integration dedicati.
- **PAT-001**: Validazione a livelli (parse -> schema -> consistency) con motivazioni tracciabili per ogni esito.
- **PAT-002**: Fallback condizionato da segnali di qualita, non solo da esito booleano finale.

## 2. Implementation Steps

### Implementation Phase 1

- **GOAL-001**: Rendere osservabile la causa reale di fallback e lentezza per ogni tentativo.

| Task     | Description | Completed | Date |
| -------- | ----------- | --------- | ---- |
| TASK-001 | Estendere telemetria in `src/app/api/tools/extraction/generate/route.ts` aggiungendo campi strutturati: `expectedFieldCount`, `knownExtractedCount`, `knownMissingCount`, `overlapCount`, `unknownExtractedSample` (max 10), `unknownMissingSample` (max 10), `consistencyDecision`, `consistencyDecisionReason`. | Yes | 2026-04-14 |
| TASK-002 | Introdurre helper puro `summarizeConsistencyDiagnostics(...)` in `src/app/api/tools/extraction/generate/route.ts` con output tipizzato e deterministico da usare sia in log sia nei test. | Yes | 2026-04-14 |
| TASK-003 | Aggiungere test unit su diagnostica consistency in `tests/unit/extraction-consistency-diagnostics.test.ts` coprendo: match pieno, overlap, unknown keys, soft-accept, no-signal. | Yes | 2026-04-14 |
| TASK-004 | Aggiungere assert su nuovi campi log in `tests/integration/extraction-route.test.ts` usando mock logger, senza dipendere dal testo completo dei messaggi. | Yes | 2026-04-14 |

### Implementation Phase 2

- **GOAL-002**: Ridurre latenza dovuta a timeout/fallback con policy runtime per-attempt piu efficiente.

| Task     | Description | Completed | Date |
| -------- | ----------- | --------- | ---- |
| TASK-005 | Estendere `src/lib/llm/extraction-model-policy.ts` per supportare timeout per-attempt (`attemptTimeoutMs[]`) mantenendo backward compatibility con valore unico corrente. | Yes | 2026-04-14 |
| TASK-006 | Impostare piano timeout default: attempt 1 = 35s, attempt 2 = 25s, attempt 3 = 30s e aggiungere test in `tests/unit/extraction-model-policy.test.ts` per verificare applicazione corretta. | Yes | 2026-04-14 |
| TASK-007 | Implementare early-abort nel consumer SSE in `src/app/api/tools/extraction/generate/route.ts` quando non arrivano token entro soglia `firstTokenTimeoutMs` (default 12s) o in caso di token-idle post-primo token oltre soglia (`tokenIdleTimeoutMs`, default 10s), classificando `fallbackReason` come `timeout`. | Yes | 2026-04-14 |
| TASK-008 | Aggiungere test integration per scenario stallo stream con assenza token e verifica passaggio rapido al fallback successivo in `tests/integration/extraction-route.test.ts`. | Yes | 2026-04-14 |
| TASK-008A | Propagare cancellazione timeout route-level via `AbortSignal` fino a orchestrator/provider (`src/lib/llm/streaming.ts`, `src/lib/llm/orchestrator.ts`, `src/lib/llm/providers/*`) per rendere effettivo l'interrupt upstream. | Yes | 2026-04-14 |

### Implementation Phase 3

- **GOAL-003**: Migliorare acceptance applicativa riducendo falsi negativi di consistency.

| Task     | Description | Completed | Date |
| -------- | ----------- | --------- | ---- |
| TASK-009 | Introdurre decision engine tipizzato `evaluateExtractionAcceptance(...)` in `src/app/api/tools/extraction/generate/route.ts` con esiti: `hard_accept`, `soft_accept`, `reject`. | Yes | 2026-04-14 |
| TASK-010 | Definire soglia `criticalFieldCoverage` (default 0.6) su insieme campi critici derivato da `fieldMap` (campi required) e usare la soglia per consentire `soft_accept` quando parse/schema sono validi. | Yes | 2026-04-14 |
| TASK-011 | Mantenere reject obbligatorio in caso di overlap reale tra `knownExtracted` e `knownMissing`; aggiungere test regression dedicato in `tests/integration/extraction-route.test.ts`. | Yes | 2026-04-14 |
| TASK-012 | Esporre nei log il motivo di acceptance (`acceptanceReason`) e la metrica di copertura (`criticalCoverage`) per ogni tentativo. | Yes | 2026-04-14 |

### Implementation Phase 4

- **GOAL-004**: Ridurre mismatch prompt-output sulle chiavi attese e consolidare la stabilita in dev.

| Task     | Description | Completed | Date |
| -------- | ----------- | --------- | ---- |
| TASK-013 | Aggiornare `src/lib/tool-prompts/prompts/tools/extraction/prompt_generation.md` con blocco esplicito "Critical fields first" ordinando estrazione prioritaria dei required fields della field map. | Yes | 2026-04-14 |
| TASK-014 | Aggiungere test contract prompt in `tests/unit/tool-prompts.test.ts` per verificare presenza regole: chiavi flat, compilazione completa, critical fields first, JSON valido anche parziale. | Yes | 2026-04-14 |
| TASK-015 | Aggiornare documentazione operativa in `docs/specifications/api-specifications.md` con semantica acceptance (`hard_accept`, `soft_accept`, `reject`) e nuove metriche di diagnostica. | Yes | 2026-04-14 |
| TASK-016 | Eseguire rollout controllato su dev con checklist runbook in `docs/review/extraction-model-policy-rollout-runbook-2026-04-12.md` aggiungendo sezione hardening acceptance-timeout e criteri go/no-go. | In Progress | 2026-04-14 |

## 3. Contribution Added In This Iteration

Contributo operativo aggiunto per rendere il piano immediatamente eseguibile e verificabile per sprint.

### 3.1 Acceptance Criteria (hardening)

- **AC-001**: Ogni tentativo extraction deve emettere diagnostica consistency strutturata con almeno: `expectedFieldCount`, `knownExtractedCount`, `knownMissingCount`, `overlapCount`, `consistencyDecision`.
- **AC-002**: La route deve distinguere in modo esplicito gli esiti `hard_accept`, `soft_accept`, `reject` senza ambiguita semantiche nei log.
- **AC-003**: Con output parse/schema validi e copertura critica >= soglia configurata, il tentativo puo chiudersi in `soft_accept` senza escalation automatica.
- **AC-004**: In presenza di overlap reale tra `knownExtracted` e `knownMissing`, l'esito deve restare obbligatoriamente `reject`.
- **AC-005**: L'early-abort first-token deve interrompere il tentativo entro la soglia configurata e procedere al fallback successivo.
- **AC-005A**: L'early-abort token-idle deve interrompere il tentativo quando il flusso si blocca dopo il primo token e procedere al fallback successivo.
- **AC-005B**: La cancellazione timeout deve interrompere realmente la richiesta provider upstream (abort propagation end-to-end).
- **AC-006**: I timeout per-attempt devono essere configurabili da policy e verificati da test unitari.
- **AC-007**: La semantica acceptance e i nuovi campi diagnostici devono essere documentati in API spec e runbook.

### 3.2 Definition of Done (DoD)

- **DOD-001**: Completamento task `TASK-001..TASK-016` con stato `Completed` e data valorizzata nel tracker.
- **DOD-002**: Test unit/integration introdotti o aggiornati per tutte le nuove decisioni di acceptance/timeout/fallback.
- **DOD-003**: Nessuna regressione sul contratto API errori e nessuna regressione sui guard auth/ownership/usage.
- **DOD-004**: Conferma `PASS` locale su test target hardening e build/typecheck/lint del perimetro toccato.
- **DOD-005**: Documentazione allineata su piano, tracker, API spec e runbook senza divergenze di semantica.

### 3.3 KPI and Quality Gates

- **KPI-001**: First-attempt success rate >= 80% su campione dev equivalente.
- **KPI-002**: p95 latenza extraction < 45s su campione dev equivalente.
- **KPI-003**: Timeout rate sul secondo tentativo < 10%.
- **KPI-004**: Fallback al terzo tentativo < 15%.
- **KPI-005**: Nessun aumento del tasso `EXTRACTION_FAILED` rispetto alla baseline pre-hardening.

### 3.4 Recommended Delivery Sequence

- **SEQ-001**: Implementare prima diagnostica consistency (Phase 1) per ottenere baseline osservabile.
- **SEQ-002**: Applicare timeout per-attempt e early-abort (Phase 2) con test dedicati.
- **SEQ-003**: Introdurre acceptance engine e soglia coverage (Phase 3), preservando reject hard su overlap.
- **SEQ-004**: Chiudere con hardening prompt contract + aggiornamento spec/runbook (Phase 4).
- **SEQ-005**: Eseguire validazione su dev in modalita canary e promuovere solo al superamento KPI.

## 4. Alternatives

- **ALT-001**: Rimuovere completamente il gate di consistency. Non scelto perche aumenta il rischio di output semanticamente incoerenti verso i generatori downstream.
- **ALT-002**: Usare solo un modello singolo senza fallback. Non scelto perche riduce robustezza su documenti rumorosi o incompleti.
- **ALT-003**: Spostare tutta la normalizzazione nel prompt senza regole app. Non scelto perche riduce controllabilita e auditabilita lato server.
- **ALT-004**: Validazione hard-only senza soft acceptance. Non scelto perche genera falsi negativi gia osservati in produzione.

## 5. Dependencies

- **DEP-001**: `src/lib/llm/extraction-model-policy.ts` per configurazione chain, timeout e decisioni escalation.
- **DEP-002**: `src/app/api/tools/extraction/generate/route.ts` per parse/schema/consistency/acceptance runtime.
- **DEP-003**: `src/lib/tool-prompts/prompts/tools/extraction/prompt_generation.md` per contratto output modello.
- **DEP-004**: Suite test Jest integration/unit esistenti in `tests/integration` e `tests/unit`.
- **DEP-005**: Logger applicativo `getRequestLogger` con supporto campi JSON aggiuntivi.

## 6. Files

- **FILE-001**: `src/app/api/tools/extraction/generate/route.ts` - telemetria diagnostica, acceptance engine, timeout early-abort.
- **FILE-002**: `src/lib/llm/extraction-model-policy.ts` - timeout per-attempt e policy runtime aggiornata.
- **FILE-003**: `src/lib/tool-prompts/prompts/tools/extraction/prompt_generation.md` - regole prompt per campi critici.
- **FILE-004**: `tests/integration/extraction-route.test.ts` - regressioni fallback/acceptance/timeout.
- **FILE-005**: `tests/unit/extraction-model-policy.test.ts` - unit test policy timeout e escalation.
- **FILE-006**: `tests/unit/extraction-consistency-diagnostics.test.ts` - unit test diagnostica consistency.
- **FILE-007**: `tests/unit/tool-prompts.test.ts` - contract test prompt extraction.
- **FILE-008**: `docs/specifications/api-specifications.md` - specifica semantica acceptance e diagnostica.
- **FILE-009**: `docs/review/extraction-model-policy-rollout-runbook-2026-04-12.md` - aggiornamento runbook rollout.

## 7. Testing

- **TEST-001**: Unit test `evaluateExtractionAcceptance` con matrice completa esiti (`hard_accept`, `soft_accept`, `reject`).
- **TEST-002**: Unit test `getExtractionAttemptPlan` con timeout per-attempt e fallback compatibility.
- **TEST-003**: Integration test route con output schema valido ma coverage critico sufficiente -> soft accept senza fallback.
- **TEST-004**: Integration test route con overlap `knownExtracted`/`knownMissing` -> reject e fallback.
- **TEST-005**: Integration test timeout first-token -> fallback anticipato e successo su tentativo successivo.
- **TEST-006**: Integration test chain exhausted con reason finale coerente.
- **TEST-007**: Contract test prompt extraction su invarianti output richiesti.
- **TEST-008**: Smoke test manuale su dev deploy con 10 documenti campione e raccolta KPI di latenza/first-pass/fallback.

## 8. Risks & Assumptions

- **RISK-001**: Soft acceptance troppo permissiva puo trasferire incompletezza ai generatori downstream.
- **RISK-002**: Timeout ridotti eccessivamente possono aumentare fallback non necessari in condizioni di rete instabile.
- **RISK-003**: Telemetria troppo verbosa puo aumentare rumore log se non campionata.
- **ASSUMPTION-001**: I campi required nel `fieldMap` rappresentano in modo affidabile i campi critici del workflow.
- **ASSUMPTION-002**: I provider mantengono comportamento SSE coerente con gestione token progressiva.
- **ASSUMPTION-003**: La suite test puo simulare scenari di stallo stream con mock affidabili.

## 9. Related Specifications / Further Reading

- docs/specifications/api-specifications.md
- docs/implementation/funnel-extraction-model-policy-plan.md
- docs/review/extraction-model-policy-rollout-runbook-2026-04-12.md
- docs/adrs/002-streaming-vs-batch-responses.md
- docs/adrs/003-rate-limiting-quota-strategy.md