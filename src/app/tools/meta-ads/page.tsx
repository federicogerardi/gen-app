'use client';

import { useState } from 'react';
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

const TONES = ['professional', 'casual', 'formal', 'technical'] as const;

export default function MetaAdsToolPage() {
  const router = useRouter();
  const [projectId, setProjectId] = useState('');
  const [model, setModel] = useState('openai/gpt-4-turbo');
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

  const { isStreaming, content, artifactId, error, generate } = useStreamGeneration();

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
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Generatore Meta Ads</h1>
            <p className="text-sm text-muted-foreground">Tool dedicato per creare varianti ads Meta in modo modulare.</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/artifacts">Vai agli artefatti</Link>
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Input campagna</CardTitle>
              <CardDescription>Compila i dati base, il prompt demo viene costruito automaticamente.</CardDescription>
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
                <Label>Prodotto/Servizio</Label>
                <Input value={product} onChange={(e) => setProduct(e.target.value)} placeholder="Es. Programma nutrizione 90 giorni" />
              </div>

              <div className="space-y-1.5">
                <Label>Audience</Label>
                <Input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Es. Donne 28-45 interessate a fitness" />
              </div>

              <div className="space-y-1.5">
                <Label>Offerta</Label>
                <Input value={offer} onChange={(e) => setOffer(e.target.value)} placeholder="Es. Call gratuita + piano personalizzato" />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Obiettivo</Label>
                  <Input value={objective} onChange={(e) => setObjective(e.target.value)} />
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
                <Label>Creative angle (opzionale)</Label>
                <Textarea value={angle} onChange={(e) => setAngle(e.target.value)} rows={3} placeholder="Es. approccio problem-solution con social proof" />
              </div>

              <Button onClick={handleGenerate} disabled={isStreaming || !projectId || !product || !audience || !offer} className="w-full">
                {isStreaming ? 'Generazione in corso...' : 'Genera Meta Ads'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Output</CardTitle>
              <CardDescription>Anteprima in streaming con salvataggio automatico artefatto.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {content ? (
                <pre className="text-sm whitespace-pre-wrap break-words font-mono max-h-[560px] overflow-y-auto">{content}</pre>
              ) : (
                <p className="text-sm text-muted-foreground">L&apos;output apparira qui dopo l&apos;avvio della generazione.</p>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
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
