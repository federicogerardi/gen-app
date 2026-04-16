import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';
import { PageShell } from '@/components/layout/PageShell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { formatArtifactContentForDisplay, getArtifactDisplayTypeLabel, getEffectiveArtifactWorkflowType } from '@/lib/artifact-preview';
import { getArtifactStatusBadgeClass, getArtifactStatusLabel } from '@/lib/artifact-status-ui';
import { buildArtifactRelaunchActions } from '@/lib/artifact-relaunch';
import { isArtifactType, isArtifactStatus } from '@/lib/types/artifact';

function parseTerminalOutcome(input: unknown): string | null {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return null;
  }

  const terminalState = (input as Record<string, unknown>).terminalState;
  if (!terminalState || typeof terminalState !== 'object' || Array.isArray(terminalState)) {
    return null;
  }

  const outcome = (terminalState as Record<string, unknown>).completionOutcome;
  return typeof outcome === 'string' ? outcome : null;
}

function hasReusableFunnelCheckpoint(artifacts: Array<{ type: string; status: string; workflowType: string | null; content: string; input: unknown }>): boolean {
  return artifacts.some((item) => {
    const workflow = item.workflowType ?? ((item.input && typeof item.input === 'object' && !Array.isArray(item.input))
      ? ((item.input as Record<string, unknown>).workflowType as string | undefined) ?? null
      : null);

    if (item.type !== 'extraction' || workflow !== 'extraction' || item.content.trim().length === 0) {
      return false;
    }

    return item.status === 'generating'
      || item.status === 'completed'
      || parseTerminalOutcome(item.input) === 'completed_partial';
  });
}

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
  const relatedProjectArtifacts = workflowType === 'funnel_pages' && artifact.projectId
    ? await db.artifact.findMany({
        where: {
          projectId: artifact.projectId,
          userId: session.user.id,
        },
        select: {
          type: true,
          status: true,
          workflowType: true,
          content: true,
          input: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 100,
      })
    : [];

  // Type-guard artifact fields from DB (String) to runtime types (literal unions)
  if (!isArtifactType(artifact.type) || !isArtifactStatus(artifact.status)) {
    notFound();
  }

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
  const relaunchActions = buildArtifactRelaunchActions({
    id: artifact.id,
    projectId: artifact.projectId,
    workflowType,
    input: artifact.input,
    hasReusableCheckpoint: hasReusableFunnelCheckpoint(relatedProjectArtifacts),
  });
  const primaryRelaunchAction = relaunchActions[0] ?? null;
  const secondaryRelaunchActions = relaunchActions.slice(1);

  return (
    <PageShell width="workspace">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{typeLabel}</Badge>
              <Badge variant="outline">{artifact.model}</Badge>
              <Badge variant="outline" className={getArtifactStatusBadgeClass(artifact.status)}>
                {getArtifactStatusLabel(artifact.status)}
              </Badge>
            </div>
            <h1 className="app-title text-3xl font-semibold text-slate-900">Dettaglio artefatto</h1>
            <p className="text-sm text-muted-foreground">
              Elemento dello storico personale. Progetto: {artifact.project?.name ?? 'Progetto non disponibile'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            {primaryRelaunchAction && (
              <Button className="w-full sm:w-auto" asChild>
                <Link href={primaryRelaunchAction.href}>{primaryRelaunchAction.label}</Link>
              </Button>
            )}
            {secondaryRelaunchActions.map((action) => (
              <Button key={action.href} className="w-full sm:w-auto" variant="outline" asChild>
                <Link href={action.href}>{action.label}</Link>
              </Button>
            ))}
            {artifact.project?.id && (
              <Button className="w-full sm:w-auto" variant="outline" asChild>
                <Link href={`/dashboard/projects/${artifact.project.id}`}>Apri progetto</Link>
              </Button>
            )}
            <Button className="w-full sm:w-auto" variant="outline" asChild>
              <Link href="/artifacts">Torna allo storico</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <Card className="app-surface rounded-3xl app-rise">
            <CardHeader>
              <CardTitle className="text-base">{readableOutput.title}</CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-5 px-6 pb-6 sm:px-7 sm:pb-7">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <h1 className="app-title mb-4 text-3xl font-semibold leading-tight tracking-tight text-foreground">{children}</h1>,
                  h2: ({ children }) => <h2 className="app-title mb-3 mt-8 text-2xl font-semibold leading-tight text-foreground">{children}</h2>,
                  h3: ({ children }) => <h3 className="app-title mb-2 mt-6 text-xl font-semibold leading-tight text-foreground">{children}</h3>,
                  p: ({ children }) => <p className="app-copy mb-5 max-w-[74ch] text-base leading-8 break-words text-foreground sm:text-[1.075rem]">{children}</p>,
                  ul: ({ children }) => <ul className="app-copy mb-5 max-w-[74ch] list-disc space-y-2 pl-6 text-base leading-8 text-foreground sm:text-[1.075rem]">{children}</ul>,
                  ol: ({ children }) => <ol className="app-copy mb-5 max-w-[74ch] list-decimal space-y-2 pl-6 text-base leading-8 text-foreground sm:text-[1.075rem]">{children}</ol>,
                  li: ({ children }) => <li className="leading-8">{children}</li>,
                  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  blockquote: ({ children }) => <blockquote className="app-copy mb-5 max-w-[72ch] border-l-2 border-slate-300 pl-4 text-[1.02rem] leading-8 italic text-muted-foreground">{children}</blockquote>,
                  code: ({ children }) => <code className="rounded bg-muted px-1.5 py-0.5 text-sm">{children}</code>,
                }}
              >
                {readableOutput.text}
              </ReactMarkdown>
            </CardContent>
          </Card>

          <Card className="app-surface rounded-3xl app-rise" style={{ animationDelay: '80ms' }}>
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
    </PageShell>
  );
}
