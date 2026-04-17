---
goal: File structure minima richiesta e naming conventions per tool clones
version: 1.2
date_created: 2026-04-17
date_updated: 2026-04-17
status: Active
tags: [runbook, tool-cloning, anatomy, file-structure]
---

# Anatomia di un Tool (File Structure)

Ogni tool richiede questa struttura minima:

---

## Directory Layout Standard

```
src/
├── app/
│   ├── api/tools/
│   │   └── {{TOOL_SLUG}}/
│   │       ├── upload/route.ts      [Opzionale: file upload + extraction]
│   │       ├── generate/route.ts    [RICHIESTO: generazione LLM (single o multi-step)]
│   │       └── [checkpoint]/route.ts [Opzionale: route dedicata checkpoint se non riusi artifacts]
│   └── tools/
│       └── {{TOOL_SLUG}}/
│           └── page.tsx             [UI client page con state machine se complex]
│
└── lib/
    ├── tool-prompts/
    │   ├── prompts/{{TOOL_SLUG}}/
    │   │   ├── *.md                 [Sorgenti markdown (source of truth)]
    │   │   └── [Subdirs per step]   [Se multi-step: step1/, step2/, step3/]
    │   ├── {{TOOL_SLUG}}.ts         [Builder: (input) → PromptTemplate (può dispatcha per step)]
    │   └── [optional] {{TOOL_SLUG}}-templates.ts  [Template statici se complessi]
    │
    ├── tool-routes/
    │   ├── {{TOOL_SLUG}}-extraction.ts [Parser extraction context (se needed)]
    │   ├── schemas.ts               [Zod schema per tool request + extraction]
    │   └── responses.ts             [Helpers errori standard]
    │
    └── orchestrator/ (Opzionale per complex workflows)
        └── {{TOOL_SLUG}}-orchestrator.ts [State machine + step sequencing logic]

tests/
├── integration/
│   ├── {{TOOL_SLUG}}-route.test.ts [POST /api/tools/{{TOOL_SLUG}}/generate scenarios]
│   └── [{{TOOL_SLUG}}-extraction.test.ts] [Upload + extraction if applicable]
│
├── unit/
│   ├── {{TOOL_SLUG}}.test.ts        [Builder prompt per ogni step + resolver logica]
│   └── [{{TOOL_SLUG}}-orchestrator.test.ts] [State machine logic if complex]
│
└── e2e/
    └── {{TOOL_SLUG}}-workflow.spec.ts [Full user workflow: upload → extract → generate → output]
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
   └─ Client page with form, styling from graphic-frameworking spec

✅ tests/integration/{{TOOL_SLUG}}-route.test.ts
   └─ Auth, ownership, validation, stream scenarios (≥4 test cases)

✅ tests/unit/{{TOOL_SLUG}}.test.ts
   └─ Prompt builder edge cases (≥3 test cases)

✅ src/lib/tool-prompts/prompts/{{TOOL_SLUG}}/generate.md
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
✅ src/lib/orchestrator/{{TOOL_SLUG}}-orchestrator.ts
   └─ State machine, step sequencing, dependency resolution

✅ tests/integration/{{TOOL_SLUG}}-orchestrator.test.ts
   └─ Happy path (all steps), failure recovery, partial completion
```

### If Tool Uses Dynamic Prompts Per Step

Add:
```
src/lib/tool-prompts/prompts/{{TOOL_SLUG}}/
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
│   └── page.tsx
└── lib/tool-prompts/
    ├── blog-gen.ts             (Builder)
    ├── prompts/blog-gen/
    │   └── generate.md         (Source)
    └── [shared: schemas.ts, responses.ts]

tests/
├── integration/blog-gen-route.test.ts
└── unit/blog-gen.test.ts
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
│   └── page.tsx
└── lib/
    ├── tool-prompts/
    │   ├── funnel-pages.ts             (Orchestrator builder)
    │   ├── funnel-pages-templates.ts   (Static templates)
    │   └── prompts/funnel-pages/
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
    └── orchestrator/
        └── funnel-pages-orchestrator.ts

tests/
├── integration/
│   ├── funnel-pages-route.test.ts
│   ├── funnel-pages-extraction.test.ts
│   └── funnel-pages-orchestrator.test.ts
├── unit/
│   ├── funnel-pages.test.ts
│   └── funnel-pages-orchestrator.test.ts
└── e2e/
    └── funnel-pages-workflow.spec.ts
```

---

## Anti-Patterns (DON'T DO)

```
❌ src/app/api/tools/blog_gen/           (use kebab-case, not snake_case)
❌ src/lib/tool-prompts/BlogGen.ts       (use kebab-case, not PascalCase)
❌ src/lib/tool-prompts/prompts/blog-gen/prompt.md    (too generic, add type)
❌ tests/blog-gen.test.ts                (MUST co-locate: tests/*.test.ts)
❌ src/lib/tool-prompts/blog-gen-prompt-template.ts   (redundant suffix)
❌ templates/blog-gen-template.md        (no custom templates folders outside lib/)
```

---

## Next Step

Procedi a **[tool-cloning-complexity-check.md](tool-cloning-complexity-check.md)** per auto-classificare il tool e stimare il tempo di work.
