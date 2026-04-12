"use client";

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageShell } from '@/components/layout/PageShell';
import { useArtifacts, useDeleteArtifact } from '@/components/hooks/useArtifacts';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getArtifactDisplayTypeLabel, getEffectiveArtifactWorkflowType } from '@/lib/artifact-preview';
import { getArtifactStatusBadgeClass, getArtifactStatusLabel } from '@/lib/artifact-status-ui';
import { buildArtifactCardIdentity } from '@/lib/artifact-card-identity';
import { isArtifactStatus, isArtifactType } from '@/lib/types/artifact';

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
    const confirmed = window.confirm('Eliminare questo artefatto? Questa azione non è reversibile.');
    if (!confirmed) return;

    await deleteMutation.mutateAsync(id);
  }

  return (
    <PageShell width="workspace">
        <div className="flex flex-wrap items-center justify-between mb-6 gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Storico personale</p>
            <h1 className="app-title text-3xl font-semibold text-slate-900">Storico artefatti</h1>
            <p className="text-sm text-muted-foreground">
              Vista trasversale per recupero e auditing. Per il lavoro corrente usa prima i progetti.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/projects">Vai ai progetti</Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/projects/new">Nuovo progetto</Link>
            </Button>
          </div>
        </div>

        <Card className="app-surface rounded-3xl mb-6 app-rise">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Filtri storico</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="sr-only" aria-live="polite">{artifacts.length} artefatti mostrati con i filtri correnti.</p>
            <div className="grid gap-3 md:grid-cols-4" role="group" aria-label="Filtri artefatti">
              <div className="space-y-1.5">
                <Label htmlFor="artifact-type-filter">Tipo</Label>
                <Select value={type} onValueChange={(value) => setType(value as typeof type)}>
                  <SelectTrigger id="artifact-type-filter" className="app-control w-full"><SelectValue /></SelectTrigger>
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
                  <SelectTrigger id="artifact-status-filter" className="app-control w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tutti</SelectItem>
                    <SelectItem value="generating">In corso</SelectItem>
                    <SelectItem value="completed">Completato</SelectItem>
                    <SelectItem value="failed">Errore</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="artifact-project-filter">Progetto</Label>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger id="artifact-project-filter" className="app-control w-full"><SelectValue /></SelectTrigger>
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
                  <SelectTrigger id="artifact-period-filter" className="app-control w-full"><SelectValue /></SelectTrigger>
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
          <Card className="app-surface rounded-2xl">
            <CardContent className="py-12 text-center text-muted-foreground" role="status" aria-live="polite">
              Caricamento artefatti...
            </CardContent>
          </Card>
        ) : listQuery.error ? (
          <Card className="app-surface rounded-2xl">
            <CardContent className="py-12 text-center text-destructive" role="alert">
              Errore nel caricamento artefatti.
            </CardContent>
          </Card>
        ) : artifacts.length === 0 ? (
          <Card className="app-surface rounded-2xl">
            <CardContent className="py-12 text-center text-muted-foreground" role="status" aria-live="polite">
              Nessun elemento nello storico con i filtri selezionati.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3" role="list" aria-label="Storico artefatti">
            {artifacts.map((artifact) => {
              const workflowType = getEffectiveArtifactWorkflowType(artifact.workflowType, artifact.input);
              // Type-guard artifact type from API response (String) to literal union
              const typedArtifactType = isArtifactType(artifact.type) ? artifact.type : 'content';
              const typedArtifactStatus = isArtifactStatus(artifact.status) ? artifact.status : 'generating';
              const typeLabel = getArtifactDisplayTypeLabel({
                type: typedArtifactType,
                workflowType,
              });
              const cardIdentity = buildArtifactCardIdentity({
                id: artifact.id,
                type: artifact.type,
                workflowType,
                input: artifact.input,
                projectName: artifact.project?.name ?? null,
              });

              return (
              <Card key={artifact.id} className="app-surface rounded-2xl hover:shadow-[0_24px_60px_-42px_rgba(15,23,42,0.75)] transition-shadow" role="listitem">
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge>{typeLabel}</Badge>
                      <Badge variant="outline">{artifact.model}</Badge>
                      <Badge variant="outline" className={getArtifactStatusBadgeClass(typedArtifactStatus)}>
                        {getArtifactStatusLabel(typedArtifactStatus)}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(artifact.createdAt).toLocaleString('it-IT')}
                    </span>
                  </div>
                  <CardTitle className="text-base">{cardIdentity.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{cardIdentity.subtitle}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Button className="w-full sm:w-auto" size="sm" variant="outline" onClick={() => router.push(`/artifacts/${artifact.id}`)} aria-label={`Apri dettaglio artefatto ${artifact.id}`}>
                      Apri dettaglio
                    </Button>
                    <Button
                      className="w-full sm:w-auto"
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
    </PageShell>
  );
}
