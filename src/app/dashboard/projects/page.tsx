import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { PageShell } from '@/components/layout/PageShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default async function ProjectsIndexPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const projects = await db.project.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: { artifacts: true },
      },
    },
  });

  return (
    <PageShell width="workspace">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground">Workspace Progetti</p>
          <h1 className="app-title text-3xl font-semibold text-slate-900">I tuoi progetti</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Apri un progetto esistente o creane uno nuovo per iniziare una generazione.
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/projects/new">Nuovo progetto</Link>
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card className="app-surface rounded-2xl">
          <CardContent className="py-12 text-center">
            <p className="text-sm text-muted-foreground">Nessun progetto disponibile.</p>
            <Button asChild className="mt-4">
              <Link href="/dashboard/projects/new">Crea il primo progetto</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card key={project.id} className="app-surface rounded-2xl">
              <CardHeader>
                <CardTitle className="text-base">{project.name}</CardTitle>
                <CardDescription className="line-clamp-2">
                  {project.description ?? 'Nessuna descrizione disponibile.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between gap-3">
                <Badge variant="secondary">{project._count.artifacts} artefatti</Badge>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/dashboard/projects/${project.id}`}>Apri progetto</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageShell>
  );
}