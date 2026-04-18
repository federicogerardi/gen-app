---
goal: Phase 3 - Frontend UI Page con architettura composable (page + ToolContent + hooks + components)
version: 1.2
date_created: 2026-04-17
date_updated: 2026-04-18
status: Active
tags: [runbook, tool-cloning, phase-3, frontend, ui]
---

# Phase 3: Frontend UI Page

Questa phase copre la creazione del layer frontend nel pattern composable introdotto con ADR 004.

> ⚠️ **Aggiornato il 2026-04-18** — Il pattern monolitico (tutto-in-page.tsx) è obsoleto. Il pattern as-is divide il frontend in: thin Suspense wrapper (`page.tsx`) + container (`{{TOOL_TITLE}}ToolContent.tsx`) + custom hooks + componenti tool-specific. Reference: `src/app/tools/funnel-pages/` (HLF) e `src/app/tools/nextland/`.

---

## Overview della struttura frontend composable

Un tool frontend si compone di questi livelli:

```
src/app/tools/{{TOOL_SLUG}}/
├── page.tsx                             [SOLO Suspense wrapper + import — ~20 righe]
├── {{TOOL_TITLE}}ToolContent.tsx        [Container: compone hooks + componenti — ~280 righe]
├── config.ts                            [Costanti: TONES, initialSteps, badge class maps]
├── types.ts                             [Re-export @/tools/shared + ToolStepState<StepKey>]
├── hooks/
│   ├── use{{TOOL_TITLE}}Generation.ts   [Stream generazione + retry via @/tools/shared]
│   ├── use{{TOOL_TITLE}}Recovery.ts     [Resume artifact + checkpoint parse]
│   ├── use{{TOOL_TITLE}}Extraction.ts   [Upload + extraction lifecycle — se applicable]
│   └── use{{TOOL_TITLE}}UiState.ts      [uiState derivato da phase/steps/intent]
└── components/
    ├── {{TOOL_TITLE}}SetupCard.tsx       [Form setup (wrappa ToolSetup di shared)]
    ├── {{TOOL_TITLE}}StatusQuick.tsx     [Widget stato step]
    └── {{TOOL_TITLE}}StepCards.tsx       [Step cards + CTA per step]
```

---

## Step 3.1: Crea `page.tsx` (Suspense wrapper)

**File**: `src/app/tools/{{TOOL_SLUG}}/page.tsx`

È un thin wrapper: Suspense + fallback + import del ToolContent. **Non contiene state, form, né logica.**

```tsx
'use client';

import { Suspense } from 'react';
import { PageShell } from '@/components/layout/PageShell';
import { {{TOOL_TITLE}}ToolContent } from './{{TOOL_TITLE}}ToolContent';

export default function {{TOOL_TITLE}}ToolPage() {
  return (
    <Suspense
      fallback={(
        <PageShell width="workspace">
          <div className="py-10 text-sm text-muted-foreground" role="status" aria-live="polite" aria-atomic="true">
            Caricamento {{TOOL_TITLE}}...
          </div>
        </PageShell>
      )}
    >
      <{{TOOL_TITLE}}ToolContent />
    </Suspense>
  );
}
```

---

## Step 3.2: Crea `config.ts`

**File**: `src/app/tools/{{TOOL_SLUG}}/config.ts`

```typescript
import type { {{TOOL_TITLE}}StepState } from './types';

export const TONES = ['professional', 'casual', 'formal', 'technical'] as const;

export const TONE_HINTS: Record<(typeof TONES)[number], string> = {
  professional: 'Chiaro e autorevole.',
  casual: 'Diretto e vicino.',
  formal: 'Istituzionale e rigoroso.',
  technical: 'Preciso e tecnico.',
};

export const STEP_STATUS_BADGE_CLASS: Record<{{TOOL_TITLE}}StepState['status'], string> = {
  idle:    'border-slate-400 bg-slate-200 text-slate-950',
  running: 'border-amber-400 bg-amber-200 text-amber-950',
  done:    'border-emerald-400 bg-emerald-200 text-emerald-950',
  error:   'border-rose-400 bg-rose-200 text-rose-950',
};

export const STEP_STATUS_LABEL: Record<{{TOOL_TITLE}}StepState['status'], string> = {
  idle:    'In attesa',
  running: 'In corso',
  done:    'Completato',
  error:   'Errore',
};

export const initialSteps: {{TOOL_TITLE}}StepState[] = [
  { key: '{{STEP_1_KEY}}', title: 'Step 1 — {{STEP_1_TITLE}}', status: 'idle', content: '', artifactId: null, error: null },
  { key: '{{STEP_2_KEY}}', title: 'Step 2 — {{STEP_2_TITLE}}', status: 'idle', content: '', artifactId: null, error: null },
  // aggiungere altri step se necessario
];
```

---

## Step 3.3: Crea `types.ts`

**File**: `src/app/tools/{{TOOL_SLUG}}/types.ts`

Riesporta i tipi condivisi da `@/tools/shared` e definisce il tipo step-state specifico.

```typescript
import type {
  ToolStepState,
  ToolIntent,
  ToolUiState,
  Phase,
  StreamResult,
  ResumeCandidateArtifact,
  RetryMeta,
  ExtractionLifecycleState,
  ApiErrorPayload,
} from '@/tools/shared';

// Definisci le step key del tuo tool
export type {{TOOL_TITLE}}StepKey = '{{STEP_1_KEY}}' | '{{STEP_2_KEY}}' /* | ... */;

// Re-export tipi shared necessari ai componenti/hooks
export type {
  ToolIntent,
  ToolUiState,
  Phase,
  StreamResult,
  ResumeCandidateArtifact,
  RetryMeta,
  ExtractionLifecycleState,
  ApiErrorPayload,
};

export type {{TOOL_TITLE}}StepState = ToolStepState<{{TOOL_TITLE}}StepKey>;
export type {{TOOL_TITLE}}Intent = ToolIntent;
export type {{TOOL_TITLE}}UiState = ToolUiState;
```

---

## Step 3.4: Crea `hooks/use{{TOOL_TITLE}}Generation.ts`

Gestisce la chiamata stream a `/api/tools/{{TOOL_SLUG}}/generate` con retry logic da `@/tools/shared`.

```typescript
import { useCallback, useState } from 'react';
import {
  RetryableRequestError,
  getRetryMeta,
  withRetry,
} from '@/tools/shared';
import { TONES, initialSteps } from '../config';
import type { ApiErrorPayload, {{TOOL_TITLE}}StepKey, {{TOOL_TITLE}}StepState, StreamResult } from '../types';

interface GenerateStreamRequest {
  projectId: string;
  model: string;
  tone: (typeof TONES)[number];
  step: {{TOOL_TITLE}}StepKey;
  extractionContext: string;
  // aggiungere campi chaining se multi-step
}

// fetch + stream parsing helper — ~20 righe
async function generateStream(request: GenerateStreamRequest): Promise<StreamResult> {
  const response = await fetch('/api/tools/{{TOOL_SLUG}}/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });
  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as ApiErrorPayload | null;
    const retryMeta = getRetryMeta(response.status, data);
    const message = data?.error?.message ?? 'Generazione fallita';
    throw new RetryableRequestError(message, retryMeta);
  }
  // parse SSE stream → return { content, artifactId }
  // vedi useFunnelGeneration.ts per implementazione completa
}

// Hook export — espone generateStep + steps + isRunning + retryNotice
export function use{{TOOL_TITLE}}Generation(/* options */) { /* ... */ }
```

> Per implementazione completa con backoff e step chaining, usa `src/app/tools/funnel-pages/hooks/useFunnelGeneration.ts` come riferimento diretto.

---

## Step 3.5: Crea `hooks/use{{TOOL_TITLE}}UiState.ts`

Calcola il `uiState` derivato da `phase`, `steps`, `intent` e stato extraction.

```typescript
import type { Phase, ToolUiState, ExtractionLifecycleState, {{TOOL_TITLE}}StepState } from '../types';

interface UseUiStateOptions {
  phase: Phase;
  intent: '{{TOOL_TITLE}}Intent';
  steps: {{TOOL_TITLE}}StepState[];
  extractionState?: ExtractionLifecycleState;
}

export function use{{TOOL_TITLE}}UiState(options: UseUiStateOptions): ToolUiState {
  // logica derivata da phase, intent, steps
  // vedi useNextLandUiState.ts per esempio
}
```

---

## Step 3.6: Crea `{{TOOL_TITLE}}ToolContent.tsx` (container)

**File**: `src/app/tools/{{TOOL_SLUG}}/{{TOOL_TITLE}}ToolContent.tsx`

Questo è il cuore della UI: compone i quattro custom hooks e i tre componenti tool-specific. Niente stato raw: tutto viene dai hook.

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/button';
import { TONES, initialSteps } from './config';
import { {{TOOL_TITLE}}SetupCard } from './components/{{TOOL_TITLE}}SetupCard';
import { {{TOOL_TITLE}}StatusQuick } from './components/{{TOOL_TITLE}}StatusQuick';
import { {{TOOL_TITLE}}StepCards } from './components/{{TOOL_TITLE}}StepCards';
import { use{{TOOL_TITLE}}Generation } from './hooks/use{{TOOL_TITLE}}Generation';
import { use{{TOOL_TITLE}}Recovery } from './hooks/use{{TOOL_TITLE}}Recovery';
import { use{{TOOL_TITLE}}Extraction } from './hooks/use{{TOOL_TITLE}}Extraction';
import { use{{TOOL_TITLE}}UiState } from './hooks/use{{TOOL_TITLE}}UiState';
import type { {{TOOL_TITLE}}Intent, Phase } from './types';

export function {{TOOL_TITLE}}ToolContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // intent da searchParams
  // project, model, tone state
  // hook generation → steps, isRunning, retryNotice, generateStep
  // hook recovery → resumeCandidate, handleResume
  // hook extraction → extractionState, handleUpload
  // hook uiState → uiState (derivato)

  return (
    <PageShell width="workspace">
      {/* Header */}
      <div className="mb-7">
        <h1 className="app-title text-3xl font-semibold">{{TOOL_TITLE_DISPLAY}}</h1>
        <p className="text-sm text-muted-foreground">{{TOOL_DESCRIPTION}}</p>
      </div>
      {/* Grid */}
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <{{TOOL_TITLE}}SetupCard /* props */ />
        <{{TOOL_TITLE}}StatusQuick /* props */ />
      </div>
      <{{TOOL_TITLE}}StepCards /* props */ />
    </PageShell>
  );
}
```

> Per implementazione completa (`~280 righe`) usa `src/app/tools/nextland/NextLandToolContent.tsx` come riferimento.

---

## Graphic Framework Checklist

- [ ] `<PageShell width="workspace">` wrappa la pagina
- [ ] Form card ha `.app-surface + .app-rise`
- [ ] Input/Select hanno `.app-control`
- [ ] Titolo ha `.app-title`
- [ ] Output panel non ha sfondo piatto
- [ ] Step CTA principale ha `data-primary-action="true"`

---

## Reference Documentazione

- **Graphic Frameworking**: [docs/specifications/graphic-frameworking-spec.md](/docs/specifications/graphic-frameworking-spec.md)
- **HLF reference implementation**: `src/app/tools/funnel-pages/`
- **NextLand reference implementation**: `src/app/tools/nextland/`
- **Shared library**: `src/tools/shared/` (types, hooks, lib, components)

---

## Next Step

Procedi a **[tool-cloning-phase-3-5-ux-guide.md](/docs/implementation/tool-cloning/phases/tool-cloning-phase-3-5-ux-guide.md)** per garantire la replicabilità UX completa.
