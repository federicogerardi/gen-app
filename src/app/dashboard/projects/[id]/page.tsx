import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { PageShell } from '@/components/layout/PageShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getArtifactDisplayTypeLabel, getEffectiveArtifactWorkflowType } from '@/lib/artifact-preview';
import { buildArtifactCardIdentity } from '@/lib/artifact-card-identity';
import { getArtifactStatusBadgeClass, getArtifactStatusLabel } from '@/lib/artifact-status-ui';
import { isArtifactType, isArtifactStatus } from '@/lib/types/artifact';

interface ProjectPageParams {
  id: string;
}

export default async function ProjectPage({ params }: { params: Promise<ProjectPageParams> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const { id } = await params;
  const project = await db.project.findUnique({
    where: { id },
    include: { artifacts: { orderBy: { createdAt: 'desc' } } },
  });

  if (!project || project.userId !== session.user.id) notFound();

  return (
    <PageShell width="workspace">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Workspace progetto</p>
          <h1 className="app-title text-3xl font-semibold text-slate-900">{project.name}</h1>
          <p className="text-sm text-muted-foreground">
            Vista contestuale del progetto: consulta qui gli output collegati e usa lo storico per audit trasversali.
          </p>
          {project.description && <p className="text-sm text-slate-700">{project.description}</p>}
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Button className="w-full sm:w-auto" variant="outline" asChild>
            <Link href="/dashboard/projects">Tutti i progetti</Link>
          </Button>
          <Button className="w-full sm:w-auto" variant="outline" asChild>
            <Link href="/artifacts">Vai allo storico</Link>
          </Button>
        </div>
      </div>

      <Card className="app-surface rounded-3xl mb-6 app-rise" style={{ animationDelay: '60ms' }}>
        <CardHeader>
          <CardTitle className="text-base">Metadati progetto</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Totale artefatti</p>
            <p className="font-semibold">{project.artifacts.length}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Creato</p>
            <p className="font-semibold">{new Date(project.createdAt).toLocaleString('it-IT')}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Ultimo aggiornamento</p>
            <p className="font-semibold">{new Date(project.updatedAt).toLocaleString('it-IT')}</p>
          </div>
        </CardContent>
      </Card>

      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="app-title text-xl font-medium">Artefatti del progetto ({project.artifacts.length})</h2>
      </div>

      {project.artifacts.length === 0 ? (
        <Card className="app-surface rounded-2xl">
          <CardContent className="py-12 text-center text-muted-foreground">
            Nessun artefatto ancora. Apri un tool dalla dashboard per creare il primo output nel contesto di questo progetto.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3" role="list" aria-label="Artefatti del progetto">
          {project.artifacts.map((a: typeof project.artifacts[number]) => {
            const workflowType = getEffectiveArtifactWorkflowType(a.workflowType, a.input);
            // Type-guard artifact fields from DB (String) to literal unions
            const typedArtifactType = isArtifactType(a.type) ? a.type : 'content';
            const typedArtifactStatus = isArtifactStatus(a.status) ? a.status : 'generating';
            const typeLabel = getArtifactDisplayTypeLabel({
              type: typedArtifactType,
              workflowType,
            });
            const cardIdentity = buildArtifactCardIdentity({
              id: a.id,
              type: a.type,
              workflowType,
              input: a.input,
            });

            return (
              <Card key={a.id} className="app-surface rounded-2xl hover:shadow-[0_24px_60px_-42px_rgba(15,23,42,0.75)] transition-shadow" role="listitem">
                <CardHeader className="pb-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge>{typeLabel}</Badge>
                      <Badge variant="outline">{a.model}</Badge>
                      <Badge variant="outline" className={getArtifactStatusBadgeClass(typedArtifactStatus)}>
                        {getArtifactStatusLabel(typedArtifactStatus)}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleString('it-IT')}</span>
                  </div>
                  <CardTitle className="text-base">{cardIdentity.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{cardIdentity.subtitle}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <Button className="w-full sm:w-auto" size="sm" variant="outline" asChild>
                      <Link href={`/artifacts/${a.id}`}>Apri dettaglio</Link>
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
