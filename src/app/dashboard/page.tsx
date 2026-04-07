import { redirect } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const [projects, user] = await Promise.all([
    db.project.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { _count: { select: { artifacts: true } } },
    }),
    db.user.findUnique({
      where: { id: session.user.id },
      select: { monthlyQuota: true, monthlyUsed: true, monthlyBudget: true, monthlySpent: true },
    }),
  ]);

  const quotaPercent = user ? Math.round((user.monthlyUsed / user.monthlyQuota) * 100) : 0;

  return (
    <>
      <Navbar />
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <Button asChild><Link href="/artifacts/new">Nuovo Artefatto</Link></Button>
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

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-medium">Progetti recenti</h2>
          <Button variant="outline" size="sm" asChild><Link href="/dashboard/projects/new">Nuovo progetto</Link></Button>
        </div>

        {projects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nessun progetto ancora. Creane uno per iniziare.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
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
