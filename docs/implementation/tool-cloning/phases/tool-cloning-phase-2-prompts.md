---
goal: Phase 2 - Prompt Specification and Builder nel formato TypeScript statico
version: 1.2
date_created: 2026-04-17
date_updated: 2026-04-18
status: Active
tags: [runbook, tool-cloning, phase-2, prompts, builder]
---

# Phase 2: Prompt Specification & Builder

Questa phase copre la creazione del prompt builder TypeScript e il markdown sorgente.

---

## Step 2.1: Scrivi Prompt Sorgente Markdown

**File**: `src/lib/tool-prompts/prompts/tools/{{TOOL_SLUG}}/generate.md` (o split per step se multi-step)

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

### Best Practices

- Mantieni prompt sotto 2000 token (riferimento OpenRouter limits)
- Separa "Regole" da "Guardrail"
- Non usare placeholder JSON — usa markdown strutturato
- Test: generazione 3-5 volte localmente su `npm run dev`

---

## Step 2.2: Crea Builder TypeScript

**File**: `src/lib/tool-prompts/{{TOOL_SLUG}}.ts`

Prima di scrivere il builder, dichiara esplicitamente il contratto di contesto multi-step.

Per coerenza con HLF, il pattern raccomandato e:

- step 1 riceve solo `extractionContext`
- step 2 riceve `extractionContext + step1Output`
- step 3 riceve `extractionContext + step1Output + step2Output`

Evita di riscrivere o sostituire il contesto base a ogni step, salvo deviazione intenzionale documentata nel blueprint.

```typescript
import 'server-only';

// Template statico — caricato UNA SOLA VOLTA (build time, no runtime fs.readFile)
const {{TOOL_SLUG_UPPER}}_TEMPLATE = `
# {{TOOL_TITLE}} Generation Prompt
...contenuto markdown dagli step 2.1...
`;

export type {{TOOL_TITLE}}Input = {
  // Definisci input specifico tool
  topic: string;
  tone?: 'professional' | 'casual';
  notes?: string;
  extractionContext?: string;
  step1Output?: string;
  step2Output?: string;
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

Se il tool e multi-step, preferisci builder separati per step con input espliciti invece di un singolo builder ambiguo. Il requisito da preservare e che gli step successivi compongano il prompt come `contesto base invariato + output precedenti`, non come nuovo contesto sostitutivo.

### Vincoli

- ✅ No `fs.readFile()` al runtime (violazione NFT Turbopack)
- ✅ Template statico tipizzato in costante
- ✅ Interpolazione safe (trim + fallback)
- ✅ Input tipizzato con Zod validato prima di call

---

## Step 2.3: Aggiorna Registry (Opzionale)

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

## Reference Documentazione

- **Tool Prompts Pattern**: [.github/instructions/tool-prompts.instructions.md](/.github/instructions/tool-prompts.instructions.md)
- **HLF Reference**: [src/lib/tool-prompts/funnel-pages.ts](/src/lib/tool-prompts/funnel-pages.ts)

---

## Next Step

Se il tool ha file upload o preprocessing, vai a **[tool-cloning-phase-2-5-extraction.md](/docs/implementation/tool-cloning/phases/tool-cloning-phase-2-5-extraction.md)**.

Altrimenti, salta direttamente a **[tool-cloning-phase-3-frontend.md](/docs/implementation/tool-cloning/phases/tool-cloning-phase-3-frontend.md)**.
