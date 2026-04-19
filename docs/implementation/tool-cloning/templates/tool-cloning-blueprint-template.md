---
goal: Template compilabile per pianificare un clone tool file-by-file partendo da una reference implementation
version: 1.1
date_created: 2026-04-18
date_updated: 2026-04-18
status: Active
tags: [runbook, tool-cloning, blueprint, template, planning]
---

# Tool Cloning Blueprint Template

Usa questo template prima di iniziare l'implementazione di un nuovo tool clone.

Scopo: trasformare una reference implementation esistente, tipicamente HLF, in un piano file-by-file con delta espliciti, senza affidarsi a memoria o note sparse.

---

## Come Usarlo

1. Completa il complexity assessment.
2. Identifica la reference implementation sorgente.
3. Compila tutte le sezioni prima di aprire i file di implementazione.
4. Usa la colonna `Action` per distinguere chiaramente `reuse`, `copy`, `adapt`, `create`.
5. Aggiorna lo stato durante il lavoro per mantenere il blueprint utile anche in review.

---

## 1. Tool Identity

| Campo | Valore |
|-------|--------|
| Tool name | [Nome tool] |
| Tool slug | [kebab-case] |
| Complexity tier | [Simple / Moderate / Complex / Very Complex] |
| Complexity score | [x/8] |
| Reference implementation | [es. funnel-pages] |
| Branch di lavoro | [feat/... o fix/...] |
| Owner | [nome] |
| Data compilazione | [YYYY-MM-DD] |

---

## 2. Product Scope Snapshot

| Area | Decisione |
|------|-----------|
| Primary input | [es. upload file + project context] |
| Extraction required | [yes/no + dettaglio] |
| Generative steps | [es. 2 step: landing + thank-you] |
| Final outputs | [artifact prodotti] |
| Resume/checkpoint | [yes/no] |
| Retry with backoff | [yes/no] |
| Quota model | [es. 1 unit per step] |
| Custom recovery UI | [yes/no] |
| LLM model strategy | [single model / multi-model] |

**Non-goals dichiarati**:
- [vincolo 1]
- [vincolo 2]
- [vincolo 3]

### Regola di Chaining del Contesto

Se stai clonando un tool multi-step sul pattern HLF, esplicita sempre quale di questi modelli usi:

- `contesto invariato soltanto` — ogni step riceve solo l'extraction context iniziale
- `contesto invariato + output step precedenti` — ogni step riceve l'extraction context iniziale e, dal secondo step in poi, anche gli output gia generati
- `contesto derivato step-by-step` — ogni step riceve un nuovo contesto trasformato che sostituisce quello precedente

Per coerenza con HLF, il pattern di default da mantenere e:

- step 1 = extraction context
- step 2 = extraction context + output step 1
- step 3 = extraction context + output step 1 + output step 2

Compila esplicitamente la scelta del tuo tool:

| Step | Contesto ricevuto |
|------|-------------------|
| Step 1 | [es. extractionContext] |
| Step 2 | [es. extractionContext + step1Output] |
| Step 3 | [es. extractionContext + step1Output + step2Output / N/A] |

---

## 3. Reference-to-Target Mapping

Compila questa sezione come mappa ad alta fedeltà tra sorgente e target.

| Concern | Source reference | Target artifact | Delta atteso |
|---------|------------------|-----------------|--------------|
| Upload + extraction | [path/file] | [path/file] | [riuso completo / adattamento leggero / nuova logica] |
| Generation route | [path/file] | [path/file] | [differenze contrattuali] |
| Prompt builder | [path/file] | [path/file] | [nuovi placeholder o step] |
| Static templates | [path/file] | [path/file] | [quanti template e per cosa] |
| UI page | [path/file] | [path/file] | [delta UX previsti] |
| Checkpoint logic | [path/file] | [path/file] | [riuso o variante] |
| Retry logic | [path/file] | [path/file] | [riuso o variante] |
| Integration tests | [path/file] | [path/file] | [scenari nuovi] |
| Unit tests | [path/file] | [path/file] | [casi edge da aggiungere] |
| E2E tests | [path/file] | [path/file] | [journey target] |

---

## 4. File-by-File Implementation Map

Segna una riga per ogni file che prevedi di toccare o creare.

| Layer | Source file | Target file | Action | Required delta | Status |
|------|-------------|-------------|--------|----------------|--------|
| API | [src/app/api/tools/.../generate/route.ts] | [src/app/api/tools/.../generate/route.ts] | [reuse/copy/adapt/create] | [auth, zod, rate limit, stream] | [todo/in-progress/done] |
| API | [src/app/api/tools/.../upload/route.ts] | [src/app/api/tools/.../upload/route.ts] | [reuse/copy/adapt/create] | [estrazione, storage, validation] | [todo/in-progress/done] |
| UI page | [src/app/tools/.../page.tsx] | [src/app/tools/.../page.tsx] | [copy/adapt] | [solo Suspense wrapper + import ToolContent] | [todo/in-progress/done] |
| UI container | [src/app/tools/.../{{TOOL_TITLE}}ToolContent.tsx] | [...] | [copy/adapt] | [hook composition, step labels, CTA logic] | [todo/in-progress/done] |
| UI config | [src/app/tools/.../config.ts] | [...] | [copy/adapt] | [TONES, initialSteps, badge maps] | [todo/in-progress/done] |
| UI types | [src/app/tools/.../types.ts] | [...] | [copy/adapt] | [StepKey type, re-export @/tools/shared] | [todo/in-progress/done] |
| Hook generation | [src/app/tools/.../hooks/use{{TOOL_TITLE}}Generation.ts] | [...] | [copy/adapt] | [step sequencing, chaining, retry] | [todo/in-progress/done] |
| Hook recovery | [src/app/tools/.../hooks/use{{TOOL_TITLE}}Recovery.ts] | [...] | [copy/adapt] | [resume candidate, checkpoint parse] | [todo/in-progress/done] |
| Hook extraction | [src/app/tools/.../hooks/use{{TOOL_TITLE}}Extraction.ts] | [...] | [copy/adapt/skip] | [se applicable: upload lifecycle] | [todo/in-progress/done] |
| Hook uiState | [src/app/tools/.../hooks/use{{TOOL_TITLE}}UiState.ts] | [...] | [copy/adapt] | [derivazione uiState] | [todo/in-progress/done] |
| Component SetupCard | [src/app/tools/.../components/{{TOOL_TITLE}}SetupCard.tsx] | [...] | [copy/adapt] | [form fields tool-specific] | [todo/in-progress/done] |
| Component StatusQuick | [src/app/tools/.../components/{{TOOL_TITLE}}StatusQuick.tsx] | [...] | [copy/adapt] | [labels step] | [todo/in-progress/done] |
| Component StepCards | [src/app/tools/.../components/{{TOOL_TITLE}}StepCards.tsx] | [...] | [copy/adapt] | [step count, CTA labels, output render] | [todo/in-progress/done] |
| Shared lib | src/tools/shared/ | src/tools/shared/ | [reuse — no modifica] | nessuno | done |
| Prompt | [src/lib/tool-prompts/...ts] | [src/lib/tool-prompts/...ts] | [reuse/copy/adapt/create] | [builder per step] | [todo/in-progress/done] |
| Prompt templates | [src/lib/tool-prompts/...-templates.ts] | [src/lib/tool-prompts/...-templates.ts] | [reuse/copy/adapt/create] | [template statici runtime] | [todo/in-progress/done] |
| Prompt source | [src/lib/tool-prompts/prompts/tools/.../*.md] | [src/lib/tool-prompts/prompts/tools/.../*.md] | [reuse/copy/adapt/create] | [copy instructions per step] | [todo/in-progress/done] |
| Registry | [src/lib/tool-prompts/registry.ts] | [src/lib/tool-prompts/registry.ts] | [adapt] | [nuovo mapping tool] | [todo/in-progress/done] |
| Integration test | [tests/integration/...test.ts] | [tests/integration/...test.ts] | [reuse/copy/adapt/create] | [auth, validation, rate limit, SSE] | [todo/in-progress/done] |
| Unit test — prompt | [tests/unit/{{TOOL_SLUG}}.test.ts] | [...] | [reuse/copy/adapt/create] | [placeholder, branching, edge cases] | [todo/in-progress/done] |
| Unit test — hooks | [tests/unit/use{{TOOL_TITLE}}*.test.ts] | [...] | [copy/adapt/create] | [generation, recovery, extraction, uiState] | [todo/in-progress/done] |
| Unit test — components | [tests/unit/tools/{{TOOL_SLUG}}/*.test.tsx] | [...] | [copy/adapt/create] | [SetupCard, StepCards render + binding] | [todo/in-progress/done] |
| E2E test | [tests/e2e/...spec.ts] | [tests/e2e/...spec.ts] | [reuse/copy/adapt/create] | [upload, generation, output parity] | [todo/in-progress/done] |

Righe aggiuntive:

| Layer | Source file | Target file | Action | Required delta | Status |
|------|-------------|-------------|--------|----------------|--------|
| [layer] | [source] | [target] | [action] | [delta] | [status] |
| [layer] | [source] | [target] | [action] | [delta] | [status] |

---

## 5. Request / Response Contract Alignment

| Area | Decisione target | Verifica |
|------|------------------|----------|
| Request schema | [campi richiesti] | [allineato a Zod] |
| Error shape | [`{ error: { code, message } }`] | [yes/no] |
| SSE contract | [eventi attesi] | [yes/no] |
| Ownership checks | [risorse coinvolte] | [yes/no] |
| Rate limit timing | [prima della chiamata LLM] | [yes/no] |
| Artifact persistence | [cosa viene salvato] | [yes/no] |
| Step chaining contract | [es. step2 richiede step1Output, step3 richiede step1Output + step2Output] | [yes/no] |

---

## 6. State Machine e UX Parity

### Stati UI previsti

| Stato | Descrizione | Parita con reference |
|------|-------------|----------------------|
| [idle] | [descrizione] | [same / adapted / new] |
| [uploading] | [descrizione] | [same / adapted / new] |
| [extracting] | [descrizione] | [same / adapted / new] |
| [generating-step-1] | [descrizione] | [same / adapted / new] |
| [generating-step-2] | [descrizione] | [same / adapted / new] |
| [completed] | [descrizione] | [same / adapted / new] |
| [error] | [descrizione] | [same / adapted / new] |

### Delta UX intenzionali

- [delta intenzionale 1]
- [delta intenzionale 2]
- [nessun altro delta fuori scope]

---

## 7. Recovery, Retry e Quota

| Capability | Decisione | Note implementative |
|------------|-----------|---------------------|
| Resume da artifacts | [yes/no] | [path / funzione / dipendenze] |
| Checkpoint recovery | [yes/no] | [come prefillare stato] |
| Retry con backoff | [yes/no] | [wrapper, tentativi, limiti] |
| Quota per step | [yes/no] | [es. 1 credito per step] |
| Partial failure handling | [yes/no] | [es. step 2 fallisce, step 1 resta valido] |

---

## 8. Test Plan Minimo

### Integration

- [ ] Unauthorized request returns 401
- [ ] Foreign ownership returns 403
- [ ] Invalid payload returns 400 with `VALIDATION_ERROR`
- [ ] Rate limit failure returns expected code
- [ ] Happy path returns SSE stream
- [ ] Multi-step sequencing validated

### Unit

- [ ] Prompt builder per step
- [ ] Placeholder interpolation
- [ ] Conditional branching logic
- [ ] Retry / resume helpers se presenti

### E2E

- [ ] Upload file
- [ ] Extraction preview
- [ ] Full generation flow
- [ ] Final output visibility
- [ ] Responsive / accessibility parity rilevante

---

## 9. Open Questions / Blockers

| Tipo | Descrizione | Owner | Stato |
|------|-------------|-------|-------|
| Product | [domanda] | [nome] | [open/closed] |
| Tech | [domanda] | [nome] | [open/closed] |
| UX | [domanda] | [nome] | [open/closed] |

---

## 10. Exit Criteria Prima Di Implementare

- [ ] Complexity tier approvato
- [ ] Reference implementation scelta e confermata
- [ ] File mapping completo
- [ ] Delta intenzionali esplicitati
- [ ] Contract API chiarito
- [ ] Piano test minimo compilato
- [ ] Nessun blocker aperto critico

Quando tutti i punti sopra sono completati, puoi passare ai phase document del runbook.