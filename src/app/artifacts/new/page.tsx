'use client';

import { Suspense, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useStreamGeneration } from '@/components/hooks/useStreamGeneration';

const ARTIFACT_TYPES = [
  { value: 'content', label: 'Contenuto' },
  { value: 'seo', label: 'SEO' },
  { value: 'code', label: 'Codice' },
];

function NewArtifactForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const defaultProjectId = searchParams.get('projectId') ?? '';
  const typeFromQuery = searchParams.get('type');
  const defaultType = typeFromQuery === 'seo' || typeFromQuery === 'code' ? typeFromQuery : 'content';

  const [projectId, setProjectId] = useState(defaultProjectId);
  const [type, setType] = useState<'content' | 'seo' | 'code'>(defaultType);
  const [model, setModel] = useState('openai/gpt-4-turbo');
  const [inputJson, setInputJson] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);

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
    setParseError(null);
    let input: Record<string, unknown>;
    try {
      input = JSON.parse(inputJson);
    } catch {
      setParseError('Input non valido: inserisci un JSON valido');
      return;
    }
    generate({ projectId, type, model, input });
  }

  function handleViewArtifact() {
    if (artifactId) router.push(`/artifacts/${artifactId}`);
  }

  const inputPlaceholders: Record<string, string> = {
    content: '{\n  "topic": "Intelligenza Artificiale",\n  "tone": "professional",\n  "length": "medium",\n  "outputFormat": "markdown"\n}',
    seo: '{\n  "topic": "Next.js 15",\n  "targetKeywords": ["nextjs", "react", "ssr"],\n  "pageType": "article",\n  "outputFormat": "structured"\n}',
    code: '{\n  "description": "REST API endpoint per la gestione utenti",\n  "language": "typescript",\n  "framework": "nextjs",\n  "style": "functional"\n}',
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <h1 className="text-2xl font-semibold mb-6">Genera artefatto</h1>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-4">
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
              <Label>Tipo artefatto</Label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ARTIFACT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
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
              <Label>Input (JSON)</Label>
              <Textarea
                value={inputJson}
                onChange={(e) => setInputJson(e.target.value)}
                placeholder={inputPlaceholders[type]}
                rows={8}
                className="font-mono text-sm"
              />
              {parseError && <p className="text-sm text-destructive">{parseError}</p>}
            </div>

            <Button onClick={handleGenerate} disabled={isStreaming || !projectId} className="w-full">
              {isStreaming ? 'Generazione in corso…' : 'Genera'}
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Output</CardTitle>
            </CardHeader>
            <CardContent>
              {isStreaming && !content && <Skeleton className="h-32 w-full" />}
              {content ? (
                <pre className="text-sm whitespace-pre-wrap break-words font-mono max-h-[500px] overflow-y-auto">{content}</pre>
              ) : (
                !isStreaming && <p className="text-muted-foreground text-sm">Il contenuto generato apparirà qui.</p>
              )}
              {error && <p className="text-sm text-destructive mt-2">{error}</p>}
              {artifactId && !isStreaming && (
                <Button variant="outline" size="sm" className="mt-4" onClick={handleViewArtifact}>
                  Visualizza artefatto completo
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}

export default function NewArtifactPage() {
  return (
    <Suspense>
      <NewArtifactForm />
    </Suspense>
  );
}
