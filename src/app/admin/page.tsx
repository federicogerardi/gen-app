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

  const users = await db.user.findMany({
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
  });

  return (
    <>
      <Navbar />
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <h1 className="text-2xl font-semibold mb-6">Gestione utenti</h1>
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
      </main>
    </>
  );
}
