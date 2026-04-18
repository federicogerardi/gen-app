---
goal: Phase 3.7 Implementation - Retry con exponential backoff e feedback utente
version: 1.0
date_created: 2026-04-17
date_updated: 2026-04-17
status: Active
tags: [runbook, tool-cloning, phase-3-7, retry, implementation]
---

# Phase 3.7: Retry Implementation (Detailed)

Guida pratica per implementare retry robusto nei tool complessi, allineata al pattern as-is di HotLeadFunnel.

---

## Obiettivo

Gestire errori transienti senza bloccare l'utente, con:

1. classificazione retryable/non-retryable
2. exponential backoff con jitter
3. feedback chiaro durante i tentativi
4. fallback esplicito dopo tentativi esauriti

---

## Pattern di riferimento (HLF)

- Retry wrapper e backoff in frontend tool page
  - [src/app/tools/funnel-pages/page.tsx](../../../src/app/tools/funnel-pages/page.tsx)
- Endpoint generation (senza loop retry server-side)
  - [src/app/api/tools/funnel-pages/generate/route.ts](../../../src/app/api/tools/funnel-pages/generate/route.ts)
- E2E coverage retry/resume
  - [tests/e2e/funnel-pages-retry-resume.spec.ts](../../../tests/e2e/funnel-pages-retry-resume.spec.ts)

---

## Implementazione consigliata

### 1) Definisci errore retryable

- Crea un errore tipizzato (es. `RetryableRequestError`)
- Marca retryable per:
  - `5xx`
  - `429`
  - codici applicativi transienti (`INTERNAL_ERROR`, `RATE_LIMIT_EXCEEDED`)

### 2) Applica `withRetry` con backoff

- Parametri baseline consigliati:
  - `maxAttempts = 3`
  - `baseDelayMs = 900`
  - `jitterMs = 350`
- Formula:
  - `delay = baseDelayMs * 2^(attempt-1) + jitter`

### 3) Mostra feedback in UI

- Aggiorna stato utente ad ogni retry, esempio:
  - `Tentativo 2/3 tra 2s (Errore temporaneo)`
- Ripulisci messaggio quando lo step torna `done`

### 4) Gestisci terminal failure

- Dopo ultimo tentativo:
  - mostra errore actionable
  - abilita CTA secondaria (`Riprova`) se possibile
  - non perdere contesto gia disponibile

---

## Checklist minima

- [ ] Retryable detection separata dalla logica di fetch
- [ ] `withRetry` riusabile su extraction e generation
- [ ] Feedback retry visibile in pagina
- [ ] Stato finale chiaro (`done` vs `failed_hard`)
- [ ] E2E che verifica almeno un retry con successo successivo

---

## Anti-pattern da evitare

- Retry infinito senza limite
- Retry su errori di validazione (`VALIDATION_ERROR`, `FORBIDDEN`, `UNAUTHORIZED`)
- Messaggi generici senza contesto attempt/max
- Azzerare output/contesto recuperabile dopo failure non fatale

---

## Note Architetturali

Per tool con carichi elevati o SLA stringenti, valutare con Architecture Team:

- policy differenziata per endpoint
- backoff adattivo in base a status code
- circuit breaker condiviso per modello/provider
