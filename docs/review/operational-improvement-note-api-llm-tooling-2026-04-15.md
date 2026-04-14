# Operational Improvement Note — API/LLM Tooling

**Date**: 2026-04-15  
**Status**: Open  
**Scope**: API routes, tool-routes guards, LLM streaming/persist, tool-prompts runtime

## Objective

Rendere piu robusto il comportamento operativo dei flussi di generation evitando regressioni su:

- stabilita contratto errori API
- coerenza artifact lifecycle in caso di fault pre-stream
- coerenza observability (reason taxonomy)
- allineamento documentazione/error codes

## Findings To Address

1. Prompt build fuori da blocco di gestione errori in alcune route tool.
2. Possibile stato artifact incoerente in extraction se avviene eccezione tra artifact create e start stream.
3. Mapping reason non discriminante nel ramo ownership extraction.
4. Drift documentale su error code `CONFLICT` (409) rispetto ai common codes.

## Improvement Plan

### 1) Hardening error boundaries pre-stream

- Portare la costruzione prompt e i passaggi pre-stream in un perimetro di catch uniforme nelle route:
  - `src/app/api/tools/meta-ads/generate/route.ts`
  - `src/app/api/tools/funnel-pages/generate/route.ts`
  - `src/app/api/tools/extraction/generate/route.ts`
- In caso di eccezioni non previste, rispondere sempre con payload standard:
  - `{ error: { code, message } }`
- Mantenere l'output HTTP coerente con il contratto API (`SERVICE_UNAVAILABLE` o `INTERNAL_ERROR` a seconda del ramo).

### 2) Artifact lifecycle safety in extraction

- Garantire che, se il flusso fallisce dopo `artifact.create` e prima dello stream valido:
  - lo stato artifact venga finalizzato (`failed`) in modo deterministico
  - sia persistita una `failureReason` coerente
  - il `terminalState` sia sempre presente nell'input snapshot
- Evitare artifact lasciati in `generating` per fault pre-stream.

### 3) Reason taxonomy fix (ownership)

- Correggere il mapping reason ownership nel path extraction distinguendo almeno:
  - not found project
  - forbidden ownership
- Conservare mapping HTTP invariato verso client, ma rendere i reason diagnostici affidabili.

### 4) API documentation alignment

- Aggiornare `docs/specifications/api-specifications.md` nella sezione common error codes includendo `CONFLICT` (409), gia usato dalla route extraction su collisione idempotency key.

## Test Additions (Required)

- Integration tests per failure pre-stream (prompt builder throw) su:
  - `tests/integration/meta-ads-route.test.ts`
  - `tests/integration/funnel-pages-route.test.ts`
  - `tests/integration/extraction-route.test.ts`
- Assertion esplicite su:
  - status code
  - schema error envelope
  - finalizzazione artifact (solo extraction)

## Acceptance Criteria

1. Nessuna route tool ritorna 500 non mappato nei fault pre-stream noti.
2. Nessun artifact extraction rimane in `generating` dopo failure pre-stream.
3. Reason diagnostici ownership sono distinti e coerenti con l'evento reale.
4. `api-specifications.md` riflette i codici errori effettivamente emessi.
5. Suite integration aggiornata copre i nuovi rami di errore.

## Operational Priority

- Priority: P1 (stabilita operativa + riduzione incident triage time)
- Blast radius: tool generation endpoints
- Recommended execution window: prossimo ciclo di hardening backend
