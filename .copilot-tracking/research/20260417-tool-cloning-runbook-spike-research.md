<!-- markdownlint-disable-file -->

# Task Research Notes: Tool Cloning Runbook — Spike

## Status

- Spike: COMPLETED
- Completed on: 2026-04-17

## Research Executed

### File Analysis

- `docs/implementation/tool-cloning/tool-cloning-index.md`
  - Master index v1.4. Gap section ha tutti i [x] checkat. Riferisce correttamente tutti i file del runbook library. Link a `tool-cloning-phase-3-7-retry.md` corretto.
- `docs/implementation/tool-cloning/tool-cloning-overview.md`
  - v1.1. Elenca 14 moduli sequenziali. Gap da colmare non ripetuto qui (gestito solo in index). Percorso per complexity tier presente e completo.
- `docs/implementation/tool-cloning/tool-cloning-prerequisites.md`
  - v1.1. Documenti di riferimento elencati con link. Checklist pre-clonazione. Comandi base corretti.
- `docs/implementation/tool-cloning/tool-cloning-anatomy.md`
  - v1.2. Directory layout standard completo, naming conventions, minimal file checklist.
- `docs/implementation/tool-cloning/tool-cloning-complexity-check.md`
  - v1.1. Questionnaire 8 domande, scoring/classification, HLF self-assessment example (score 6.5/8 → VERY COMPLEX).
- `docs/implementation/tool-cloning/tool-cloning-phase-1-backend.md`
  - v1.1. Route POST template con sequenza auth→ratelimit→validate→build→stream. Zod schema template. Checklist route.
- `docs/implementation/tool-cloning/tool-cloning-phase-2-prompts.md`
  - v1.1. Prompt markdown sorgente, builder TypeScript statico, no-fs vincolo, registry opzionale.
- `docs/implementation/tool-cloning/tool-cloning-phase-2-5-extraction.md`
  - v1.1. Upload route, extraction schema, opzionale se il tool non ha file upload.
- `docs/implementation/tool-cloning/tool-cloning-phase-3-frontend.md`
  - v1.1. Template UI page con Suspense wrapper, SSE fetch pattern, state management.
- `docs/implementation/tool-cloning/tool-cloning-phase-3-5-ux-guide.md`
  - v1.1. User journey docs, UX replication checklist 10 dimensioni, design system parity.
- `docs/implementation/tool-cloning/tool-cloning-phase-3-6-checkpoint.md`
  - v1.1. Thin guide con riferimenti a sorgente HLF e go-no-go. Non referenzia `checkpoint/route.ts` (corretto).
- `docs/implementation/tool-cloning/tool-cloning-phase-3-7-retry.md`
  - v1.1. Thin guide rimanda a `tool-cloning-phase-3-7-retry-implementation.md` (file esiste).
- `docs/implementation/tool-cloning/tool-cloning-testing-strategy.md`
  - v1.1. Structure test, integration/unit/e2e templates, 5 test categories per integration.
- `docs/implementation/tool-cloning/tool-cloning-conformity-checklist.md`
  - v1.1. DoD in sezioni: Backend, Prompt, Frontend, UX Replicability con sub-checklist dettagliata.

### Code Search Results

- `data-primary-action|app-surface|app-control|app-title` in `src/app/tools/funnel-pages/page.tsx`
  - Selectors PRESENTI nel markup reale: `data-primary-action="true"` (line 1127), `app-surface` (line 991, 1282), `app-control` (line 1078, 1092, 1114), `app-title` (line 979), `app-rise` (line 991, 1282)
  - La UX guide referenzia i selector corretti che esistono nel markup reale
- `tests/e2e/funnel-pages-ux-parity.spec.ts`
  - 4 test: keyboard-only navigation, mobile 375px no horizontal scroll, 200% zoom usability, focus visibility
  - Usa `page.getByRole('heading', { name: 'HotLeadFunnel' })` — heading reale presente in page.tsx line 979
  - Usa `[data-primary-action="true"]` — presente in markup line 1127 ✅
  - Usa `.app-surface` — presente in markup ✅

### External Research

- n/a (ricerca interna sufficiente)

### Project Conventions

- Standards referenced: `graphic-frameworking-spec.md`, `tool-routes.instructions.md`, `tool-prompts.instructions.md`
- Instructions followed: Conventional Commits, docs taxonomy guardrails

## Key Discoveries

### Project Structure

La libreria è composta da 17 file atomici in `docs/implementation/tool-cloning/`. Tutti i file esistono. La directory `docs/ux/` contiene i file HLF user journey e UX checklist (confermati presenti).

### Implementation Patterns

**Sequenza obbligatoria route** (verificata in phase-1-backend.md e conformity-checklist.md):
```
auth → ownership → rate-limit → validate → build-prompt → stream
```

**Selectors CSS confermati come reali nel markup HLF**:
- `.app-surface`, `.app-rise` — card container
- `.app-control` — form controls (Select, Textarea)
- `.app-title` — heading
- `data-primary-action="true"` — pulsante primario (usato in E2E test)

**E2E test copertura confermata** (funnel-pages-ux-parity.spec.ts):
- ✅ keyboard-only navigation
- ✅ mobile 375px no horizontal scroll
- ✅ 200% zoom layout
- ✅ focus visibility

**Gap section index**: tutti i [x] sono completati e verificati nei file/sorgenti.

### Complete Examples

```typescript
// Selectors reali da page.tsx (verificati)
<h1 className="app-title text-3xl font-semibold text-slate-900">HotLeadFunnel</h1>
<Card className="app-surface app-rise rounded-3xl">
<SelectTrigger id="funnel-model-select" className="app-control" aria-label="...">
<Button data-primary-action="true" ...>
<Card key={step.key} className="app-surface app-rise rounded-2xl">
```

### API and Schema Documentation

- Route contract: POST `/api/tools/{slug}/generate` → SSE stream
- Error format: `{ error: { code, message } }` con codici standard
- Rate limit: `enforceUsageGuards(userId)` PRIMA di LLM call

### Technical Requirements

- Next.js 16: `params` è Promise, `useSearchParams` richiede Suspense wrapper
- Prisma 7: import da `@/generated/prisma`
- No `fs.readFile` in runtime route path
- Zod v4: `z.record(z.string(), z.unknown())`

## Recommended Approach

**Stato della libreria**: la documentazione è **sostanzialmente allineata** con il codice sorgente HLF. Tutti i gap elencati nell'index sono chiusi. I selectors CSS e la sequenza obbligatoria route sono corretti e verificati.

**Delta verificato e confermato** (unica lacuna tecnica):

- `tool-cloning-phase-2-prompts.md` line 70: `import { fuse } from '@/lib/template-utils'` 
  - **Il file `src/lib/template-utils.ts` NON ESISTE nel codebase**
  - Il builder reale HLF (`src/lib/tool-prompts/funnel-pages.ts`) usa string concatenation (`array.join('\n')`) e `loadPromptSource` da `./loader`
  - Il template di phase-2-prompts.md deve rimuovere l'import `fuse` e allinearsi al pattern reale

**Guards verificati** (tutti presenti in `src/lib/tool-routes/guards.ts`):
- `enforceUsageGuards` (line 84) ✅
- `requireAuthenticatedUser` (line 56) ✅
- `requireOwnedProject` (line 172) ✅
- `requireAvailableModel` (line 68) ✅

**`createArtifactStream`** (presente in `src/lib/llm/streaming.ts` line 227) ✅

## Implementation Guidance

- **Objectives**: correggere il template di phase-2-prompts.md rimuovendo l'import inesistente e allineando al pattern reale HLF
- **Key Tasks**: 
  1. In `tool-cloning-phase-2-prompts.md`: rimuovere `import { fuse } from '@/lib/template-utils'`
  2. Sostituire il builder template con pattern reale: string concatenation o `.replace()` diretti, senza import esterni
  3. Aggiungere nota: "HLF usa `loadPromptSource` da `./loader` + string template literals — non usare `fuse`"
- **Dependencies**: nessuna — modifica solo a docs
- **Success Criteria**: il template in phase-2-prompts.md non referenzia più moduli inesistenti nel codebase
