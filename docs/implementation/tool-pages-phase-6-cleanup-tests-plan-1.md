---
goal: Completare Phase 6 del refactor tool-pages composabile con cleanup residui, copertura test estesa e consolidamento documentazione pattern
version: 1.0
date_created: 2026-04-18
last_updated: 2026-04-18
owner: Federico / AI Coding Agent
status: 'Completed'
tags: [refactor, tool-pages, phase-6, cleanup, testing, docs]
---

# Introduction

Phase 6 finalizza il refactor composabile dei tool pages dopo la chiusura di Phase 4 (funnel) e Phase 5 (nextland).

## Kickoff Evidence (2026-04-18, notte)

- Nuovi test introdotti:
  - `tests/unit/tools/nextland/nextland-setup-card.test.tsx`
  - `tests/unit/tools/nextland/nextland-step-cards.test.tsx`
  - `tests/integration/nextland-page-flow.test.tsx`
- Validazione mirata:
  - 3 suite verdi
  - 7 test verdi

## Validation Update (2026-04-18, notte)

- Estensione copertura shared completata con nuove suite:
  - `tests/unit/shared/useStepGeneration.test.ts`
  - `tests/unit/shared/useExtraction.test.ts`
  - `tests/unit/shared/step-card.test.tsx`
  - `tests/unit/shared/status-checklist.test.tsx`
- Esito validazione shared:
  - 4 suite verdi
  - 9 test verdi
- Gate tecnico finale eseguito e chiuso in locale:
  - `npm run typecheck` ✅
  - `npm run lint` ✅
  - `npm run test` ✅ (69 suite, 456 test)
  - `npm run build` ✅
  - `npx playwright test --config .tmp-playwright.reuse.config.ts` ✅ (25/25 test E2E)

## 1. Scope

- cleanup dei residui legacy del refactor tool-pages
- estensione copertura test shared hooks/components
- consolidamento documentazione del pattern composabile nel README principale

## 2. Implementation Steps

### Phase 6.1 - Cleanup

| Task | Description | Completed | Date |
| -------- | --------------------- | --------- | ---------- |
| TASK-601 | Inventariare e rimuovere eventuali file/utility legacy non piu referenziati dopo split funnel/nextland. | ✅ | 2026-04-18 |
| TASK-602 | Verificare import dead paths e allineare eventuali riferimenti documentali obsoleti. | ✅ | 2026-04-18 |

### Phase 6.2 - Tests

| Task | Description | Completed | Date |
| -------- | --------------------- | --------- | ---------- |
| TASK-603 | Aggiungere test componenti NextLand e integration flow container. | ✅ | 2026-04-18 |
| TASK-604 | Estendere copertura shared hooks/components verso target documentato (>70% area shared). | ✅ | 2026-04-18 |

### Phase 6.3 - Documentation

| Task | Description | Completed | Date |
| -------- | --------------------- | --------- | ---------- |
| TASK-605 | Consolidare pattern composabile nel README principale con linee guida operative per nuovi tool. | ✅ | 2026-04-18 |
| TASK-606 | Allineare implement-index e ADR 004 allo stato finale di chiusura Phase 6. | ✅ | 2026-04-18 |
| TASK-607 | Eseguire gate tecnico finale (`typecheck`, `lint`, `test`, `build`) e registrare evidenze. | ✅ | 2026-04-18 |

## 4. Closure Note

Tutti i task Phase 6 previsti nel piano risultano completati e validati con evidenze tecniche/documentali.

## 3. Exit Criteria

- nessun residuo legacy critico nel perimetro tool-pages
- copertura test shared/hooks/components estesa e validata
- README aggiornato con pattern composabile e flusso consigliato per estensione nuovi tool
- gate tecnici verdi (`typecheck`, `lint`, `test`)
