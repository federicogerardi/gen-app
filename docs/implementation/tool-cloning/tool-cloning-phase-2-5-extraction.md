---
goal: Phase 2.5 (Opzionale) - File Upload e Extraction Preprocessing
version: 1.1
date_created: 2026-04-17
date_updated: 2026-04-17
status: Active
tags: [runbook, tool-cloning, phase-2-5, extraction, optional]
---

# Phase 2.5: Extraction & Preprocessing (Opzionale)

Questa fase copre il **preprocessing di input** prima della generazione LLM. Se il tool accetta file upload, dati strutturati, o richiede estrazione di contesto testuale, implementa questo flow.

**Se il tool NON ha file upload**, salta questa phase e vai direttamente a **Phase 3: Frontend UI**.

---

## Step 2.5.1: Definisci Extraction Schema

**File**: `src/lib/tool-routes/schemas.ts`

Aggiungi schema per extraction preprocessing:

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

---

## Step 2.5.2: Crea Upload Route Handler

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

---

## Step 2.5.3: Collega Extraction Context ai Prompt Multi-Step

Regola di coerenza con HLF: l'`extractionContext` prodotto in questa fase resta il contesto base invariato per tutti gli step successivi.

Questo significa:

- step 1 usa `extractionContext`
- step 2 usa `extractionContext + output step 1`
- step 3 usa `extractionContext + output step 1 + output step 2`

Non sostituire `extractionContext` con un nuovo contesto derivato a ogni step, salvo deviazione intenzionale documentata nel blueprint del tool.

Modifica il builder della Phase 2 per accettare `extractionContext`:

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

La regola da rendere esplicita anche nei test e nella documentazione del clone e:

- `step1Output` si aggiunge al contesto base per lo step 2
- `step2Output` si aggiunge al contesto base per lo step 3
- il contesto base resta identico lungo tutta la pipeline

---

## Checklist Phase 2.5

- [ ] Upload route created: `src/app/api/tools/{{TOOL_SLUG}}/upload/route.ts`
- [ ] Extraction schema defined in shared `schemas.ts`
- [ ] File type validation (MIME + extension)
- [ ] File size validation (max 10MB)
- [ ] Text extraction working for .txt and .md
- [ ] Return format: JSON with `extractionContext`, `fileSize`, `fileName`
- [ ] Error handling for invalid files
- [ ] Prompt builder updated to accept extraction context
- [ ] Multi-step builders dispatch correctly (if applicable)

---

## Next Step

Procedi a **[tool-cloning-phase-3-frontend.md](tool-cloning-phase-3-frontend.md)** per creare la UI page.
