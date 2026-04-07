'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { useArtifacts, useDeleteArtifact, type Artifact } from '@/components/hooks/useArtifacts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatArtifactPreview } from '@/lib/artifact-preview';

type ProjectOption = {
  id: string;
  name: string;
};

type Props = {
  projects: ProjectOption[];
};

function getSinceDate(period: 'all' | '7d' | '30d' | '90d') {
  const now = new Date();
  if (period === 'all') return null;
  const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  now.setDate(now.getDate() - days);
  return now;
}

function createDuplicateHref(artifact: Artifact): string {
  const search = new URLSearchParams({
    projectId: artifact.projectId,
    type: artifact.type,
    model: artifact.model,
    input: encodeURIComponent(JSON.stringify(artifact.input, null, 2)),
  });
  return `/artifacts/new?${search.toString()}`;
}

export function ArtifactsClientPage({ projects }: Props) {
  const router = useRouter();
  const [type, setType] = useState<'all' | 'content' | 'seo' | 'code'>('all');
  const [status, setStatus] = useState<'all' | 'generating' | 'completed' | 'failed'>('all');
  const [projectId, setProjectId] = useState<string>('all');
  const [period, setPeriod] = useState<'all' | '7d' | '30d' | '90d'>('all');

  const listQuery = useArtifacts({
    type: type === 'all' ? undefined : type,
    status: status === 'all' ? undefined : status,
    projectId: projectId === 'all' ? undefined : projectId,
    limit: 100,
    offset: 0,
  });

  const deleteMutation = useDeleteArtifact();

  const artifacts = useMemo(() => {
    const base = listQuery.data?.items ?? [];
    const since = getSinceDate(period);
    if (!since) return base;
    return base.filter((item) => new Date(item.createdAt) >= since);
  }, [listQuery.data?.items, period]);

  async function handleDelete(id: string) {
    const confirmed = window.confirm('Eliminare questo artefatto? Questa azione non e reversibile.');
    if (!confirmed) return;

    await deleteMutation.mutateAsync(id);
  }

  return (
    <>
      <Navbar />
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Artefatti</h1>
            <p className="text-sm text-muted-foreground">Filtra, riusa e gestisci rapidamente gli output generati.</p>
          </div>
          <Button asChild><Link href="/artifacts/new">Nuovo artefatto</Link></Button>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Filtri</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="sr-only" aria-live="polite">{artifacts.length} artefatti mostrati con i filtri correnti.</p>
            <div className="grid gap-3 md:grid-cols-4" role="group" aria-label="Filtri artefatti">
              <div className="space-y-1.5">
                <Label htmlFor="artifact-type-filter">Tipo</Label>
                <Select value={type} onValueChange={(value) => setType(value as typeof type)}>
                  <SelectTrigger id="artifact-type-filter" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti</SelectItem>
                    <SelectItem value="content">Content</SelectItem>
                    <SelectItem value="seo">SEO</SelectItem>
                    <SelectItem value="code">Code</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="artifact-status-filter">Stato</Label>
                <Select value={status} onValueChange={(value) => setStatus(value as typeof status)}>
                  <SelectTrigger id="artifact-status-filter" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti</SelectItem>
                    <SelectItem value="generating">Generating</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="artifact-project-filter">Progetto</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger id="artifact-project-filter" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="artifact-period-filter">Periodo</Label>
                <Select value={period} onValueChange={(value) => setPeriod(value as typeof period)}>
                  <SelectTrigger id="artifact-period-filter" className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutto</SelectItem>
                    <SelectItem value="7d">Ultimi 7 giorni</SelectItem>
                    <SelectItem value="30d">Ultimi 30 giorni</SelectItem>
                    <SelectItem value="90d">Ultimi 90 giorni</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {listQuery.isLoading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground" role="status" aria-live="polite">
              Caricamento artefatti...
            </CardContent>
          </Card>
        ) : listQuery.error ? (
          <Card>
            <CardContent className="py-12 text-center text-destructive" role="alert">
              Errore nel caricamento artefatti.
            </CardContent>
          </Card>
        ) : artifacts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground" role="status" aria-live="polite">
              Nessun artefatto trovato con i filtri selezionati.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3" role="list" aria-label="Lista artefatti">
            {artifacts.map((artifact) => {
              const preview = formatArtifactPreview({
                type: artifact.type,
                status: artifact.status,
                content: artifact.content,
              });

              return (
              <Card key={artifact.id} className="hover:shadow-md transition-shadow" role="listitem">
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge>{artifact.type}</Badge>
                      <Badge variant="outline">{artifact.model}</Badge>
                      <Badge variant={artifact.status === 'completed' ? 'default' : artifact.status === 'failed' ? 'destructive' : 'secondary'}>
                        {artifact.status}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(artifact.createdAt).toLocaleString('it-IT')}
                    </span>
                  </div>
                  <CardTitle className="text-base">{artifact.project?.name ?? 'Progetto non disponibile'}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">{preview.label}</p>
                    <p className="text-sm text-muted-foreground line-clamp-4" aria-label={`Anteprima artefatto ${artifact.id}`}>
                      {preview.text}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => router.push(`/artifacts/${artifact.id}`)} aria-label={`Modifica artefatto ${artifact.id}`}>
                      Modifica
                    </Button>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={createDuplicateHref(artifact)}>Duplica input</Link>
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(artifact.id)}
                      disabled={deleteMutation.isPending}
                      aria-label={`Elimina artefatto ${artifact.id}`}
                    >
                      Elimina
                    </Button>
                  </div>
                </CardContent>
              </Card>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
