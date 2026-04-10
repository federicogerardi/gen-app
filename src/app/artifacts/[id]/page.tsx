import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { Navbar } from '@/components/layout/Navbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatArtifactContentForDisplay, getArtifactDisplayTypeLabel, getEffectiveArtifactWorkflowType } from '@/lib/artifact-preview';

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

  const workflowType = getEffectiveArtifactWorkflowType(artifact.workflowType, artifact.input);

  const readableOutput = formatArtifactContentForDisplay({
    type: artifact.type,
    status: artifact.status,
    content: artifact.content,
    workflowType,
  });
  const typeLabel = getArtifactDisplayTypeLabel({
    type: artifact.type,
    workflowType,
  });

  return (
    <>
      <Navbar />
      <main className="flex-1 p-6 max-w-6xl mx-auto w-full" id="main-content">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{typeLabel}</Badge>
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
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <Button className="w-full sm:w-auto" variant="outline" asChild>
              <Link href="/artifacts">Torna alla lista</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{readableOutput.title}</CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              <div className="rounded-md border bg-muted/20 p-4">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={{
                    h1: ({ children }) => <h1 className="mb-3 text-xl font-semibold text-foreground">{children}</h1>,
                    h2: ({ children }) => <h2 className="mb-2 text-lg font-semibold text-foreground">{children}</h2>,
                    h3: ({ children }) => <h3 className="mb-2 text-base font-semibold text-foreground">{children}</h3>,
                    p: ({ children }) => <p className="mb-3 text-sm leading-7 break-words text-foreground">{children}</p>,
                    ul: ({ children }) => <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-foreground">{children}</ul>,
                    ol: ({ children }) => <ol className="mb-3 list-decimal space-y-1 pl-5 text-sm text-foreground">{children}</ol>,
                    li: ({ children }) => <li className="leading-7">{children}</li>,
                    strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                    blockquote: ({ children }) => <blockquote className="mb-3 border-l-2 pl-3 italic text-muted-foreground">{children}</blockquote>,
                    code: ({ children }) => <code className="rounded bg-muted px-1 py-0.5 text-xs">{children}</code>,
                  }}
                >
                  {readableOutput.text}
                </ReactMarkdown>
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
