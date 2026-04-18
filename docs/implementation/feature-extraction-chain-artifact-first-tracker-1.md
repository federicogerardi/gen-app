---
goal: Operational tracker for extraction chain artifact-first resilience rollout
version: 1.9
date_created: 2026-04-14
last_updated: 2026-04-15
owner: Platform Engineering
status: In Progress
tags: [process, tracker, extraction, artifact-first, resilience]
---

# Introduction

![Status: In Progress](https://img.shields.io/badge/status-In%20Progress-yellow)

Questo tracker e il companion operativo di `docs/implementation/extraction-chain-artifact-first-prompt-plan.md`.
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
- 2026-04-14: avvio implementazione Sprint 3 su finalizzazione atomica extraction (artifact/cost/quota), persistenza reason terminale e coerenza complete-event post-commit.
- 2026-04-14: validazione locale Sprint 3 PASS su `tests/unit/streaming.test.ts`, `tests/integration/extraction-route.test.ts` e `tests/unit/extraction-model-policy.test.ts`.
- 2026-04-14: `TASK-0301`, `TASK-0302`, `TASK-0303` aggiornati a Completed; ingresso operativo su Fase 4 pronto.
- 2026-04-14: avvio implementazione Sprint 4 su diagnostica minima obbligatoria nei log extraction e best-effort observability per evitare blocchi del path utente.
- 2026-04-14: validazione locale Sprint 4 PASS su `tests/integration/extraction-route.test.ts`, `tests/unit/streaming.test.ts` e `tests/unit/extraction-model-policy.test.ts`.
- 2026-04-14: `TASK-0401` e `TASK-0403` aggiornati a Completed; backlog aperto su `TASK-0402` (metriche aggregate).
- 2026-04-14: avvio operativo `TASK-0402` con definizione query baseline e piano raccolta metriche su timeout distribution, partial rate e fallback depth.
- 2026-04-14: `TASK-0402` aggiornato a Completed con query/runbook operative allineate e evidenze registrate.
- 2026-04-14: avvio Sprint 5 su funnel upload-first con implementazione retry client backoff+jitter e resume da checkpoint artifact lato UI.
- 2026-04-14: validazione regressione funnel PASS su `tests/integration/funnel-pages-route.test.ts`, `tests/unit/funnel-mapping.test.ts`, `tests/unit/funnel-extraction-field-map.test.ts`.
- 2026-04-14: avanzamento Sprint 5 su UX recovery con lifecycle state esplicito extraction e CTA dedicate `riprendi`/`riprova`/`rigenera` nel tool funnel.
- 2026-04-14: aggiunto test E2E dedicato retry/resume funnel in `tests/e2e/funnel-pages-retry-resume.spec.ts` con copertura feedback retry ed effettivo resume da checkpoint artifact.
- 2026-04-14: validazione E2E retry/resume PASS e chiusura `TASK-0501`, `TASK-0502`, `TASK-0503`, `TASK-0504`.
- 2026-04-15: avvio Sprint 6 con gate rollout route-level artifact-first (feature flag, percent gating, rollback switch) su route extraction.
- 2026-04-15: validazione locale Sprint 6 PASS su `tests/integration/extraction-route.test.ts` (scenari `flag_disabled`, `outside_rollout`, `rollback_active`).
- 2026-04-15: `TASK-0601`, `TASK-0602`, `TASK-0603` aggiornati a Completed con allineamento runbook rollout/rollback.
- 2026-04-15: applicata salvaguardia completeness-first sul path extraction text-mode: rimossi cap stretti per-attempt (18s/22s), estesi timeout policy e disattivati guard stream aggressivi in text-mode.
- 2026-04-15: allineata finalizzazione artifact su successo route-level (`status: completed`, `completedAt`) e rimosso override `status: generating` nel recovery update stream timeout.
- 2026-04-15: validazione post-hardening PASS su `tests/unit/extraction-model-policy.test.ts`, `tests/integration/extraction-route.test.ts` e `npm run build`.
- 2026-04-15: conferma manuale frontend su flusso funnel upload-first: generazione completa verificata, output non troncato e patch completeness-first confermata efficace.

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
| TASK-0301 | Completed | 2026-04-14 |
| TASK-0302 | Completed | 2026-04-14 |
| TASK-0303 | Completed | 2026-04-14 |

### Phase 4

| Task | Current Status | Date |
| --- | --- | --- |
| TASK-0401 | Completed | 2026-04-14 |
| TASK-0402 | Completed | 2026-04-14 |
| TASK-0403 | Completed | 2026-04-14 |

### Phase 5

| Task | Current Status | Date |
| --- | --- | --- |
| TASK-0501 | Completed | 2026-04-14 |
| TASK-0502 | Completed | 2026-04-14 |
| TASK-0503 | Completed | 2026-04-14 |
| TASK-0504 | Completed | 2026-04-14 |

### Phase 6

| Task | Current Status | Date |
| --- | --- | --- |
| TASK-0601 | Completed | 2026-04-15 |
| TASK-0602 | Completed | 2026-04-15 |
| TASK-0603 | Completed | 2026-04-15 |
| TASK-0604 | Completed | 2026-04-14 |

## 5. Evidence Register

- **EVID-001**: piano artifact-first creato in `docs/implementation/extraction-chain-artifact-first-prompt-plan.md`.
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
- **EVID-018**: finalizzazione atomica completion/failure con transazione (`artifact`, `monthlySpent`, `quotaHistory`) introdotta in `src/lib/llm/streaming.ts`.
- **EVID-019**: persistenza terminal state (`completionReason`, `fallbackReason`) su artifact input implementata in `src/app/api/tools/extraction/generate/route.ts` e `src/lib/llm/streaming.ts`.
- **EVID-020**: validazione AC-030x su consistenza DB e terminal reason in `tests/integration/extraction-route.test.ts`.
- **EVID-021**: logging extraction reso best-effort con fallback suppression per failure osservabilita in `src/app/api/tools/extraction/generate/route.ts`.
- **EVID-022**: campi minimi diagnostici (`requestId`, `attemptIndex`, `runtimeModel`, `timeoutKind`, `completionReason`, `fallbackReason`) uniformati sui log attempt/terminal in `src/app/api/tools/extraction/generate/route.ts`.
- **EVID-023**: copertura test Sprint 4 aggiunta con scenario logger throw non-bloccante in `tests/integration/extraction-route.test.ts`.
- **EVID-024**: query operative baseline per `TASK-0402` definite nel runbook (`timeout_distribution`, `partial_rate`, `fallback_depth`) in `docs/review/extraction-model-policy-rollout-runbook-2026-04-12.md`.
- **EVID-025**: chiusura operativa `TASK-0402` con sezione runbook dedicata (`Baseline Queries Completed`) e allineamento tracker/index.
- **EVID-026**: retry client con backoff+jitter e gestione errori retryable introdotti in `src/app/tools/funnel-pages/hooks/useFunnelGeneration.ts` (con utility condivise in `src/tools/shared/lib/retryLogic.ts`).
- **EVID-027**: resume da checkpoint artifact (extraction + step funnel) introdotto in `src/app/tools/funnel-pages/hooks/useFunnelRecovery.ts` e wiring UI in `src/app/tools/funnel-pages/FunnelPagesToolContent.tsx`.
- **EVID-028**: regressione funnel validata su test integration/unit (`tests/integration/funnel-pages-route.test.ts`, `tests/unit/funnel-mapping.test.ts`, `tests/unit/funnel-extraction-field-map.test.ts`).
- **EVID-029**: stati UX lifecycle extraction (`in_progress`, `completed_partial`, `completed_full`, `failed_hard`) esposti nel funnel tool in `src/app/tools/funnel-pages/FunnelPagesToolContent.tsx` e hook dedicati.
- **EVID-030**: CTA recovery esplicite `Riprendi da checkpoint`, `Riprova estrazione`, `Rigenera funnel` integrate in `src/app/tools/funnel-pages/components/FunnelStepCards.tsx` con orchestration in `src/app/tools/funnel-pages/FunnelPagesToolContent.tsx`.
- **EVID-031**: copertura E2E dedicata retry/resume con feedback backoff e resume da checkpoint validata in `tests/e2e/funnel-pages-retry-resume.spec.ts`.
- **EVID-032**: decision engine rollout artifact-first (feature flag + cohort percentage + rollback switch) introdotto in `src/lib/tool-routes/extraction-rollout.ts`.
- **EVID-033**: gate route-level rollout integrato in `src/app/api/tools/extraction/generate/route.ts` con mapping `SERVICE_UNAVAILABLE` e dettagli diagnostici rollout.
- **EVID-034**: copertura integration Phase 6 (`flag_disabled`, `outside_rollout`, `rollback_active`) aggiunta in `tests/integration/extraction-route.test.ts`.
- **EVID-035**: runbook Phase 6 aggiornato con progressione 10% -> 30% -> 100% e rollback drill in `docs/review/extraction-model-policy-rollout-runbook-2026-04-12.md`.
- **EVID-036**: policy timeout extraction riallineata in modalita completeness-first con soglie estese e profilo text-mode dedicato in `src/lib/llm/extraction-model-policy.ts`.
- **EVID-037**: route extraction text-mode senza cap stringenti per-attempt e senza guard stream aggressivi (`enableStreamGuards: false`) in `src/app/api/tools/extraction/generate/route.ts`.
- **EVID-038**: coerenza stato artifact post-success hardening (chiusura esplicita a `completed` + `completedAt`, rimozione ripristino forzato `generating`) in `src/app/api/tools/extraction/generate/route.ts` e `src/lib/llm/streaming.ts`.
- **EVID-039**: test e build di regressione aggiornati e validati in `tests/unit/extraction-model-policy.test.ts`, `tests/integration/extraction-route.test.ts`, `tests/unit/streaming.test.ts`.
- **EVID-040**: verifica funzionale frontend completata su generazione funnel con output completo e senza missing content dopo patch completeness-first (evidenza operativa sessione 2026-04-15).

## 6A. Pre-Production Validation Gate

| Gate | Esito | Note |
| --- | --- | --- |
| Contratti resilience Fase 0 definiti e approvati | GO | `TASK-0001..TASK-0003` completati con evidenze codice + documentazione + test. |
| Coerenza stato tracker/index | GO | allineamento completato con `TASK-0604` Completed e evidenza registrata. |
| Abort propagation end-to-end | GO | copertura gia presente e riallineata a `TASK-0204` Completed. |
| Piano test minimo pre-rollout | GO | validazione Sprint 0-4 eseguita (`tests/unit/extraction-model-policy.test.ts`, `tests/unit/streaming.test.ts`, `tests/integration/extraction-route.test.ts`). |
| KPI runtime artifact-first misurati su finestra minima | NO-GO | metriche target definite nel piano ma non ancora raccolte su finestra valida. |

Decisione corrente: NO-GO per produzione per KPI runtime non ancora consolidati; GO operativo per ingresso Sprint successivo.

## 6. Exit Criteria

- **EXIT-001**: Tutti i task `TASK-0001..TASK-0604` marcati Completed con evidenza file-level e data.
- **EXIT-002**: Test unit/integration/E2E target del track eseguiti con esito PASS.
- **EXIT-003**: Nessuna regressione su guard route o contratto errori API.
- **EXIT-004**: KPI artifact-first in soglia su due finestre consecutive di monitoraggio.

## 7. Immediate Next Actions (operativo)

1. Sprint 0-4 chiusi: mantenere invarianti outcome/reason, idempotenza route-level, timeout semantics, finalizzazione atomica e logging best-effort.
2. Sprint 5 chiuso: mantenere stabile UX recovery funnel (`retry`/`resume`) e copertura E2E dedicata.
3. Sprint 6 codice completato: raccogliere due finestre KPI consecutive per conferma gate `EXIT-004`.
4. Promuovere rollout operativo progressivo 10% -> 30% -> 100% seguendo runbook Phase 6.

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
| TASK-0301 | Platform Engineering | Completed | 2026-04-14 | chiusura atomica artifact/costi/quota |
| TASK-0302 | Platform Engineering | Completed | 2026-04-14 | reason persistita su ogni terminal state |
| TASK-0303 | Platform Engineering | Completed | 2026-04-14 | evento complete solo post-commit |
| TASK-0401 | Platform Engineering | Completed | 2026-04-14 | campi diagnostici minimi >=99% |
| TASK-0403 | Platform Engineering | Completed | 2026-04-14 | logging best-effort non bloccante |

### Sprint 3 - Retry/Resume UX and Controlled Rollout

| Task | Owner | Status | Target | Exit gate |
| --- | --- | --- | --- | --- |
| TASK-0501 | Platform + Frontend | Completed | 2026-04-14 | retry backoff+jitter senza loop infinito |
| TASK-0502 | Platform + Frontend | Completed | 2026-04-14 | resume da checkpoint artifact |
| TASK-0503 | Frontend | Completed | 2026-04-14 | stati UX lifecycle artifact-first esposti |
| TASK-0504 | Frontend | Completed | 2026-04-14 | CTA riprendi/riprova/rigenera attive |
| TASK-0402 | Platform Engineering | Completed | 2026-04-14 | metriche timeout/partial/fallback depth operative |
| TASK-0601 | Platform Engineering | Completed | 2026-04-15 | feature flag route extraction attiva |
| TASK-0602 | Platform Engineering | Completed | 2026-04-15 | rollout 10%->30%->100% con gate KPI |
| TASK-0603 | Platform Engineering | Completed | 2026-04-15 | rollback trigger e drill documentati |
| TASK-0604 | Platform Engineering | Completed | 2026-04-14 | index/tracker gia allineati |

## 9. Related Documents

- docs/implementation/extraction-chain-artifact-first-prompt-plan.md
- docs/implementation/extraction-chain-artifact-first-sprint-operations-plan-2026-04-14.md
- docs/archive/feature-extraction-chain-hardening-plan-1.md
- docs/implement-index.md
- docs/review/extraction-model-policy-rollout-runbook-2026-04-12.md