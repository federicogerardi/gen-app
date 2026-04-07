'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type FunnelStepKey = 'optin' | 'quiz' | 'vsl';

type FunnelStepState = {
  key: FunnelStepKey;
  title: string;
  status: 'idle' | 'running' | 'done' | 'error';
  content: string;
  artifactId: string | null;
  error: string | null;
};

const initialSteps: FunnelStepState[] = [
  { key: 'optin', title: 'Step 1 - Optin Page', status: 'idle', content: '', artifactId: null, error: null },
  { key: 'quiz', title: 'Step 2 - Domande Quiz', status: 'idle', content: '', artifactId: null, error: null },
  { key: 'vsl', title: 'Step 3 - Script VSL', status: 'idle', content: '', artifactId: null, error: null },
];

const TONES = ['professional', 'casual', 'formal', 'technical'] as const;

type StreamResult = {
  content: string;
  artifactId: string | null;
};

async function generateStream(request: {
  projectId: string;
  model: string;
  tone: (typeof TONES)[number];
  step: FunnelStepKey;
  product: string;
  audience: string;
  offer: string;
  promise: string;
  notes: string;
  optinOutput?: string;
  quizOutput?: string;
}): Promise<StreamResult> {
  const response = await fetch('/api/tools/funnel-pages/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(data?.error?.message ?? 'Generazione fallita');
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Stream non disponibile');

  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  let artifactId: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n');
    buffer = parts.pop() ?? '';

    for (const line of parts) {
      if (!line.startsWith('data: ')) continue;
      const payload = JSON.parse(line.slice(6));

      if (payload.type === 'start') artifactId = payload.artifactId ?? artifactId;
      if (payload.type === 'token') content += payload.token ?? '';
      if (payload.type === 'error') throw new Error(payload.message ?? 'Errore di stream');
    }
  }

  return { content, artifactId };
}

export default function FunnelPagesToolPage() {
  const router = useRouter();
  const [projectId, setProjectId] = useState('');
  const [model, setModel] = useState('openai/gpt-4-turbo');
  const [tone, setTone] = useState<(typeof TONES)[number]>('professional');

  const [product, setProduct] = useState('');
  const [audience, setAudience] = useState('');
  const [offer, setOffer] = useState('');
  const [promise, setPromise] = useState('');
  const [notes, setNotes] = useState('');

  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<FunnelStepState[]>(initialSteps);

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await fetch('/api/projects');
      return res.json();
    },
  });

  const { data: modelsData } = useQuery({
    queryKey: ['models'],
    queryFn: async () => {
      const res = await fetch('/api/models');
      return res.json();
    },
  });

  function updateStep(key: FunnelStepKey, patch: Partial<FunnelStepState>) {
    setSteps((prev) => prev.map((step) => (step.key === key ? { ...step, ...patch } : step)));
  }

  function resetSteps() {
    setSteps(initialSteps);
  }

  async function handleRunProcess() {
    if (!projectId || !product || !audience || !offer || !promise) return;

    resetSteps();
    setRunning(true);
    let currentStep: FunnelStepKey = 'optin';

    try {
      updateStep('optin', { status: 'running', error: null });
      currentStep = 'optin';
      const optin = await generateStream({
        projectId,
        model,
        tone,
        step: 'optin',
        product,
        audience,
        offer,
        promise,
        notes,
      });

      updateStep('optin', { status: 'done', content: optin.content, artifactId: optin.artifactId });

      updateStep('quiz', { status: 'running', error: null });
      currentStep = 'quiz';
      const quiz = await generateStream({
        projectId,
        model,
        tone,
        step: 'quiz',
        product,
        audience,
        offer,
        promise,
        notes,
        optinOutput: optin.content,
      });

      updateStep('quiz', { status: 'done', content: quiz.content, artifactId: quiz.artifactId });

      updateStep('vsl', { status: 'running', error: null });
      currentStep = 'vsl';
      const vsl = await generateStream({
        projectId,
        model,
        tone,
        step: 'vsl',
        product,
        audience,
        offer,
        promise,
        notes,
        optinOutput: optin.content,
        quizOutput: quiz.content,
      });

      updateStep('vsl', { status: 'done', content: vsl.content, artifactId: vsl.artifactId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore inatteso';
      updateStep(currentStep, { status: 'error', error: message });
    } finally {
      setRunning(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Generatore Pagine del Funnel</h1>
            <p className="text-sm text-muted-foreground">Processo multi-step demo: optin page -&gt; domande quiz -&gt; script VSL.</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/artifacts">Vai agli artefatti</Link>
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Input funnel</CardTitle>
              <CardDescription>Prompt caricati da documentazione centralizzata e orchestrati step by step.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>Progetto</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger><SelectValue placeholder="Seleziona progetto" /></SelectTrigger>
                  <SelectContent>
                    {projectsData?.projects?.map((p: { id: string; name: string }) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Modello</Label>
                  <Select value={model} onValueChange={setModel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {modelsData?.models?.map((m: { id: string; name: string }) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Tono</Label>
                  <Select value={tone} onValueChange={(value) => setTone(value as (typeof TONES)[number])}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TONES.map((item) => (
                        <SelectItem key={item} value={item}>{item}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Prodotto/Servizio</Label>
                <Input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Es. Programma coaching performance" />
              </div>

              <div className="space-y-1.5">
                <Label>Audience</Label>
                <Input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Es. Founder e professionisti digitali 30-50" />
              </div>

              <div className="space-y-1.5">
                <Label>Offerta</Label>
                <Input value={offer} onChange={(e) => setOffer(e.target.value)} placeholder="Es. Sessione strategica gratuita + piano operativo" />
              </div>

              <div className="space-y-1.5">
                <Label>Promessa principale</Label>
                <Input value={promise} onChange={(e) => setPromise(e.target.value)} placeholder="Es. +30% lead qualificati in 45 giorni" />
              </div>

              <div className="space-y-1.5">
                <Label>Note opzionali</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Vincoli brand, claim da evitare, dettagli settore..." />
              </div>

              <Button onClick={handleRunProcess} disabled={running || !projectId || !product || !audience || !offer || !promise} className="w-full">
                {running ? 'Processo in esecuzione...' : 'Avvia generazione funnel'}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {steps.map((step) => (
              <Card key={step.key}>
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base">{step.title}</CardTitle>
                    <Badge variant={step.status === 'done' ? 'secondary' : step.status === 'error' ? 'destructive' : 'outline'}>
                      {step.status}
                    </Badge>
                  </div>
                  <CardDescription>
                    {step.key === 'optin' && 'Landing page di acquisizione lead'}
                    {step.key === 'quiz' && 'Questionario di qualificazione'}
                    {step.key === 'vsl' && 'Script Video Sales Letter'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {step.content ? (
                    <pre className="text-sm whitespace-pre-wrap break-words font-mono max-h-64 overflow-y-auto">{step.content}</pre>
                  ) : (
                    <p className="text-sm text-muted-foreground">Output non ancora generato.</p>
                  )}
                  {step.error && <p className="text-sm text-destructive">{step.error}</p>}
                  {step.artifactId && (
                    <Button variant="outline" size="sm" onClick={() => router.push(`/artifacts/${step.artifactId}`)}>
                      Apri artefatto
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
