---
goal: File structure minima richiesta e naming conventions per tool clones
version: 1.3
date_created: 2026-04-17
date_updated: 2026-04-18
status: Active
tags: [runbook, tool-cloning, anatomy, file-structure]
---

# Anatomia di un Tool (File Structure)

Ogni tool richiede questa struttura minima.

> ⚠️ **Aggiornato il 2026-04-18** — Il layout frontend riflette l'architettura composable introdotta con ADR 004 (Phase 4-5). La reference implementation è ora `src/app/tools/funnel-pages/` (HLF) o `src/app/tools/nextland/`. Il vecchio pattern monolitico in page.tsx è obsoleto.

---

## Directory Layout Standard

```
src/
├── tools/
│   └── shared/                          [Libreria condivisa tra tutti i tool]
│       ├── types/
│       │   └── tool.types.ts            [ToolStepState<T>, Phase, ToolIntent, ToolUiState, ecc.]
│       ├── hooks/
│       │   ├── useExtraction.ts         [Orchestrazione upload + extraction + retry]
│       │   └── useStepGeneration.ts     [Generation stream + state management]
│       ├── lib/
│       │   ├── retryLogic.ts            [withRetry, RetryableRequestError, backoff]
│       │   └── streamHelpers.ts         [streamToText, SSE helpers]
│       ├── components/
│       │   ├── ToolSetup.tsx            [Form setup generico]
│       │   ├── StatusChecklist.tsx      [Widget stato step]
│       │   ├── StepCard.tsx             [Template card singolo step]
│       │   └── ProjectDialog.tsx        [Selector progetto]
│       └── index.ts                     [Barrel export pubblico — usare questo come import]
│
├── app/
│   ├── api/tools/
│   │   └── {{TOOL_SLUG}}/
│   │       ├── upload/route.ts          [Opzionale: file upload + extraction]
│   │       ├── generate/route.ts        [RICHIESTO: generazione LLM (single o multi-step)]
│   │       └── [checkpoint]/route.ts   [Opzionale: route checkpoint dedicata]
│   └── tools/
│       └── {{TOOL_SLUG}}/
│           ├── page.tsx                 [SOLO Suspense wrapper + import ToolContent — ~20 righe]
│           ├── {{TOOL_TITLE}}ToolContent.tsx  [Container: compone setup/status/steps via hooks — ~280 righe]
│           ├── config.ts                [Costanti: TONES, initialSteps, STEP_STATUS_BADGE_CLASS, ecc.]
│           ├── types.ts                 [Re-export @/tools/shared + ToolStepState<{{TOOL_TITLE}}StepKey>]
│           ├── hooks/
│           │   ├── use{{TOOL_TITLE}}Generation.ts  [Generation stream per step + retry — usa @/tools/shared]
│           │   ├── use{{TOOL_TITLE}}Recovery.ts    [Resume artifact + checkpoint parsing]
│           │   ├── use{{TOOL_TITLE}}Extraction.ts  [Upload file + extraction state — se applicable]
│           │   └── use{{TOOL_TITLE}}UiState.ts     [Calcolo uiState derivato da phase/steps/intent]
│           └── components/
│               ├── {{TOOL_TITLE}}SetupCard.tsx     [Form setup tool-specific (compone ToolSetup)]
│               ├── {{TOOL_TITLE}}StatusQuick.tsx   [Widget stato tool-specific (compone StatusChecklist)]
│               └── {{TOOL_TITLE}}StepCards.tsx     [Step cards tool-specific (compone StepCard)]
│
└── lib/
    ├── tool-prompts/
    │   ├── prompts/tools/{{TOOL_SLUG}}/
    │   │   ├── *.md                     [Sorgenti markdown per step (source of truth)]
    │   │   └── [Subdirs per step]
    │   ├── {{TOOL_SLUG}}.ts             [Builder: (input) → PromptTemplate]
    │   └── {{TOOL_SLUG}}-templates.ts   [Template statici runtime (obbligatorio se multi-step)]
    │
    ├── tool-routes/
    │   ├── {{TOOL_SLUG}}-extraction.ts  [Parser extraction context (se needed)]
    │   ├── schemas.ts                   [Zod schema per tool request + extraction]
    │   └── responses.ts                 [Helpers errori standard]
    │
    └── types/
        └── artifact.ts                  [Aggiungere {{TOOL_SLUG}} workflow type + step keys]

tests/
├── integration/
│   ├── {{TOOL_SLUG}}-route.test.ts     [POST handler scenarios: auth, ownership, rate limit, stream]
│   └── [{{TOOL_SLUG}}-extraction.test.ts] [Upload + extraction se applicable]
│
├── unit/
│   ├── {{TOOL_SLUG}}.test.ts           [Builder prompt per ogni step]
│   ├── use{{TOOL_TITLE}}Generation.test.ts   [Hook generation: retry, step sequencing, error]
│   ├── use{{TOOL_TITLE}}Recovery.test.ts     [Hook recovery: resume, checkpoint parse]
│   ├── use{{TOOL_TITLE}}Extraction.test.ts   [Hook extraction: upload, lifecycle state]
│   ├── use{{TOOL_TITLE}}UiState.test.ts      [Hook uiState: derivazione da inputs]
│   └── tools/{{TOOL_SLUG}}/
│       ├── {{TOOL_SLUG}}-setup-card.test.tsx [Componente SetupCard]
│       └── {{TOOL_SLUG}}-step-cards.test.tsx [Componente StepCards]
│
└── e2e/
    └── {{TOOL_SLUG}}-ux-parity.spec.ts [Full user workflow + ux parity]
```

---

## Naming Conventions

**RICHIESTO**: Applicare coerentemente a tutti i nuovi file tool.

### Slug e Titoli

- **`{{TOOL_SLUG}}`**: kebab-case, es. `meta-ads`, `content-gen`, `funnel-pages`
  - Usato per path URL: `/tools/{{TOOL_SLUG}}`
  - Usato per nome file: `{{TOOL_SLUG}}.ts`, `{{TOOL_SLUG}}-extraction.ts`
  
- **`{{TOOL_TITLE}}`**: PascalCase per TypeScript types
  - Es. `ContentGen`, `FunnelPages`, `MetaAds`
  - Usato per nomi tipo: `type {{TOOL_TITLE}}Input`, `function build{{TOOL_TITLE}}Prompt()`

### Per Multi-Step Tools

Se il tool ha pipeline sequenziale (step1 → step2 → step3):

- Usa nomi domain-specific se possibile: `optin`, `quiz`, `vsl` (HLF example)
- Altrimenti numerico: `step1`, `step2`, `step3`
- File prompt: `optin.md`, `quiz.md`, `vsl.md` OR `step1.md`, `step2.md`, `step3.md`
- Builder exports: `buildOptinPrompt()`, `buildQuizPrompt()`, etc.

### File Naming

- **Api routes**: lowercase + kebab-case suffixes (NO spaces, NO CamelCase)
  - ✅ `content-gen-extraction.ts`
  - ❌ `contentGenExtraction.ts`, `content_gen_extraction.ts`
  
- **Library files**: lowercase + kebab-case suffixes per type
  - `-extraction.ts`: Extract preprocessing logic
  - `-orchestrator.ts`: State machine + sequencing
  - `-schema.ts`: Zod schemas (inside shared `schemas.ts`)
  - `-templates.ts`: Static template constants
  - `.test.ts`: Test files (co-located)

- **Prompt files**: lowercase + kebab-case + domain-rich names
  - ✅ `optin-generation-prompt.md`, `quiz-prompt.md`
  - ❌ `prompt.md`, `p1.md`, `template.md`

---

## Minimal File Checklist

**EVERY tool clone must include minimum**:

```
✅ src/app/api/tools/{{TOOL_SLUG}}/generate/route.ts
   └─ POST handler with auth → ownership → rate limit → validate → stream

✅ src/lib/tool-prompts/{{TOOL_SLUG}}.ts
   └─ Prompt builder function, static template, no runtime fs

✅ src/app/tools/{{TOOL_SLUG}}/page.tsx
   └─ Thin Suspense wrapper che monta `{{TOOL_TITLE}}ToolContent`

✅ tests/integration/{{TOOL_SLUG}}-route.test.ts
   └─ Auth, ownership, validation, stream scenarios (≥4 test cases)

✅ tests/unit/{{TOOL_SLUG}}.test.ts
   └─ Prompt builder edge cases (≥3 test cases)

✅ src/lib/tool-prompts/prompts/tools/{{TOOL_SLUG}}/generate.md
   └─ Markdown sorgente (source of truth per prompt)
```

---

## Optional File Patterns (If Complexity Demands)

### If Tool Has File Upload + Extraction

Add:
```
✅ src/app/api/tools/{{TOOL_SLUG}}/upload/route.ts
   └─ File validation, text extraction, context building

✅ src/lib/tool-routes/{{TOOL_SLUG}}-extraction.ts
   └─ Parser logic, file type handling, error recovery

✅ tests/integration/{{TOOL_SLUG}}-extraction.test.ts
   └─ Happy path, validation failures, edge cases
```

### If Tool Has Recovery / Checkpoint

Add:
```
✅ Strategy A (route dedicata): src/app/api/tools/{{TOOL_SLUG}}/checkpoint/route.ts
   └─ POST (save), GET (load), DELETE (drop)

OR

✅ Strategy B (riuso artifacts): src/app/api/artifacts/route.ts + query mirata per resume
   └─ Recupero checkpoint da artifacts esistenti per project/workflow

✅ src/lib/tool-routes/{{TOOL_SLUG}}-checkpoint.ts
   └─ Checkpoint schema, persistence logic
```

### If Tool Has Multi-Step Orchestration

Add:
```
✅ src/app/tools/{{TOOL_SLUG}}/hooks/use{{TOOL_TITLE}}Generation.ts
   └─ Sequencing degli step, chaining del contesto, retry lato UI

✅ src/app/tools/{{TOOL_SLUG}}/types.ts
   └─ Step key union tipizzata + ToolStepState<StepKey>

✅ tests/unit/use{{TOOL_TITLE}}Generation.test.ts
   └─ Happy path multi-step, failure recovery, partial completion
```

### If Tool Uses Dynamic Prompts Per Step

Add:
```
src/lib/tool-prompts/prompts/tools/{{TOOL_SLUG}}/
├── step1/
│   ├── optin-prompt.md        (if domain-specific names)
│   └── instructions.md        (if shared instructions)
├── step2/
│   ├── quiz-prompt.md
│   └── instructions.md
└── step3/
    ├── vsl-prompt.md
    └── instructions.md
```

---

## File Structure Example: Simple Tool

**Tool**: Blog Post Generator (`blog-gen`)

```
src/
├── app/api/tools/blog-gen/
│   └── generate/route.ts
├── app/tools/blog-gen/
│   ├── page.tsx
│   ├── BlogGenToolContent.tsx
│   ├── config.ts
│   ├── types.ts
│   ├── hooks/
│   │   └── useBlogGenGeneration.ts
│   └── components/
│       └── BlogGenSetupCard.tsx
└── lib/tool-prompts/
    ├── blog-gen.ts             (Builder)
   ├── prompts/tools/blog-gen/
    │   └── generate.md         (Source)
    └── [shared: schemas.ts, responses.ts]

tests/
├── integration/blog-gen-route.test.ts
└── unit/
   ├── blog-gen.test.ts
   └── useBlogGenGeneration.test.ts
```

---

## File Structure Example: Complex Tool (HLF-like)

**Tool**: HotLeadFunnel (`funnel-pages`)

```
src/
├── app/api/tools/funnel-pages/
│   ├── generate/route.ts
│   └── upload/route.ts
├── app/api/artifacts/
│   └── route.ts
├── app/tools/funnel-pages/
│   ├── page.tsx
│   ├── FunnelPagesToolContent.tsx
│   ├── config.ts
│   ├── types.ts
│   ├── hooks/
│   │   ├── useFunnelGeneration.ts
│   │   ├── useFunnelRecovery.ts
│   │   ├── useFunnelExtraction.ts
│   │   └── useFunnelUiState.ts
│   └── components/
│       ├── FunnelSetupCard.tsx
│       ├── FunnelStatusQuick.tsx
│       └── FunnelStepCards.tsx
└── lib/
    ├── tool-prompts/
    │   ├── funnel-pages.ts             (Orchestrator builder)
    │   ├── funnel-pages-templates.ts   (Static templates)
   │   └── prompts/tools/hl_funnel/
    │       ├── step1/
    │       │   └── optin-prompt.md
    │       ├── step2/
    │       │   └── quiz-prompt.md
    │       └── step3/
    │           └── vsl-prompt.md
    ├── tool-routes/
    │   ├── funnel-pages-extraction.ts
    │   ├── funnel-pages-checkpoint.ts
   │   └── [shared: schemas.ts, responses.ts]
   └── [shared: llm orchestrator/provider modules]

tests/
├── integration/
│   ├── funnel-pages-route.test.ts
│   └── funnel-pages-extraction.test.ts
├── unit/
│   ├── funnel-pages.test.ts
│   ├── useFunnelGeneration.test.ts
│   ├── useFunnelRecovery.test.ts
│   ├── useFunnelExtraction.test.ts
│   ├── useFunnelUiState.test.ts
│   └── tools/funnel-pages/
│       ├── funnel-pages-setup-card.test.tsx
│       └── funnel-pages-step-cards.test.tsx
└── e2e/
   ├── funnel-pages-ux-parity.spec.ts
   └── funnel-pages-retry-resume.spec.ts
```

---

## Anti-Patterns (DON'T DO)

```
❌ src/app/api/tools/blog_gen/           (use kebab-case, not snake_case)
❌ src/lib/tool-prompts/BlogGen.ts       (use kebab-case, not PascalCase)
❌ src/lib/tool-prompts/prompts/tools/blog-gen/prompt.md    (too generic, add type)
❌ tests/blog-gen.test.ts                (MUST co-locate: tests/*.test.ts)
❌ src/lib/tool-prompts/blog-gen-prompt-template.ts   (redundant suffix)
❌ templates/blog-gen-template.md        (no custom templates folders outside lib/)
```

---

## Next Step

Procedi a **[tool-cloning-complexity-check.md](/docs/implementation/tool-cloning/core/tool-cloning-complexity-check.md)** per auto-classificare il tool e stimare il tempo di work.
