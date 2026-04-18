---
goal: Procedura step-by-step per clonare HotLeadFunnel con variazioni mantenendo conformità a linee guida grafiche, API, prompt e UX replicability
version: 1.2
date_created: 2026-04-17
date_updated: 2026-04-18
status: Historical Snapshot
tags: [runbook, tool-cloning, frontend, api, prompts, templates, ux-replicability, design-system, testing]
---

# Tool Cloning Runbook: Da HotLeadFunnel a Nuovo Tool

> Nota storica (2026-04-18): questo documento monolitico e stato superseded dalla libreria atomizzata in `docs/implementation/tool-cloning/`.
> Entry point corrente: [tool-cloning-index.md](./tool-cloning/tool-cloning-index.md).

**Versione**: 1.1 (Aggiunta UX Replicability Guidance)  
**Data creazione**: 2026-04-17  
**Ultimo aggiornamento**: 2026-04-17  
**Scope**: Clonare HotLeadFunnel con variazioni mantenendo **95%+ conformità** a linee guida grafiche, API, prompt, **e replicabilità UX**  
**Audience**: Developer che replicano HLF per nuovo tool con workflow diverso

---

## Novità in v1.1

**Aggiunto contributo completo sulla UX Replicability** (Phase 3.5):
- ✅ User Journey extraction e documentazione da HLF reference
- ✅ UX Replication Checklist multi-aspetto (layout, form components, accessibility, interactions)
- ✅ Interaction Parity Testing con Playwright E2E
- ✅ UX Consistency Guard Rails (design principles, accessibility, tone, responsive, performance)
- ✅ UX Testing Checklist prima di PR review
- ✅ Expanded DoD (Definition of Done) con dimensione UX

**Beneficio**: Tool clones non solo replicano API/design visivo, ma mantengono **identica esperienza utente** (journey, interazioni, accessibilità, reattività).

**Tempo stimato** aggiornato: 3-3.5 ore (vs 2.5-3 ore) — l'extra 30 minuti è tempo di UX validation che aumenta confidence sulla replicabilità end-to-end.

---

## 1. Pre-requisiti e Setup

Prima di iniziare, verifica che tu abbia accesso a:

### Documenti di riferimento (leggi in ordine)
1. **Graphic Frameworking**: [docs/specifications/graphic-frameworking-spec.md](../specifications/graphic-frameworking-spec.md)
   - Section "Tool Pages Exceptions" per deviazioni intenzionali
   
2. **Tool Routes Guardrails**: [.github/instructions/tool-routes.instructions.md](../../.github/instructions/tool-routes.instructions.md)
   - Auth → ownership → rate limit ordine obbligatorio
   
3. **Tool Prompts Pattern**: [.github/instructions/tool-prompts.instructions.md](../../.github/instructions/tool-prompts.instructions.md)
   - Markdown sorgente + template runtime tipizzato
   
4. **API Specifications**: [docs/specifications/api-specifications.md](../specifications/api-specifications.md#tool-specific-generation)
   - Error codes + SSE contract standard
   
5. **HLF Reference Implementation**: [src/app/tools/funnel-pages/page.tsx](../../src/app/tools/funnel-pages/page.tsx) (main UI)

### File sorgente di riferimento da copiare
- Route handler template: `src/app/api/tools/funnel-pages/generate/route.ts`
- UI page template: `src/app/tools/funnel-pages/page.tsx`
- Prompt builder template: `src/lib/tool-prompts/funnel-pages.ts`
- Test template: `tests/integration/funnel-pages-route.test.ts`

---

## 2. Anatomia di un Tool (File Structure)

Ogni tool richiede questa struttura minima:

```
src/
├── app/
│   ├── api/tools/
│   │   └── {{TOOL_SLUG}}/
│   │       ├── upload/route.ts      [Opzionale: file upload + extraction]
│   │       ├── generate/route.ts    [RICHIESTO: generazione LLM (single o multi-step)]
│   │       └── checkpoint/route.ts  [Opzionale: save/load checkpoint di stato]
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
└── unit/
    ├── {{TOOL_SLUG}}.test.ts        [Builder prompt per ogni step + resolver logica]
    └── [{{TOOL_SLUG}}-orchestrator.test.ts] [State machine logic if complex]

e2e/
└── {{TOOL_SLUG}}-workflow.spec.ts [Full user workflow: upload → extract → generate → output]
```

**Naming Conventions**:
- `{{TOOL_SLUG}}`: kebab-case, es. `meta-ads`, `content-gen`, `funnel-pages`
- `{{TOOL_TITLE}}` per TypeScript types: PascalCase, es. `ContentGen`, `FunnelPages`
- Per multi-step: `step1`, `step2`, `step3` o domain-specific: `optin`, `quiz`, `vsl`
- File: sempre lowercase + kebab-case suffixes (`-extraction.ts`, `-orchestrator.ts`, `-schema.ts`)


---

## 3. Ordine di Implementazione (Sequenziale)

### Phase 1: Backend Route + Schema (Start Here)

#### Step 1.1: Definisci Zod Schema
**File**: `src/lib/tool-routes/schemas.ts`

```typescript
// Aggiungi al file esistente:

const {{TOOL_SLUG}}RequestSchema = z.object({
  projectId: z.string().cuid('Project ID non valido'),
  model: z.string().min(1, 'Modello richiesto'),
  // Aggiungi campi specifici tool:
  // tone: z.enum(['professional', 'casual', 'formal', 'technical']),
  // topic: z.string().min(10),
  // notesFacultative: z.string().optional(),
});

export type {{TOOL_SLUG_UPPER}}Request = z.infer<typeof {{TOOL_SLUG}}RequestSchema>;

export const {{TOOL_SLUG}}RequestSchema = {{TOOL_SLUG}}RequestSchema;
```

**Validation Rules**:
- `projectId`: SEMPRE `z.string().cuid()`
- `model`: SEMPRE string non-empty (da lista admin)
- Tool-specific fields: SEMPRE con descrizione d'errore chiara
- Optional fields: usa `.optional()`, mai null senza fallback

#### Step 1.2: Crea Route Handler POST
**File**: `src/app/api/tools/{{TOOL_SLUG}}/generate/route.ts`

```typescript
import { createArtifactStream } from '@/lib/llm/streaming';
import { getRequestLogger } from '@/lib/logger';
import {
  build{{TOOL_TITLE}}Prompt,
  type {{TOOL_TITLE}}Input,
} from '@/lib/tool-prompts/{{TOOL_SLUG}}';
import {
  enforceUsageGuards,
  parseAndValidateRequest,
  requireAvailableModel,
  requireAuthenticatedUser,
  requireOwnedProject,
} from '@/lib/tool-routes/guards';
import { apiError, sseResponse } from '@/lib/tool-routes/responses';
import { {{TOOL_SLUG}}RequestSchema } from '@/lib/tool-routes/schemas';

export async function POST(request: Request) {
  // ✅ SEQUENZA OBBLIGATORIA (non alterare ordine)
  
  // 1. Auth
  const authResult = await requireAuthenticatedUser();
  if (!authResult.ok) {
    return authResult.response;
  }

  const userId = authResult.data.userId;
  const requestId = request.headers.get('x-request-id') ?? crypto.randomUUID();
  const log = getRequestLogger({ userId, requestId });

  try {
    // 2. Parse + Validate
    const body = await request.json();
    const parsed = {{TOOL_SLUG}}RequestSchema.safeParse(body);
    if (!parsed.success) {
      return apiError('VALIDATION_ERROR', 'Input non valido', 400, parsed.error.flatten());
    }

    const { projectId, model, ...toolSpecificInput } = parsed.data;

    // 3. Ownership check
    const ownershipResult = await requireOwnedProject(projectId, userId);
    if (!ownershipResult.ok) {
      return ownershipResult.response;
    }

    // 4. Rate limit BEFORE LLM call
    const guardResult = await enforceUsageGuards(userId);
    if (!guardResult.ok) {
      return guardResult.response;
    }

    // 5. Model availability
    const modelResult = requireAvailableModel(model);
    if (!modelResult.ok) {
      return modelResult.response;
    }

    // 6. Build prompt (tool-specific logic)
    const prompt = await build{{TOOL_TITLE}}Prompt({
      ...toolSpecificInput,
    });

    log.info('Generazione avviata', { model, toolSlug: '{{TOOL_SLUG}}' });

    // 7. Stream response
    return sseResponse(async (writer) => {
      const stream = await createArtifactStream({
        userId,
        projectId,
        prompt,
        model,
        workflowType: '{{TOOL_SLUG}}',
        artifactType: 'content', // o altro se tool genera tipo diverso
        onStart: (artifactId) => {
          writer.event('start', { artifactId });
        },
        onToken: (token) => {
          writer.event('token', { token });
        },
        onComplete: (content) => {
          writer.event('complete', { content });
          log.info('Generazione completata', { artifactId: '...' });
        },
        onError: (error) => {
          writer.event('error', { message: error.message });
          log.error('Errore stream', { message: error.message });
        },
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Errore inatteso';
    log.error('Route error', { message });
    return apiError('INTERNAL_ERROR', message, 500);
  }
}
```

**Checklist Route**:
- [ ] Auth via `requireAuthenticatedUser()` + userId salvato
- [ ] Zod parse + safeParse().success check
- [ ] Ownership check via `requireOwnedProject()`
- [ ] `enforceUsageGuards()` PRIMA di `createArtifactStream()`
- [ ] `requireAvailableModel()` per validazione modello
- [ ] `build{{TOOL_TITLE}}Prompt()` chiamato PRIMA di stream
- [ ] `sseResponse()` wrappa l'intera logica stream
- [ ] `workflowType: '{{TOOL_SLUG}}'` per artifact tracking
- [ ] Logging su start/complete/error via `getRequestLogger()`

#### Step 1.3: (Opzionale) Crea Route Handler UPLOAD
**Solo se il tool ha upload file** (es. HLF). Copia da [src/app/api/tools/funnel-pages/upload/route.ts](../../src/app/api/tools/funnel-pages/upload/route.ts).

```typescript
// File: src/app/api/tools/{{TOOL_SLUG}}/upload/route.ts
// Pattern: auth → rate limit → project ownership → file validation → parse → return text
```

---

### Phase 2: Prompt Specification & Builder

#### Step 2.1: Scrivi Prompt Sorgente Markdown
**File**: `src/lib/tool-prompts/prompts/{{TOOL_SLUG}}/generate.md` (o split per step se multi-step)

```markdown
# {{TOOL_TITLE}} Generation Prompt

Versione 1.0

## Ruolo

Sei un {{EXPERT_ROLE}}.

## Obiettivo

Generare {{OUTPUT_DESCRIPTION}}.

## Input

{{INPUT_FIELDS_SPEC}}

## Regole

1. {{CRITICAL_RULE_1}}
2. {{CRITICAL_RULE_2}}
...

## Guardrail

- Non {{DONT_1}}
- Non {{DONT_2}}

## Struttura Output

Usa sempre:
- Markdown headings
- Clear sections
- Numbered lists se sequenziale
```

**Best Practices**:
- Mantieni prompt sotto 2000 token (riferimento OpenRouter limits)
- Separa "Regole" da "Guardrail"
- Non usare placeholder JSON — usa markdown strutturato
- Test: generazione 3-5 volte localmente su `npm run dev`

#### Step 2.2: Crea Builder TypeScript
**File**: `src/lib/tool-prompts/{{TOOL_SLUG}}.ts`

```typescript
import { fuse } from '@/lib/template-utils';

// Template caricato UNA SOLA VOLTA (build time)
const {{TOOL_SLUG_UPPER}}_TEMPLATE = `
# {{TOOL_TITLE}} Generation Prompt
...contenuto markdown dagli step 2.1...
`;

export type {{TOOL_TITLE}}Input = {
  // Definisci input specifico tool
  topic: string;
  tone?: 'professional' | 'casual';
  notes?: string;
};

export type PromptTemplate = {
  content: string;
  tokens: number;
};

/**
 * Build prompt con interpolazione safe.
 * 
 * Specifiche:
 * - Template statico tipizzato (no runtime fs.readFile)
 * - Sanitizzazione input (trim, fallback empty string)
 * - Conteggio token approssimato
 */
export async function build{{TOOL_TITLE}}Prompt(input: {{TOOL_TITLE}}Input): Promise<PromptTemplate> {
  const rendered = {{TOOL_SLUG_UPPER}}_TEMPLATE
    .replace('{{TOPIC}}', input.topic?.trim() ?? '')
    .replace('{{TONE}}', input.tone ?? 'professional')
    .replace('{{NOTES}}', input.notes?.trim() ?? '')
    // Aggiungi altre sostituzioni se necessario
  ;

  return {
    content: rendered,
    tokens: countTokensApprox(rendered),
  };
}

function countTokensApprox(text: string): number {
  // Approssimazione: ~1 token ogni 4 caratteri
  return Math.ceil(text.length / 4);
}
```

**Vincoli**:
- ✅ No `fs.readFile()` al runtime (violazione NFT Turbopack)
- ✅ Template statico tipizzato in costante
- ✅ Interpolazione safe (trim + fallback)
- ✅ Input tipizzato con Zod validato prima di call

#### Step 2.3: Aggiorna Registry (Opzionale)
**File**: `src/lib/tool-prompts/registry.ts`

Se repo usa registry centralizzato:
```typescript
export const toolRegistry = {
  'funnel-pages': { builder: buildFunnelOptinPrompt, steps: ['optin', 'quiz', 'vsl'] },
  'meta-ads': { builder: buildMetaAdsPrompt, steps: ['generate'] },
  '{{TOOL_SLUG}}': { builder: build{{TOOL_TITLE}}Prompt, steps: ['generate'] }, // ← Aggiungi
};
```

---

### Phase 2.5: Extraction & Preprocessing (Opzionale ma Consigliato per Tool Complessi)

Questa fase copre il **preprocessing di input** prima della generazione LLM. Se il tool accetta file upload, dati strutturati, o richiede estrazione di contesto testuale, implementa questo flow.

#### Step 2.5.1: Definisci Extraction Schema
**File**: `src/lib/tool-routes/schemas.ts`

```typescript
// Aggiungi schema per extraction preprocessing
const {{TOOL_SLUG}}ExtractionContextSchema = z.object({
  fileId: z.string().cuid('File ID non valido').optional(),
  rawText: z.string().min(100, 'Testo troppo breve').optional(),
  // Campi strutturati (se tool ha estrazione campi specifici)
  businessType: z.enum(['B2B', 'B2C']).optional(),
  targetAudience: z.string().optional(),
  keyOffer: z.string().optional(),
  // Risultato estrazione
  extractionContext: z.string().optional(), // output di estrazione precedente
});

export type {{TOOL_SLUG_UPPER}}ExtractionContext = z.infer<typeof {{TOOL_SLUG}}ExtractionContextSchema>;
```

#### Step 2.5.2: Crea Upload Route Handler
**File**: `src/app/api/tools/{{TOOL_SLUG}}/upload/route.ts`

```typescript
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { enforceUsageGuards, requireOwnedProject } from '@/lib/tool-routes/guards';
import { apiError } from '@/lib/tool-routes/responses';

export async function POST(request: Request) {
  // 1. Auth
  const session = await auth();
  if (!session?.user?.id) {
    return apiError('UNAUTHORIZED', 'Autenticazione richiesta', 401);
  }

  const userId = session.user.id;

  try {
    // 2. Parse multipart form
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const projectId = formData.get('projectId') as string;

    if (!file || !projectId) {
      return apiError('VALIDATION_ERROR', 'File e projectId richiesti', 400);
    }

    // 3. Ownership check
    const project = await db.project.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      return apiError('FORBIDDEN', 'Progetto non trovato o accesso negato', 403);
    }

    // 4. Rate limit
    const guardResult = await enforceUsageGuards(userId);
    if (!guardResult.ok) {
      return guardResult.response;
    }

    // 5. Validate file
    const allowedMimes = ['application/pdf', 'text/plain', 'text/markdown', 
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const allowedExtensions = ['.pdf', '.txt', '.md', '.docx'];

    if (!allowedMimes.includes(file.type)) {
      return apiError('VALIDATION_ERROR', `File type ${file.type} non supportato`, 400);
    }

    const fileName = file.name.toLowerCase();
    if (!allowedExtensions.some(ext => fileName.endsWith(ext))) {
      return apiError('VALIDATION_ERROR', `Estensione file non supportata`, 400);
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB max
      return apiError('VALIDATION_ERROR', 'File troppo grande (max 10MB)', 400);
    }

    // 6. Extract text content (dipende da tipo file)
    let extractedText = '';
    if (file.type === 'text/plain' || file.type === 'text/markdown') {
      extractedText = await file.text();
    } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      // Per .docx, usa libreria type docx-parser o mammoth
      // extractedText = await parseDocx(await file.arrayBuffer());
      // Per MVP, suggerisci to user di usare .txt o .md
      return apiError('VALIDATION_ERROR', 'Per MVP, usa .txt o .md. Supporto .docx in roadmap', 400);
    }

    // 7. Return extracted context
    return Response.json({
      success: true,
      data: {
        extractionContext: extractedText.trim(),
        fileSize: file.size,
        fileName: file.name,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Errore upload';
    return apiError('INTERNAL_ERROR', message, 500);
  }
}
```

#### Step 2.5.3: Collega Extraction Context ai Prompt Multi-Step

Modifica il builder della Phase 2.2 per accettare `extractionContext`:

```typescript
// In src/lib/tool-prompts/{{TOOL_SLUG}}.ts

export type {{TOOL_TITLE}}BuilderInput = {
  step: 'step1' | 'step2' | 'step3'; // Adjust per tuo tool
  extractionContext: string;          // Contesto estratto da upload
  tone?: 'professional' | 'casual';
  notes?: string;
  // Output precedenti (per step sequenziali)
  step1Output?: string;
  step2Output?: string;
};

// Builder specificA per ogni step
async function build{{TOOL_TITLE}}Step1Prompt(input: {{TOOL_TITLE}}BuilderInput): Promise<PromptTemplate> {
  const template = `
# {{TOOL_TITLE}} - Step 1: [Description]

## Contesto Aziendale
${input.extractionContext}

## Compito
Genera [output description] sul tema [tema specifico step1].

## Requisiti di Qualità
- Lunghezza: 800-1200 parole
- Tono: ${input.tone || 'professional'}
- Include: [specifici del step 1]

${input.notes ? `## Note dell'utente\n${input.notes}` : ''}
`;

  return {
    content: template,
    tokens: countTokensApprox(template),
  };
}

// Simile per step2, step3 (dipendono da output precedenti)
async function build{{TOOL_TITLE}}Step2Prompt(input: {{TOOL_TITLE}}BuilderInput): Promise<PromptTemplate> {
  const template = `
# {{TOOL_TITLE}} - Step 2: [Description]

## Contesto Precedente (Step 1)
${input.step1Output || '[No step1 output provided]'}

## Contesto Aziendale
${input.extractionContext}

## Compito
Generasi [output description step 2] basato su Step 1 sopra.

## Requisiti di Qualità
- Lunghezza: 1000-1500 parole
- Coerenza con Step 1: [specifici]
- Include: [specifici step 2]
`;

  return {
    content: template,
    tokens: countTokensApprox(template),
  };
}

// Export wrapper che dispatcha a builder corretto
export async function build{{TOOL_TITLE}}Prompt(
  input: {{TOOL_TITLE}}BuilderInput
): Promise<PromptTemplate> {
  if (input.step === 'step1') {
    return build{{TOOL_TITLE}}Step1Prompt(input);
  }
  if (input.step === 'step2') {
    return build{{TOOL_TITLE}}Step2Prompt(input);
  }
  if (input.step === 'step3') {
    return build{{TOOL_TITLE}}Step3Prompt(input);
  }
  throw new Error(`Unknown step: ${input.step}`);
}
```

---

### Phase 3: Frontend UI Page

#### Step 3.1: Crea UI Page
**File**: `src/app/tools/{{TOOL_SLUG}}/page.tsx`

**Template minimo** (copiato da HLF e adattato):

```tsx
'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

// ✅ Separazione: export default → Suspense → Content
export default function {{TOOL_TITLE}}Page() {
  return (
    <Suspense fallback={<div>Caricamento...</div>}>
      <{{TOOL_TITLE}}Content />
    </Suspense>
  );
}

function {{TOOL_TITLE}}Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // State: project, model, tone, input, running, output
  const [projectId, setProjectId] = useState('');
  const [model, setModel] = useState('');
  const [tone, setTone] = useState('professional');
  const [input, setInput] = useState('');
  const [running, setRunning] = useState(false);
  const [output, setOutput] = useState('');

  const handleGenerate = async () => {
    if (!projectId || !input.trim()) {
      alert('Completa campi obbligatori');
      return;
    }

    setRunning(true);
    setOutput('');

    try {
      const response = await fetch('/api/tools/{{TOOL_SLUG}}/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          model,
          tone,
          topic: input,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || 'Generazione fallita');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Stream non disponibile');

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n');
        buffer = parts.pop() ?? '';

        for (const line of parts) {
          if (!line.startsWith('data: ')) continue;
          const payload = JSON.parse(line.slice(6));
          if (payload.type === 'token') setOutput(prev => prev + (payload.token ?? ''));
          if (payload.type === 'error') throw new Error(payload.message);
        }
      }
    } catch (error) {
      alert(`Errore: ${error instanceof Error ? error.message : 'Sconosciuto'}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <PageShell width="workspace">
      <div className="mb-7">
        <h1 className="app-title text-3xl font-semibold">{{TOOL_TITLE}}</h1>
        <p className="text-sm text-muted-foreground">{{TOOL_DESCRIPTION}}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        {/* Form Card */}
        <Card className="app-surface app-rise rounded-3xl">
          <CardHeader>
            <CardTitle>Setup</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progetto */}
            <div>
              <label className="text-sm font-medium">Progetto</label>
              <input
                type="text"
                placeholder="Seleziona progetto"
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="app-control w-full rounded px-3 py-2"
              />
            </div>

            {/* Model */}
            <div>
              <label className="text-sm font-medium">Modello</label>
              <Select value={model} onValueChange={setModel}>
                <SelectTrigger className="app-control">
                  <SelectValue placeholder="Scegli modello" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gpt-4">GPT-4</SelectItem>
                  <SelectItem value="gpt-3.5">GPT-3.5</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tone */}
            <div>
              <label className="text-sm font-medium">Tono</label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="app-control">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professionale</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Input testuale */}
            <div>
              <label className="text-sm font-medium">Argomento</label>
              <Textarea
                placeholder="Descrivi il tema su cui generare contenuto"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="app-control"
                rows={4}
              />
            </div>

            {/* Generate button */}
            <Button
              onClick={handleGenerate}
              disabled={running || !projectId || !input.trim()}
              className="w-full"
            >
              {running ? 'In generazione...' : 'Genera contenuto'}
            </Button>
          </CardContent>
        </Card>

        {/* Output Panel */}
        <div>
          <Card className="app-surface rounded-2xl">
            <CardHeader>
              <CardTitle className="text-sm">Output</CardTitle>
            </CardHeader>
            <CardContent>
              {output ? (
                <div className="text-xs whitespace-pre-wrap">{output}</div>
              ) : (
                <p className="text-xs text-muted-foreground">Output apparirà qui...</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}
```

**Graphic Framework Checklist**:
- [ ] `<PageShell width="workspace">` wrappa la pagina
- [ ] Form card ha `.app-surface + .app-rise`
- [ ] Select/Textarea hanno `.app-control`
- [ ] Titolo ha `.app-title`
- [ ] Copy ha `.app-copy` (automatica da PageShell)
- [ ] Output panel non ha sfondo piatto (usa bg-white/70 o container dedicato)
- [ ] Pulsante ha variant="default" non custom

---

### Phase 3.5: UX Design & Pattern Replication

Questa fase è CRITICA: garantisce che il tool clone **senta e si comporti come HLF** dal punto di vista utente. Non è sufficiente replicare il codice — devi replicare l'esperienza.

#### Step 3.5.1: Estrarre User Journey da HLF

Prima di qualsiasi modifica UI, documenta il journey corrente di HLF:

**File**: `docs/ux/{{TOOL_SLUG}}-user-journey.md`

```markdown
# User Journey: {{TOOL_TITLE}}

## Goal
Utente [ruolo] vuole [task principale] per [outcome finale].

**Esempio per HLF**: 
Marketer di agenzia vuole **generare pagine di funnel ottimizzate** per **capire quali elementi convertono meglio senza dover scrivere codice HTML**.

## Journey Map

### Stage 1: Entry & Orientation (0-30 sec)
**What User Sees**
- Landing su `/tools/{{TOOL_SLUG}}`
- Titolo prominent + descrizione breve (1-2 righe max)
- Tre campi visibili senza scroll

**What User Thinks**
- "OK, dove comincio?"
- "Quanto tempo ci vuole?"

**What User Feels**
- 😐 Neutro, curiosità
- 🤔 Incertezza se sono nel posto giusto

**Design Pattern**
- Form layout 2-column (input + output side-by-side)
- Titolo grande, copy breve e orientativa
- CTA primario ben visibile sotto fold

---

### Stage 2: Form Completion (30-120 sec)
**What User Does**
- Seleziona progetto da dropdown
- Scrrive topic/descrizione nel textarea
- Seleziona tone/model se opzionale
- Può resettare form senza perdere sessione

**What User Thinks**
- "Capisco cosa servono questi campi?"
- "Ho riempito tutto?"

**What User Feels**
- 👍 Confidenza se i campi sono chiari
- 😕 Frustrazione se label/tooltip assenti

**Design Pattern**
- Label text ABOVE input (accessibility + clarity)
- Placeholder dimesso (es. "es. SEO copywriting for SaaS landing...")
- Focus ring visibile (2px outline, colore brand)
- Character counter opzionale su textarea lunga

---

### Stage 3: Generation In Progress (Duration of stream)
**What User Does**
- Clicca pulsante "Genera..."
- Pulsante disabilitato + loading spinner
- Vede output comparire in real-time, token per token

**What User Thinks**
- "Sta funzionando?"
- "Quanto manca?"

**What User Feels**
- ⏳ Compreso (streaming chiarisce che è in corso)
- 😌 Zen se il flusso è fluido

**Design Pattern**
- Pulsante loading state `{loading ? 'In generazione...' : 'Genera'}`
- Output panel mostra placeholder grigio se vuoto
- Text appare progressivamente (token streaming, non wait-then-dump)
- Nessun "Annulla" durante stream (UX pattern: let it finish)

---

### Stage 4: Output & Action (Post-stream)
**What User Does**
- Legge output generato
- Copia contenuto
- Modifica/rifina manualmente se necessario
- Decide se salvare come artifact o scartare

**What User Thinks**
- "Va bene questo?"
- "Posso riusarlo?"

**What User Feels**
- 😊 Soddisfatto se qualità è buona
- 😕 Deluso se richiede troppe modifiche

**Design Pattern**
- Output in card con `.app-surface` (leggibile, copiabile)
- Copy button accanto a titolo output
- Nessun lock-in; testo selezionabile libero
- Optional: "Regenerate with different tone" button

### Success Metric
- ✅ User completa form → genera → copia output in **< 3 minuti** senza external help
- ✅ Zero confusion su cosa fare dopo generazione
```

#### Step 3.5.2: Replicare Pattern UX (Design System Parity)

Crea una checklist per assicurare che il clone segue IDENTICAMENTE gli stessi pattern UX di HLF:

**File**: `docs/ux/{{TOOL_SLUG}}-ux-replication-checklist.md`

```markdown
# UX Replication Checklist: {{TOOL_TITLE}}

Questo documento assicura che il nuovo tool **replica esattamente l'esperienza UX di HLF**, con variazioni solo sul workflow specifico.

---

## 1. Navigation & Entry Point

| Aspetto | HLF Reference | {{TOOL_TITLE}} Clone | Status |
|---------|---------------|---------------------|--------|
| URL Path | `/tools/funnel-pages` | `/tools/{{TOOL_SLUG}}` | ✅ |
| Page Shell | `<PageShell width="workspace">` | `<PageShell width="workspace">` | ✅ |
| Breadcrumb | "Tools > Funnel Pages" | "Tools > {{TOOL_TITLE}}" | ✅ |
| Back Button | Link a `/tools` | Link a `/tools` | - |

---

## 2. Layout Structure & Responsiveness

| Breakpoint | HLF Layout | Clone Layout | Notes |
|------------|-----------|--------------|-------|
| Mobile 320px | Stacked 1-column (form, then output) | Stacked 1-column | Same |
| Tablet 768px | Single column avec scroll | Single column avec scroll | Same |
| Desktop 1024px+ | 2-column grid `3fr 2fr` | 2-column grid `3fr 2fr` | Same |
| XL 1440px | Max width 1440px, centered | Max width 1440px, centered | Same |

**Conformance Check**:
```bash
# Browser test at 320px, 768px, 1024px, 1440px
npm run dev
# → Desktop (1440px): side-by-side form + output ✅
# → Tablet (768px): stacked, form full-width ✅
# → Mobile (320px): form full-width, no horizontal scroll ✅
```

---

## 3. Form Component Parity

### Input Fields

| Control Type | HLF Implementation | Clone Requirements | Status |
|--------------|-------------------|-------------------|--------|
| Project Select | Dropdown Radix, `.app-control`, label above | SAME styling | ✅ |
| Text Textarea | `<Textarea rows={4} className="app-control">` | SAME rows, SAME class | ✅ |
| Toggle/Tone | Select dropdown with enum options | SAME Radix pattern | ✅ |
| File Upload | Native `<input type="file">` (exception) | IF needed: native input, NO styling | - |
| Submit Button | `<Button ... disabled={running\|\|!input.trim()}>` | SAME disabled logic | ✅ |

### LabelConstraint Pattern

**MUST replicate**:
```tsx
<div>
  <label className="text-sm font-medium">Campo Obbligatorio</label>
  <input
    className="app-control w-full rounded px-3 py-2"
    placeholder="es. descrizione..."
  />
</div>
```

**DON'T deviate**:
- ❌ `<label>` INSIDE `<input>` (accessibility fail)
- ❌ Placeholder-only label (cognitive load, WCAG fail)
- ❌ Label styling diverso (must be `.text-sm font-medium`)

---

## 4. Focus & Keyboard Navigation

| Interaction | HLF Reference | Clone Test | Status |
|-------------|---------------|------------|--------|
| Tab Order | Left to right, top to bottom | SAME order | Test with keyboard |
| Focus Ring | 2px outline, brand color | SAME visual | Visible? |
| Enter on Input | Submit form (optional, controlled) | SAME behavior | Works? |
| Escape | No effect (streams don't support Abort) | SAME | - |
| Screen Reader | Announces label + current value | SAME support | Test with NVDA/JAWS |

**Test Scenario**:
```
1. Start on Project Select (Tab)
2. Move to Textarea (Tab)
3. Move to Model Select (Tab)
4. Move to Generate Button (Tab)
5. All focus rings visible? YES ✅
6. All announcements clear? YES ✅
```

---

## 5. Streaming & Real-time UX

| Aspect | HLF Behavior | Clone Requirement | Status |
|--------|-------------|-------------------|--------|
| Button State | Disabilitato durante stream | SAME | ✅ |
| Loading Indicator | "In generazione..." testo | OPTIONAL spinner | - |
| Token Rendering | Token appare immediatamente nel reader | SAME real-time | ✅ |
| Error Display | Alert() con messaggio | SAME (o toast) | ✅ |
| Abort/Cancel | NO (stream non abortible) | NO | - |
| Progress Bar | NO (unknown duration) | NO | - |

---

## 6. Output Panel Styling

| Element | HLF Styling | Clone Requirement | Status |
|---------|------------|-------------------|--------|
| Container | `.app-surface` card, rounded-2xl | EXACTLY same | ✅ |
| Background | Semi-transparent white `.bg-white/70` | EXACTLY same opacity | ✅ |
| Border | Soft border class from CSS | SAME border | ✅ |
| Text | `.text-xs whitespace-pre-wrap` | SAME for code-like output | ✅ |
| Copy Button | Optional, top-right corner | Optional copy button | - |

---

## 7. Accessibility Baseline (WCAG AA)

| Requirement | HLF Status | Clone Test | Pass? |
|-------------|-----------|-----------|-------|
| Contrast | AA minimum 4.5:1 text | Manual check or axe audit | ✅ |
| Focus Visible | Focus ring on all controls | Tab & visual check | ✅ |
| Keyboard Complete | All tasks keyboard-accessible | Test without mouse | ✅ |
| Screen Reader | Labels associated, dynamic updates announced | Arrow key + Read aloud test | ✅ |
| Text Resize | 200% without breakage | Browser zoom 200% | ✅ |
| Touch Targets | Min 44px height (tool-pages exception: file input OK) | Manual measure | ✅ |

**Quick Audit**:
```bash
npm install -D @axe-core/react
# Then in UI test: run axe scan, flag AA violations
```

---

## 8. Error States & Edge Cases

| Scenario | HLF Behavior | Clone Requirement | Status |
|----------|------------|-------------------|--------|
| Empty Form Submit | Alert "Completa campi obligatori" | SAME message | ✅ |
| Invalid ProjectId | Zod validation error, modal alert | SAME error handling | ✅ |
| Network Error | "Errore: [message]" alert | SAME error display | ✅ |
| Rate Limited | "RATE_LIMIT_EXCEEDED" message | SAME message | ✅ |
| Malformed Stream | Error event parsed, user notified | SAME error recovery | ✅ |
| Rapid Re-submit | Button disabilitato fino a completamento | SAME disabled state | ✅ |

---

## 9. Tone & Language Consistency

| UI Text | HLF Copy | Clone Copy | Notes |
|---------|----------|-----------|-------|
| Button Label | "Genera contenuto" | SAME or "Genera [output]" | Keep Italian, imperative |
| Placeholder | "es. descrizione dettagliata..." | Similar format | Provide examples |
| Loading State | "In generazione..." | SAME | Don't change |
| Error Alert | "Errore: [reason]" | SAME format | Technical but clear |
| Help Text | Minimal, 1 line max | SAME brevity | Avoid wall-of-text |

---

## 10. Micro-interactions & Animations

| Interaction | HLF Present | Clone Requirement | Status |
|------------|-----------|-------------------|--------|
| Button Hover | Color shift, cursor pointer | OPTIONAL (shadcn default OK) | - |
| Input Focus | Outline glow | AUTOMATIC via CSS | ✅ |
| Output Append | Token appears with no delay | SAME (client-side SSE) | ✅ |
| Page Load | No splash animation | SAME minimal | - |
| Skeleton/Placeholder | Optional, minimal | OPTIONAL | - |

---

## 11. UX Testing Scenario (Before Merge)

Completa TUTTI questi test con utente interno o team member:

```markdown
### Test 1: Complete Happy Path (3 min)
1. Load page
2. Select project from dropdown
3. Type topic in textarea (min 20 char)
4. Click "Genera"
5. Wait for output  
6. Copy output
7. Expected outcome: Zero friction, output legibile ✅

### Test 2: Keyboard Navigation Only (2 min)
1. Tab through all controls
2. Focus ring visibile su ogni elemento? ✅
3. Submit form con Enter key
4. Test passes? ✅

### Test 3: Mobile Experience (2 min)
1. Open on mobile device (or responsive 375px)
2. Tap project field
3. Select option
4. Tap textarea, type content
5. Tap generate button
6. Read output (should be scrollable, not cramped)
7. Test passes? ✅

### Test 4: Error Recovery (2 min)
1. Submit form vuoto
2. Error alert appears? ✅
3. Dismiss alert
4. Fill form correctly
5. Generate succeeds ✅

### Test 5: Accessibility Check (3 min)
- Screen reader (NVDA on Windows / VoiceOver on Mac):
  - Navigate to form with arrow keys
  - Labels announced clearly? ✅
  - Form field types obvious? ✅
  - Error messages announced? ✅
```

**Signed Off**: When all tests pass, document:
```
UX Replication Test Complete ✅
Tester: [name]
Date: [YYYY-MM-DD]
Notes: No deviations from HLF experience observed
```

---

## 12. Non-Compliance Red Flags 🚩

| Red Flag | Impact | Fix |
|----------|--------|-----|
| Focus ring missing or hard to see | WCAG fail, keyboard-only user locked out | Add/enhance focus styling |
| Placeholder-only label | WCAG fail, confusion on required fields | Add visible label above input |
| Output panel NOT `.app-surface` | Visual inconsistency breaks cohesion | Apply `.app-surface` class |
| Button not disabilitato during stream | UX confusion, double-submit risk | Implement `disabled={running}` |
| No error handling on fetch | User sees blank page on failure | Add try/catch + error alert |
| File input has custom styling | Tool-pages exception violated | Use native `<input type="file">` |

```
🚨 BLOCKING: Cannot merge if ANY red flag present
```

---
```

#### Step 3.5.3: Interaction Parity Testing

Prima di testare backend/API, valida che le interazioni UX siano identiche:

**Test file**: `tests/e2e/{{TOOL_SLUG}}-ux-parity.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('UX Parity: {{TOOL_TITLE}} vs HLF Reference', () => {
  test('Form layout matches 2-column responsive pattern', async ({ page }) => {
    await page.goto('/tools/{{TOOL_SLUG}}');

    // Desktop: 2-column (form left, output right)
    const form = await page.locator('[data-test="form-container"]');
    const output = await page.locator('[data-test="output-panel"]');
    
    const formBox = await form.boundingBox();
    const outputBox = await output.boundingBox();
    
    expect(formBox?.x).toBeLessThan(outputBox?.x || 0);
    expect(formBox?.width).toBeGreaterThan((outputBox?.width || 0) * 0.5);
  });

  test('Focus ring visible on all inputs (keyboard navigation)', async ({ page }) => {
    await page.goto('/tools/{{TOOL_SLUG}}');
    
    await page.keyboard.press('Tab'); // Project select
    let focused = await page.locator(':focus');
    expect(await focused.evaluate(el => getComputedStyle(el).outline)).not.toBe('none');
    
    await page.keyboard.press('Tab'); // Topic textarea
    focused = await page.locator(':focus');
    expect(await focused.evaluate(el => getComputedStyle(el).outline)).not.toBe('none');
    
    await page.keyboard.press('Tab'); // Generate button
    focused = await page.locator(':focus');
    expect(await focused.evaluate(el => getComputedStyle(el).outline)).not.toBe('none');
  });

  test('Button disabled during stream generation', async ({ page }) => {
    await page.goto('/tools/{{TOOL_SLUG}}');
    
    // Fill form
    await page.locator('input[placeholder*="Seleziona progetto"]').fill('test-project-id');
    await page.locator('textarea').fill('Test topic for generation');
    
    const button = await page.locator('button:has-text("Genera")');
    
    // Before click: enabled
    expect(await button.isDisabled()).toBe(false);
    
    // Click
    await button.click();
    
    // During stream: disabled
    await page.waitForTimeout(100);
    expect(await button.isDisabled()).toBe(true);
    
    // After stream completes: re-enabled
    await page.waitForFunction(
      () => !!document.querySelector('[data-test="output"]')?.textContent?.length,
      { timeout: 10000 }
    );
    expect(await button.isDisabled()).toBe(false);
  });

  test('Output panel shows token-by-token streaming (not batch)', async ({ page }) => {
    await page.goto('/tools/{{TOOL_SLUG}}');
    
    await page.locator('input[placeholder*="Seleziona"]').fill('test-project');
    await page.locator('textarea').fill('Test flow: should see tokens appear progressively');
    
    await page.locator('button:has-text("Genera")').click();
    
    const output = page.locator('[data-test="output"]');
    
    // Collect token counts over time (should increase, not jump)
    const tokenCounts = [];
    for (let i = 0; i < 10; i++) {
      const text = await output.textContent();
      tokenCounts.push(text?.length || 0);
      await page.waitForTimeout(500);
    }
    
    // Check that token count increases monotonically (streaming, not batch)
    for (let i = 1; i < tokenCounts.length; i++) {
      expect(tokenCounts[i]).toBeGreaterThanOrEqual(tokenCounts[i - 1]);
    }
  });

  test('Mobile responsive: output stacks below form at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/tools/{{TOOL_SLUG}}');
    
    const form = await page.locator('[data-test="form-container"]');
    const output = await page.locator('[data-test="output-panel"]');
    
    const formBox = await form.boundingBox();
    const outputBox = await output.boundingBox();
    
    // Mobile: form above, output below (Y coordinate of output > form)
    expect(outputBox?.y || 0).toBeGreaterThan(formBox?.y || 0 + 200);
    
    // No horizontal scroll needed
    const viewport = await page.viewportSize();
    const bodyWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual((viewport?.width || 0) + 10);
  });

  test('Error alert on form validation failure', async ({ page }) => {
    await page.goto('/tools/{{TOOL_SLUG}}');
    
    // Try to submit empty form
    await page.locator('button:has-text("Genera")').click();
    
    // Expect alert or error message
    const errorMsg = await page.locator('[data-test="error-message"]');
    await expect(errorMsg).toBeVisible();
    await expect(errorMsg).toContainText('Completa campi');
  });
});
```

---

### Phase 3.6: Checkpoint & Recovery Pattern (Per Tool Complessi)

Se il tool supporta **workflow stateful** (come HLF con resume), implementa checkpoint e recovery logic:

#### Step 3.6.1: Definisci Checkpoint Schema
**File**: `src/lib/tool-routes/schemas.ts`

```typescript
const {{TOOL_SLUG}}CheckpointSchema = z.object({
  id: z.string().cuid(),
  userId: z.string().cuid(),
  projectId: z.string().cuid(),
  artifactId: z.string().cuid(),
  phase: z.enum(['uploaded', 'extracted', 'step1-complete', 'step2-complete', 'step3-complete']),
  extractionContext: z.string(),
  outputs: z.record(z.string()), // { step1: "content", step2: "content" }
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type {{TOOL_SLUG_UPPER}}Checkpoint = z.infer<typeof {{TOOL_SLUG}}CheckpointSchema>;
```

#### Step 3.6.2: Crea Checkpoint Persist Route
**File**: `src/app/api/tools/{{TOOL_SLUG}}/checkpoint/route.ts`

```typescript
// POST: Save checkpoint
// GET: Load checkpoint for recovery
// DELETE: Drop checkpoint on tool abandon

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiError('UNAUTHORIZED', '', 401);

  const body = await request.json();
  const checkpoint = await db.{{TOOL_SLUG}}Checkpoint.create({
    data: {
      userId: session.user.id,
      projectId: body.projectId,
      artifactId: body.artifactId,
      phase: body.phase,
      extractionContext: body.extractionContext,
      outputs: body.outputs,
    },
  });

  return Response.json({ success: true, checkpoint });
}

export async function GET(request: Request, { params }: { params: Promise<{ artifactId: string }> }) {
  const { artifactId } = await params;
  const session = await auth();
  if (!session?.user?.id) return apiError('UNAUTHORIZED', '', 401);

  const checkpoint = await db.{{TOOL_SLUG}}Checkpoint.findFirst({
    where: { artifactId, userId: session.user.id },
  });

  return Response.json({ success: true, checkpoint: checkpoint || null });
}
```

#### Step 3.6.3: Load Checkpoint on UI Mount
**File**: `src/app/tools/{{TOOL_SLUG}}/page.tsx` (modificare {{TOOL_TITLE}}Content)

```typescript
async function handleResumeFromArtifacts() {
  if (!projectId) {
    setResumeNotice('Seleziona prima un progetto.');
    return;
  }

  try {
    // Fetch artifacts
    const artifactsRes = await fetch(`/api/artifacts?projectId=${projectId}&limit=20`);
    const { artifacts } = await artifactsRes.json();

    // For each artifact, try to load checkpoint
    for (const artifact of artifacts) {
      const checkpointRes = await fetch(`/api/tools/{{TOOL_SLUG}}/checkpoint/${artifact.id}`);
      const { checkpoint } = await checkpointRes.json();

      if (checkpoint) {
        // Prefill UI from checkpoint
        setExtractionContext(checkpoint.extractionContext);
        setSteps(prevSteps => prevSteps.map(step => {
          const output = checkpoint.outputs[step.key];
          return output ? { ...step, content: output, status: 'done' } : step;
        }));
        setHasRecoveredCheckpoint(true);
        setResumeNotice(`Ripreso checkpoint da "${artifact.name}" (${checkpoint.phase})`);
        return;
      }
    }

    setResumeNotice('Nessun checkpoint trovato. Carica un nuovo file.');
  } catch (error) {
    setResumeNotice(`Errore nel caricamento checkpoint: ${error}`);
  }
}

// In useEffect on mount:
useEffect(() => {
  const intent = parseIntent(searchParams.get('intent'), sourceArtifactId ? 'regenerate' : 'new');
  if (intent === 'resume') {
    handleResumeFromArtifacts();
  }
}, [projectId, sourceArtifactId]);
```

---

### Phase 3.7: Retry Strategy with Exponential Backoff

Per tool complessi con network fragility, implementa retry logic:

#### Step 3.7.1: Crea Retry Orchestrator
**File**: `src/lib/tool-routes/retry-strategy.ts`

```typescript
type RetryConfig = {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
};

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

class RetryableError extends Error {
  constructor(message: string, public readonly retryable = true) {
    super(message);
  }
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: Partial<RetryConfig> & {
    onRetry?: (attempt: number, maxAttempts: number, delayMs: number, error: string) => void;
  },
): Promise<T> {
  const config = { ...DEFAULT_RETRY_CONFIG, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      lastError = err;

      // Check if retryable
      if (!err.message.includes('RATE_LIMIT') && !err.message.includes('timeout') && attempt === config.maxAttempts - 1) {
        throw err; // Don't retry permanent errors
      }

      // Calculate backoff
      const delayMs = Math.min(
        config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt),
        config.maxDelayMs,
      );

      if (options?.onRetry) {
        options.onRetry(attempt + 1, config.maxAttempts, delayMs, err.message);
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }

  throw lastError || new Error('Max retries exceeded');
}
```

#### Step 3.7.2: Integra Retry nel Generate Route
**File**: `src/app/api/tools/{{TOOL_SLUG}}/generate/route.ts`

```typescript
// In POST handler:

return sseResponse(async (writer) => {
  try {
    const stream = await withRetry(
      () => createArtifactStream({
        userId,
        projectId,
        prompt,
        model,
        workflowType: '{{TOOL_SLUG}}',
        artifactType: 'content',
        onStart: (artifactId) => writer.event('start', { artifactId }),
        onToken: (token) => writer.event('token', { token }),
        onComplete: (content) => writer.event('complete', { content }),
        onError: (error) => writer.event('error', { message: error.message }),
      }),
      {
        maxAttempts: 3,
        onRetry: (attempt, maxAttempts, delayMs, errorMessage) => {
          writer.event('retry-notice', {
            message: `Tentativo ${attempt}/${maxAttempts} tra ${Math.ceil(delayMs / 1000)}s: ${errorMessage}`,
          });
          log.info('Step retry', { attempt, maxAttempts, delayMs });
        },
      },
    );
  } catch (error) {
    writer.event('error', { message: 'Generazione fallita dopo retry' });
    log.error('Final error after retries', { message: error });
  }
});
```

---

### Phase 3.8: Multi-Step State Machine (Per Tool Complessi)

Se il tool ha **3+ step sequenziali**, usa state machine per gestire transizioni:

#### Step 3.8.1: Definisci State Machine
**File**: `src/lib/orchestrator/{{TOOL_SLUG}}-orchestrator.ts`

```typescript
export type {{TOOL_SLUG_UPPER}}Step = 'step1' | 'step2' | 'step3';
export type {{TOOL_SLUG_UPPER}}StepStatus = 'idle' | 'running' | 'done' | 'error';
export type {{TOOL_SLUG_UPPER}}UIPhase = 'idle' | 'uploading' | 'extracting' | 'review' | 'generating' | 'completed';

export type {{TOOL_SLUG_UPPER}}State = {
  phase: {{TOOL_SLUG_UPPER}}UIPhase;
  steps: Record<{{TOOL_SLUG_UPPER}}Step, {
    status: {{TOOL_SLUG_UPPER}}StepStatus;
    content: string;
    artifactId: string | null;
    error: string | null;
  }>;
  extractionContext: string;
  intent: 'new' | 'resume' | 'regenerate';
  canRunGeneration: boolean;
};

export function deriveUIState(state: {{TOOL_SLUG_UPPER}}State): {
  primaryAction: { label: string; disabled: boolean; onClick?: () => void };
  secondaryActions: Array<{ label: string; onClick: () => void }>;
} {
  // Resolver determinístico: state → CTA
  
  if (state.phase === 'uploading' || state.phase === 'extracting') {
    return {
      primaryAction: { label: 'In elaborazione...', disabled: true },
      secondaryActions: [],
    };
  }

  if (state.phase === 'generating') {
    return {
      primaryAction: { label: 'Generazione in corso...', disabled: true },
      secondaryActions: [],
    };
  }

  if (state.extractionContext && !state.steps.step1.content) {
    return {
      primaryAction: {
        label: 'Avvia generazione',
        disabled: !state.canRunGeneration,
        onClick: () => { /* trigger generation */ },
      },
      secondaryActions: [
        { label: 'Carica nuovo file', onClick: () => { /* upload */ } },
      ],
    };
  }

  if (state.steps.step3.status === 'done') {
    return {
      primaryAction: { label: 'Generazione completata ✅', disabled: true },
      secondaryActions: [
        { label: 'Rigenera variante', onClick: () => { /* regenerate */ } },
        { label: 'Apri artefatto', onClick: () => { /* open artifact */ } },
      ],
    };
  }

  return {
    primaryAction: { label: 'Completa dati obbligatori', disabled: true },
    secondaryActions: [],
  };
}
```

#### Step 3.8.2: Multi-Step Generation Flow in UI
**File**: `src/app/tools/{{TOOL_SLUG}}/page.tsx` (Enhanced)

```typescript
async function handleRunProcess() {
  if (!projectId || !extractionContext) return;

  setPhase('generating');
  setRunning(true);

  try {
    // Step 1
    updateStep('step1', { status: 'running', error: null });
    const step1Result = await withRetry(() => generateStream({
      projectId,
      model,
      step: 'step1',
      extractionContext,
    }));
    updateStep('step1', { status: 'done', content: step1Result.content, artifactId: step1Result.artifactId });

    // Step 2 (dipende da step1)
    updateStep('step2', { status: 'running', error: null });
    const step2Result = await withRetry(() => generateStream({
      projectId,
      model,
      step: 'step2',
      extractionContext,
      step1Output: step1Result.content,
    }));
    updateStep('step2', { status: 'done', content: step2Result.content, artifactId: step2Result.artifactId });

    // Step 3 (dipende da step1 + step2)
    updateStep('step3', { status: 'running', error: null });
    const step3Result = await withRetry(() => generateStream({
      projectId,
      model,
      step: 'step3',
      extractionContext,
      step1Output: step1Result.content,
      step2Output: step2Result.content,
    }));
    updateStep('step3', { status: 'done', content: step3Result.content, artifactId: step3Result.artifactId });

    // Save checkpoint on completion
    await fetch(`/api/tools/{{TOOL_SLUG}}/checkpoint`, {
      method: 'POST',
      body: JSON.stringify({
        projectId,
        artifactId: step3Result.artifactId,
        phase: 'step3-complete',
        extractionContext,
        outputs: {
          step1: step1Result.content,
          step2: step2Result.content,
          step3: step3Result.content,
        },
      }),
    });

    setPhase('completed');
  } catch (error) {
    const currentStep = Object.entries(steps).find(([_, s]) => s.status === 'running')?.[0];
    if (currentStep) {
      updateStep(currentStep as {{TOOL_SLUG_UPPER}}Step, {
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
    setPhase('idle');
  } finally {
    setRunning(false);
  }
}
```

---

## 4. Conformità Checklist

#### Step 4.1: Integration Test Route
**File**: `tests/integration/{{TOOL_SLUG}}-route.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { db } from '@/lib/db';
import { createTestUser, createTestProject, cleanupTest } from '@/tests/helpers';

describe('POST /api/tools/{{TOOL_SLUG}}/generate', () => {
  let testUser: any;
  let testProject: any;

  beforeAll(async () => {
    testUser = await createTestUser();
    testProject = await createTestProject(testUser.id);
  });

  afterAll(async () => {
    await cleanupTest([testUser.id]);
  });

  it('should require authentication', async () => {
    const response = await fetch('http://localhost:3000/api/tools/{{TOOL_SLUG}}/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId: testProject.id, model: 'gpt-4', topic: 'test' }),
    });

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('should reject invalid projectId', async () => {
    const session = await createAuthSession(testUser);
    const response = await fetch('http://localhost:3000/api/tools/{{TOOL_SLUG}}/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sessionToken=${session.token}`,
      },
      body: JSON.stringify({ projectId: 'invalid', model: 'gpt-4', topic: 'test' }),
    });

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('should check project ownership', async () => {
    const otherUser = await createTestUser();
    const session = await createAuthSession(otherUser);

    const response = await fetch('http://localhost:3000/api/tools/{{TOOL_SLUG}}/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sessionToken=${session.token}`,
      },
      body: JSON.stringify({
        projectId: testProject.id, // Progetto di testUser, non otherUser
        model: 'gpt-4',
        topic: 'test',
      }),
    });

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error.code).toBe('FORBIDDEN');
  });

  it('should generate stream on valid request', async () => {
    const session = await createAuthSession(testUser);
    const response = await fetch('http://localhost:3000/api/tools/{{TOOL_SLUG}}/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `sessionToken=${session.token}`,
      },
      body: JSON.stringify({
        projectId: testProject.id,
        model: 'gpt-4-turbo',
        topic: 'test generation',
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/event-stream');

    // Parse SSE
    const reader = response.body?.getReader();
    let hasStart = false;
    let hasToken = false;

    while (true) {
      const { done, value } = await reader!.read();
      if (done) break;
      const text = new TextDecoder().decode(value);
      if (text.includes('type":"start')) hasStart = true;
      if (text.includes('type":"token')) hasToken = true;
    }

    expect(hasStart).toBe(true);
    expect(hasToken).toBe(true);
  });
});
```

#### Step 4.2: Unit Test Prompt Builder
**File**: `tests/unit/{{TOOL_SLUG}}.test.ts`

```typescript
import { describe, it, expect } from '@jest/globals';
import { build{{TOOL_TITLE}}Prompt } from '@/lib/tool-prompts/{{TOOL_SLUG}}';

describe('build{{TOOL_TITLE}}Prompt', () => {
  it('should render template with input', async () => {
    const result = await build{{TOOL_TITLE}}Prompt({
      topic: 'test topic',
      tone: 'professional',
    });

    expect(result.content).toContain('test topic');
    expect(result.tokens).toBeGreaterThan(0);
  });

  it('should sanitize empty notes', async () => {
    const result = await build{{TOOL_TITLE}}Prompt({
      topic: 'test',
      notes: '',
    });

    expect(result.content).not.toContain('notes: ');
  });

  it('should handle missing optional fields', async () => {
    const result = await build{{TOOL_TITLE}}Prompt({
      topic: 'minimal input',
    });

    expect(result.content).toContain('minimal input');
    expect(result.tokens).toBeGreaterThan(0);
  });
});
```

---

## 4. Conformità Checklist

Completa TUTTI i seguenti punti prima di mergiare:

### ✅ Backend (API Route)
- [ ] Route POST `/api/tools/{{TOOL_SLUG}}/generate` esiste
- [ ] Sequenza: auth → rate limit → validate → build → stream (ORDINE FISSO)
- [ ] `enforceUsageGuards()` chiamato PRIMA di LLM
- [ ] Zod schema nel file `schemas.ts`
- [ ] Error codes usano enum standard (`UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`, `RATE_LIMIT_EXCEEDED`, `INTERNAL_ERROR`)
- [ ] Logging via `getRequestLogger()`
- [ ] Test integration coperti (auth, ownership, validation, stream) ✅ 4+ test
- [ ] `npm run typecheck` ✅ Zero errors
- [ ] `npm run lint` ✅ Zero errors

### ✅ Prompt & Builder
- [ ] Sorgente markdown in `src/lib/tool-prompts/prompts/{{TOOL_SLUG}}/`
- [ ] Builder in `src/lib/tool-prompts/{{TOOL_SLUG}}.ts`
- [ ] Template statico tipizzato (NO `fs.readFile` runtime)
- [ ] Interpolazione safe (trim + empty string fallback)
- [ ] Test unit su builder ✅ 3+ test
- [ ] `tests/unit/tool-prompts-parity.test.ts` ✅ passa (template statico = sorgente markdown)

### ✅ Frontend UI
- [ ] Page exists: `src/app/tools/{{TOOL_SLUG}}/page.tsx`
- [ ] `<Suspense>` wrappa `useSearchParams()` ✅ Build gate
- [ ] Layout usa `<PageShell width="workspace">`
- [ ] Form card: `.app-surface + .app-rise`
- [ ] Select/Textarea: `.app-control`
- [ ] Titolo: `.app-title`
- [ ] File input (se presente): nativo `<input type="file">` OK (tool-pages exception)
- [ ] Output panel: non flat white (bg-white/70 o container dedicato)
- [ ] Pulsante primario disabilitato fino a campi obbligatori (UX pattern)
- [ ] SSE parsing client-side ✅ onToken + onError

### ✅ UX Replicability (NEW)
- [ ] User journey documented in `docs/ux/{{TOOL_SLUG}}-user-journey.md` (stages, emotions, patterns)
- [ ] UX checklist completed: `docs/ux/{{TOOL_SLUG}}-ux-replication-checklist.md`
- [ ] Layout responsive tested ✅ 320px, 768px, 1024px, 1440px
- [ ] Form component parity verified ✅ labels-above-input pattern, className consistency
- [ ] Focus ring visible on Tab navigation ✅ keyboard-only test
- [ ] Button disabled during stream ✅ prevents double-submit UX
- [ ] Output panel `.app-surface` styling ✅ matches graphic framework
- [ ] Error handling & edge cases tested (empty form, network error, rate limit)
- [ ] Accessibility baseline met ✅ WCAG AA (4.5:1 contrast, keyboard complete, screen reader support)
- [ ] E2E UX parity tests pass ✅ `tests/e2e/{{TOOL_SLUG}}-ux-parity.spec.ts`
- [ ] Mobile responsive verified ✅ no horizontal scroll, accessible touch targets
- [ ] Happy path scenario tested with team member ✅ < 3 min without help

### ✅ Graphic Framework
- [ ] `npm run lint` + `npm run typecheck` ✅ clean
- [ ] Visualizzazione responsive ✅ 320px, 768px, 1024px, 1440px (browser test)
- [ ] Focus ring visibile su tutti input ✅ keyboard Tab test
- [ ] Contrasto AA su testo secondario ✅ manual check o axe audit
- [ ] Tool-pages exceptions documentate (se presenti) in PR description

### ✅ Testing & Build
- [ ] `npm test` ✅ All tests pass
- [ ] `npm run build` ✅ Build succeeds (Next.js 16 + Turbopack warnings check)
- [ ] `npm run dev` ✅ Dev server starts
- [ ] Manual flow test: create project → fill form → generate → output appears

### ✅ Testing Avanzato (PER TOOL COMPLESSI CON MULTI-STEP/EXTRACTION/RETRY/CHECKPOINT)

**ONLY IF Tool ha 2+ step_orchestration, extraction, o recovery logic:**

#### Multi-Step Workflow Tests
- [ ] Step 1 completes successfully ✅ artifact created + content streamed
- [ ] Step 2 receives Step 1 output correctly ✅ dependency resolved
- [ ] Step 3 receives both Step 1 + Step 2 outputs ✅ multi-input dependency correct
- [ ] Error in Step 1 prevents Step 2 from starting ✅ no orphaned artifacts
- [ ] User can regenerate single step ✅ step N can run independently
- [ ] Parallel step detection test ✅ confirms steps are strictly sequential (not parallel)

#### Extraction Pipeline Tests (if Phase 2.5 present)
- [ ] Upload route validates file type ✅ .txt, .md OK; .png rejected
- [ ] Extraction outputs valid context schema ✅ fileId, rawText, businessType, etc.
- [ ] Multi-step builder receives extraction context ✅ step1/step2/step3 builders access extractionContext
- [ ] Extraction re-runs on file re-upload ✅ previous extraction dropped
- [ ] Large file (5MB) extracts within timeout ✅ no 504 Gateway Timeout

#### Retry Logic Tests (if Phase 3.7 present)
- [ ] Retry triggers on network timeout ✅ withRetry catches error
- [ ] Exponential backoff delays increase ✅ wait(1s) → wait(2s) → wait(4s)
- [ ] Max retries = 3 ✅ fails after 3 attempts
- [ ] Permanent errors (validation) don't retry ✅ VALIDATION_ERROR fails immediately
- [ ] Rate limit errors DO retry ✅ RATE_LIMIT_EXCEEDED triggers backoff
- [ ] Retry notice sent to client ✅ SSE event 'retry-notice' streamed

#### Checkpoint & Recovery Tests (if Phase 3.6 present)
- [ ] POST /checkpoint saves state ✅ all steps + extractionContext persisted
- [ ] GET /checkpoint retrieves state ✅ correct phase + outputs returned
- [ ] DELETE /checkpoint cleanly removes ✅ artifact still exists, checkpoint gone
- [ ] UI prefills from loaded checkpoint ✅ form controls show previous values
- [ ] Recovered checkpoint workflow continues ✅ user can regenerate step 3 after step 1+2
- [ ] Checkpoint ownership enforced ✅ userId cannot access other user's checkpoint

#### State Machine Tests (if Phase 3.8 present)
- [ ] UI phase = idle initially ✅ upload section visible
- [ ] UI phase = uploading during file upload ✅ progress loader shown
- [ ] UI phase = extracting after upload completes ✅ extraction processing visible
- [ ] UI phase = review after extraction ✅ generation button enabled
- [ ] UI phase = generating during multi-step flow ✅ step progress bars shown
- [ ] UI phase = completed on success ✅ output panel + "export" CTA visible
- [ ] Primary action label changes per phase ✅ "Avvia generazione" → "Generazione in corso..." → "Esporta artefatto"
- [ ] Secondary actions available context-dependent ✅ "Rigenera" shown only after completion
- [ ] deriveUIState() is deterministic ✅ same state object → same CTA (testable)

### ✅ Documentation
- [ ] PR title: `feat(tool-{{TOOL_SLUG}}): generazione {{TOOL_TITLE}} con streaming`
- [ ] PR body includes:
  - Descrizione breve del tool
  - Link a docs di riferimento (graphic-frameworking-spec, tool-routes guardrails)
  - Graphic framework exceptions (se presenti)
  - UX replicability confirmation
  - Test coverage summary
- [ ] Nessun `TODO` introdotto senza issue associata

---

## 5. Troubleshooting Comune

| Problema | Causa | Soluzione |
|----------|-------|-----------|
| `useSearchParams() should be wrapped in Suspense` | Page.tsx non ha Suspense | Avvolgi content in `<Suspense><{{TOOL_TITLE}}Content /></Suspense>` |
| Input file non mostra focus ring | File input nativo senza styling | OK — tool-pages exception. Verifica browser focus con Tab |
| `.app-control` su select rompe styling | SelectTrigger da Radix | Aggiungi `className="app-control"` su `SelectTrigger` non su Select |
| Template prompt non interpola {{PLACEHOLDER}} | Build-time template statico | Usa `.replace('{{KEY}}', value)` in builder, non nel template |
| `npm run build` fallisce con NFT warning | `fs.readFile` nel path route | Sposta runtime fs a build-time template es. `templates.ts` |
| Rate limit test fallisce | Mock `rateLimit()` non corretto | Importa da `@/tests/helpers`, non mock inline |

---

## 6. Tempi Stimati

### ⚠️ Important: Stima Variabile per Complexity Tier

**Usa la sezione 11 (Complexity Assessment) per classificare il tuo tool PRIMA di leggere queste stime.**

### 🟢 SIMPLE TOOLS (0 SI' nel questionnaire)

**Runbook Base**: Phase 1-4, Conformità Checklist (basic testing)  
**Total Estimated Time**: **3-3.5 ore** (developer con esperienza)

| Phase | Attività | Tempo |
|-------|----------|-------|
| 1 | Route + Schema | 30 min |
| 2 | Prompt + Builder | 45 min |
| 3 | UI Page | 45 min |
| 3.5 | UX Replicability & Basic Testing | 45 min |
| 4 | Integration + Unit Testing (basic) | 30 min |
| 5 | Polish + Docs + PR | 30 min |
| **Totale** | | **3-3.5 ore** |

**Scope**: Form-based tool, single POST endpoint, no preprocessing, no recovery, basic UX testing, accessibility baseline

---

### 🟡 MODERATE TOOLS (1-2 SI' nel questionnaire)

**Runbook Base**: Phase 1-4 + selectedPhases from 2.5/3.6/3.7/3.8  
**Recommended**: Case study reference tool (HLF preview) + this runbook  
**Total Estimated Time**: **4-5 ore** (developer con esperienza)

| Phase | Attività | Tempo | Applicabilità |
|-------|----------|-------|---|
| 1 | Route + Schema | 45 min | ✅ Core |
| 2 | Prompt + Builder (extended for context) | 60 min | ✅ Core |
| 2.5 | Extraction preprocessing (IF needed) | 60 min | ⚠️ Conditional |
| 3 | UI Page | 60 min | ✅ Core (more complex state) |
| 3.5 | UX Replicability & Testing | 60 min | ✅ Full |
| 3.6 | Checkpoint logic (IF needed) | 30 min | ⚠️ Conditional |
| 3.7 | Retry strategy (IF needed) | 30 min | ⚠️ Conditional |
| 4 | Integration + Unit + E2E Testing | 60 min | ✅ Extended |
| 5 | Polish + Docs + PR | 45 min | ✅ Full |
| **Totale** | | **4-5 ore** (baseline) + conditionals |

**Scope Example**: Tool con preprocessing OR multi-step (not both), basic recovery, moderate state complexity

**Decision Tree**:
- Tool ha extraction? → Add Phase 2.5 (+60 min)
- Tool ha resume capability? → Add Phase 3.6 (+30 min)
- Tool ha retry logic? → Add Phase 3.7 (+30 min)
- Adjusted total: 4-5h +/- conditionals

---

### 🔴 COMPLEX TOOLS (3+ SI' nel questionnaire)

**Runbook Base**: Phases 1-4 + Phases 2.5 + 3.6 + 3.7 + 3.8 + Advanced Testing  
**Recommended**: Study HLF source code extensively + this runbook v1.2 + advanced patterns doc  
**Total Estimated Time**: **6-8 ore** (developer esperienza, reference implementation available)

| Phase | Attività | Tempo | Applicabilità |
|-------|----------|-------|---|
| 1 | Route + Schema + orchestrator scaffold | 60 min | ✅ Core |
| 2 | Prompt + Multi-Step Builder | 75 min | ✅ Core |
| 2.5 | Extraction preprocessing pipeline | 60 min | ✅ Required |
| 3 | UI Page + Phase State Machine | 120 min | ✅ Required (2x simple) |
| 3.5 | UX Replicability + Journey Map | 75 min | ✅ Full |
| 3.6 | Checkpoint & Recovery Pattern | 45 min | ✅ Required |
| 3.7 | Retry Strategy with Backoff | 45 min | ✅ Required |
| 3.8 | Multi-Step Orchestration State Machine | 60 min | ✅ Required |
| 4 | Advanced Integration + E2E + Recovery Tests | 120 min | ✅ Extended (2x simple) |
| 5 | Polish + Docs + PR + Team Sign-Off | 60 min | ✅ Full |
| **Totale** | | **6-8 ore** (with reference code) |

**Scope**: Multi-step orchestration (3+), file extraction, state machine UI (5+ phases), recovery/checkpoint, retry logic, complex dependency mapping

**Reality Check**: 
- Prima volta clonando complex tool: **+2-3h** (more code review cycles)
- Con HLF source code reference: **6-8h core estimate**
- Without reference code: **+4-6h** (reverse engineering)

---

### 🔴 VERY COMPLEX TOOLS (6+ SI' nel questionnaire)

**Estimated Time**: **8-12+ ore**  
**Recommendation**: **Contact architecture team before starting** — may need framework extensions

| Additional Complexity | Extra Time |
|---|---|
| Multi-model orchestration | +60 min |
| Dynamic step routing | +90 min |
| Advanced error recovery | +60 min |
| Custom analytics/tracking per step | +45 min |
| Feature flags / A-B testing in generation | +75 min |

---

### Summary Table (Quick Reference)

| Tier | Phase Count | Complexity | Time | Runbook Version |
|---|---|---|---|---|
| 🟢 Simple | 1-3 | Low | 3-3.5h | v1.1 |
| 🟡 Moderate | 4-5 | Medium | 4-5h | v1.1 + case study |
| 🔴 Complex | 6-8 | High | 6-8h | v1.2 (this doc) + patterns |
| 🔴 Very Complex | 8+ | Very High | 8-12h+ | Advanced v2.0 (TBD) |

_Stima include: user journey mapping, UX checklist validation, E2E tests, accessibility audit, mobile responsive testing, team sign-off._

**Base Assumption**: Developer knows Next.js, React, TypeScript, Zod, and has ref implementation available (HLF for complex tools)

---

Con questo runbook **completo di UX**: **+40% qualità di replicabilità** vs HLF raw code.

---

## 7. UX Consistency Guard Rails

Questi principi garantiscono che ALL tool clones mantengono **coerenza UX globale** (non solo conformità grafica):

### 1. Form Pattern Invariant
```
✅ TUTTI i tool clones usano identico form pattern:
  - 2-column responsive layout (form left, output right)
  - Label ABOVE input (accessibility non-negotiable)
  - .app-control su tutti input/select/textarea
  - Pulsante disabilitato durante generazione
  - No side-effects form reset (user decides)
```

### 2. Journey Stages Consistency
```
Ogni tool deve esporre identiche 4 journey stages:

  Stage 1: Entry (0-30 sec)
    → User vede cosa fa lo tool in < 15 parole
    → Forma visibile senza scroll
    
  Stage 2: Configuration (30-120 sec)
    → Campi chiari, label visibili, placeholder helpfully
    → Zero confusion, max 5 campi form
    
  Stage 3: Generation (Streaming)
    → Button disabled, output appare token-by-token
    → User sente il controllo (non lottando contro layout)
    
  Stage 4: Outcome (Post-generation)
    → Output copiabile, selezionabile, commentabile
    → User ha opzione di rigenera/modifica/save
```

### 3. Interaction Parity Rules
```
✅ ALWAYS match HLF interactions:
  - Tab navigation works without mouse
  - Focus ring visible at all times (brand color)
  - Button hover state consistent with design system
  - Error alerts are clear, not hidden
  - No "Save automatically" without user consent
  - Stream abortable ONLY if explicitly supported in route
```

### 4. Accessibility Non-Negotiable
```
WCAG AA MINIMUM on ALL clones:
  ✅ 4.5:1 contrast on all text
  ✅ 24px+ touch targets (except file input, tool-pages exception)
  ✅ Keyboard complete (Tab, Enter, Escape all work)
  ✅ Screen reader announces labels, errors, dynamic updates
  ✅ Focus visible on all interactive elements
  ✅ No color-only indicators (icon + color always)
  ✅ Text resizable to 200% without layout collapse

  RED FLAG (cannot merge):
  ❌ Placeholder-only labels
  ❌ Focus ring missing
  ❌ Color-only form validation
  ❌ Mouse-only interaction path
```

### 5. Copy & Tone Consistency
```
All UI text must follow HLF patterns:

  BUTTONS:      "Genera [cosa]" (imperative, Italian)
  LOADING:      "In generazione..." (always dot ellipsis)
  ERROR:        "Errore: [reason]" (technical but friendly)
  PLACEHOLDER:  "es. [example in field context]" (lowercase, helpful)
  HELP TEXT:    Max 1 line ~60 char (no walls of text)
  LABELS:       "[Campo]" (title case, required marker if mandatory)
  
  ❌ DON'T:
    - Mix language ("Generate your [output]" in IT context)
    - Use "Loading..." or "Please wait..."
    - Generic placeholders like "Enter text here"
    - Capitalized error messages
```

### 6. Mobile-First Responsive Guarantee
```
Tool clone must NOT break at ANY breakpoint:

  320px (iPhone SE)
    - Form 1 column, 100% width
    - No horizontal scroll
    - Touch targets ≥ 44px height
    
  768px (Tablet Portrait)
    - Still 1 column (form, output stacked)
    - Max width ~600px centered
    
  1024px (Small Desktop)
    - 2-column layout starts here (form 3fr, output 2fr)
    - Responsive gap (1.5rem)
    
  1440px (Large Desktop)
    - Max width container 1440px
    - Breathing room maintained

  Test: `npm run dev` → F12 toggle device mode at each breakpoint
```

### 7. Performance Baseline
```
Clone generation must not feel slower than HLF:

  ✅ Form interactive within 200ms of page load
  ✅ First token appears within 2 seconds of submit
  ✅ Token streaming at >1 token/50ms (minimal jank)
  ✅ No layout shift during output (CSS containment or placeholder)
  ✅ Submit button responds immediately (no N second lag)

  If slower → debug:
    - Image/CSS not optimized
    - Stream buffering too large
    - Route handler doing sync work
```

---

## 7b. UX Testing Checklist (Before PR)

**Before requesting review, complete these manual tests:**

| Test | Pass? | Notes |
|------|-------|-------|
| **Scenario 1**: Fill form, generate, copy output | [ ] | Mobile + desktop both? |
| **Scenario 2**: Keyboard-only (no mouse) | [ ] | Tab through all, Enter to submit? |
| **Scenario 3**: Browser zoom 200% | [ ] | Text readable, no overlap? |
| **Scenario 4**: Empty form submit → error alert | [ ] | Error message clear? |
| **Scenario 5**: Screen reader test | [ ] | NVDA (Windows) or VoiceOver (Mac)? |
| **Scenario 6**: Slow network (DevTools throttle) | [ ] | UX handles latency gracefully? |
| **Scenario 7**: Mobile (375px width) | [ ] | No horizontal scroll, readable? |
| **Scenario 8**: Focus ring visibility | [ ] | Can see outline on Tab? |

**Sign-off Template**:
```markdown
## UX Sign-Off ✅

**Tester**: [Your Name]  
**Date**: YYYY-MM-DD  
**Tool**: {{TOOL_TITLE}}  

| Scenario | Result | Notes |
|----------|--------|-------|
| Happy path (form → generate → copy) | ✅ Pass | 2 min 30 sec |
| Keyboard navigation | ✅ Pass | All focus rings visible |
| Mobile responsive (375px) | ✅ Pass | No horizontal scroll |
| Accessibility (screen reader) | ✅ Pass | VoiceOver announces labels clearly |
| Error recovery | ✅ Pass | Alert clear, form recoverable |

**Observation**: Behavior feels identical to HLF.  
**Ready for Code Review**: YES ✅
```

---

## 8. Riferimenti & Link Rapidi

| Documento | Scopo | Link |
|-----------|-------|------|
| Graphic Framework | CSS classes obbligatorie | [docs/specifications/graphic-frameworking-spec.md](../specifications/graphic-frameworking-spec.md) |
| Tool Routes | Pattern auth/rate limit | [.github/instructions/tool-routes.instructions.md](../../.github/instructions/tool-routes.instructions.md) |
| Tool Prompts | Template strategy | [.github/instructions/tool-prompts.instructions.md](../../.github/instructions/tool-prompts.instructions.md) |
| API Specs | Error codes + SSE | [docs/specifications/api-specifications.md](../specifications/api-specifications.md#tool-specific-generation) |
| HLF Reference | Codice completo funzionante | [src/app/tools/funnel-pages/page.tsx](../../src/app/tools/funnel-pages/page.tsx) |
| HLF Route | Route handler di riferimento | [src/app/api/tools/funnel-pages/generate/route.ts](../../src/app/api/tools/funnel-pages/generate/route.ts) |
| HLF Tests | Test template | [tests/integration/funnel-pages-route.test.ts](../../tests/integration/funnel-pages-route.test.ts) |
| UX Strategy | Higher-level design direction | [docs/ux/ux-strategy.md](../ux/ux-strategy.md) |
| Accessibility Guidelines | WCAG AA requirements | [docs/accessibility/accessibility.md](../accessibility/accessibility.md) |
| UX Replicability (Phase 3.5) | Complete UX alignment guide for clones | This runbook (Section 3.5) |

---

## 9. DoD Finale (Definition of Done)

**Tool clone è conforme quando**:
- ✅ Route POST generazione implementata con sequenza auth → rate limit → validate
- ✅ Prompt builder statico tipizzato (zero runtime fs)
- ✅ UI page con `.app-surface`, `.app-control`, `.app-title` applicati
- ✅ User journey documented in `docs/ux/{{TOOL_SLUG}}-user-journey.md`
- ✅ UX checklist completed: `docs/ux/{{TOOL_SLUG}}-ux-replication-checklist.md`
- ✅ Layout responsive tested ✅ 320px, 768px, 1024px, 1440px
- ✅ Keyboard navigation complete, focus rings visible
- ✅ Accessibility baseline met (WCAG AA: 4.5:1 contrast, keyboard complete, screen reader)
- ✅ E2E UX parity tests pass ✅ `tests/e2e/{{TOOL_SLUG}}-ux-parity.spec.ts`
- ✅ Mobile experience verified (no horizontal scroll, ≥44px touch targets)
- ✅ Test integration ≥ 4 scenari (auth, ownership, validation, stream)
- ✅ Test unit ≥ 3 scenari (builder, edge cases)
- ✅ `npm test` ✅, `npm run build` ✅, `npm run typecheck` ✅, `npm run lint` ✅
- ✅ PR approvata con code review focus su conformità spec + UX replicability
- ✅ Zero `TODO` senza issue
- ✅ Browser test: form → generate → output ✅ works
- ✅ Manual team sign-off: "Behavior feels identical to HLF" ✅

**Status**: Ready to Merge 🚀

---

---

## 10. GO/NO GO Assessment: Validità del Framework per Clonare HLF-Like Tools

**Data Assessment**: 2026-04-17  
**Scope**: Capacità del runbook di guidare clonazione tool **con complessità comparabile o superiore** a HotLeadFunnel

### Verdict Sintetico

| Categoria Tool | Applicabilità Runbook | GO/NO GO | Tempo Reale |
|---|---|---|---|
| **Simple** (form → POST → output) | ✅ 100% | 🟢 **GO** | 3-3.5h |
| **Moderate** (form + preprocessing) | ⚠️ 60% | 🟡 **CONDITIONAL** | 4-5h |
| **Complex** (multi-step + state machine + recovery) | ❌ 20% | 🔴 **NO GO** | 6-8h |

**HotLeadFunnel Classification**: **Complex** (multi-step optin→quiz→vsl, extraction preprocessing, state machine UI, checkpoint recovery)

---

### Detailed Gap Analysis

#### ✅ STRENGTHS (Runbook è Valido Per)

1. **Backend Pattern Solido** ✅
   - Sequenza auth → rate limit → validate → build → stream è corretta
   - Zod schema approach è robusto e scalabile
   - SSE streaming contract è standard
   - Error handling è coerente

2. **UX Replicability Framework** ✅
   - User journey extraction template è utile per simple tools
   - UX checklist multi-aspetto (form parity, keyboard, accessibility, responsive)
   - E2E test patterns (Playwright) sono copiabili
   - Accessibility baseline (WCAG AA) è non-negotiable

3. **Testing Strategy** ✅
   - Integration tests coprono auth, ownership, validation, stream
   - Unit tests su builder sono appropriati
   - E2E UX tests validano layout e interazioni

---

#### 🔴 CRITICAL GAPS (Runbook Non Copre Per Tool Complessi)

**A. Multi-Step Orchestration (✗ NOT COVERED)**

```typescript
// HLF reality: sequenziale optin → quiz → vsl
// dove output di step N alimenta input step N+1

// Runbook template: single POST → generate, assume no sequencing
```

**Mancanze**:
- [ ] Orchestrazione sequenziale (step dependency, output chaining)
- [ ] Passaggio di output intermedi tra step
- [ ] Partial failure recovery (step 1 OK, step 2 FAIL → resume da step 2)
- [ ] State machine per step (idle → running → done → error)

**Impatto**: Developer deduce da HLF code senza guidance → **Rischio alto di divergence**

---

**B. Preprocessing & Extraction Chain (✗ NOT COVERED)**

```typescript
// HLF reality:
// 1. POST /funnel-pages/upload file
// 2. POST /extraction/generate → extract context
// 3. POST /funnel-pages/generate ← USE extraction context

// Runbook template: direct POST /generate, assume no preprocessing
```

**Mancanze**:
- [ ] File upload route implementation
- [ ] Extraction preprocessing pipeline
- [ ] Async extraction with partial failure states (`completed_partial`, `completed_full`, `failed_hard`)
- [ ] Linking extraction output to generation request

**Impatto**: Tool clone non supporta file upload+extraction → **Impossibile replicare HLF behavior**

---

**C. Stateful UI Phase Management (✗ NOT COVERED)**

```typescript
// HLF reality: complex state machine
type FunnelUiState = 'draft-empty' | 'processing-briefing' | 'draft-ready' | 
  'prefilled-regenerate' | 'paused-with-checkpoint' | 'resume-needs-briefing' | 
  'running' | 'completed'

// Runbook template: const [running, setRunning] = useState(false)
// Simple binary state, no phase tracking
```

**Mancanze**:
- [ ] Phase state machine design (uploading, extracting, review, generating)
- [ ] UI state derivation logic `deriveFunnelUiState()`
- [ ] Primary action resolver (state → CTA primaria)
- [ ] Secondary actions contextualized
- [ ] Intent-based initialization (`intent=resume`, `intent=regenerate`)

**Impatto**: UI diventa "simple form → generate", perde capacità di recovery e prefill → **UX breaks for power users**

---

**D. Recovery & Checkpoint Logic (✗ NOT COVERED)**

```typescript
// HLF reality: artifact recovery & resume
handleResumeFromArtifacts() → fetch artifacts → pick → prefill context
canResumeCheckpoint = hasRecoveredCheckpoint && (hasExtractionReady || hasRecoveredSteps)

// Runbook template: no mention of recovery/checkpoint
```

**Mancanze**:
- [ ] Artifact discovery & recovery logic
- [ ] Checkpoint storage & retrieval strategy
- [ ] Resume intent vs Regenerate intent disambiguation
- [ ] Prefill form from artifact
- [ ] State reconstruction

**Impatto**: Tool non supporta resume flow → **Operational friction; partial work lost on page reload**

---

**E. Retry Strategy with Backoff (⚠️ PARTIAL)**

```typescript
// HLF reality: exponential backoff retry
withRetry(() => generateStream(...), {
  onRetry: (attempt, maxAttempts, delayMs, errorMessage) => {
    setRetryNotice(`Step ${step}: tentativo ${attempt + 1}/${maxAttempts} tra ${delayMs/1000}s...`);
  },
});

// Runbook template: no retry strategy documented
```

**Mancanze**:
- [ ] Retry decision logic (retryable vs transient vs permanent)
- [ ] Exponential backoff calculation
- [ ] Max retry attempts per step
- [ ] User feedback during retry
- [ ] Circuit breaker

**Impatto**: Tool fails on transient network errors → **Reduced reliability (not breaking)**

---

**F. Time Estimate Severely Underestimated (⚠️ RISKY)**

**Runbook claims**: 3-3.5 hours (developer esperienza)

**Reality per Complex Tools**:

| Phase | Simple Tools | Complex Tools | Delta |
|-------|---|---|---|
| Route + Schema | 30 min | 45 min | +50% |
| Prompt + Builder | 45 min | 60 min | +33% |
| **UI Page** | 45 min | **120 min** | **+167%** (state machine) |
| UX + Testing | 60 min | 60 min | — |
| Testing (integration + E2E) | 45 min | 90 min | +100% |
| **Total** | **3-3.5h** | **6-8h** | **+85% underestimate** |

---

### Applicability Matrix

| Tool Trait | Runbook Coverage | Grade | Go/No Go | Risk |
|---------|---|-----|----|---|
| Simple form → single-shot generate | ✅ Full | A | 🟢 GO | Low |
| Multi-step orchestrated pipeline | ✗ Not mentioned | F | 🔴 NO GO | 🔴 Critical |
| File upload + preprocessing | ⚠ Partial | D | 🟡 CONDITIONAL | 🔴 Critical |
| Stateful UI with phase tracking | ✗ Template only | F | 🔴 NO GO | 🔴 Critical |
| Resume / checkpoint recovery | ✗ Not mentioned | F | 🔴 NO GO | ⚠️ High |
| Retry with exponential backoff | ✗ Not mentioned | F | 🔴 NO GO | ⚠️ High |
| Backend auth/rate-limit/validation | ✅ Full | A | 🟢 GO | Low |
| Prompt builder (static template) | ✅ Full | A | 🟢 GO | Low |
| E2E UX testing | ✅ Good | B+ | 🟢 GO | Low |
| Accessibility (WCAG AA) | ✅ Full | A | 🟢 GO | Low |

---

### Final Verdict

**🟢 GO** — Per clonare tool **semplici** (form-based, single-endpoint, no recovery)  
- Applicabilità: 100%  
- Tempo realistico: 3-3.5h  
- Confidence: Alta

**🟡 CONDITIONAL GO** — Per tool con **moderate complexity** (preprocessing OR multi-step, not both)  
- Applicabilità: 60%  
- Tempo realistico: 4-5h  
- Confidence: Media  
- Required: Caso studio aggiuntivo

**🔴 NO GO** — Per clonare **HLF-like complex tools** (stateful, multi-step, recovery)  
- Applicabilità: 20%  
- Tempo realistico: 6-8h  
- Confidence: Bassa  
- Required: Advanced runbook separato

---

### Raccomandazioni

**1. Per Simple Tools** → Usa Runbook v1.1 as-is ✅

**2. Per Tool Complessi Come HLF** → 

Crea **supplementary advanced guide** che copra:
- Multi-step orchestrator pattern
- Extraction preprocessing architecture
- UI state machine design (derivation logic)
- Checkpoint & recovery strategy  
- Retry with backoff implementation

**File suggerito**: `docs/implementation/tool-cloning-advanced-patterns-1.md`

**3. Aggiungi Complexity Assessment Checklist** a Section 4:

```markdown
### Complexity Pre-Check (Prima di iniziare)

- [ ] Tool ha multi-step workflow? (optin → quiz → vsl?)
- [ ] Tool richiede preprocessing/extraction?
- [ ] Tool ha state machine UI con 5+ stati?
- [ ] Tool supporta resume/checkpoint recovery?
- [ ] Tool ha retry con backoff?

**Decision**:
- 0 checkmark → Simple tool, Runbook v1.1, 3-3.5h
- 1-2 checkmark → Moderate, Runbook v1.1 + case study, 4-5h
- 3+ checkmark → Complex, Advanced guide needed, 6-8h
```

**4. Update Timing Section** con conditional estimates

---

**Conclusione**: Il runbook è **valido e utile per il 60% dei tool realistici**, ma **insufficiente per tool stateful come HLF**. Non è un "fallimento" — è design corretto per mid-complexity scope. Per tools più avanzati, è fondamentale suddividere in runbook separati per complexity tier.

---

## 11. Complexity Assessment Questionnaire

**PRIMA DI INIZIARE A CLONARE**, completa questo questionnaire per auto-classificare il tool e stimare correttamente tempo + ambito.

### Quick Diagnostic Tool

Rispondi alle seguenti domande con **SI'** o **NO**:

| # | Domanda | SI' | NO | Note |
|---|---------|-----|----|----|
| 1 | Tool ha **multi-step workflow**? (es. optin → quiz → vsl, step1 output → step2 input) | [ ] | [ ] | Multi-step significa output di un passo alimenta il successivo |
| 2 | Tool richiede **preprocessing/estrazione** da file? (es. upload .txt → extract context) | [ ] | [ ] | Deve caricare file e preprocessarlo prima della generazione |
| 3 | Tool ha **state machine UI** con 5+ stati? (es. idle, uploading, extracting, generating, completed) | [ ] | [ ] | Prova a elencare tutti i "phase" UI: se >5, è complex |
| 4 | Tool supporta **resume/checkpoint recovery**? (es. user può ripartire da artifact precedente) | [ ] | [ ] | Salva e ricupera stato tra sessioni |
| 5 | Tool ha **retry logic con backoff**? (es. transient error → attendi e riprova) | [ ] | [ ] | Gestione intelligente di errori temporanei |
| 6 | Tool richiede **accounting/quota per step**? (es. cost tracking variabile per ogni step) | [ ] | [ ] | Non solo costo totale, ma cost per step |
| 7 | Tool ha **custom error recovery UI**? (es. "Riprova step 3?", partial state prefill) | [ ] | [ ] | UX specifica per recupero errore |
| 8 | Tool utilizza **multiple LLM models** in parallelo o sequenziale? (es. model1 step1, model2 step2) | [ ] | [ ] | Orchestrazione multi-model |

### Scoring & Classification

**Conta i SI' nella tabella sopra:**

```
0 SI':  🟢 SIMPLE TOOL          Runbook v1.1 → 3-3.5h
        Esempi: blog post generator, product description tool, meta description tool
        
1-2 SI': 🟡 MODERATE TOOL       Runbook v1.1 + Case Study → 4-5h
        Esempi: long-form content with reviewer step, multi-tone variations
        
3-5 SI': 🔴 COMPLEX TOOL        Advanced Runbook (TBD v2.0) → 6-8h
        Esempi: HotLeadFunnel, multi-step sales flows, extraction-based tools
        
6+ SI': 🔴 VERY COMPLEX TOOL    Specialized Framework Needed → 8-12h+
        Esempi: custom agent workflows, dynamic step routing, complex state
```

---

### Self-Assessment Example: HotLeadFunnel

| # | Domanda | Risposta | Evidenza |
|---|---------|----------|----------|
| 1 | Multi-step workflow? | ✅ SI' | optin → quiz → vsl (3 steps sequenziali) |
| 2 | Preprocessing/extraction? | ✅ SI' | upload file → extract business context |
| 3 | State machine UI 5+ stati? | ✅ SI' | idle, uploading, extracting, review, generating, completed, error (7 stati) |
| 4 | Resume/checkpoint recovery? | ✅ SI' | handleResumeFromArtifacts(), prefill da checkpoint |
| 5 | Retry logic con backoff? | ✅ SI' | withRetry wrapper, exponential backoff |
| 6 | Accounting/quota per step? | ⚠️ Parziale | Cost tracking globale, non per step |
| 7 | Custom error recovery UI? | ✅ SI' | "Riprova generazione", prefill step precedenti |
| 8 | Multi-model orchestration? | ❌ NO | Usa GPT-4-turbo per tutti i step |

**Total SI'**: 6.5 / 8 → **🔴 VERY COMPLEX TOOL** → **Advanced Runbook + 6-8h minimum**

---

### How to Use This Assessment

**Step 1**: Completa il questionnaire con il product owner / tech lead  
**Step 2**: Conta i SI'  
**Step 3**: Scegli runbook e tempo di stima appropriato  
**Step 4**: Traccia il link a questa assessment nel PR come proof-of-planning  

**PR Template Excerpt**:
```markdown
## Planning & Assessment

- Tool Complexity Tier: [🟢 Simple / 🟡 Moderate / 🔴 Complex]
- Complexity Assessment: [Link a questo doc sezione 11 con score]
- Estimated Time: [3-3.5h / 4-5h / 6-8h]
- Runbook Version: [v1.1 / v1.1+Case / Advanced v2.0]
```

---

### Advanced: Custom Tool Type Classification

Se il tuo tool non rientra bene nelle 3 categorie, usa questa matrice:

| Trait | Impact on Scope | Score |
|-------|---|---|
| Multi-step orchestration | +50% time | 1 point |
| File upload + extraction | +30% time | 1 point |
| Stateful UI (5+ phases) | +40% time | 1 point |
| Recovery/checkpoint logic | +25% time | 1 point |
| Retry with backoff | +20% time | 1 point |
| Custom error recovery UI | +15% time | 1 point |

**Formula**: 
```
Base Time = 3.5h
Adjusted Time = Base Time + (Traits Found × Percentage)
```

**Esempio**: Tool con multi-step (+50%) + extraction (+30%) + state machine (+40%)  
= 3.5h + (3 × ~40% avg) = ~5.7h → **Classify as COMPLEX**

---

**Versione**: 1.2 (Complete coverage of complex tool patterns)  
**Autore**: Federico (Aprile 2026)  
**Ultimo aggiornamento**: 2026-04-17  
**Sezioni Aggiunte in v1.2**:
- Phase 3.6: Checkpoint & Recovery Pattern (con schema, persist route, UI prefill)
- Phase 3.7: Retry Strategy with Exponential Backoff (withRetry wrapper, route integration)
- Phase 3.8: Multi-Step State Machine (orchestration sequenziale, UI state derivation)
- Advanced Testing section in "Conformità Checklist" (multi-step, extraction, retry, checkpoint, state machine test scenarios)
- Section 11: Complexity Assessment Questionnaire (auto-classificazione tool tier prima di iniziare)

**Feedback Welcome**: Se questo runbook ti ha aiutato, aggiorna con le tue learnings! Segna complexity tier del tuo tool prima di partire.
