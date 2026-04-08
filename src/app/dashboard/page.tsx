import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { formatArtifactPreview, getArtifactDisplayTypeLabel, getEffectiveArtifactWorkflowType } from '@/lib/artifact-preview';

const TOOL_ACTIONS = [
  {
    title: 'Generatore Meta Ads',
    description: 'Crea varianti ad copy Meta complete: hook, primary text, headline e CTA.',
    href: '/tools/meta-ads',
    cta: 'Apri tool',
  },
  {
    title: 'Generatore Funnel Pages',
    description: 'Workflow multi-step: optin page, domande quiz e script VSL.',
    href: '/tools/funnel-pages',
    cta: 'Apri tool',
  },
];

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const [projects, recentArtifacts, user] = await Promise.all([
    db.project.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { _count: { select: { artifacts: true } } },
    }),
    db.artifact.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
    }),
    db.user.findUnique({
      where: { id: session.user.id },
      select: { monthlyQuota: true, monthlyUsed: true, monthlyBudget: true, monthlySpent: true },
    }),
  ]);

  const quotaPercent = user ? Math.round((user.monthlyUsed / user.monthlyQuota) * 100) : 0;

  // Patch: ensure description is always string | undefined (never null)
  const projectsForClient = projects.map((p: any) => ({
    ...p,
    description: p.description === null ? undefined : p.description,
  }));

  return (
    <>
      <Navbar />
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <section className="rounded-2xl border bg-gradient-to-r from-slate-950 to-slate-700 text-white p-6 mb-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/70 mb-2">Workspace Marketing AI</p>
              <h1 className="text-2xl md:text-3xl font-semibold">Scegli il tool giusto e genera più velocemente</h1>
              <p className="text-sm text-white/80 mt-2 max-w-2xl">
                Flusso separato per SEO Specialist e MediaBuyer: meno attrito in input, più iterazioni utili per campagna.
              </p>
            </div>
            <Button asChild variant="secondary"><Link href="/dashboard/projects/new">Nuovo progetto</Link></Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2 mb-8">
          {TOOL_ACTIONS.map((tool) => (
            <Card key={tool.href}>
              <CardHeader>
                <CardTitle className="text-base">{tool.title}</CardTitle>
                <CardDescription>{tool.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild className="w-full"><Link href={tool.href}>{tool.cta}</Link></Button>
              </CardContent>
            </Card>
          ))}
        </section>

        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Panoramica account</h2>
          <Button asChild variant="outline"><Link href="/artifacts/new">Generazione rapida</Link></Button>
        </div>

        {user && (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="pb-2"><CardDescription>Richieste usate</CardDescription></CardHeader>
              <CardContent><p className="text-2xl font-bold">{user.monthlyUsed}</p><p className="text-xs text-muted-foreground">/ {user.monthlyQuota} mensili</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardDescription>Quota residua</CardDescription></CardHeader>
              <CardContent><p className="text-2xl font-bold">{100 - quotaPercent}%</p><p className="text-xs text-muted-foreground">{user.monthlyQuota - user.monthlyUsed} richieste</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardDescription>Budget speso</CardDescription></CardHeader>
              <CardContent><p className="text-2xl font-bold">${Number(user.monthlySpent).toFixed(2)}</p><p className="text-xs text-muted-foreground">/ ${Number(user.monthlyBudget).toFixed(2)}</p></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardDescription>Progetti</CardDescription></CardHeader>
              <CardContent><p className="text-2xl font-bold">{projects.length}</p></CardContent>
            </Card>
          </div>
        )}

        <div className="flex items-center justify-between mb-4 mt-10">
          <h2 className="text-lg font-medium">Progetti recenti</h2>
          <Button variant="outline" size="sm" asChild><Link href="/dashboard/projects/new">Nuovo progetto</Link></Button>
        </div>

        {projectsForClient.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nessun progetto ancora. Creane uno per iniziare.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projectsForClient.map((p) => (
              <Link key={p.id} href={`/dashboard/projects/${p.id}`}>
                <Card className="hover:shadow-md transition-shadow h-full">
                  <CardHeader>
                    <CardTitle className="text-base">{p.name}</CardTitle>
                    {p.description && <CardDescription className="line-clamp-2">{p.description}</CardDescription>}
                  </CardHeader>
                  <CardContent>
                    <Badge variant="secondary">{p._count.artifacts} artefatti</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
