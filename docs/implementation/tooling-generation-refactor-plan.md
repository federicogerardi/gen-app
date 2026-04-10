# Detailed Implementation Plan — Tooling Generation Optimization

**Versione**: 1.2  
**Stato**: COMPLETATO (branch `feat/tooling-generation-optimization`)  
**Data**: 2026-04-10  
**Owner**: Team App + AI Generation

## Stato avanzamento (snapshot 2026-04-10)

- PR-1: COMPLETATA
- PR-2: COMPLETATA
- PR-3: COMPLETATA
- PR-4: COMPLETATA
- PR-5: COMPLETATA
- PR-6: COMPLETATA

### Evidenze completamento PR-1

- Unificato schema request tool in `src/lib/tool-routes/schemas.ts` con supporto retrocompatibile ai campi legacy top-level (`product`, `audience`, `offer`) e normalizzazione server-side su `customerContext`.
- Centralizzati guardrail route in `src/lib/tool-routes/guards.ts` per auth, validazione payload, quota/budget/rate-limit e ownership check.
- Refactor route completato su entrambi gli endpoint:
  - `src/app/api/tools/meta-ads/generate/route.ts`
  - `src/app/api/tools/funnel-pages/generate/route.ts`
- Test aggiunti/aggiornati e verdi:
  - `tests/unit/tool-routes-schemas.test.ts`
  - `tests/integration/meta-ads-route.test.ts`
  - `tests/integration/funnel-pages-route.test.ts`

### Delta tecnico introdotto

- Ridotta duplicazione nelle route tool spostando logica condivisa su helper riusabili.
- Mantenuto il contratto errori `{ error: { code, message, details? } }` e i codici attesi.
- Preservata compatibilita con i client correnti durante la transizione al nuovo schema base.

### Evidenze completamento PR-3

- Introdotta normalizzazione centralizzata in `src/lib/llm/orchestrator.ts` con parser robusto per workflow (`meta_ads`, `funnel_pages`) e fallback safe mantenendo formattazione markdown leggibile.
- Aggiornata persistenza in `src/lib/llm/streaming.ts` per salvare `content` normalizzato a completamento stream.
- Aggiunto logging warning non bloccante sui fallback di normalizzazione (nessun crash runtime).
- Test aggiunti/aggiornati e verdi:
  - `tests/unit/llm-orchestrator-normalization.test.ts`
  - `tests/unit/artifact-preview.test.ts` (regression guard)
  - `tests/integration/meta-ads-route.test.ts`
  - `tests/integration/funnel-pages-route.test.ts`

### Evidenze completamento PR-4

- Esteso il contratto SSE in `src/lib/llm/streaming.ts` con metadata additive:
  - `start`: `workflowType`, `format`
  - `token`: `sequence`, `workflowType`, `format`
  - `progress`: `estimatedTokens`, `costEstimate`, `workflowType`, `format`
  - `complete`: `artifactId`, `workflowType`, `format`, `tokens`, `cost`
  - `error`: `code`, `message`, `workflowType`, `format`
- Adeguato il parser client in `src/components/hooks/useStreamGeneration.ts` con supporto eventi `progress` e gestione robusta buffer chunk SSE.
- Allineato `format` SSE a supportare `markdown` come standard corrente dei workflow tool.
- Compatibilità retroattiva mantenuta: i consumer esistenti continuano a funzionare con i campi base (`start/token/complete/error`).
- Test aggiunti/aggiornati e verdi:
  - `tests/unit/llm-streaming-events.test.ts`
  - `tests/unit/llm-orchestrator-normalization.test.ts`
  - `tests/unit/artifact-preview.test.ts`
  - `tests/integration/meta-ads-route.test.ts`
  - `tests/integration/funnel-pages-route.test.ts`

### Evidenze completamento PR-5

- Introdotto modulo shared responses in `src/lib/tool-routes/responses.ts` con:
  - `apiError(...)` per mapping uniforme `{ error: { code, message, details? } }`
  - `sseResponse(...)` per risposta stream standardizzata
  - `serviceUnavailableError()` per fallback uniforme provider failure
- `src/lib/tool-routes/guards.ts` rifattorizzato su `apiError(...)` per ridurre duplicazione e garantire coerenza codice/status/message.
- Route tool consolidate:
  - `src/app/api/tools/meta-ads/generate/route.ts` usa helper shared per SSE/error
  - `src/app/api/tools/funnel-pages/generate/route.ts` usa helper shared e funzione `buildFunnelPrompt(...)` per ridurre branching duplicato
- Test di riferimento verdi su route + guardrail:
  - `tests/integration/meta-ads-route.test.ts`
  - `tests/integration/funnel-pages-route.test.ts`
  - `tests/unit/tool-routes-schemas.test.ts`
  - `tests/unit/llm-streaming-events.test.ts`

### Evidenze completamento PR-6

- Cleanup finale eseguito su warning residui (rimozione variabili inutilizzate in `src/components/layout/Navbar.tsx`).
- Regressione unit test adeguata al nuovo contratto stream (`tests/unit/streaming.test.ts`, mock orchestrator con `normalizeOutput`).
- Validazione qualità completa locale completata con esito verde:
  - `npm run lint` PASS
  - `npm run typecheck` PASS
  - `npm run test` PASS (`28/28` suite, `187/187` test)
  - `npm run build` PASS (Next.js production build)
- Documentazione di avanzamento allineata in questo piano + `docs/implement-index.md`.

### Prossimo step immediato

- Track post-refactor: monitoraggio runtime, estensione E2E real-flow e hardening progressivo fuori dal perimetro PR-1..PR-6.

## 1) Obiettivo

Refactoring centrale del sistema di generazione tool per ottenere:
- organizzazione logica stabile del processo (Orchestrator -> Agent -> Provider)
- interazione utente coerente (schema input unificato, errori standard, streaming consistente)
- output tipizzato e visualizzazione human-readable affidabile

Perimetro iniziale: **Meta Ads** + **Funnel Pages** (prototipo framework per tool futuri).

## 2) Problemi As-Is (confermati)

1. Prompt output e schema app sono disallineati in alcuni flussi.
2. JSON raw viene talvolta salvato e visualizzato come testo non normalizzato.
3. Request schema e validazioni sono duplicati nelle route tool.
4. Eventi SSE sono minimali e non descrivono formato/output context in modo esplicito.
5. Error handling tra route/orchestrator/provider non è sufficientemente categorizzato.

## 3) Target Architecture (To-Be)

### 3.1 Contratto input unificato

Introduzione di uno schema base condiviso per i tool:
- projectId
- model
- tone
- workflowType
- customerContext (business, target, offerta, obiettivo)

Estensioni tool-specific:
- Meta Ads: angle, objective refinements
- Funnel Pages: step, promise, notes, contesto step precedenti

### 3.2 Normalizzazione output a livello LLM layer

Normalizzazione in uscita nel layer orchestrator/agent:
- parsing robusto dell'output provider
- validazione con schema output per workflow
- fallback sicuro a contenuto human-readable con warning (senza crash)
- persistenza artifact con contenuto coerente e preview-ready

### 3.3 Streaming SSE esteso

Standardizzazione eventi:
- start
- token (con metadata minimi: workflowType, format, sequence)
- progress (token/costo stimato)
- complete (token finali, costo finale, artifactId)
- error (code + message)

### 3.4 Error contract uniforme

Formato obbligatorio:
{
  "error": {
    "code": "...",
    "message": "..."
  }
}

Codici standard: UNAUTHORIZED, FORBIDDEN, NOT_FOUND, VALIDATION_ERROR, RATE_LIMIT_EXCEEDED, PAYMENT_REQUIRED, SERVICE_UNAVAILABLE, INTERNAL_ERROR.

## 4) Workstreams

## WS-A: Request Schema Unification - COMPLETATO

**Deliverable**
- schema base condiviso + estensioni tool-specific
- helper di validazione riusabile nelle route tool

**File target**
- [src/app/api/tools/meta-ads/generate/route.ts](../../src/app/api/tools/meta-ads/generate/route.ts)
- [src/app/api/tools/funnel-pages/generate/route.ts](../../src/app/api/tools/funnel-pages/generate/route.ts)
- [src/lib](../../src/lib)

**Acceptance Criteria**
- validazione input centralizzata e non duplicata
- differenze tool-specific isolate in schema extension
- stesso pattern auth -> ownership -> rateLimit -> validate -> orchestrator

**Stato implementazione**
- Completato con introduzione schema condiviso + guardrail comuni e migrazione route Meta Ads/Funnel.
- Verificato con test unit/integration dedicati.

## WS-B: Prompt Alignment con schema app - COMPLETATO

**Deliverable**
- prompt aggiornati per emettere output coerente al contratto applicativo
- eliminazione mismatch tra formato richiesto e formato consumato

**File target**
- [src/lib/tool-prompts/prompts/tools/meta_ads/prompt_generation.md](../../src/lib/tool-prompts/prompts/tools/meta_ads/prompt_generation.md)
- [src/lib/tool-prompts/prompts/tools/hl_funnel/prompt_optin_generator.md](../../src/lib/tool-prompts/prompts/tools/hl_funnel/prompt_optin_generator.md)
- [src/lib/tool-prompts/prompts/tools/hl_funnel/prompt_quiz_generator.md](../../src/lib/tool-prompts/prompts/tools/hl_funnel/prompt_quiz_generator.md)
- [src/lib/tool-prompts/prompts/tools/hl_funnel/prompt_vsl_generator.md](../../src/lib/tool-prompts/prompts/tools/hl_funnel/prompt_vsl_generator.md)
- [src/lib/tool-prompts/templates.ts](../../src/lib/tool-prompts/templates.ts)
- [src/lib/tool-prompts/loader.ts](../../src/lib/tool-prompts/loader.ts)

**Acceptance Criteria**
- output atteso definito e testabile per ciascun workflow
- nessun uso runtime di fs.readFile nelle route
- parity tra prompt source markdown e template runtime

**Stato implementazione**
- Rinforzati i vincoli output nei prompt source con standard unico `markdown` (Meta Ads + Funnel optin/quiz/vsl), no code fences.
- Rigenerato `src/lib/tool-prompts/templates.ts` direttamente dalle sorgenti markdown per allineamento 1:1.
- Aggiunti test di parity e contract in `tests/unit/tool-prompts-parity.test.ts`.

## WS-C: Output Parsing + Normalization - COMPLETATO

**Deliverable**
- parser/normalizer centralizzato per workflow
- separazione chiara tra raw provider output e normalized artifact content

**File target**
- [src/lib/llm/orchestrator.ts](../../src/lib/llm/orchestrator.ts)
- [src/lib/llm/agents](../../src/lib/llm/agents)
- [src/lib/llm/streaming.ts](../../src/lib/llm/streaming.ts)
- [src/lib/artifact-preview.ts](../../src/lib/artifact-preview.ts)

**Acceptance Criteria**
- ogni completion produce content renderizzabile senza JSON rumoroso
- parse error non interrompe il flusso: fallback controllato + logging
- token/costi persistiti in modo deterministico

**Stato implementazione**
- Completato con normalizer centralizzato nel layer LLM e salvataggio contenuto normalizzato a fine stream.
- Fallback parse non bloccante con warning loggato, senza interruzione pipeline.
- Per i workflow tool, il formato normalizzato persistito/esposto e `markdown`.

## WS-D: SSE Contract Enhancement - COMPLETATO

**Deliverable**
- eventi SSE arricchiti
- compatibilità retroattiva con client corrente dove possibile

**File target**
- [src/lib/llm/streaming.ts](../../src/lib/llm/streaming.ts)
- [src/components/hooks/useStreamGeneration.ts](../../src/components/hooks/useStreamGeneration.ts)

**Acceptance Criteria**
- stream include metadata minimi utili a UI
- no regressione su start/token/complete/error
- gestione error eventi con messaggistica user-safe

**Stato implementazione**
- Completato con estensione metadata additive su stream e parser client aggiornato.
- Nessuna regressione sui consumer correnti e suite test di riferimento verde.

## WS-E: Route Consolidation & Guardrails - COMPLETATO

**Deliverable**
- riduzione duplicazione logica nelle route tool
- helper comuni per quota/rate-limit/error mapping

**File target**
- [src/app/api/tools/meta-ads/generate/route.ts](../../src/app/api/tools/meta-ads/generate/route.ts)
- [src/app/api/tools/funnel-pages/generate/route.ts](../../src/app/api/tools/funnel-pages/generate/route.ts)
- [src/lib](../../src/lib)
- [.github/instructions/tool-routes.instructions.md](../../.github/instructions/tool-routes.instructions.md)

**Acceptance Criteria**
- percorso di validazione omogeneo tra i due endpoint
- error contract allineato e verificato da test
- riduzione significativa della duplicazione

**Stato implementazione**
- Completato con helper shared per error mapping/SSE response e riduzione branching duplicato nelle route tool.
- Pattern route omogeneo e verificato da test integration.

## WS-F: Test Strategy - COMPLETATO (scope PR-1..PR-6)

**Deliverable**
- test unit/integration aggiornati su schema/output/streaming
- regression tests per preview human-readable

**File target**
- [tests/unit](../../tests/unit)
- [tests/integration](../../tests/integration)
- [tests/e2e](../../tests/e2e)

**Acceptance Criteria**
- test su parsing/normalizzazione output per Meta Ads + Funnel
- test route per validation/error mapping/rate-limit order
- nessuna regressione sulle suite esistenti

**Stato implementazione**
- Copertura unit/integration allineata su schema/prompt/normalizzazione/streaming/route consolidation.
- Validazione finale completa eseguita con suite Jest completa + build produzione senza regressioni.

## 5) Sequenza di Implementazione (PR Plan)

### PR-1: Schema base + validazione condivisa - COMPLETATA
- implementazione schema base
- refactor minimo route per adottare il nuovo schema
- test unit su schema

**Esito**
- Consegnata con test verdi (unit + integration) su route Meta Ads/Funnel.

### PR-2: Prompt alignment (Meta Ads + Funnel) - COMPLETATA
- aggiornamento prompt source e template runtime
- test snapshot/output contract prompt

**Esito**
- Prompt source e runtime templates allineati con parity test dedicato e suite verde.

### PR-3: Parsing e normalizzazione output - COMPLETATA
- introduzione normalizer a livello LLM
- persistenza artifact content normalizzato
- test unit su casi validi/malformed

**Esito**
- Normalizzazione output applicata nel percorso stream completion con fallback safe e logging warning.
- Suite test PR-3 verde su unit + regression route.

### PR-4: SSE metadata enhancement - COMPLETATA
- estensione stream events
- adattamento hook client per nuovi metadata
- test integration stream parsing

**Esito**
- Eventi SSE arricchiti e parser client robusto a chunk parziali, con backward compatibility preservata.

### PR-5: Consolidation route + error mapping - COMPLETATA
- riduzione duplicazioni
- helper comuni + uniformità codici errore
- test integration route-level

**Esito**
- Consolidamento route chiuso con helper responses/guards condivisi e contratti API invariati.

### PR-6: Hardening finale + docs allineate - COMPLETATA
- cleanup, coverage check, validazione build
- aggiornamento docs di riferimento e indice implementativo

**Esito**
- Hardening chiuso con lint/typecheck/test/build verdi e allineamento documentale completato.

## 6) Pianificazione Temporale (blocco critico 1-2 settimane)

- Giorno 1-2: PR-1
- Giorno 3-4: PR-2
- Giorno 5-6: PR-3
- Giorno 7: PR-4
- Giorno 8-9: PR-5
- Giorno 10: PR-6 + stabilizzazione

## 7) Criteri di Done (Definition of Done)

1. Meta Ads e Funnel Pages rispettano stesso contratto input/output.
2. Artifact preview è human-readable come default, senza JSON raw esposto in UI finale.
3. SSE include metadata utili e non rompe compatibilità base.
4. Error contract uniforme su entrambi i tool endpoint.
5. Test unit/integration passano in CI.
6. Build e typecheck passano senza warning bloccanti.

## 8) Rischi e Mitigazioni

- **Rischio**: regressione streaming lato client.
  - **Mitigazione**: mantenere eventi base e introdurre metadata additive.

- **Rischio**: parse aggressivo rompe output borderline.
  - **Mitigazione**: fallback human-readable + warning, mai crash hard.

- **Rischio**: disallineamento prompt source vs runtime templates.
  - **Mitigazione**: test dedicato loader/templates e review checklist PR.

- **Rischio**: aumento scope oltre le 2 settimane.
  - **Mitigazione**: cut line netta su 2 tool; futuri tool solo framework-ready, non implementati.

## 9) Rollback Plan

1. Feature flag o branch-level rollback per SSE metadata se UI mostra regressioni.
2. Revert isolato PR-3 se normalizer crea inconsistenze su artifact existing.
3. Ripristino route precedenti in caso di error rate inatteso su produzione.
4. Conservazione del contenuto raw in artifact per audit/troubleshooting.

## 10) KPI di successo

- Riduzione errori preview JSON raw -> target vicino a 0 nei flussi Meta/Funnel.
- Riduzione duplicazione route (misura qualitativa e diff SLOC).
- Tempo di onboarding nuovo tool ridotto grazie a schema/guardrail comuni.
- Stabilità stream (assenza regressioni nei test e nei log applicativi).

## 11) Riferimenti

- [docs/implement-index.md](../implement-index.md)
- [docs/specifications/api-specifications.md](../specifications/api-specifications.md)
- [docs/adrs/001-modular-llm-controller-architecture.md](../adrs/001-modular-llm-controller-architecture.md)
- [docs/adrs/002-streaming-vs-batch-responses.md](../adrs/002-streaming-vs-batch-responses.md)
- [docs/adrs/003-rate-limiting-quota-strategy.md](../adrs/003-rate-limiting-quota-strategy.md)
- [docs/ux/gui-refactor-plan.md](../ux/gui-refactor-plan.md)
