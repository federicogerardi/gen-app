---
goal: Blueprint tecnico precompilato per clonare NextLand a partire da HLF
version: 1.5
date_created: 2026-04-18
date_updated: 2026-04-18
status: Active
tags: [runbook, tool-cloning, blueprint, nextland, planning]
---

# NextLand Tool Cloning Blueprint

Documento di preparazione e allineamento operativo per il clone NextLand.

Scopo: usare HotLeadFunnel come reference implementation per costruire un tool con upload + extraction, due step generativi e capability di resume, retry e quota per step.

Stato corrente: **implementazione completata e gate tecnici chiusi** (typecheck, lint, test full suite 69/69, build, E2E 25/25). Architettura composable ADR 004 applicata su entrambi i tool.

---

## Snapshot Implementazione (as-is — post ADR 004 Phase 5)

### Layer API e Prompt (invariati rispetto a versione pre-refactor)

- `src/app/api/tools/nextland/generate/route.ts`
- `src/app/api/tools/nextland/upload/route.ts`
- `src/lib/tool-prompts/nextland.ts`, `src/lib/tool-prompts/nextland-templates.ts`
- `src/lib/tool-prompts/prompts/tools/nextland/*`
- `src/lib/tool-prompts/registry.ts`, `src/lib/tool-prompts/templates.ts`

### Layer Frontend (architettura composable — aggiornato ADR 004 Phase 5)

- `src/app/tools/nextland/page.tsx` — thin Suspense wrapper (~20 righe)
- `src/app/tools/nextland/NextLandToolContent.tsx` — container (~282 righe)
- `src/app/tools/nextland/config.ts` — TONES, initialSteps, badge class maps
- `src/app/tools/nextland/types.ts` — re-export `@/tools/shared` + `NextLandStepState`
- `src/app/tools/nextland/hooks/useNextLandGeneration.ts`
- `src/app/tools/nextland/hooks/useNextLandRecovery.ts`
- `src/app/tools/nextland/hooks/useNextLandExtraction.ts`
- `src/app/tools/nextland/hooks/useNextLandUiState.ts`
- `src/app/tools/nextland/components/NextLandSetupCard.tsx`
- `src/app/tools/nextland/components/NextLandStatusQuick.tsx`
- `src/app/tools/nextland/components/NextLandStepCards.tsx`

### Shared library (condivisa con HLF — non modificare)

- `src/tools/shared/` — types, hooks, lib, components, index.ts

### Integrations e artifact support

- `src/lib/artifact-relaunch.ts`, `src/lib/artifact-preview.ts`, `src/lib/artifact-card-identity.ts`
- `src/app/artifacts/[id]/page.tsx`
- `src/lib/types/artifact.ts`, `src/lib/tool-routes/artifact-type-map.ts`

### Copertura test completata

- `tests/integration/nextland-route.test.ts`, `tests/integration/nextland-upload-route.test.ts`
- `tests/unit/useNextLandGeneration.test.ts`, `tests/unit/useNextLandRecovery.test.ts`
- `tests/unit/useNextLandExtraction.test.ts`, `tests/unit/useNextLandUiState.test.ts`
- `tests/unit/tools/nextland/nextland-setup-card.test.tsx`, `tests/unit/tools/nextland/nextland-step-cards.test.tsx`
- `tests/integration/nextland-page-flow.test.tsx`
- `tests/e2e/nextland-retry-resume.spec.ts`, `tests/e2e/nextland-ux-parity.spec.ts`

### Gate tecnici chiusi (2026-04-18)

- ✅ `npm run typecheck`
- ✅ `npm run lint`
- ✅ `npm run test` (69 suite, 456 test)
- ✅ `npm run build`
- ✅ `npx playwright test` (25/25 E2E)

---

## 1. Tool Identity

| Campo | Valore |
|-------|--------|
| Tool name | NextLand |
| Tool slug | `nextland` |
| Complexity tier | Very Complex |
| Complexity score | 6/8 |
| Reference implementation | `funnel-pages` |
| Branch di lavoro | Da definire |
| Owner | Federico |
| Data compilazione | 2026-04-18 |

### Disposizione Gate Architetturale

NextLand ricade nel tier `Very Complex` secondo il runbook generale. Per questo dossier specifico il gate architetturale e considerato soddisfatto come `eccezione documentata`, perche:

- il clone resta intenzionalmente dentro i pattern gia verificati di HLF
- non introduce nuovi pattern architetturali fuori perimetro
- riduce la pipeline da 3 step a 2 step mantenendo upload, extraction, retry, resume e artifact-first flow gia esistenti
- il delta principale e di contenuto e naming, non di architettura applicativa

**Esito per NextLand**: `GO` al kickoff operativo del clone, senza estensioni framework richieste in questa fase.

---

## 2. Product Scope Snapshot

| Area | Decisione |
|------|-----------|
| Primary input | Upload file + project context |
| Extraction required | Yes. Riusa il contesto di extraction gia usato da HLF |
| Generative steps | 2 step: landing page copy + thank-you page copy |
| Final outputs | Due artifact content coordinati |
| Resume/checkpoint | Yes |
| Retry with backoff | Yes |
| Quota model | Yes. Un singolo step vale 1 nella quota |
| Custom recovery UI | No |
| LLM model strategy | Single model, coerente con HLF attuale |

**Non-goals dichiarati**:
- Non replicare il funnel HLF a 3 step.
- Non introdurre multi-model orchestration.
- Non introdurre custom recovery UI oltre al pattern resume/retry gia esistente.

### Regola di Chaining del Contesto

Per mantenere coerenza esplicita con HLF, NextLand usa il pattern `contesto invariato + output step precedenti`, non un contesto derivato che viene riscritto step dopo step.

| Step | Contesto ricevuto |
|------|-------------------|
| `nextland_landing` | `extractionContext` |
| `nextland_thank_you` | `extractionContext` + output `nextland_landing` |

---

## 3. Reference-to-Target Mapping

| Concern | Source reference | Target artifact | Delta atteso |
|---------|------------------|-----------------|--------------|
| Upload + extraction | `src/app/api/tools/funnel-pages/upload/route.ts` | `src/app/api/tools/nextland/upload/route.ts` | Riuso quasi completo del flusso upload; cambia solo namespace tool |
| Generation route | `src/app/api/tools/funnel-pages/generate/route.ts` | `src/app/api/tools/nextland/generate/route.ts` | Riduzione da 3 step a 2; `workflowType: nextland`, topic `nextland_landing` e `nextland_thank_you` |
| Prompt builder | `src/lib/tool-prompts/funnel-pages.ts` | `src/lib/tool-prompts/nextland.ts` | Sostituire optin/quiz/vsl con landing/thank-you |
| Static templates | `src/lib/tool-prompts/funnel-templates.ts` | `src/lib/tool-prompts/nextland-templates.ts` | Template runtime per due step |
| Prompt source | `src/lib/tool-prompts/prompts/tools/hl_funnel/*` | `src/lib/tool-prompts/prompts/tools/nextland/*` | Nuovi markdown sorgente orientati a landing e thank-you |
| UI page | `src/app/tools/funnel-pages/FunnelPagesToolContent.tsx` | `src/app/tools/nextland/NextLandToolContent.tsx` | State machine simile, step UI rinominati e semplificati |
| Checkpoint logic | `src/app/tools/funnel-pages/hooks/useFunnelRecovery.ts` | `src/app/tools/nextland/hooks/useNextLandRecovery.ts` | Riuso del pattern artifact-first / resume |
| Retry logic | `src/app/tools/funnel-pages/hooks/useFunnelGeneration.ts` | `src/app/tools/nextland/hooks/useNextLandGeneration.ts` | Riuso del wrapper `withRetry` con messaging adattato |
| Integration tests | `tests/integration/funnel-pages-route.test.ts` | `tests/integration/nextland-route.test.ts` | Coprire step landing e thank-you invece di optin/quiz/vsl |
| Upload tests | `tests/integration/funnel-pages-upload-route.test.ts` | `tests/integration/nextland-upload-route.test.ts` | Riuso quasi completo |
| E2E tests | `tests/e2e/funnel-pages-retry-resume.spec.ts` | `tests/e2e/nextland-retry-resume.spec.ts` | Retry extraction + resume adattati al journey NextLand |

Principio guida del clone:

- riusare HLF dove il pattern e gia corretto
- cambiare solo naming, numero step e contenuto dei prompt
- non introdurre nuovi pattern architetturali

---

## 4. File-by-File Implementation Map

| Layer | Source file | Target file | Action | Required delta | Status |
|------|-------------|-------------|--------|----------------|--------|
| API | `src/app/api/tools/funnel-pages/generate/route.ts` | `src/app/api/tools/nextland/generate/route.ts` | adapt | Step union a 2 valori, workflowType dedicato, prompt builder dedicati | done |
| API | `src/app/api/tools/funnel-pages/upload/route.ts` | `src/app/api/tools/nextland/upload/route.ts` | copy | Namespace tool aggiornato, riuso validazione upload | done |
| UI | `src/app/tools/funnel-pages/FunnelPagesToolContent.tsx` | `src/app/tools/nextland/NextLandToolContent.tsx` | adapt | Step titles, CTA, output model, content labels | done |
| Prompt | `src/lib/tool-prompts/funnel-pages.ts` | `src/lib/tool-prompts/nextland.ts` | adapt | `buildLandingPrompt()` e `buildThankYouPrompt()` | done |
| Prompt | `src/lib/tool-prompts/funnel-templates.ts` | `src/lib/tool-prompts/nextland-templates.ts` | adapt | Due template statici runtime | done |
| Prompt source | `src/lib/tool-prompts/prompts/tools/hl_funnel/prompt_optin_generator.md` | `src/lib/tool-prompts/prompts/tools/nextland/prompt_landing_generator.md` | adapt | Copy system per landing page | done |
| Prompt source | `src/lib/tool-prompts/prompts/tools/hl_funnel/prompt_quiz_generator.md` | `src/lib/tool-prompts/prompts/tools/nextland/prompt_thank_you_generator.md` | adapt | Step 2 usa sia extraction context sia output landing come contesto upstream | done |
| Prompt source | `src/lib/tool-prompts/prompts/tools/hl_funnel/prompt_vsl_generator.md` | Nessuno | drop | Step 3 non previsto in NextLand | done |
| Registry | `src/lib/tool-prompts/registry.ts` | `src/lib/tool-prompts/registry.ts` | adapt | Aggiungere mapping NextLand | done |
| Tool routes | `src/lib/tool-routes/funnel-mapping.ts` | `src/lib/tool-routes/funnel-mapping.ts` | reuse | Mapping extraction HLF confermato come riusabile senza fork | done |
| Integration test | `tests/integration/funnel-pages-route.test.ts` | `tests/integration/nextland-route.test.ts` | adapt | Validation per step 2 dipendente da output step 1 | done |
| Integration test | `tests/integration/funnel-pages-upload-route.test.ts` | `tests/integration/nextland-upload-route.test.ts` | copy | Riuso test upload/extraction | done |
| Unit test | `tests/unit/tool-prompts.test.ts` | `tests/unit/tool-prompts.test.ts` | adapt | Prompt builder NextLand coperti nel file unit esistente | done |
| Unit test | `tests/unit/artifact-relaunch.test.ts` | `tests/unit/artifact-relaunch.test.ts` | adapt | Relaunch resume/regenerate NextLand | done |
| E2E test | `tests/e2e/funnel-pages-retry-resume.spec.ts` | `tests/e2e/nextland-retry-resume.spec.ts` | adapt | Resume e retry su journey a 2 step | done |
| E2E test | `tests/e2e/funnel-pages-ux-parity.spec.ts` | `tests/e2e/nextland-ux-parity.spec.ts` | adapt | Keyboard, mobile, zoom, focus parity | done |

---

## 5. Request / Response Contract Alignment

| Area | Decisione target | Verifica |
|------|------------------|----------|
| Request schema | `projectId`, `model`, `tone`, `step`, `extractionContext`, output step 1 per lo step thank-you | Implementato (`v2`/`v3` schema) |
| Error shape | `{ error: { code, message } }` | Preservato |
| SSE contract | Identico agli altri tool di generation | Preservato |
| Ownership checks | `projectId` su upload e generate | Implementato |
| Rate limit timing | Prima della chiamata LLM | Implementato |
| Artifact persistence | `workflowType: nextland`; un artifact per step generativo con topic `nextland_landing` e `nextland_thank_you`, piu extraction separata | Confermato |
| Step chaining contract | `nextland_thank_you` richiede sempre `extractionContext` + output `nextland_landing` | Confermato |

---

## 6. State Machine e UX Parity

### Stati UI previsti

| Stato | Descrizione | Parita con reference |
|------|-------------|----------------------|
| `idle` | Pagina iniziale senza briefing caricato | same |
| `uploading` | Upload file in corso | same |
| `extracting` | Estrazione contesto dal file caricato | same |
| `review` | Revisione contesto estratto prima della generazione | same |
| `generating-landing` | Generazione step 1 landing page | adapted |
| `generating-thank-you` | Generazione step 2 thank-you page | adapted |
| `completed` | Entrambi gli output disponibili | adapted |
| `error` | Errore di upload, extraction o generation | same |

### Delta UX intenzionali

- Sostituire la progressione optin / quiz / vsl con landing / thank-you.
- Mantenere pattern artifact-first, retry e resume gia presenti in HLF.
- Non introdurre recovery UI custom oltre agli stati e messaggi standard gia esistenti.

---

## 7. Recovery, Retry e Quota

| Capability | Decisione | Note implementative |
|------------|-----------|---------------------|
| Resume da artifacts | Yes | Riusare il pattern di artifacts query e intent `resume` presente in HLF |
| Checkpoint recovery | Yes | Prefill di extraction context e output gia completati |
| Retry con backoff | Yes | Riuso `withRetry` lato UI con messaging step-specifico |
| Quota per step | Yes | Ogni step generativo vale 1 unita quota |
| Partial failure handling | Yes | Se step 2 fallisce, step 1 landing resta valido e riusabile |

---

## 8. Test Plan Minimo

### Integration

- [x] Unauthorized request returns 401
- [x] Foreign ownership returns 403
- [x] Invalid payload returns 400 with `VALIDATION_ERROR`
- [ ] Rate limit failure returns expected code
- [x] Happy path returns SSE stream for landing step
- [x] Step thank-you requires landing output upstream

Path target:
- `tests/integration/nextland-route.test.ts`
- `tests/integration/nextland-upload-route.test.ts`

### Unit

- [x] Prompt builder landing
- [x] Prompt builder thank-you
- [x] Placeholder interpolation from extraction context
- [x] Mapping registry/template NextLand verificato
- [x] Relaunch helper behavior per NextLand verificato

Path target:
- `tests/unit/tool-prompts.test.ts`
- `tests/unit/tool-prompts-parity.test.ts`
- `tests/unit/artifact-relaunch.test.ts`
- `tests/unit/llm-orchestrator-normalization.test.ts`

### E2E

- [x] Upload file
- [x] Extraction preview
- [x] Full generation flow landing -> thank-you
- [x] Resume from checkpoint with completed landing
- [x] Retry extraction and retry generation feedback
- [x] Responsive and accessibility parity on key interactions

Path target:
- `tests/e2e/nextland-retry-resume.spec.ts`
- `tests/e2e/nextland-ux-parity.spec.ts`

---

## 9. Decisioni Fissate

- `workflowType`: `nextland`
- topic step 1: `nextland_landing`
- topic step 2: `nextland_thank_you`
- chaining: `nextland_thank_you` riceve `extractionContext + output nextland_landing`
- mapping extraction: riuso di `funnel-mapping.ts` senza fork
- recovery UI custom: non prevista
- blocker critici documentali: nessuno

---

## 10. Exit Criteria Prima Di Implementare

- [x] Complexity tier approvato
- [x] Reference implementation scelta e confermata
- [x] File mapping iniziale compilato
- [x] Delta intenzionali di alto livello esplicitati
- [x] Slug tool confermato (`nextland`)
- [x] Contract funzionale step-to-step chiarito
- [x] Piano test minimo rifinito sui path definitivi
- [x] Nessun blocker aperto critico

Verdetto documentale: `GO` confermato su implementazione core NextLand nel perimetro HLF-like descritto in questo blueprint.