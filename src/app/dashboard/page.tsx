import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { getArtifactDisplayTypeLabel, getEffectiveArtifactWorkflowType } from '@/lib/artifact-preview';
import { getArtifactStatusBadgeClass, getArtifactStatusLabel } from '@/lib/artifact-status-ui';
import { isArtifactStatus, isArtifactType } from '@/lib/types/artifact';
import { PersonalTrendCard } from './PersonalTrendCard';

const TOOL_ACTIONS = [
  {
    title: 'Generatore Funnel Pages',
    description: 'Workflow multi-step: optin page, domande quiz e script VSL.',
    href: '/tools/funnel-pages',
    cta: 'Apri tool',
    tag: 'Campaign',
  },
];

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const trendStartDate = new Date();
  trendStartDate.setUTCHours(0, 0, 0, 0);
  trendStartDate.setUTCDate(trendStartDate.getUTCDate() - 29);

  const [projects, latestArtifacts, trendArtifacts, user] = await Promise.all([
    db.project.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { _count: { select: { artifacts: true } } },
    }),
    db.artifact.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        type: true,
        workflowType: true,
        status: true,
        createdAt: true,
      },
    }),
    db.artifact.findMany({
      where: {
        userId: session.user.id,
        createdAt: { gte: trendStartDate },
      },
      select: { createdAt: true },
    }),
    db.user.findUnique({
      where: { id: session.user.id },
      select: { monthlyQuota: true, monthlyUsed: true },
    }),
  ]);

  const quotaPercent = user && user.monthlyQuota > 0 ? Math.round((user.monthlyUsed / user.monthlyQuota) * 100) : 0;

  const projectsForClient = projects.map((p: typeof projects[number]) => ({
    ...p,
    description: p.description === null ? undefined : p.description,
  }));

  const trendCountByDate = new Map<string, number>();
  for (const artifact of trendArtifacts) {
    const key = artifact.createdAt.toISOString().slice(0, 10);
    trendCountByDate.set(key, (trendCountByDate.get(key) ?? 0) + 1);
  }

  const trendPoints30d = Array.from({ length: 30 }, (_unused, index) => {
    const day = new Date(trendStartDate);
    day.setUTCDate(trendStartDate.getUTCDate() + index);
    const key = day.toISOString().slice(0, 10);
    return {
      date: key,
      count: trendCountByDate.get(key) ?? 0,
    };
  });

  return (
    <PageShell width="workspace">
      <section className="app-rise relative rounded-3xl border border-black/10 bg-gradient-to-r from-slate-950 via-slate-800 to-slate-700 text-white p-6 mb-8 shadow-[0_28px_70px_-45px_rgba(15,23,42,0.85)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/70 mb-2">Workspace Marketing AI</p>
              <h1 className="app-title text-2xl md:text-3xl font-semibold">Organizza il lavoro nei progetti e genera in modo contestuale</h1>
              <p className="text-sm text-white/80 mt-2 max-w-2xl">
                Parti dai progetti: ogni artefatto resta tracciato nel suo contesto, con cronologia chiara e iterazioni piu veloci.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button asChild variant="secondary"><Link href="/dashboard/projects">Apri progetti</Link></Button>
              <Button asChild variant="outline" className="border-white/30 bg-white/10 text-white hover:bg-white/20 hover:text-white">
                <Link href="/dashboard/projects/new">Nuovo progetto</Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="app-rise mb-10" id="projects-workspace" style={{ animationDelay: '70ms' }}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="app-title text-2xl font-semibold text-slate-900">Workspace progetti</h2>
              <p className="text-sm text-muted-foreground">Accedi rapidamente ai progetti recenti o vai alla lista completa.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" asChild><Link href="/dashboard/projects">Tutti i progetti</Link></Button>
              <Button size="sm" asChild><Link href="/dashboard/projects/new">Nuovo progetto</Link></Button>
            </div>
          </div>

          {projectsForClient.length === 0 ? (
            <Card className="app-surface rounded-2xl">
              <CardContent className="py-12 text-center text-muted-foreground">
                Nessun progetto ancora. Creane uno per iniziare.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {projectsForClient.map((p: typeof projectsForClient[number]) => (
                <Link key={p.id} href={`/dashboard/projects/${p.id}`}>
                  <Card className="app-surface rounded-2xl hover:shadow-[0_26px_65px_-44px_rgba(15,23,42,0.75)] transition-shadow h-full">
                    <CardHeader>
                      <CardTitle className="text-base">{p.name}</CardTitle>
                      {p.description && <CardDescription className="line-clamp-2">{p.description}</CardDescription>}
                    </CardHeader>
                    <CardContent className="flex items-center justify-between gap-2">
                      <Badge variant="secondary">{p._count.artifacts} artefatti</Badge>
                      <span className="text-xs text-muted-foreground">Apri progetto</span>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="app-rise relative mb-8" style={{ animationDelay: '90ms' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="app-title text-xl font-medium">Tool del workspace</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {TOOL_ACTIONS.map((tool) => (
              <Card key={tool.href} className="app-surface rounded-2xl">
                <CardHeader>
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle className="text-base">{tool.title}</CardTitle>
                    <Badge variant="outline" className="text-[10px] uppercase tracking-wide">{tool.tag}</Badge>
                  </div>
                  <CardDescription>{tool.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full"><Link href={tool.href}>{tool.cta}</Link></Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <section className="app-rise relative mb-8" style={{ animationDelay: '120ms' }}>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="app-title text-xl font-medium">Ultimi artefatti generati</h2>
            <Button variant="outline" size="sm" asChild>
              <Link href="/artifacts">Apri storico</Link>
            </Button>
          </div>

          {latestArtifacts.length === 0 ? (
            <Card className="app-surface rounded-2xl">
              <CardContent className="py-8 text-center text-muted-foreground">
                Nessun artefatto recente disponibile.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3" role="list" aria-label="Ultimi artefatti generati">
              {latestArtifacts.map((artifact) => {
                const typedStatus = isArtifactStatus(artifact.status) ? artifact.status : 'generating';
                const typedType = isArtifactType(artifact.type) ? artifact.type : 'content';
                const typeLabel = getArtifactDisplayTypeLabel({
                  type: typedType,
                  workflowType: getEffectiveArtifactWorkflowType(artifact.workflowType, null),
                });

                return (
                  <Card key={artifact.id} className="app-surface rounded-2xl" role="listitem">
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge>{typeLabel}</Badge>
                        <Badge variant="outline" className={getArtifactStatusBadgeClass(typedStatus)}>
                          {getArtifactStatusLabel(typedStatus)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(artifact.createdAt).toLocaleString('it-IT')}
                        </span>
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/artifacts/${artifact.id}`}>Apri dettaglio</Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        <section className="app-rise relative mb-8" style={{ animationDelay: '130ms' }}>
          <PersonalTrendCard points30d={trendPoints30d} />
        </section>

        <div className="flex items-center justify-between mb-6">
          <h2 className="app-title text-2xl font-semibold text-slate-900">Panoramica account</h2>
        </div>

        {user && (
          <div className="app-rise grid gap-4 grid-cols-2 md:grid-cols-4 mb-8" style={{ animationDelay: '140ms' }}>
            <Card className="app-surface rounded-2xl">
              <CardHeader className="pb-2"><CardDescription>Richieste usate</CardDescription></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{user.monthlyUsed}</p>
                <p className="text-xs text-muted-foreground">/ {user.monthlyQuota} mensili</p>
              </CardContent>
            </Card>
            <Card className="app-surface rounded-2xl">
              <CardHeader className="pb-2"><CardDescription>Utilizzo quota</CardDescription></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{Math.min(quotaPercent, 100)}%</p>
                <p className="text-xs text-muted-foreground">{user.monthlyUsed} su {user.monthlyQuota}</p>
                <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden" aria-hidden="true">
                  <div className="h-full bg-primary" style={{ width: `${Math.min(quotaPercent, 100)}%` }} />
                </div>
              </CardContent>
            </Card>
            <Card className="app-surface rounded-2xl">
              <CardHeader className="pb-2"><CardDescription>Richieste disponibili</CardDescription></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{Math.max(0, user.monthlyQuota - user.monthlyUsed)}</p>
                <p className="text-xs text-muted-foreground">su {user.monthlyQuota} mensili</p>
              </CardContent>
            </Card>
            <Card className="app-surface rounded-2xl">
              <CardHeader className="pb-2"><CardDescription>Progetti</CardDescription></CardHeader>
              <CardContent><p className="text-2xl font-bold">{projects.length}</p></CardContent>
            </Card>
          </div>
        )}
    </PageShell>
  );
}
