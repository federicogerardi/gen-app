# Extraction Chain Artifact-First Sprint Operations Plan (2026-04-14)

## Scopo

Rendere eseguibile il track artifact-first con operazioni sprint time-boxed, mantenendo i vincoli del piano:

- nessuna regressione su guardrail auth, ownership, validation, usage/rate limit
- nessun breaking change al contratto errori API `{ error: { code, message } }`
- priorita a output utile persistito rispetto a stop hard non necessari

Questo documento e il layer operativo del piano sorgente `docs/implementation/extraction-chain-artifact-first-prompt-plan.md`.

## Operative Rules

- **OPS-001**: ordine guard route invariato: auth -> validation -> usage/rate limit -> ownership -> LLM.
- **OPS-002**: ogni sprint chiude solo task con evidenza file-level e test correlati in verde.
- **OPS-003**: nessun task puo promuovere rollout senza gate pre-produzione aggiornato nel tracker.
- **OPS-004**: ogni run terminale deve avere reason code persistito interrogabile.
- **OPS-005**: feature flag artifact-first obbligatoria prima di qualunque promozione sopra dev.

## Sprint Structure (4 sprint, 5 giorni)

### Sprint 0 - Contract Baseline (blocker)

Obiettivo: chiudere la Fase 0 con semantica unica outcome/reason e mapping centralizzato.

Task in scope:

- `TASK-0001` outcome matrix canonica (`completed_full`, `completed_partial`, `failed_hard`).
- `TASK-0002` reason taxonomy condivisa route/policy/UI.
- `TASK-0003` mapping outcome -> HTTP -> artifact status -> reason persistence.

Deliverable file-level:

- `src/lib/llm/extraction-model-policy.ts` (taxonomy e classifier outcome).
- `src/app/api/tools/extraction/generate/route.ts` (mapping finale response/status/reason).
- `docs/specifications/api-specifications.md` (semantica outcome/reason allineata).
- `docs/review/extraction-model-policy-rollout-runbook-2026-04-12.md` (query operative e diagnosi).

Test gate minimi:

- Unit classifier outcome/reason.
- Integration mapping HTTP vs artifact status.

Exit sprint:

- tutti `TASK-0001..TASK-0003` in Completed nel tracker.
- gate pre-produzione: "Contratti resilience Fase 0" passa da NO-GO a GO.

### Sprint 1 - Ingress Artifact-First

Obiettivo: eliminare perdita run iniziale e duplicazioni request.

Task in scope:

- `TASK-0102` idempotency key e deduplica request extraction.
- `TASK-0101` persistenza anticipata artifact stub.
- `TASK-0103` consolidamento sequenza guard senza ridondanze per-attempt.
- `TASK-0104` incremento usage singolo per request.

Deliverable file-level:

- `src/app/api/tools/extraction/generate/route.ts` (idempotenza + artifact stub + single usage accounting).
- `src/lib/tool-routes/guards.ts` (sequenza guard consolidata, se necessaria).
- `tests/integration/extraction-route.test.ts` (idempotenza + guard order).

Test gate minimi:

- integration retry con stessa key senza duplicati.
- integration su una sola registrazione usage per request con fallback multipli.

Exit sprint:

- nessuna richiesta valida resta senza stato persistito.
- `TASK-0101..TASK-0104` Completed.

### Sprint 2 - Timeout, Atomic Completion, Observability

Obiettivo: chiusura deterministica e non distruttiva in presenza di timeout/race.

Task in scope:

- `TASK-0201`, `TASK-0202`, `TASK-0203` (timeout kinds, partial useful, single-finalize).
- `TASK-0301`, `TASK-0302`, `TASK-0303` (transazione atomica + reason persistence + complete post-commit).
- `TASK-0401`, `TASK-0403` (campi diagnostici minimi + logging best-effort).

Deliverable file-level:

- `src/lib/llm/streaming.ts` (state machine single-finalize).
- `src/app/api/tools/extraction/generate/route.ts` (atomic completion contract).
- `src/lib/llm/orchestrator.ts`, `src/lib/llm/providers/openrouter.ts` (abort e timeout continuity).

Test gate minimi:

- integration race timeout concorrenti senza doppia chiusura.
- integration DB consistency tra HTTP response e stato artifact persistito.

Exit sprint:

- timeout con segnale utile produce `completed_partial`.
- reason terminale presente su tutti i run.

### Sprint 3 - Retry/Resume UX + Controlled Rollout

Obiettivo: trasformare transient failure in flusso recuperabile e promuovere in sicurezza.

Task in scope:

- `TASK-0501..TASK-0504` (retry/backoff+jitter, resume checkpoint, stati UX, CTA dedicate).
- `TASK-0601..TASK-0604` (feature flag, rollout 10-30-100, trigger rollback, reporting index/tracker).
- `TASK-0402` (metriche aggregate timeout/partial/fallback depth).

Deliverable file-level:

- `src/app/tools/funnel-pages/page.tsx` (stati UX recovery + CTA).
- `docs/review/extraction-model-policy-rollout-runbook-2026-04-12.md` (gate rollout e rollback drill).
- `docs/implement-index.md` + tracker operativo allineati a ogni promozione.

Test gate minimi:

- E2E upload-first su retry/resume.
- KPI in soglia su due finestre consecutive.

Exit sprint:

- passaggio graduale fino a 100% solo con KPI in soglia.
- rollback drill documentato con esito.

## Sequenziamento Settimanale (template)

1. Giorno 1: design contract + patch core + unit tests.
2. Giorno 2: integration tests + hardening race/edge path.
3. Giorno 3: observability fields + runbook updates.
4. Giorno 4: canary validation + KPI capture.
5. Giorno 5: regression full, tracker update, go/no-go decision.

## Definition of Ready (DoR)

- task con owner e file target espliciti.
- acceptance criteria con outcome verificabile.
- strategia test minima definita prima del coding.
- conferma esplicita: nessun breaking API contract.

## Definition of Done (DoD)

- implementazione completa sul perimetro task.
- test unit/integration/E2E in scope pass.
- evidenza file-level registrata nel tracker.
- aggiornamento runbook/spec/index coerente con stato reale repository.

## Sprint Cut Policy

1. Se Sprint 0 non chiude entro la finestra, bloccare Sprint 1.
2. Se Sprint 1 non dimostra idempotenza e single usage accounting, bloccare Sprint 2.
3. Se Sprint 2 non garantisce single-finalize + atomic completion, bloccare Sprint 3.
4. Se KPI rollout degradano oltre soglia, rollback immediato alla percentuale precedente.

## KPI Gates

- First-attempt useful artifact rate >= 80%.
- `p95_latency` extraction < 45s.
- campi reason mancanti nel persistito = 0.
- completezza log diagnostici >= 99% richieste monitorate.

## Related Documents

- docs/implementation/extraction-chain-artifact-first-prompt-plan.md
- docs/implementation/feature-extraction-chain-artifact-first-tracker-1.md
- docs/implementation/feature-extraction-chain-hardening-plan-1.md
- docs/review/extraction-model-policy-rollout-runbook-2026-04-12.md