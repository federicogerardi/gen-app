---
goal: Operational tracker for extraction chain artifact-first resilience rollout
version: 1.4
date_created: 2026-04-14
last_updated: 2026-04-14
owner: Platform Engineering
status: In Progress
tags: [process, tracker, extraction, artifact-first, resilience]
---

# Introduction

![Status: In Progress](https://img.shields.io/badge/status-In%20Progress-yellow)

Questo tracker e il companion operativo di `docs/implementation/plan-extractionChainArtifactFirst.prompt.md`.
Registra baseline, avanzamento, evidenze e criteri di chiusura per il track di refactor artifact-first della chain extraction.

Come leggere questo tracker:
1. La sezione Baseline Snapshot rappresenta lo stato iniziale alla data di creazione del tracker.
2. La sezione Current Phase Status rappresenta lo stato operativo aggiornato.
3. In caso di differenze tra baseline e stato corrente, fa fede Current Phase Status.

## 1. Tracking Rules

- **TRK-001**: Un task passa a Completed solo con implementazione, test e aggiornamento documentale coerente.
- **TRK-002**: Preservare ordine guard route extraction: auth -> validation -> usage/rate limit -> ownership -> LLM call.
- **TRK-003**: Nessuna modifica breaking al contratto errori API `{ error: { code, message } }`.
- **TRK-004**: Ogni task Completed deve avere almeno una evidenza file-level nella sezione Evidence Register.
- **TRK-005**: Ogni run extraction deve avere stato persistito interrogabile e reason code terminale.

## 2. Baseline Snapshot (2026-04-14)

Status legend:
- Gap: non implementato o divergente dal piano.
- Partial: implementazione parziale con lacune su test o documentazione.
- Covered: implementato e validato.

Current status legend:
- Planned: task identificato ma non avviato.
- In Progress: task avviato con attivita in corso.
- Completed: task chiuso con evidenza file-level e validazione coerente.

### Phase 0 - Resilience contract (blocker)

Nota di priorita: questa fase e bloccante per tutte le fasi successive.

| Task | Baseline Status | Evidence Snapshot |
| --- | --- | --- |
| TASK-0001 | Gap | Matrice outcome unica (`completed_full`, `completed_partial`, `failed_hard`) non formalizzata in un catalogo condiviso. |
| TASK-0002 | Gap | Reason taxonomy condivisa route/policy/UI non ancora consolidata in un enum unico. |
| TASK-0003 | Gap | Mapping esplicito outcome -> HTTP -> artifact status -> reason non documentato in modo centralizzato. |

### Phase 1 - Artifact-first ingress and guard consolidation

| Task | Baseline Status | Evidence Snapshot |
| --- | --- | --- |
| TASK-0101 | Gap | Persistenza anticipata artifact stub non ancora applicata in ingresso route extraction. |
| TASK-0102 | Gap | Idempotency key non ancora introdotta su request extraction. |
| TASK-0103 | Gap | Sequenza guard consolidata non ancora verificata contro ridondanze per-attempt. |
| TASK-0104 | Partial | Incremento usage singolo e gia presente in parte, da validare con semantica artifact-first end-to-end. |

### Phase 2 - Timeout semantics and stream consumer hardening

| Task | Baseline Status | Evidence Snapshot |
| --- | --- | --- |
| TASK-0201 | Partial | Timeout kinds principali presenti, manca classificazione completa allineata al contratto artifact-first. |
| TASK-0202 | Partial | In text mode esiste acceptance utile su timeout, da estendere e rendere coerente cross-mode. |
| TASK-0203 | Gap | State machine stream non ancora formalmente vincolata a single-finalize in tutti i race path. |
| TASK-0204 | Covered | Abort propagation end-to-end gia introdotta su route/orchestrator/provider. |

### Phase 3 - Atomic completion and reason persistence

| Task | Baseline Status | Evidence Snapshot |
| --- | --- | --- |
| TASK-0301 | Gap | Atomicita completa artifact final + cost accounting + quota history non ancora formalizzata come transazione unica di chiusura. |
| TASK-0302 | Gap | Persistenza obbligatoria `completionReason` e `fallbackReason` non ancora applicata come invariant generale. |
| TASK-0303 | Gap | Vincolo esplicito complete client solo post-commit non ancora codificato come guardrail unico. |

### Phase 4 - Non-blocking observability

| Task | Baseline Status | Evidence Snapshot |
| --- | --- | --- |
| TASK-0401 | Partial | Campi diagnostici principali presenti, da estendere con completion reason e partial-useful marker uniformi. |
| TASK-0402 | Gap | Metriche aggregate su timeout distribution, partial rate e fallback depth non ancora complete in runbook operativo. |
| TASK-0403 | Gap | Best-effort observability non ancora esplicitata come regola tecnica e testata. |

### Phase 5 - Retry and resume UX

| Task | Baseline Status | Evidence Snapshot |
| --- | --- | --- |
| TASK-0501 | Gap | Retry client con backoff+jitter non ancora introdotto in modo esplicito nel funnel upload-first. |
| TASK-0502 | Gap | Resume da checkpoint artifact non ancora disponibile nel flusso UI funnel. |
| TASK-0503 | Gap | Stati UX distinti per lifecycle artifact-first non ancora esposti in modo completo. |
| TASK-0504 | Gap | CTA dedicate `riprendi`/`riprova`/`rigenera` non ancora integrate end-to-end. |

### Phase 6 - Controlled rollout

| Task | Baseline Status | Evidence Snapshot |
| --- | --- | --- |
| TASK-0601 | Gap | Feature flag artifact-first non ancora definita nel percorso extraction. |
| TASK-0602 | Gap | Piano percentuale 10% -> 30% -> 100% non ancora tracciato con gate KPI operativi. |
| TASK-0603 | Partial | Rollback criteria esistono nel runbook policy, da riallineare ai trigger artifact-first. |
| TASK-0604 | Gap | Implement index e reporting stato non ancora aggiornati per il nuovo track artifact-first. |

Nota baseline: il dato sopra riflette il momento iniziale del tracker; l'aggiornamento indice e ora registrato in Execution Log e Evidence Register.

## 3. Execution Log

- 2026-04-14: Tracker creato e baseline allineata al repository state corrente.
- 2026-04-14: Stato iniziale impostato in progress con focus su Fase 0 come blocker del rollout.
- 2026-04-14: Indicizzazione del nuovo track artifact-first aggiunta in `docs/implement-index.md`.
- 2026-04-14: Verifica cross-link index/tracker completata; `TASK-0604` aggiornato a Completed.
- 2026-04-14: `TASK-0204` riallineato a Completed in quanto coperto da evidenze gia presenti su abort propagation end-to-end.
- 2026-04-14: aggiunto piano operativo sprint in `docs/implementation/extraction-chain-artifact-first-sprint-operations-plan-2026-04-14.md`.
- 2026-04-14: planning operativo aggiornato: `TASK-0002` e `TASK-0003` promossi a In Progress per chiusura Sprint 0.
- 2026-04-14: avvio implementazione Sprint 0 su codice con taxonomy outcome/reason e mapping terminale centralizzato in route/policy.
- 2026-04-14: validazione locale Sprint 0 (parziale) PASS su `tests/unit/extraction-model-policy.test.ts` e `tests/integration/extraction-route.test.ts`.
- 2026-04-14: allineamento documentale Sprint 0 completato su API spec e runbook con contratto outcome/reason ufficiale.
- 2026-04-14: `TASK-0001`, `TASK-0002`, `TASK-0003` aggiornati a Completed; Sprint 0 chiuso.
- 2026-04-14: avvio implementazione Sprint 1 su route extraction con artifact stub persistito, idempotency key e riuso dello stesso artifact lungo la chain fallback.
- 2026-04-14: validazione locale Sprint 1 PASS su `tests/integration/extraction-route.test.ts` e `tests/unit/streaming.test.ts`.
- 2026-04-14: avvio implementazione Sprint 2 su route extraction e streaming con timeout classifier completo, acceptance di partial-useful timeout e guard single-finalize sui race path di cancellazione.
- 2026-04-14: validazione locale Sprint 2 PASS su `tests/unit/extraction-model-policy.test.ts`, `tests/unit/streaming.test.ts` e `tests/integration/extraction-route.test.ts`.
- 2026-04-14: `TASK-0201`, `TASK-0202`, `TASK-0203` aggiornati a Completed; ingresso operativo su Fase 3 pronto.

## 4. Current Phase Status

### Phase 0

| Task | Current Status | Date |
| --- | --- | --- |
| TASK-0001 | Completed | 2026-04-14 |
| TASK-0002 | Completed | 2026-04-14 |
| TASK-0003 | Completed | 2026-04-14 |

### Phase 1

| Task | Current Status | Date |
| --- | --- | --- |
| TASK-0101 | Completed | 2026-04-14 |
| TASK-0102 | Completed | 2026-04-14 |
| TASK-0103 | Completed | 2026-04-14 |
| TASK-0104 | Completed | 2026-04-14 |

### Phase 2

| Task | Current Status | Date |
| --- | --- | --- |
| TASK-0201 | Completed | 2026-04-14 |
| TASK-0202 | Completed | 2026-04-14 |
| TASK-0203 | Completed | 2026-04-14 |
| TASK-0204 | Completed | 2026-04-14 |

### Phase 3

| Task | Current Status | Date |
| --- | --- | --- |
| TASK-0301 | Planned | 2026-04-14 |
| TASK-0302 | Planned | 2026-04-14 |
| TASK-0303 | Planned | 2026-04-14 |

### Phase 4

| Task | Current Status | Date |
| --- | --- | --- |
| TASK-0401 | Planned | 2026-04-14 |
| TASK-0402 | Planned | 2026-04-14 |
| TASK-0403 | Planned | 2026-04-14 |

### Phase 5

| Task | Current Status | Date |
| --- | --- | --- |
| TASK-0501 | Planned | 2026-04-14 |
| TASK-0502 | Planned | 2026-04-14 |
| TASK-0503 | Planned | 2026-04-14 |
| TASK-0504 | Planned | 2026-04-14 |

### Phase 6

| Task | Current Status | Date |
| --- | --- | --- |
| TASK-0601 | Planned | 2026-04-14 |
| TASK-0602 | Planned | 2026-04-14 |
| TASK-0603 | Planned | 2026-04-14 |
| TASK-0604 | Completed | 2026-04-14 |

## 5. Evidence Register

- **EVID-001**: piano artifact-first creato in `docs/implementation/plan-extractionChainArtifactFirst.prompt.md`.
- **EVID-002**: baseline timeout/acceptance e chain semantics gia presenti in `src/app/api/tools/extraction/generate/route.ts`.
- **EVID-003**: policy timeout e escalation esistente in `src/lib/llm/extraction-model-policy.ts`.
- **EVID-004**: runbook rollback e KPI base presenti in `docs/review/extraction-model-policy-rollout-runbook-2026-04-12.md`.
- **EVID-005**: implement index aggiornato con nuovo track artifact-first in `docs/implement-index.md`.
- **EVID-006**: piano sprint operativo artifact-first creato in `docs/implementation/extraction-chain-artifact-first-sprint-operations-plan-2026-04-14.md`.
- **EVID-007**: outcome matrix e reason taxonomy condivise introdotte in `src/lib/llm/extraction-model-policy.ts`.
- **EVID-008**: mapping terminale outcome/reason collegato in `src/app/api/tools/extraction/generate/route.ts`.
- **EVID-009**: copertura test Sprint 0 aggiornata in `tests/unit/extraction-model-policy.test.ts` e validata con suite integration route.
- **EVID-010**: specifica API allineata al resilience contract Sprint 0 in `docs/specifications/api-specifications.md`.
- **EVID-011**: runbook rollout aggiornato con closure Sprint 0 in `docs/review/extraction-model-policy-rollout-runbook-2026-04-12.md`.
- **EVID-012**: artifact stub anticipato e riuso dello stesso artifact tra tentativi implementati in `src/app/api/tools/extraction/generate/route.ts` e `src/lib/llm/streaming.ts`.
- **EVID-013**: idempotency key route-level con replay artifact completato implementata in `src/app/api/tools/extraction/generate/route.ts`.
- **EVID-014**: copertura test Sprint 1 aggiornata in `tests/integration/extraction-route.test.ts`, `tests/unit/streaming.test.ts` e `tests/integration/db-mock.ts`.
- **EVID-015**: timeout classifier completo (`first_token`, `json_start`, `json_parse`, `token_idle`, `route_deadline`) e partial timeout acceptance cross-mode implementati in `src/app/api/tools/extraction/generate/route.ts` e `src/lib/llm/extraction-model-policy.ts`.
- **EVID-016**: single-finalize sui path di cancel/abort e helper di persistenza completion riusabile introdotti in `src/lib/llm/streaming.ts`.
- **EVID-017**: copertura test Sprint 2 aggiornata in `tests/integration/extraction-route.test.ts`, `tests/unit/streaming.test.ts` e `tests/unit/extraction-model-policy.test.ts`.

## 6A. Pre-Production Validation Gate

| Gate | Esito | Note |
| --- | --- | --- |
| Contratti resilience Fase 0 definiti e approvati | GO | `TASK-0001..TASK-0003` completati con evidenze codice + documentazione + test. |
| Coerenza stato tracker/index | GO | allineamento completato con `TASK-0604` Completed e evidenza registrata. |
| Abort propagation end-to-end | GO | copertura gia presente e riallineata a `TASK-0204` Completed. |
| Piano test minimo pre-rollout | GO | validazione Sprint 0-2 eseguita (`tests/unit/extraction-model-policy.test.ts`, `tests/unit/streaming.test.ts`, `tests/integration/extraction-route.test.ts`). |
| KPI runtime artifact-first misurati su finestra minima | NO-GO | metriche target definite nel piano ma non ancora raccolte su finestra valida. |

Decisione corrente: NO-GO per produzione per KPI runtime non ancora consolidati; GO operativo per ingresso Fase 3 / Sprint successivo.

## 6. Exit Criteria

- **EXIT-001**: Tutti i task `TASK-0001..TASK-0604` marcati Completed con evidenza file-level e data.
- **EXIT-002**: Test unit/integration/E2E target del track eseguiti con esito PASS.
- **EXIT-003**: Nessuna regressione su guard route o contratto errori API.
- **EXIT-004**: KPI artifact-first in soglia su due finestre consecutive di monitoraggio.

## 7. Immediate Next Actions (operativo)

1. Sprint 0-2 chiusi: mantenere invarianti outcome/reason, idempotenza route-level e timeout semantics come baseline bloccante.
2. Avviare `TASK-0301`, `TASK-0302`, `TASK-0303` per chiusura atomica artifact/costi/quota e reason persistence finale.
3. Agganciare `TASK-0401` e `TASK-0403` senza introdurre blocchi sul path critico di completamento.
4. Definire finestra KPI canary per Fase 3/Fase 4 con soglie e trigger rollback allineati al runbook.

## 8. Sprint Operations Board

### Sprint 0 - Contract Baseline (blocker)

| Task | Owner | Status | Target | Exit gate |
| --- | --- | --- | --- | --- |
| TASK-0001 | Platform Engineering | Completed | 2026-04-14 | outcome matrix canonica approvata |
| TASK-0002 | Platform Engineering | Completed | 2026-04-14 | reason taxonomy condivisa route/policy/UI |
| TASK-0003 | Platform Engineering | Completed | 2026-04-14 | mapping outcome->HTTP->artifact status->reason validato |

### Sprint 1 - Ingress Artifact-First

| Task | Owner | Status | Target | Exit gate |
| --- | --- | --- | --- | --- |
| TASK-0102 | Platform Engineering | Completed | 2026-04-14 | idempotency key senza duplicati su retry |
| TASK-0101 | Platform Engineering | Completed | 2026-04-14 | artifact stub persistito su request valida |
| TASK-0103 | Platform Engineering | Completed | 2026-04-14 | ordine guard deterministico senza duplicazioni |
| TASK-0104 | Platform Engineering | Completed | 2026-04-14 | usage increment singolo per request |

### Sprint 2 - Timeout and Atomic Completion

| Task | Owner | Status | Target | Exit gate |
| --- | --- | --- | --- | --- |
| TASK-0201 | Platform Engineering | Completed | 2026-04-14 | timeout classifier completo |
| TASK-0202 | Platform Engineering | Completed | 2026-04-14 | timeout utile chiuso in completed_partial |
| TASK-0203 | Platform Engineering | Completed | 2026-04-14 | single-finalize garantito |
| TASK-0301 | Platform Engineering | Planned | 2026-04-23 | chiusura atomica artifact/costi/quota |
| TASK-0302 | Platform Engineering | Planned | 2026-04-23 | reason persistita su ogni terminal state |
| TASK-0303 | Platform Engineering | Planned | 2026-04-23 | evento complete solo post-commit |
| TASK-0401 | Platform Engineering | Planned | 2026-04-23 | campi diagnostici minimi >=99% |
| TASK-0403 | Platform Engineering | Planned | 2026-04-23 | logging best-effort non bloccante |

### Sprint 3 - Retry/Resume UX and Controlled Rollout

| Task | Owner | Status | Target | Exit gate |
| --- | --- | --- | --- | --- |
| TASK-0501 | Platform + Frontend | Planned | 2026-04-25 | retry backoff+jitter senza loop infinito |
| TASK-0502 | Platform + Frontend | Planned | 2026-04-25 | resume da checkpoint artifact |
| TASK-0503 | Frontend | Planned | 2026-04-25 | stati UX lifecycle artifact-first esposti |
| TASK-0504 | Frontend | Planned | 2026-04-25 | CTA riprendi/riprova/rigenera attive |
| TASK-0402 | Platform Engineering | Planned | 2026-04-25 | metriche timeout/partial/fallback depth operative |
| TASK-0601 | Platform Engineering | Planned | 2026-04-26 | feature flag route extraction attiva |
| TASK-0602 | Platform Engineering | Planned | 2026-04-26 | rollout 10%->30%->100% con gate KPI |
| TASK-0603 | Platform Engineering | Planned | 2026-04-26 | rollback trigger e drill documentati |
| TASK-0604 | Platform Engineering | Completed | 2026-04-14 | index/tracker gia allineati |

## 9. Related Documents

- docs/implementation/plan-extractionChainArtifactFirst.prompt.md
- docs/implementation/extraction-chain-artifact-first-sprint-operations-plan-2026-04-14.md
- docs/implementation/feature-extraction-chain-hardening-plan-1.md
- docs/implement-index.md
- docs/review/extraction-model-policy-rollout-runbook-2026-04-12.md