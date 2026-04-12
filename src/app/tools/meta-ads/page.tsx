'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '@/components/layout/Navbar';
import { useStreamGeneration } from '@/components/hooks/useStreamGeneration';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatArtifactContentForDisplay } from '@/lib/artifact-preview';

const TONES = ['professional', 'casual', 'formal', 'technical'] as const;

export default function MetaAdsToolPage() {
  const router = useRouter();
  const [projectId, setProjectId] = useState('');
  const [model, setModel] = useState('');
  const [product, setProduct] = useState('');
  const [audience, setAudience] = useState('');
  const [offer, setOffer] = useState('');
  const [objective, setObjective] = useState('lead generation');
  const [tone, setTone] = useState<(typeof TONES)[number]>('professional');
  const [angle, setAngle] = useState('');

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

  useEffect(() => {
    if (model) return;
    const defaultModel = modelsData?.models?.find((item: { default?: boolean }) => item.default);
    if (defaultModel?.id) {
      setModel(defaultModel.id);
      return;
    }

    const firstModel = modelsData?.models?.[0];
    if (firstModel?.id) {
      setModel(firstModel.id);
    }
  }, [modelsData, model]);

  const { isStreaming, content, artifactId, error, generate } = useStreamGeneration();
  const outputDisplay = formatArtifactContentForDisplay({
    type: 'content',
    status: content ? 'completed' : isStreaming ? 'generating' : error ? 'failed' : 'completed',
    content,
    workflowType: 'meta_ads',
  });

  function handleGenerate() {
    if (!projectId || !product || !audience || !offer) return;

    generate({
      projectId,
      model,
      tone,
      product,
      audience,
      offer,
      objective,
      angle,
    }, { endpoint: '/api/tools/meta-ads/generate' });
  }

  return (
    <>
      <Navbar />
      <main className="app-shell app-copy flex-1 p-6 max-w-6xl mx-auto w-full relative overflow-hidden" id="main-content">
        <div className="pointer-events-none absolute inset-0 app-grid-overlay" />
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="app-title text-3xl font-semibold text-slate-900">Generatore Meta Ads</h1>
            <p className="text-sm text-muted-foreground">Tool dedicato per creare varianti ads Meta in modo modulare.</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/artifacts">Vai agli artefatti</Link>
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="app-surface rounded-3xl app-rise">
            <CardHeader>
              <CardTitle className="text-base">Input campagna</CardTitle>
              <CardDescription>Compila i dati base, il prompt demo viene costruito automaticamente.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="meta-project-select">Progetto</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger id="meta-project-select" className="app-control" aria-label="Seleziona progetto"><SelectValue placeholder="Seleziona progetto" /></SelectTrigger>
                  <SelectContent>
                    {projectsData?.projects?.map((p: { id: string; name: string }) => (
                      <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="meta-model-select">Modello</Label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger id="meta-model-select" className="app-control" aria-label="Modello LLM"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {modelsData?.models?.map((m: { id: string; name: string }) => (
                      <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="meta-product">Prodotto/Servizio</Label>
                <Input className="app-control" id="meta-product" value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Es. Programma nutrizione 90 giorni" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="meta-audience">Audience</Label>
                <Input className="app-control" id="meta-audience" value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Es. Donne 28-45 interessate a fitness" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="meta-offer">Offerta</Label>
                <Input className="app-control" id="meta-offer" value={offer} onChange={(e) => setOffer(e.target.value)} placeholder="Es. Call gratuita + piano personalizzato" />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="meta-objective">Obiettivo</Label>
                  <Input className="app-control" id="meta-objective" value={objective} onChange={(e) => setObjective(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="meta-tone-select">Tono</Label>
                  <Select value={tone} onValueChange={(value) => setTone(value as (typeof TONES)[number])}>
                    <SelectTrigger id="meta-tone-select" className="app-control" aria-label="Tono di comunicazione"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {TONES.map((item) => (
                        <SelectItem key={item} value={item}>{item}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="meta-angle">Creative angle (opzionale)</Label>
                <Textarea className="app-control" id="meta-angle" value={angle} onChange={(e) => setAngle(e.target.value)} rows={3} placeholder="Es. approccio problem-solution con social proof" />
              </div>

              <Button onClick={handleGenerate} disabled={isStreaming || !projectId || !model || !product || !audience || !offer} className="w-full">
                {isStreaming ? 'Generazione in corso...' : 'Genera Meta Ads'}
              </Button>
            </CardContent>
          </Card>

          <Card className="app-surface rounded-3xl app-rise" style={{ animationDelay: '90ms' }}>
            <CardHeader>
              <CardTitle className="text-base">Output</CardTitle>
              <CardDescription>Anteprima in streaming con salvataggio automatico artefatto.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="sr-only" aria-live="polite">{isStreaming ? 'Generazione Meta Ads in corso' : 'Output Meta Ads aggiornato'}</p>
              {content ? (
                <div className="rounded-xl border border-black/10 bg-white/70 p-4 max-h-[560px] overflow-y-auto" aria-live="polite">
                  <p className="text-sm leading-7 whitespace-pre-wrap break-words text-foreground">{outputDisplay.text}</p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {isStreaming ? outputDisplay.text : 'L\'output appare qui dopo l\'avvio della generazione.'}
                </p>
              )}
              {error && <p className="text-sm text-destructive" role="alert">{error}</p>}
              {artifactId && !isStreaming && (
                <Button variant="outline" onClick={() => router.push(`/artifacts/${artifactId}`)}>
                  Apri artefatto completo
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
