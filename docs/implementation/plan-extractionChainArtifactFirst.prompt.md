## Plan: Refactor Extraction Chain Artifact-First

Goal: massimizzare la resilienza della chain extraction garantendo output utile quando esiste segnale, spostando la frizione su stati degradati e reason codes invece che su stop hard.

Version: 1.0
Date: 2026-04-14
Owner: Platform Engineering
Status: Planned

### 1. Objectives and Scope

Obiettivi principali:
1. Garantire che ogni run extraction lasci sempre uno stato persistito interrogabile.
2. Privilegiare artifact utile anche parziale quando il segnale e riusabile.
3. Mantenere invariati i guardrail di sicurezza e i contratti API esistenti.

Out of scope:
1. Ottimizzazioni costo-modello non legate alla resilienza.
2. Cambiamenti breaking del payload client.
3. Cambiamenti al contratto errori `{ error: { code, message } }`.

### 2. Resilience Contract (Phase 0, blocker)

Goal: definire formalmente i soli errori hard-fail e i fallback degradabili.

Hard-fail ammessi:
1. Auth non valida.
2. Ownership fallita.
3. Payload invalido.
4. Assenza totale di segnale utile dopo esaurimento chain.

Degraded outcomes ammessi:
1. Timeout con contenuto utile gia disponibile.
2. Parse/schema non pienamente completati ma output testuale riusabile.
3. Errori transient provider con retry o resume possibili.

Task:
1. TASK-0001: definire matrice outcome unica (`completed_full`, `completed_partial`, `failed_hard`).
2. TASK-0002: introdurre reason taxonomy canonica condivisa route/policy/UI.
3. TASK-0003: allineare mapping outcome -> HTTP -> artifact status -> log reason.

Exit criteria:
1. AC-0001: nessuno stato terminale senza reason code persistito.
2. AC-0002: classifier outcome coperto da test unit.
3. AC-0003: documentazione runbook/spec allineata senza divergenze semantiche.

### 3. Artifact-First Ingress and Guard Consolidation (Phase 1)

Goal: eliminare perdita lavoro iniziale e ridurre ridondanze pre-generazione.

Task:
1. TASK-0101: persistenza anticipata artifact stub alla validazione input minima.
2. TASK-0102: idempotency key per deduplica richiesta extraction.
3. TASK-0103: consolidare check ownership/rate/quota in sequenza deterministica senza duplicazioni per tentativo.
4. TASK-0104: garantire incremento usage singolo per request, indipendente dalla profondita fallback.

Exit criteria:
1. AC-0101: retry con stessa idempotency key non crea artifact duplicati.
2. AC-0102: nessuna richiesta valida rimane senza stato persistito.
3. AC-0103: test integration guard order e idempotenza verdi.

### 4. Timeout Semantics and Stream Consumer Hardening (Phase 2)

Goal: separare timeout distruttivi da timeout utili e ridurre race concorrenti.

Task:
1. TASK-0201: classificare timeout in `first_token`, `json_start`, `json_parse`, `token_idle`, `route_deadline`.
2. TASK-0202: chiudere in `completed_partial` quando timeout avviene dopo contenuto gia riusabile.
3. TASK-0203: semplificare state machine stream per garantire single-finalize e singolo path di cancellazione.
4. TASK-0204: mantenere abort propagation end-to-end verso orchestrator/provider.

Exit criteria:
1. AC-0201: assenza di doppie chiusure in scenari timeout concorrenti.
2. AC-0202: timeout con segnale utile non termina in hard fail.
3. AC-0203: suite integration timeout kinds e chain exhausted verde.

### 5. Atomic Completion and Reason Persistence (Phase 3)

Goal: rendere atomica la chiusura run prima della risposta definitiva al client.

Task:
1. TASK-0301: transazione atomica per artifact final, cost accounting e quota history.
2. TASK-0302: persistenza obbligatoria `completionReason` e `fallbackReason` finale.
3. TASK-0303: invio `complete` al client solo dopo commit riuscito.

Exit criteria:
1. AC-0301: nessun mismatch tra risposta HTTP e stato artifact DB.
2. AC-0302: tutti i run terminali includono reason interrogabile.
3. AC-0303: test integration DB consistenza pass.

### 6. Non-Blocking Observability (Phase 4)

Goal: estendere diagnostica e metriche senza introdurre nuovi failure points.

Task:
1. TASK-0401: aggiungere campi log minimi (`requestId`, `attemptIndex`, `runtimeModel`, `timeoutKind`, `completionReason`, `fallbackReason`).
2. TASK-0402: estendere metriche con distribuzione timeout, partial rate, fallback depth.
3. TASK-0403: rendere logging best-effort, senza bloccare il percorso utente su errore osservabilita.

Exit criteria:
1. AC-0401: completezza campi diagnostici >= 99% richieste monitorate.
2. AC-0402: nessun incremento error rate dovuto a log/metric pipeline.
3. AC-0403: query operative runbook aggiornate e validate.

### 7. Retry and Resume UX (Phase 5)

Goal: convertire failure transient in flusso recuperabile nel funnel upload-first.

Task:
1. TASK-0501: retry client con backoff + jitter su errori retryable.
2. TASK-0502: resume da checkpoint quando esiste artifact `in_progress` o `completed_partial`.
3. TASK-0503: rappresentare stati UX distinti (`in_progress`, `completed_partial`, `completed_full`, `failed_hard`).
4. TASK-0504: CTA dedicate: riprendi, riprova, rigenera.

Exit criteria:
1. AC-0501: E2E upload-first con retry/resume pass.
2. AC-0502: riduzione run perse su transient failure.
3. AC-0503: nessun loop retry infinito lato client.

### 8. Controlled Rollout (Phase 6)

Goal: attivare in sicurezza con rollback rapido e criteri go/no-go oggettivi.

Task:
1. TASK-0601: feature flag artifact-first a livello route extraction.
2. TASK-0602: rollout progressivo 10% -> 30% -> 100% con gate KPI.
3. TASK-0603: trigger rollback hard predefiniti su `extraction_failed_rate` e `p95_latency`.
4. TASK-0604: aggiornamento stato su implement index e tracker con evidenze runbook.

Exit criteria:
1. AC-0601: KPI in soglia su due finestre consecutive.
2. AC-0602: nessuna regressione su auth/ownership/usage e contratto errori.
3. AC-0603: drill rollback eseguito e documentato.

### 9. Dipendenze chiave

1. Fase 0 blocca tutto il resto.
2. Fase 2 dipende da Fase 1.
3. Fase 3 dipende da Fase 2.
4. Fase 5 dipende da Fase 3 e Fase 4.
5. Fase 6 dipende da tutte le fasi precedenti.

### 10. File centrali da usare

- [src/app/api/tools/extraction/generate/route.ts](src/app/api/tools/extraction/generate/route.ts)
- [src/lib/llm/streaming.ts](src/lib/llm/streaming.ts)
- [src/lib/llm/extraction-model-policy.ts](src/lib/llm/extraction-model-policy.ts)
- [src/lib/llm/orchestrator.ts](src/lib/llm/orchestrator.ts)
- [src/lib/llm/providers/openrouter.ts](src/lib/llm/providers/openrouter.ts)
- [src/lib/tool-routes/guards.ts](src/lib/tool-routes/guards.ts)
- [src/app/tools/funnel-pages/page.tsx](src/app/tools/funnel-pages/page.tsx)
- [docs/review/extraction-model-policy-rollout-runbook-2026-04-12.md](docs/review/extraction-model-policy-rollout-runbook-2026-04-12.md)
- [docs/implementation/feature-extraction-chain-hardening-plan-1.md](docs/implementation/feature-extraction-chain-hardening-plan-1.md)
- [docs/implement-index.md](docs/implement-index.md)

### 11. Verification

1. Unit tests su acceptance tiers, escalation decision e timeout classifier.
2. Integration tests su timeout kinds, partial useful output e chain exhausted.
3. Integration DB su coerenza status artifact, reason, token e cost accounting.
4. E2E funnel upload-first con retry e resume su errori transient.
5. Monitor runtime su partial rate, timeout distribution e artifact stuck.

### 12. KPI and Quality Gates

1. First-attempt useful artifact rate >= 80%.
2. `p95_latency` extraction < 45s.
3. Nessun aumento di `EXTRACTION_FAILED` rispetto alla baseline pre-rollout.
4. Campi reason mancanti nel persistito = 0.
5. Completezza log diagnostici >= 99%.

### 13. Decisioni incluse

1. Artifact utile prioritario rispetto alla purezza del parsing.
2. Frizioni non bloccanti devono produrre `completed_partial` con reason esplicita.
3. Errori hard solo per auth, ownership, payload invalidi o assenza totale di segnale.
4. Ogni run deve lasciare uno stato persistito interrogabile.