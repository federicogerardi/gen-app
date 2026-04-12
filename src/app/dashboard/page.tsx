import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const TOOL_ACTIONS = [
  {
    title: 'Generatore Meta Ads',
    description: 'Crea varianti ad copy Meta complete: hook, primary text, headline e CTA.',
    href: '/tools/meta-ads',
    cta: 'Apri tool',
    tag: 'Campaign',
  },
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

  const [projects, , user] = await Promise.all([
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
      select: { monthlyQuota: true, monthlyUsed: true },
    }),
  ]);

  const quotaPercent = user && user.monthlyQuota > 0 ? Math.round((user.monthlyUsed / user.monthlyQuota) * 100) : 0;

  const projectsForClient = projects.map((p: typeof projects[number]) => ({
    ...p,
    description: p.description === null ? undefined : p.description,
  }));

  return (
    <>
      <Navbar />
      <main className="app-shell app-copy flex-1 p-6 max-w-5xl mx-auto w-full relative overflow-hidden" id="main-content">
        <div className="pointer-events-none absolute inset-0 app-grid-overlay" />
        <section className="app-rise relative rounded-3xl border border-black/10 bg-gradient-to-r from-slate-950 via-slate-800 to-slate-700 text-white p-6 mb-8 shadow-[0_28px_70px_-45px_rgba(15,23,42,0.85)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-widest text-white/70 mb-2">Workspace Marketing AI</p>
              <h1 className="app-title text-2xl md:text-3xl font-semibold">Scegli il tool giusto e genera piu velocemente</h1>
              <p className="text-sm text-white/80 mt-2 max-w-2xl">
                Flusso separato per SEO Specialist e MediaBuyer: meno attrito in input, più iterazioni utili per campagna.
              </p>
            </div>
            <Button asChild variant="secondary"><Link href="/dashboard/projects/new">Nuovo progetto</Link></Button>
          </div>
        </section>

        <section className="app-rise relative mb-8" style={{ animationDelay: '90ms' }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="app-title text-xl font-medium">Tool workspace</h2>
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

        <div className="flex items-center justify-between mb-4 mt-10">
          <h2 className="app-title text-xl font-medium">Progetti recenti</h2>
          <Button variant="outline" size="sm" asChild><Link href="/dashboard/projects/new">Nuovo progetto</Link></Button>
        </div>

        {projectsForClient.length === 0 ? (
          <Card className="app-surface rounded-2xl">
            <CardContent className="py-12 text-center text-muted-foreground">
              Nessun progetto ancora. Creane uno per iniziare.
            </CardContent>
          </Card>
        ) : (
          <div className="app-rise grid gap-4 md:grid-cols-2 lg:grid-cols-3" style={{ animationDelay: '190ms' }}>
            {projectsForClient.map((p: typeof projectsForClient[number]) => (
              <Link key={p.id} href={`/dashboard/projects/${p.id}`}>
                <Card className="app-surface rounded-2xl hover:shadow-[0_26px_65px_-44px_rgba(15,23,42,0.75)] transition-shadow h-full">
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
