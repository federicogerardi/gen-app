---
goal: Phase 3 - Frontend UI Page con form, state management, streaming integration
version: 1.1
date_created: 2026-04-17
date_updated: 2026-04-17
status: Active
tags: [runbook, tool-cloning, phase-3, frontend, ui]
---

# Phase 3: Frontend UI Page

Questa phase copre la creazione della UI page Next.js con form, state management, e SSE streaming.

---

## Step 3.1: Crea UI Page Template

**File**: `src/app/tools/{{TOOL_SLUG}}/page.tsx`

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

---

## Graphic Framework Checklist

- [ ] `<PageShell width="workspace">` wrappa la pagina
- [ ] Form card ha `.app-surface + .app-rise`
- [ ] Select/Textarea hanno `.app-control`
- [ ] Titolo ha `.app-title`
- [ ] Copy ha `.app-copy` (automatica da PageShell)
- [ ] Output panel non ha sfondo piatto (usa bg-white/70 o container dedicato)
- [ ] Pulsante ha variant="default" non custom

---

## Reference Documentazione

- **Graphic Frameworking**: [docs/specifications/graphic-frameworking-spec.md](../../specifications/graphic-frameworking-spec.md)
- **HLF Implementation**: [src/app/tools/funnel-pages/page.tsx](../../../src/app/tools/funnel-pages/page.tsx)

---

## Next Step

Procedi a **[tool-cloning-phase-3-5-ux-guide.md](tool-cloning-phase-3-5-ux-guide.md)** per garantire la replicabilità UX completa.
