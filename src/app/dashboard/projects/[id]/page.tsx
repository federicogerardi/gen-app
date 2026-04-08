import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { formatArtifactPreview, getArtifactDisplayTypeLabel, getEffectiveArtifactWorkflowType } from '@/lib/artifact-preview';

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const { id } = await params;
  const project = await db.project.findUnique({
    where: { id },
    include: { artifacts: { orderBy: { createdAt: 'desc' } } },
  });

  if (!project || project.userId !== session.user.id) notFound();

  const statusColor: Record<string, string> = {
    completed: 'default',
    generating: 'secondary',
    failed: 'destructive',
  };

  return (
    <>
      <Navbar />
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold">{project.name}</h1>
            {project.description && <p className="text-muted-foreground mt-1">{project.description}</p>}
          </div>
          <Button asChild><Link href={`/artifacts/new?projectId=${project.id}`}>Genera artefatto</Link></Button>
        </div>

        <h2 className="text-lg font-medium mb-4">Artefatti ({project.artifacts.length})</h2>

        {project.artifacts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nessun artefatto ancora. Genera il primo.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {project.artifacts.map((a: any) => {
              const workflowType = getEffectiveArtifactWorkflowType(a.workflowType, a.input);
              const preview = formatArtifactPreview({
                type: a.type,
                status: a.status,
                content: a.content,
                workflowType,
              });
              const typeLabel = getArtifactDisplayTypeLabel({
                type: a.type,
                workflowType,
              });

              return (
              <Link key={a.id} href={`/artifacts/${a.id}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader className="py-3 px-4 flex flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{typeLabel}</Badge>
                      <span className="text-sm text-muted-foreground">{a.model}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={statusColor[a.status] as 'default' | 'secondary' | 'destructive' | 'outline'}>{a.status}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(a.createdAt).toLocaleDateString('it-IT')}</span>
                    </div>
                  </CardHeader>
                  <CardContent className="py-2 px-4">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">{preview.label}</p>
                    <p className="text-sm text-muted-foreground line-clamp-3">{preview.text}</p>
                  </CardContent>
                </Card>
              </Link>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
