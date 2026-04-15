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

---

## Hotfix Applicato (2026-04-15)

### Root cause confermata — artifact status stuck `generating`

Da log runtime Vercel produzione (`dpl_29aKsX6qxUMiqunjAn8QmDSfiEzu`, fra1, iad1):

- `POST /api/tools/funnel-pages/generate` → HTTP 200, durata `300001ms` (Vercel hard kill a 300s).
- OpenRouter ha risposto in ~6.5s; i restanti ~293s erano idle Vercel-side (stream aperto, nessun token in arrivo dal provider lento o nessun cleanup forzato).
- Il processo Node viene terminato dal platform a 300s prima che il `db.artifact.update({ status: 'completed'|'failed' })` venga eseguito.
- Risultato: l'artefatto resta bloccato in stato `generating` nel DB, mentre il frontend ha già mostrato il contenuto ricevuto via SSE.

### Fix — `streamDeadlineMs` in `createArtifactStream`

**Parametro aggiunto**: `streamDeadlineMs?: number` nell'interfaccia `StreamParams` di `src/lib/llm/streaming.ts`.

Logica:
- Se configurato, arma un `setTimeout` applicativo all'interno dello stream `ReadableStream.start`.
- Alla scadenza: imposta `cancellationReason = 'timeout'` e chiama `providerAbortController.abort()`.
- Il generatore lancia, il path catch valuta `canPersistPartialTimeout`: se il contenuto accumulato è ≥ 120 chars → `persistArtifactSuccess` (partial); altrimenti → `persistArtifactFailure(failureReason: 'timeout')`.
- In entrambi i casi lo stato DB viene finalizzato con `status: 'completed'` o `status: 'failed'` **prima** del kill Vercel.
- Il timer viene cancellato nel `finally` alla chiusura regolare dello stream.

**Route `funnel-pages/generate`**: imposta `FUNNEL_STREAM_DEADLINE_MS = 270_000` (30s di margine sul limite Vercel 300s).

### File modificati

| File | Modifica |
|---|---|
| `src/lib/llm/streaming.ts` | Aggiunto parametro `streamDeadlineMs`, timer interno con abort anticipato, cleanup nel `finally` |
| `src/app/api/tools/funnel-pages/generate/route.ts` | Passa `streamDeadlineMs: 270_000` a `createArtifactStream` |
| `tests/unit/streaming.test.ts` | Nuovo test: `persists failed(timeout) when stream deadline aborts before completion` |
| `tests/integration/funnel-pages-route.test.ts` | Asserzione `streamDeadlineMs: 270000` su optin step |

### Validazione post-fix

- `npm run typecheck` → PASS
- `npm run test -- tests/unit/streaming.test.ts tests/integration/funnel-pages-route.test.ts` → **23/23 PASS**
- `npm run lint` → PASS

### Scope residuo

- Verificare se applicare `streamDeadlineMs` anche a `meta-ads/generate` (stesso limite runtime Vercel 300s).
- I finding originali di questa nota (TASK-001..013) rimangono aperti nel tracker operativo.
