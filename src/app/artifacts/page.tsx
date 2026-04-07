import Link from 'next/link';
import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Navbar } from '@/components/layout/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default async function ArtifactsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const artifacts = await db.artifact.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    include: { project: { select: { id: true, name: true } } },
  });

  return (
    <>
      <Navbar />
      <main className="flex-1 p-6 max-w-5xl mx-auto w-full">
        <div className="flex items-center justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-semibold">Artefatti</h1>
            <p className="text-sm text-muted-foreground">Storico completo degli output generati.</p>
          </div>
          <Button asChild><Link href="/artifacts/new">Nuovo artefatto</Link></Button>
        </div>

        {artifacts.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Nessun artefatto disponibile.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {artifacts.map((artifact) => (
              <Link key={artifact.id} href={`/artifacts/${artifact.id}`}>
                <Card className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Badge>{artifact.type}</Badge>
                        <Badge variant="outline">{artifact.model}</Badge>
                        <Badge variant={artifact.status === 'completed' ? 'default' : artifact.status === 'failed' ? 'destructive' : 'secondary'}>
                          {artifact.status}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(artifact.createdAt).toLocaleString('it-IT')}
                      </span>
                    </div>
                    <CardTitle className="text-base">{artifact.project.name}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-2">{artifact.content || 'Nessun contenuto disponibile.'}</p>
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