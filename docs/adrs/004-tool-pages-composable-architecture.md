# ADR 004: Refactoring Tool Pages a Architettura Composabile

**Data**: 18 Aprile 2026  
**Status**: Accepted (Phase 4 Completed, Phase 5 Completed, Phase 6 Formally Closed)  
**Deciders**: Federico (Lead)  
**Affected Components**: `src/app/tools/funnel-pages/`, `src/app/tools/nextland/`

---

## Problema

I file tool pages (`funnel-pages/page.tsx` e `nextland/page.tsx`) hanno raggiunto **complessità insostenibile**:

- **1162 righe** (funnel-pages) e **1032 righe** (nextland)
- **~95% duplicazione** di codice identico tra i due file
- **40+ state variable** per componente (disorganizzate)
- **8+ custom TypeScript types** definiti localmente
- **5 fasi di workflow** interdipendenti e sparse
- **Impatto AI-assistito negativo**: file saturo → context window insufficiente per modifiche con copilot

### Metriche di Complessità

| Aspetto | Valore | Soglia Ideale | Status |
|---------|--------|---------------|--------|
| Righe per file | 1000+ | <400 | 🔴 Critico |
| Numero state vars | 40+ | <15 | 🔴 Critico |
| Duplicazione | ~95% | <10% | 🔴 Critico |
| Cognitive complexity | Molto alta | Media | 🔴 Critico |
| Testabilità | Bassa | Alta | 🔴 Critico |

### Conseguenze del Status Quo

1. **Sviluppo lento**: Una modifica a UI richiede capire 1000 righe in un unico file
2. **Rischio regressione alto**: Cambiare una callback può rompere logiche sparse in 50+ righe di distanza
3. **Onboarding difficile**: Nuovo sviluppatore non sa da dove iniziare
4. **Testing frammentato**: Unità non isolabili → test integration-only
5. **AI-copilot inefficiente**: Prompt consuma 40% di context window per una modifica localizzata

---

## Contesto di Decisione

### Analisi Comparativa

#### Status Quo
- Rapido prototyping iniziale
- Tutto in un posto (percepito "semplice")
- **Cost**: Maintenance exponential

#### Soluzione: Composable Architecture
- Estratti shared hooks e componenti
- Tool-specific code concentrato in 300 righe
- **Benefit**: Scalabilità lineare, manutenzione centralizzata

**Scelta**: Il progetto è in **fase operativa** (non prototipo). La scalabilità è prerequisito.

---

## Soluzione Proposta

### Nuova Struttura di Directory

```
src/tools/
├── shared/
│   ├── hooks/
│   │   ├── useExtraction.ts          # Orchestrazione extraction + retry
│   │   ├── useStepGeneration.ts      # Generation stream + state management
│   │   └── useStreamParsing.ts       # SSE parsing, error handling
│   ├── types/
│   │   ├── tool.types.ts             # Shared types (steps, phases, UI state)
│   │   └── errors.types.ts           # API error payloads
│   ├── lib/
│   │   ├── retryLogic.ts             # withRetry, backoff, retry meta
│   │   ├── artifactRecovery.ts       # Resume logic + checkpoint parsing
│   │   └── streamHelpers.ts          # streamToText, SSE formatting
│   └── components/
│       ├── ToolSetup.tsx             # Form setup (project, file, options)
│       ├── StatusChecklist.tsx       # Quick status widget
│       ├── StepCard.tsx              # Single step card template
│       ├── ProjectDialog.tsx         # Project selector dialog
│       └── StepStatusBadge.tsx       # Tone + status badges (constants)
├── funnel-pages/
│   ├── page.tsx                      # Main entry (Suspense wrapper)
│   ├── FunnelPagesToolContent.tsx    # Container component (300 righe)
│   ├── types.ts                      # Overrides tool-specific (optin/quiz/vsl)
│   ├── config.ts                     # Constants (TONES, field maps)
│   └── hooks/
│       └── useFunnelGeneration.ts    # Funnel-specific generation orchestration
├── nextland/
│   ├── page.tsx                      # Main entry (Suspense wrapper)
│   ├── NextLandToolContent.tsx       # Container component (280 righe)
│   ├── types.ts                      # Overrides tool-specific (landing/thank_you)
│   ├── config.ts                     # Constants
│   └── hooks/
│       └── useNextLandGeneration.ts  # NextLand-specific generation orchestration
└── extraction/
    ├── page.tsx                      # Shared extraction tool (future)
    └── types.ts
```

### Migrazione dei Componenti Chiave

#### 1. **Shared Types** → `shared/types/tool.types.ts`
```typescript
export type ToolStepKey = FunnelStepKey | NextLandStepKey;

export interface ToolStepState<T extends ToolStepKey = ToolStepKey> {
  key: T;
  title: string;
  status: 'idle' | 'running' | 'done' | 'error';
  content: string;
  artifactId: string | null;
  error: string | null;
}

export type Phase = 'idle' | 'uploading' | 'extracting' | 'review' | 'generating';
export type ToolIntent = 'new' | 'resume' | 'regenerate';
export type ToolUiState = 
  | 'draft-empty' 
  | 'processing-briefing' 
  | 'draft-ready' 
  | 'prefilled-regenerate' 
  | 'paused-with-checkpoint' 
  | 'resume-needs-briefing' 
  | 'running' 
  | 'completed';
```

#### 2. **useExtraction Hook** → `shared/hooks/useExtraction.ts` (~150 righe)
Centralizza: file upload, validazione, stream parsing, error handling

#### 3. **useStepGeneration Hook** → `shared/hooks/useStepGeneration.ts` (~100 righe)
Centralizza: generation stream, retry logic, step orchestration

#### 4. **Shared Components** → `shared/components/`
- `ToolSetup.tsx` (~250 righe) - Form generico
- `StatusChecklist.tsx` (~200 righe) - Widget stato
- `StepCard.tsx` (~80 righe) - Card template
- `ProjectDialog.tsx` (~100 righe) - Dialog selector

#### 5. **Tool-specific Content** → `funnel-pages/FunnelPagesToolContent.tsx` (~300 righe)
```typescript
export function FunnelPagesToolContent() {
  // Usa: useExtraction + useStepGeneration + useArtifactRecovery
  // Compone: ToolSetup, StatusChecklist, StepCard
  
  // Solo logica funnel-specific:
  // - handleRegenerateFunnel (optin → quiz → vsl sequencing)
  // - Primary action deterministico per 3 step
  // - Parsing topic da input.topic === 'funnel_*'
}
```

---

## Benefici Attesi

### Metriche di Miglioramento

| Aspetto | Prima | Dopo | Beneficio |
|---------|-------|------|-----------|
| Righe per tool-page | 1000+ | 300 | **-70%** |
| Condivisione codice | 0% | 70%+ | **Reusabilità x4** |
| Test isolabili | 3 | 15+ | **Copertura x5** |
| Time to modify | 30min | 5min | **6x faster** |
| Cognitive load | Critica | Media | **AI-friendly** ✓ |

### Per lo Sviluppo AI-Assistito
- ✅ File singolo < 400 righe → copilot efficace
- ✅ Hook isolati testabili → modifiche granulari proposte
- ✅ Shared components stable → meno churn nei prompt
- ✅ Config-driven → facile aggiungere nuovi tool

### Per il Team
- ✅ Nuovo tool: copia struttura funnel-pages + override config
- ✅ Modifica UI: aggiorna 1 file condiviso, riflette ovunque
- ✅ Fix bug: centralizzato, non sparpagliato
- ✅ Nuovi step types: estendi tool.types.ts + nuovo tool

---

## Piano di Implementazione

### Fase 1: Setup Infrastruttura (2-3h)
1. Crea `src/tools/shared/` + sottocartelle
2. Estrai type definitions
3. Estrai retry logic, artifact recovery, stream helpers

### Fase 2: Shared Hooks (3-4h)
1. Crea `useExtraction`, `useStepGeneration`, `useArtifactRecovery`
2. Test unitari per ciascun hook

### Fase 3: Shared Components (2-3h)
1. Estrai `ToolSetup`, `StatusChecklist`, `StepCard`, `ProjectDialog`
2. Centralizza badge + color constants

### Fase 4: Refactor Funnel Pages (2h)
1. Ricrea `FunnelPagesToolContent` con import da shared
2. Test end-to-end
3. PR review

### Fase 5: Refactor NextLand (1.5h)
1. Applica struttura da funnel-pages
2. Test e-2-e
3. PR review

### Fase 6: Cleanup + Tests (2h)
1. Cancella file originali
2. Aggiungi integration tests
3. Storie Storybook per shared components

**Tempo totale**: **12-15 ore** (1.5-2 giorni concentrati)

---

## Criteri di Successo

### Definition of Done

1. ✅ `funnel-pages/page.tsx` < 350 righe
2. ✅ `nextland/page.tsx` < 350 righe
3. ✅ 0 duplicazione tra tool pages
4. ⏳ All shared hooks + components testati (>70% coverage)
5. ⏳ PR verde (build + typecheck + lint + test)
6. ⏳ Documentazione pattern in README

### Metriche di Validazione
```bash
wc -l src/app/tools/funnel-pages/page.tsx      # < 350
wc -l src/app/tools/nextland/page.tsx          # < 350
npm run test -- shared/                    # > 70% coverage
```

---

## Referenze Correlate

- [ADR 001: Modular LLM Controller Architecture](./001-modular-llm-controller-architecture.md)
- [ADR 002: Streaming vs Batch Responses](./002-streaming-vs-batch-responses.md)
- [ADR 003: Rate-limiting & Quota Strategy](./003-rate-limiting-quota-strategy.md)

### Spike Tecnico

- **[Spike: Tool Pages Composable Architecture POC](../implementation/spike-tool-pages-composable-architecture-poc-1.md)** — Validazione fattibilità attraverso proof-of-concept (6-8 ore, risoluvi incertezze chiave su types, size reduction, hook composition)
- **[Phase 4 Plan: Funnel Pages Refactor](../implementation/funnel-pages-phase-4-refactor-plan.md)** — Piano esecutivo dettagliato per implementazione Step 4
- **[Phase 5 Plan: NextLand Refactor](../../plan/feature-nextland-phase-5-1.md)** — Piano operativo esecutivo per avvio e completamento della Phase 5

---

## Status

✅ **PHASE 4 COMPLETE (FUNNEL PAGES)** → ✅ **PHASE 5 COMPLETE (NEXTLAND)**

### Implementation Update (2026-04-18)

Refactor Phase 4 eseguito e validato su funnel-pages con decomposizione completa del monolite.

**Risultato dimensionale verificato**:
- `src/app/tools/funnel-pages/page.tsx`: **21 righe**
- `src/app/tools/funnel-pages/FunnelPagesToolContent.tsx`: **285 righe**

**Nuovi moduli funnel-specific creati**:
- `src/app/tools/funnel-pages/config.ts`
- `src/app/tools/funnel-pages/types.ts`
- `src/app/tools/funnel-pages/components/FunnelSetupCard.tsx`
- `src/app/tools/funnel-pages/components/FunnelStatusQuick.tsx`
- `src/app/tools/funnel-pages/components/FunnelStepCards.tsx`
- `src/app/tools/funnel-pages/hooks/useFunnelGeneration.ts`
- `src/app/tools/funnel-pages/hooks/useFunnelRecovery.ts`
- `src/app/tools/funnel-pages/hooks/useFunnelExtraction.ts`
- `src/app/tools/funnel-pages/hooks/useFunnelUiState.ts`

**Gate tecnici Phase 4**:
- ✅ `typecheck` verde
- ✅ `lint` verde
- ✅ test matrix Phase 4 verde (56/56)
- ✅ parity funzionale confermata su flow upload/extraction/retry/resume/generation

### Implementation Update (2026-04-18, sera) — Phase 5 Closed

Refactor NextLand completato con decomposizione del monolite e allineamento al pattern composabile usato in Funnel.

**Risultato dimensionale verificato**:
- `src/app/tools/nextland/page.tsx`: **20 righe**
- `src/app/tools/nextland/NextLandToolContent.tsx`: **282 righe**

**Nuovi moduli nextland-specific creati**:
- `src/app/tools/nextland/config.ts`
- `src/app/tools/nextland/types.ts`
- `src/app/tools/nextland/components/NextLandSetupCard.tsx`
- `src/app/tools/nextland/components/NextLandStatusQuick.tsx`
- `src/app/tools/nextland/components/NextLandStepCards.tsx`
- `src/app/tools/nextland/hooks/useNextLandGeneration.ts`
- `src/app/tools/nextland/hooks/useNextLandRecovery.ts`
- `src/app/tools/nextland/hooks/useNextLandExtraction.ts`
- `src/app/tools/nextland/hooks/useNextLandUiState.ts`

**Test hook NextLand aggiunti (targeted)**:
- `tests/unit/useNextLandGeneration.test.ts`
- `tests/unit/useNextLandRecovery.test.ts`
- `tests/unit/useNextLandExtraction.test.ts`
- `tests/unit/useNextLandUiState.test.ts`

### Next Gate
Proceed to Phase 6 (cleanup finale, estensione copertura shared, documentazione pattern README).

### Implementation Update (2026-04-18, notte) — Phase 6 Started

Phase 6 avviata con primo incremento su copertura test NextLand.

**Nuovi test introdotti in avvio Phase 6**:
- `tests/unit/tools/nextland/nextland-setup-card.test.tsx`
- `tests/unit/tools/nextland/nextland-step-cards.test.tsx`
- `tests/integration/nextland-page-flow.test.tsx`

**Validazione kickoff Phase 6**:
- ✅ 3/3 suite verdi
- ✅ 7/7 test verdi

**Workstream Phase 6 (snapshot iniziale)**:
- cleanup file legacy/residui del refactor tool-pages
- estensione copertura shared hooks/components fino al target documentato
- consolidamento documentazione pattern nel README principale

### Implementation Update (2026-04-18, notte) — Shared Coverage Extended + Final Gate Closed

Copertura shared hooks/components estesa con nuove suite dedicate:
- `tests/unit/shared/useStepGeneration.test.ts`
- `tests/unit/shared/useExtraction.test.ts`
- `tests/unit/shared/step-card.test.tsx`
- `tests/unit/shared/status-checklist.test.tsx`

Esito validazione nuova copertura shared:
- ✅ 4/4 suite verdi
- ✅ 9/9 test verdi

Gate tecnico finale eseguito e chiuso su stato corrente:
- ✅ `npm run typecheck`
- ✅ `npm run lint`
- ✅ `npm run test` (69 suite, 456 test)
- ✅ `npm run build`
- ✅ `npx playwright test --config .tmp-playwright.reuse.config.ts` (25/25 test E2E)

### Implementation Update (2026-04-18, notte) — Phase 6 Formally Closed

Chiusura formale del perimetro ADR completata dopo validazione finale e riallineamento documentale.

Conferme finali di chiusura:
- ✅ cleanup residui legacy/dead-path verificato sul perimetro tool-pages
- ✅ estensione copertura shared hooks/components completata
- ✅ pattern composabile consolidato nel README principale
- ✅ ADR, implement-index e piano operativo allineati allo stato finale

### Spike Execution Results (2026-04-18)

**POC Code Created**: `src/tools/shared/` (545 lines)
- ✅ Type architecture: `tool.types.ts` (85 lines)
- ✅ Retry logic: `retryLogic.ts` (76 lines)
- ✅ Stream helpers: `streamHelpers.ts` (40 lines)
- ✅ useExtraction hook: `useExtraction.ts` (211 lines)
- ✅ useStepGeneration hook: `useStepGeneration.ts` (120 lines)
- ✅ Barrel exports: `index.ts` (13 lines)

### Go/No-Go Decision: **✅ GO**

All spike success criteria **MET & EXCEEDED**:
- ✅ Type safety: **ZERO** TypeScript errors, full generics, no `any`
- ✅ Size target: **545 lines** of shared code (vs 400+ inline per file)
- ✅ Hook composition: Hooks work standalone, clean separation
- ✅ Reusability: **70%+ code shared** between tools
- ✅ No blockers: Architecture validated, ready for implementation

### Closure
ADR 004 chiuso formalmente su scope Phase 4-5-6 con gate tecnici e E2E finali verdi.
