---
goal: Checklist operativa precompilata per mantenere allineamento con HLF durante la clonazione di NextLand
version: 1.3
date_created: 2026-04-18
date_updated: 2026-04-18
status: Active
tags: [runbook, tool-cloning, checklist, nextland, operations]
---

# NextLand Operational Checklist

Checklist operativa precompilata per NextLand.

Scopo: mantenere il clone allineato al pattern HLF riducendo i delta alla sola differenza funzionale rilevante: due step generativi invece di tre, con upload + extraction, resume, retry e quota per step.

Stato corrente: checklist aggiornata su implementazione completata nel perimetro core (backend, prompt layer, frontend, relaunch, testing mirato). Test funzionali su ambiente Dev superati: upload + extraction OK, step 1 OK, step 2 OK.

---

## Istruzioni d'Uso

- Aggiorna i checkbox durante implementazione e review.
- Usa `N/A` solo quando una capability e stata esplicitamente esclusa.
- Per ogni deviazione intenzionale, aggiorna anche il blueprint NextLand.

---

## 1. Planning

- [x] Complexity questionnaire completato
- [x] Tool tier dichiarato
- [x] Reference implementation confermata (`funnel-pages`)
- [x] Blueprint tecnico compilato
- [x] Input, output e numero step confermati a livello macro
- [x] Non-goals dichiarati

### Readiness Pre-Implementation

- [x] Gate architetturale trattato come eccezione documentata per clone HLF-like
- [x] Naming tecnico confermato (`nextland`, `nextland_landing`, `nextland_thank_you`)
- [x] Regola di chaining del contesto confermata
- [x] Nessun blocker critico aperto a livello documentale
- [x] Dossier pronto per kickoff operativo

---

## 2. Backend Route Guardrails

- [x] `auth()` verificato prima di usare input utente
- [x] Ownership check presente su `projectId`
- [x] Validazione Zod eseguita prima della logica di business
- [x] Rate limit eseguito prima della chiamata OpenRouter
- [x] Errori mappati nel formato standard
- [x] SSE contract coerente con gli endpoint tool esistenti
- [x] Nessuna lettura filesystem runtime nel path route

Note precompilate:
- Source route da usare come baseline: `src/app/api/tools/funnel-pages/generate/route.ts`
- Upload route baseline: `src/app/api/tools/funnel-pages/upload/route.ts`

---

## 3. Prompt Layer Guardrails

- [x] Markdown sorgente creato sotto `src/lib/tool-prompts/prompts/`
- [x] Builder runtime tipizzato creato in `src/lib/tool-prompts/`
- [x] Registry aggiornato con NextLand
- [x] Placeholder espliciti e stabili
- [x] Nessun `fs.readFile` runtime nelle route o nel prompt builder
- [x] Template statici separati per i due step generativi

Note precompilate:
- Builder baseline: `src/lib/tool-prompts/funnel-pages.ts`
- Template runtime baseline: `src/lib/tool-prompts/funnel-templates.ts`
- Prompt source HLF da cui derivare i due step: optin e quiz
- Regola di chaining da mantenere esplicita: `nextland_landing = extractionContext`; `nextland_thank_you = extractionContext + landingOutput`

---

## 4. Upload / Extraction

- [x] Il tool richiede upload file
- [x] L'extraction deve riusare il pattern HLF
- [x] Mapping dei campi estratti verificato per il dominio NextLand
- [x] Stato UI per upload ed extraction coperto
- [x] Errori di extraction mostrati in modo esplicito

Note precompilate:
- Expected route target: `src/app/api/tools/nextland/upload/route.ts`
- Reuse candidate per mapping: verificare il mapping funnel gia esistente prima di creare fork dedicati

---

## 5. Frontend e UX Parity

- [x] Page structure allineata al framework grafico del progetto
- [x] State machine UI definita e completa
- [x] Copy dei CTA coerente con lo step corrente
- [x] Loading, disabled state e feedback utente gestiti
- [x] Focus management e keyboard accessibility verificati
- [x] Responsive mobile verificato sui breakpoint rilevanti
- [x] Nessuna deviazione UX non documentata

Note precompilate:
- Baseline UI wrapper: `src/app/tools/funnel-pages/page.tsx`
- Baseline UI container: `src/app/tools/funnel-pages/FunnelPagesToolContent.tsx`
- Baseline retry/resume hooks: `src/app/tools/funnel-pages/hooks/useFunnelGeneration.ts`, `src/app/tools/funnel-pages/hooks/useFunnelRecovery.ts`
- Step target: landing page, thank-you page
- Resume e regenerate devono restare coerenti con intent e artifact-first flow gia presenti in HLF

---

## 6. Recovery, Retry e Quota

- [x] Resume/checkpoint richiesto
- [x] Retry con backoff richiesto
- [x] Partial failure handling richiesto
- [x] Quota per step richiesta
- [x] Messaggi errore coerenti con la capability disponibile

Note precompilate:
- Non e richiesta custom error recovery UI dedicata
- Se fallisce il secondo step, il primo deve restare riusabile
- Baseline E2E per retry/resume: `tests/e2e/funnel-pages-retry-resume.spec.ts`

---

## 7. Testing Minimo

- [x] Integration test per unauthorized
- [x] Integration test per validation error
- [ ] Integration test per rate limit
- [x] Integration test happy path SSE
- [x] Unit test per prompt builder landing
- [x] Unit test per prompt builder thank-you
- [x] Test per step sequencing landing -> thank-you
- [x] E2E workflow principale coperto
- [x] Test accessibilita o UX parity aggiunti

Note precompilate:
- Baseline integration: `tests/integration/funnel-pages-route.test.ts`
- Baseline upload integration: `tests/integration/funnel-pages-upload-route.test.ts`
- Baseline E2E parity: `tests/e2e/funnel-pages-ux-parity.spec.ts`

---

## 8. Pre-PR Gate

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run test`
- [ ] `npm run test:e2e` se applicabile
- [ ] Nessun TODO introdotto senza issue collegata
- [ ] Conformity checklist finale completata

Note stato gate:

- eseguite con esito positivo le suite mirate integration/unit/e2e per NextLand
- non ancora eseguiti in questo ciclo i gate completi su typecheck/lint/test full/e2e full

---

## 9. Note / Deviazioni Intenzionali

| Area | Deviazione | Motivazione | Approvata da |
|------|------------|-------------|--------------|
| Workflow | 2 step invece di 3 | NextLand genera landing + thank-you, non funnel completo | Da definire |
| Recovery UI | Nessuna custom recovery UI dedicata | Si riusa il pattern standard HLF | Da definire |

---

## 10. Sign-Off

| Ruolo | Nome | Stato |
|------|------|-------|
| Developer | Federico | implemented and validated (targeted suites) |
| Reviewer | Da definire | pending |
| Product / Design | Da definire | pending |

La checklist e allineata allo stato as-is del clone NextLand: implementazione core completata e verificata con suite mirate; restano da chiudere i gate full-run prima del merge finale.