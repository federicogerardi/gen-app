---
goal: Rollout and rollback runbook for extraction runtime model policy
version: 1.0
date_created: 2026-04-12
last_updated: 2026-04-14
owner: Platform AI / Tooling
status: Active
tags: [runbook, extraction, llm, rollout, rollback, observability]
---

# Extraction Model Policy Rollout Runbook

## Scope

Runbook operativo per rollout controllato della policy runtime extraction con fallback deterministico:
- `anthropic/claude-3.7-sonnet`
- `openai/gpt-4.1`
- `openai/o3`

Copre:
- rollout in due fasi
- monitoraggio metriche
- query di diagnostica
- criteri di rollback
- bootstrap deploy del model registry extraction

## Deploy Bootstrap Procedure (Phase 5)

Ordine operativo obbligatorio in deploy:
1. `npm run db:migrate:deploy`
2. `npm run db:bootstrap:extraction-models`
3. `npm run build`

Obiettivi bootstrap:
- garantire presenza/attivazione model ID runtime extraction (`anthropic/claude-3.7-sonnet`, `openai/gpt-4.1`, `openai/o3`)
- garantire idempotenza su run ripetuti
- non alterare `isDefault` gia impostato da amministrazione
- usare pricing mock solo in create (fallback operativo)

Failure policy:
- lo step `db:bootstrap:extraction-models` e fail-fast
- qualunque errore nello script blocca il deploy (exit code non-zero)
- nessun fallback silenzioso consentito

Log di successo attesi:
- evento `extraction_models_bootstrap_completed`
- campi: `requiredModelIds`, `created`, `reactivated`, `alreadyActive`, `preservedDefault`

Log di failure attesi:
- evento `extraction_models_bootstrap_failed`
- campo `message` con dettaglio errore

## Rollout Plan (2 fasi)

### Fase A — 20% shadow traffic (48h)

Obiettivo:
- validare stabilita JSON/schema e costo/latenza su traffico reale senza esposizione totale.

Gate di ingresso:
- test locali/CI verdi su extraction route + policy unit tests
- modello chain attivo nel registry DB (`llmModel`)
- alerting base su error rate e latency disponibile

Soglie target (finestra 48h):
- `json_valid_rate >= 98%`
- `schema_pass_rate >= 97%`
- `p95_latency <= 10s`
- `mean_cost <= 0.04 USD`
- `extraction_failed_rate <= 2%`

Esito fase A:
- se tutte le soglie sono rispettate per 48h continue, promuovere a fase B
- altrimenti applicare rollback e aprire analisi incident

### Fase B — 100% traffic

Obiettivo:
- attivazione completa della policy su tutte le richieste extraction

Soglie di stabilita post-promozione (prime 24h):
- nessun degrado >20% rispetto alla baseline fase A su `json_valid_rate` e `schema_pass_rate`
- nessun degrado >30% su `p95_latency`
- `mean_cost` entro +15% rispetto alla baseline fase A

## Hardening Acceptance-Timeout (2026-04-14)

Obiettivo:
- validare in dev che il nuovo decision engine (`hard_accept` / `soft_accept` / `reject`) e l'early-abort first-token riducano fallback superflui senza introdurre incoerenze semantiche.

Nota perimetro attuale Funnel:
- il flusso UI usa `responseMode: text` con payload V3 `extractionContext`.
- in text mode la chain e ridotta a 2 tentativi (18s / 22s).
- in text mode, timeout con contenuto gia utile puo essere accettato come `soft_accept` per evitare `EXTRACTION_FAILED` non necessari.

Checklist operativa dev (go/no-go):
1. Verificare nei log per ogni tentativo la presenza dei campi diagnostici: `expectedFieldCount`, `knownExtractedCount`, `knownMissingCount`, `overlapCount`, `consistencyDecision`, `consistencyDecisionReason`, `acceptanceDecision`, `acceptanceReason`, `criticalCoverage`.
2. Validare almeno un caso per ciascun esito acceptance:
   - `hard_accept` con campi attesi coerenti
   - `soft_accept` con output parziale e copertura critica sopra soglia
   - `reject` con overlap reale o copertura critica insufficiente
3. Validare fallback anticipato su stream stall (assenza token entro 12s) con `fallbackReason=timeout` e `timeoutKind=first_token`.
4. Validare fallback anticipato su stream senza inizio JSON (`{`) entro 8s dal primo token non vuoto con `fallbackReason=timeout` e `timeoutKind=json_start`.
5. Validare fallback anticipato su stream con `{` ma senza JSON parseable entro 7s con `fallbackReason=timeout` e `timeoutKind=json_parse`.
6. Validare fallback anticipato su stream idle post-primo token (assenza token successivi oltre 10s) con `fallbackReason=timeout` e `timeoutKind=token_idle`.
7. Verificare che i timeout route-level propaghino cancellazione upstream (`AbortSignal`) fino al provider per evitare timeout effettivi oltre soglia.
8. Confermare assenza regressioni su contratto errori API `{ error: { code, message } }`.

Go criteria:
- completezza log diagnostici >= 99% richieste extraction monitorate.
- first-attempt success rate >= 80% nel campione dev.
- p95 latenza extraction < 45s nel campione dev.
- nessun aumento di `EXTRACTION_FAILED` oltre baseline pre-hardening.

No-go criteria:
- mancanza sistematica dei campi diagnostici richiesti.
- aumento `EXTRACTION_FAILED` > 20% rispetto baseline.
- regressioni semantiche sui codici errore o su guard route (auth/usage/ownership).

## Sprint 0 Closure - Resilience Contract (2026-04-14)

Obiettivo chiuso:
- formalizzare outcome matrix unica e reason taxonomy condivisa.
- allineare mapping outcome -> HTTP -> artifact status per il terminal path route extraction.

Evidence di implementazione:
- `src/lib/llm/extraction-model-policy.ts`: outcome classifier + reason resolver + terminal mapping.
- `src/app/api/tools/extraction/generate/route.ts`: emissione campi terminali (`completionOutcome`, `completionReason`, `artifactStatus`, `httpStatus`) e classificazione hard-fail pre-chain.
- `tests/unit/extraction-model-policy.test.ts`: copertura unit su classifier/reason/mapping.
- `tests/integration/extraction-route.test.ts`: regressione route extraction verde post-integrazione.

Checklist go/no-go per chiusura Sprint 0:
1. classifier outcome coperto da test unit.
2. mapping terminale HTTP/artifact status documentato e allineato alla route.
3. reason taxonomy condivisa in spec/runbook/tracker.
4. nessuna regressione su contratto errori API `{ error: { code, message } }`.

Esito Sprint 0:
- GO per passaggio operativo a Sprint 1.

## Metriche operative

- `json_valid_rate`: percentuale tentativi con parse JSON valido
- `schema_pass_rate`: percentuale tentativi con schema valido (`fields`, `missingFields`, `notes`)
- `consistency_pass_rate`: percentuale tentativi con coerenza `fieldMap`
- `extraction_failed_rate`: percentuale richieste terminate con `EXTRACTION_FAILED`
- `p95_latency`: latenza p95 per richiesta extraction
- `mean_cost`: costo medio richiesta extraction
- `fallback_depth_mean`: media numero tentativi per richiesta
- `first_attempt_text_accept_rate`: percentuale richieste text mode chiuse al primo tentativo (inclusi soft-accept su timeout con contenuto utile)

## Query log consigliate

Filtri base:
- route = `/api/tools/extraction/generate`
- workflowType = `extraction`

Eventi principali:
- `Extraction attempt succeeded`
- `Extraction attempt failed`
- `Extraction fallback chain exhausted`

Campi minimi da aggregare:
- `requestId`
- `attemptIndex`
- `runtimeModel`
- `fallbackReason`
- `duration_ms`
- `costEstimate`
- `parseOk`, `schemaOk`, `consistencyOk`

## Criteri di rollback

Trigger hard rollback immediato:
- `extraction_failed_rate > 5%` su finestra 30 min
- `p95_latency > 15s` su finestra 30 min
- errore sistemico provider (timeout/provider_error) persistente su due modelli consecutivi

Trigger soft rollback (decisione operativa):
- degrado prolungato sopra soglie di Fase A o Fase B per oltre 2h
- aumento anomalo `fallback_depth_mean` > 2.2
- `mean_cost` > 0.06 USD per oltre 2h

## Procedura rollback

1. Portare il rollout al 0% (disabilitare policy runtime fallback in produzione, o riportare routing a singolo modello baseline precedentemente stabile).
2. Confermare riduzione immediata di `extraction_failed_rate` e `p95_latency`.
3. Aprire incident review con root cause preliminare entro 2h.
4. Allegare evidenze log con almeno 20 `requestId` impattati.
5. Aggiornare tracker implementation con stato e prossime azioni.

## Post-incident checklist

- Verifica attivazione modelli in registry (`llmModel`) e priorita chain
- Verifica conformita prompt text-first (sezioni obbligatorie + checklist required)
- Verifica accuratezza mapping `fieldMap`
- Verifica semantica quota/costi su retry (`monthlyUsed` single increment)
- Aggiornamento test regressione se emerge un nuovo failure mode

## Related docs

- `docs/implementation/funnel-extraction-model-policy-plan.md`
- `docs/implementation/feature-funnel-extraction-model-policy-tracker-1.md`
- `docs/specifications/api-specifications.md`
- `docs/adrs/003-rate-limiting-quota-strategy.md`
