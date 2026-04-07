import { redirect, notFound } from 'next/navigation';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Navbar } from '@/components/layout/Navbar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export default async function ArtifactPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const { id } = await params;
  const artifact = await db.artifact.findUnique({ where: { id } });

  if (!artifact || artifact.userId !== session.user.id) notFound();

  return (
    <>
      <Navbar />
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full">
        <div className="flex items-center gap-3 mb-6">
          <Badge>{artifact.type}</Badge>
          <Badge variant="outline">{artifact.model}</Badge>
          <Badge variant={artifact.status === 'completed' ? 'default' : artifact.status === 'failed' ? 'destructive' : 'secondary'}>
            {artifact.status}
          </Badge>
        </div>

        <div className="grid gap-4 grid-cols-3 mb-6">
          <Card>
            <CardHeader className="pb-1"><p className="text-xs text-muted-foreground">Token input</p></CardHeader>
            <CardContent><p className="font-semibold">{artifact.inputTokens}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1"><p className="text-xs text-muted-foreground">Token output</p></CardHeader>
            <CardContent><p className="font-semibold">{artifact.outputTokens}</p></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-1"><p className="text-xs text-muted-foreground">Costo</p></CardHeader>
            <CardContent><p className="font-semibold">${Number(artifact.costUSD).toFixed(4)}</p></CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader><CardTitle className="text-base">Contenuto generato</CardTitle></CardHeader>
          <Separator />
          <CardContent className="pt-4">
            {artifact.content ? (
              <pre className="text-sm whitespace-pre-wrap break-words font-mono">{artifact.content}</pre>
            ) : (
              <p className="text-muted-foreground">Nessun contenuto disponibile.</p>
            )}
          </CardContent>
        </Card>
      </main>
    </>
  );
}
