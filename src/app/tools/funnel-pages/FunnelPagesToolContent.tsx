'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { PageShell } from '@/components/layout/PageShell';
import { Button } from '@/components/ui/button';
import { TONES, initialSteps } from './config';
import { FunnelSetupCard } from './components/FunnelSetupCard';
import { FunnelStatusQuick } from './components/FunnelStatusQuick';
import { FunnelStepCards } from './components/FunnelStepCards';
import { useFunnelGeneration } from './hooks/useFunnelGeneration';
import { useFunnelRecovery } from './hooks/useFunnelRecovery';
import { useFunnelExtraction } from './hooks/useFunnelExtraction';
import { useFunnelUiState } from './hooks/useFunnelUiState';
import type {
  FunnelIntent,
  Phase,
} from './types';

function parseIntent(value: string | null, fallback: FunnelIntent = 'new'): FunnelIntent {
  if (value === 'new' || value === 'resume' || value === 'regenerate') {
    return value;
  }

  return fallback;
}


export function FunnelPagesToolContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceArtifactId = searchParams.get('sourceArtifactId');
  const initialIntent = parseIntent(searchParams.get('intent'), sourceArtifactId ? 'regenerate' : 'new');
  const toneFromQuery = searchParams.get('tone');
  const initialTone = TONES.includes((toneFromQuery ?? '') as (typeof TONES)[number])
    ? (toneFromQuery as (typeof TONES)[number])
    : 'professional';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [projectId, setProjectId] = useState(() => searchParams.get('projectId') ?? '');
  const [manualModel, setManualModel] = useState('');
  const [tone, setTone] = useState<(typeof TONES)[number]>(initialTone);
  const [notes, setNotes] = useState(() => searchParams.get('notes') ?? '');
  const [phase, setPhase] = useState<Phase>('idle');
  const [retryNotice, setRetryNotice] = useState<string | null>(null);
  const [resumeNotice, setResumeNotice] = useState<string | null>(null);
  const [intent, setIntent] = useState<FunnelIntent>(initialIntent);
  const [hasRecoveredCheckpoint, setHasRecoveredCheckpoint] = useState(false);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const [isStatusOpen, setIsStatusOpen] = useState(true);

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await fetch('/api/projects');
      return res.json() as Promise<{ projects?: Array<{ id: string; name: string }> }>;
    },
  });

  const { data: modelsData } = useQuery({
    queryKey: ['models'],
    queryFn: async () => {
      const res = await fetch('/api/models');
      return res.json() as Promise<{ models?: Array<{ id: string; name: string; default?: boolean }> }>;
    },
  });

  const model = manualModel
    || modelsData?.models?.find((item: { default?: boolean }) => item.default)?.id
    || modelsData?.models?.[0]?.id
    || '';
  const selectedProject = projectsData?.projects?.find((project) => project.id === projectId) ?? null;
  const {
    steps,
    running,
    replaceSteps,
    resetSteps,
    runProcess,
  } = useFunnelGeneration({
    onRetryNoticeChange: setRetryNotice,
  });
  const {
    uploadedFileName,
    extractionContext,
    lastUploadedText,
    extractionLifecycle,
    uploadError,
    extractionError,
    setExtractionContext,
    setExtractionLifecycle,
    resetExtractionState,
    handleFileChange,
    handleRetryExtraction,
  } = useFunnelExtraction({
    projectId,
    model,
    tone,
    setPhase,
    setIntent,
    intent,
    sourceArtifactId,
    setHasRecoveredCheckpoint,
    resetSteps,
    setRetryNotice,
    setResumeNotice,
  });
  const {
    handleResumeFromArtifacts,
    handleAutoResumeFromIntent,
  } = useFunnelRecovery({
    projectId,
    setResumeNotice,
    setRetryNotice,
    setHasRecoveredCheckpoint,
    setExtractionContext,
    setExtractionLifecycle,
    setPhase,
    replaceSteps,
    setIntent,
  });

  function resetAll() {
    setIntent(sourceArtifactId && (intent === 'regenerate' || intent === 'resume') ? 'regenerate' : 'new');
    setHasRecoveredCheckpoint(false);
    setPhase('idle');
    resetExtractionState();
    setRetryNotice(null);
    setResumeNotice(null);
    setNotes('');
    resetSteps();
  }

  async function handleRegenerateFunnel() {
    if (!extractionContext || !projectId) {
      return;
    }

    setIntent('regenerate');
    setHasRecoveredCheckpoint(false);
    setRetryNotice(null);
    setResumeNotice(null);
    setIsStatusOpen(false);
    setPhase('generating');
    await runProcess({
      projectId,
      model,
      tone,
      extractionContext,
      notes,
      baseSteps: initialSteps,
    });
  }

  useEffect(() => {
    handleAutoResumeFromIntent({
      intent,
      sourceArtifactId,
      phase,
      running,
    });
  }, [handleAutoResumeFromIntent, intent, sourceArtifactId, phase, running]);

  async function handleRunProcess() {
    if (!projectId || !extractionContext) {
      return;
    }

    setRetryNotice(null);
    setResumeNotice(null);
    setIsStatusOpen(false);
    setPhase('generating');
    await runProcess({
      projectId,
      model,
      tone,
      extractionContext,
      notes,
    });
  }

  const {
    isBriefingProcessing,
    hasExtractionReady,
    hasCheckpointBriefing,
    hasProjectSelected,
    hasBriefingSource,
    hasExtractionError,
    canRunGeneration,
    primaryAction,
    secondaryActions,
  } = useFunnelUiState({
    phase,
    running,
    intent,
    sourceArtifactId,
    projectId,
    model,
    uploadedFileName,
    extractionContext,
    uploadError,
    extractionError,
    lastUploadedText,
    extractionLifecycle,
    steps,
    hasRecoveredCheckpoint,
    onRunProcess: handleRunProcess,
    onResumeFromArtifacts: handleResumeFromArtifacts,
    onRetryExtraction: handleRetryExtraction,
    onRegenerateFunnel: handleRegenerateFunnel,
    onResetAll: resetAll,
    onOpenLatestArtifact: (artifactId) => router.push(`/artifacts/${artifactId}`),
    onOpenFilePicker: () => fileInputRef.current?.click(),
  });

  return (
    <PageShell width="workspace">

        <div className="mb-7 flex items-center justify-between gap-4">
          <div>
            <h1 className="app-title text-3xl font-semibold text-slate-900">HotLeadFunnel</h1>
            <p className="text-sm text-muted-foreground">Seleziona progetto, carica briefing e genera i 3 step del funnel.</p>
            {sourceArtifactId && (
              <p className="mt-2 text-xs text-muted-foreground">Dati precompilati da artefatto (ID: {sourceArtifactId}).</p>
            )}
          </div>
          <Button variant="outline" asChild>
            <Link href="/artifacts">Apri storico</Link>
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
          <FunnelSetupCard
            selectedProject={selectedProject}
            projectId={projectId}
            projects={projectsData?.projects ?? []}
            models={modelsData?.models ?? []}
            model={model}
            tone={tone}
            notes={notes}
            hasExtractionReady={hasExtractionReady}
            phase={phase}
            running={running}
            primaryAction={primaryAction}
            secondaryActions={secondaryActions}
            isProjectDialogOpen={isProjectDialogOpen}
            setIsProjectDialogOpen={setIsProjectDialogOpen}
            onProjectChange={setProjectId}
            onFileChange={handleFileChange}
            onModelChange={setManualModel}
            onToneChange={(nextTone) => setTone(nextTone)}
            onNotesChange={setNotes}
          />

          <div className="space-y-4">
            <FunnelStatusQuick
              isStatusOpen={isStatusOpen}
              setIsStatusOpen={setIsStatusOpen}
              hasExtractionError={hasExtractionError}
              canRunGeneration={canRunGeneration}
              hasProjectSelected={hasProjectSelected}
              selectedProjectName={selectedProject?.name ?? null}
              projectId={projectId}
              hasBriefingSource={hasBriefingSource}
              hasCheckpointBriefing={hasCheckpointBriefing}
              uploadedFileName={uploadedFileName}
              uploadError={uploadError}
              extractionError={extractionError}
              isBriefingProcessing={isBriefingProcessing}
              phase={phase}
              hasExtractionReady={hasExtractionReady}
              running={running}
              retryNotice={retryNotice}
              resumeNotice={resumeNotice}
            />

            <FunnelStepCards
              steps={steps}
              onOpenArtifact={(artifactId) => router.push(`/artifacts/${artifactId}`)}
            />
          </div>
        </div>
    </PageShell>
  );
}
