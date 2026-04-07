import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Navbar } from '@/components/layout/Navbar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdminQuotaForm } from './AdminQuotaForm';

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== 'admin') redirect('/dashboard');

  const [users, totalArtifacts, completedArtifacts, recentActivity] = await Promise.all([
    db.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        monthlyQuota: true,
        monthlyUsed: true,
        monthlyBudget: true,
        monthlySpent: true,
        resetDate: true,
      },
    }),
    db.artifact.count(),
    db.artifact.count({ where: { status: 'completed' } }),
    db.quotaHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: 12,
      include: { user: { select: { email: true, name: true } } },
    }),
  ]);

  return (
    <>
      <Navbar />
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <h1 className="text-2xl font-semibold mb-6">Gestione utenti</h1>
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Utenti</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{users.length}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Artefatti</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{totalArtifacts}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Completati</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">{completedArtifacts}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Spesa mensile</CardTitle></CardHeader>
            <CardContent><p className="text-2xl font-bold">${users.reduce((acc, user) => acc + Number(user.monthlySpent), 0).toFixed(2)}</p></CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          {users.map((u) => (
            <Card key={u.id}>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-base">{u.name ?? u.email}</CardTitle>
                  <p className="text-sm text-muted-foreground">{u.email}</p>
                </div>
                <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>{u.role}</Badge>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 text-sm mb-4">
                  <div><p className="text-muted-foreground">Quota</p><p className="font-medium">{u.monthlyUsed} / {u.monthlyQuota}</p></div>
                  <div><p className="text-muted-foreground">Budget</p><p className="font-medium">${Number(u.monthlySpent).toFixed(2)} / ${Number(u.monthlyBudget).toFixed(2)}</p></div>
                  <div><p className="text-muted-foreground">Reset</p><p className="font-medium">{new Date(u.resetDate).toLocaleDateString('it-IT')}</p></div>
                </div>
                <AdminQuotaForm userId={u.id} currentQuota={u.monthlyQuota} currentBudget={Number(u.monthlyBudget)} />
              </CardContent>
            </Card>
          ))}
        </div>

        <section className="mt-10">
          <h2 className="text-lg font-medium mb-4">Attività recente</h2>
          <Card>
            <CardContent className="pt-4 space-y-3">
              {recentActivity.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessun evento disponibile.</p>
              ) : recentActivity.map((entry) => (
                <div key={entry.id} className="flex flex-wrap items-center justify-between gap-3 border-b last:border-b-0 pb-3 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{entry.user.name ?? entry.user.email}</p>
                    <p className="text-xs text-muted-foreground">{entry.artifactType} · {entry.model} · {entry.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">${Number(entry.costUSD).toFixed(4)}</p>
                    <p className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString('it-IT')}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );
}
