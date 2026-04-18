---
goal: Phase 1 - Backend Route Handler + Zod Schema per tool generation
version: 1.1
date_created: 2026-04-17
date_updated: 2026-04-17
status: Active
tags: [runbook, tool-cloning, phase-1, backend, route]
---

# Phase 1: Backend Route + Schema (Start Here)

Questa phase copre la creazione del route POST handler e del Zod schema per la validazione input.

---

## Step 1.1: Definisci Zod Schema

**File**: `src/lib/tool-routes/schemas.ts`

Aggiungi al file esistente:

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

### Validation Rules

- `projectId`: SEMPRE `z.string().cuid()`
- `model`: SEMPRE string non-empty (da lista admin)
- Tool-specific fields: SEMPRE con descrizione d'errore chiara
- Optional fields: usa `.optional()`, mai null senza fallback

---

## Step 1.2: Crea Route Handler POST

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

### Checklist Route

- [ ] Auth via `requireAuthenticatedUser()` + userId salvato
- [ ] Zod parse + safeParse().success check
- [ ] Ownership check via `requireOwnedProject()`
- [ ] `enforceUsageGuards()` PRIMA di `createArtifactStream()`
- [ ] `requireAvailableModel()` per validazione modello
- [ ] `build{{TOOL_TITLE}}Prompt()` chiamato PRIMA di stream
- [ ] `sseResponse()` wrappa l'intera logica stream
- [ ] `workflowType: '{{TOOL_SLUG}}'` per artifact tracking
- [ ] Logging su start/complete/error via `getRequestLogger()`

---

## Step 1.3: (Opzionale) Crea Route Handler UPLOAD

**Solo se il tool ha upload file** (es. HLF). Copia da `src/app/api/tools/funnel-pages/upload/route.ts`:

```typescript
// File: src/app/api/tools/{{TOOL_SLUG}}/upload/route.ts
// Pattern: auth → rate limit → project ownership → file validation → parse → return text
```

Se il tool non ha upload, salta questo step e vai a Phase 2.

---

## Reference Documentazione

- **Tool Routes Guardrails**: [.github/instructions/tool-routes.instructions.md](/.github/instructions/tool-routes.instructions.md)
- **API Specifications**: [docs/specifications/api-specifications.md](/docs/specifications/api-specifications.md#tool-specific-generation)
- **HLF Reference**: [src/app/api/tools/funnel-pages/generate/route.ts](/src/app/api/tools/funnel-pages/generate/route.ts)

---

## Next Step

Procedi a **[tool-cloning-phase-2-prompts.md](/docs/implementation/tool-cloning/phases/tool-cloning-phase-2-prompts.md)** per creare il prompt builder.
