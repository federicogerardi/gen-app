import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Navbar } from '@/components/layout/Navbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { formatArtifactPreview, formatArtifactContentForDisplay } from '@/lib/artifact-preview';

export default async function ArtifactPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect('/');

  const { id } = await params;
  const artifact = await db.artifact.findUnique({
    where: { id },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!artifact || artifact.userId !== session.user.id) notFound();

  const preview = formatArtifactPreview({
    type: artifact.type,
    status: artifact.status,
    content: artifact.content,
  });
  const readableOutput = formatArtifactContentForDisplay({
    type: artifact.type,
    status: artifact.status,
    content: artifact.content,
  });

  return (
    <>
      <Navbar />
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{artifact.type}</Badge>
              <Badge variant="outline">{artifact.model}</Badge>
              <Badge variant={artifact.status === 'completed' ? 'default' : artifact.status === 'failed' ? 'destructive' : 'secondary'}>
                {artifact.status}
              </Badge>
            </div>
            <h1 className="text-2xl font-semibold">Dettaglio artefatto</h1>
            <p className="text-sm text-muted-foreground">
              Progetto: {artifact.project?.name ?? 'Progetto non disponibile'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/artifacts">Torna alla lista</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/artifacts/new?projectId=${artifact.projectId}`}>Nuova generazione</Link>
            </Button>
          </div>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm">Anteprima</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{preview.text}</p>
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{readableOutput.title}</CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              <div className="rounded-md border bg-muted/20 p-4">
                <p className="text-sm leading-7 whitespace-pre-wrap break-words text-foreground">
                  {readableOutput.text}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Metadati</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-xs text-muted-foreground">Token input</p>
                <p className="font-semibold">{artifact.inputTokens}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Token output</p>
                <p className="font-semibold">{artifact.outputTokens}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Costo</p>
                <p className="font-semibold">${Number(artifact.costUSD).toFixed(4)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Creato</p>
                <p className="font-semibold">{new Date(artifact.createdAt).toLocaleString('it-IT')}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Completato</p>
                <p className="font-semibold">
                  {artifact.completedAt ? new Date(artifact.completedAt).toLocaleString('it-IT') : 'Non ancora completato'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
