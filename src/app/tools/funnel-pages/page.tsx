'use client';

import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import * as Dialog from '@radix-ui/react-dialog';
import { useQuery } from '@tanstack/react-query';
import { PageShell } from '@/components/layout/PageShell';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatArtifactContentForDisplay } from '@/lib/artifact-preview';
import { FUNNEL_EXTRACTION_FIELD_MAP } from '@/lib/tool-prompts/funnel-extraction-field-map';

type FunnelStepKey = 'optin' | 'quiz' | 'vsl';

type FunnelStepState = {
  key: FunnelStepKey;
  title: string;
  status: 'idle' | 'running' | 'done' | 'error';
  content: string;
  artifactId: string | null;
  error: string | null;
};

type Phase = 'idle' | 'uploading' | 'extracting' | 'review' | 'generating';

type FunnelIntent = 'new' | 'resume' | 'regenerate';

type FunnelUiState = 'draft-empty' | 'processing-briefing' | 'draft-ready' | 'prefilled-regenerate' | 'paused-with-checkpoint' | 'resume-needs-briefing' | 'running' | 'completed';

type StreamResult = {
  content: string;
  artifactId: string | null;
};

type ResumeCandidateArtifact = {
  id: string;
  type: string;
  workflowType?: string | null;
  status: string;
  content: string;
  createdAt: string;
  input?: Record<string, unknown>;
};

type RetryMeta = {
  retryable: boolean;
};

type ExtractionLifecycleState = 'idle' | 'in_progress' | 'completed_partial' | 'completed_full' | 'failed_hard';

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: {
      reason?: string;
      maxCostUsd?: number;
      cumulativeCostUsd?: number;
    };
  };
};

class RetryableRequestError extends Error {
  retryable = true;
}

type FieldLabelProps = {
  htmlFor?: string;
  required?: boolean;
  children: ReactNode;
};

const initialSteps: FunnelStepState[] = [
  { key: 'optin', title: 'Step 1 - Optin Page', status: 'idle', content: '', artifactId: null, error: null },
  { key: 'quiz', title: 'Step 2 - Domande Quiz', status: 'idle', content: '', artifactId: null, error: null },
  { key: 'vsl', title: 'Step 3 - Script VSL', status: 'idle', content: '', artifactId: null, error: null },
];

const TONES = ['professional', 'casual', 'formal', 'technical'] as const;

const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
] as const;

const ALLOWED_EXTENSIONS = ['.docx', '.txt', '.md'] as const;

const TONE_HINTS: Record<(typeof TONES)[number], string> = {
  professional: 'Chiaro e autorevole.',
  casual: 'Diretto e vicino.',
  formal: 'Istituzionale e rigoroso.',
  technical: 'Preciso e tecnico.',
};

const STEP_STATUS_BADGE_CLASS: Record<FunnelStepState['status'], string> = {
  idle: 'border-slate-400 bg-slate-200 text-slate-950',
  running: 'border-amber-400 bg-amber-200 text-amber-950',
  done: 'border-emerald-400 bg-emerald-200 text-emerald-950',
  error: 'border-rose-400 bg-rose-200 text-rose-950',
};

const STEP_STATUS_LABEL: Record<FunnelStepState['status'], string> = {
  idle: 'In attesa',
  running: 'In corso',
  done: 'Completato',
  error: 'Errore',
};

const EXTRACTION_LIFECYCLE_BADGE_CLASS: Record<ExtractionLifecycleState, string> = {
  idle: 'border-slate-400 bg-slate-200 text-slate-950',
  in_progress: 'border-amber-400 bg-amber-200 text-amber-950',
  completed_partial: 'border-orange-400 bg-orange-200 text-orange-950',
  completed_full: 'border-emerald-400 bg-emerald-200 text-emerald-950',
  failed_hard: 'border-rose-400 bg-rose-200 text-rose-950',
};

const EXTRACTION_LIFECYCLE_LABEL: Record<ExtractionLifecycleState, string> = {
  idle: 'Carica un documento per iniziare',
  in_progress: 'Estrazione in corso',
  completed_partial: 'Estrazione parziale',
  completed_full: 'Estrazione completa',
  failed_hard: 'Estrazione fallita',
};

const RETRY_MAX_ATTEMPTS = 3;
const RETRY_BASE_DELAY_MS = 900;
const RETRY_JITTER_MS = 350;

function parseIntent(value: string | null, fallback: FunnelIntent = 'new'): FunnelIntent {
  if (value === 'new' || value === 'resume' || value === 'regenerate') {
    return value;
  }

  return fallback;
}

function FieldLabel({ htmlFor, required = true, children }: FieldLabelProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={htmlFor}>{children}</Label>
      {!required && (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-600">
          Opzionale
        </span>
      )}
    </div>
  );
}

async function streamToText(response: Response): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Stream non disponibile');

  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n');
    buffer = parts.pop() ?? '';

    for (const line of parts) {
      if (!line.startsWith('data: ')) continue;
      const payload = JSON.parse(line.slice(6)) as Record<string, unknown>;
      if (payload.type === 'token') content += (payload.token as string) ?? '';
      if (payload.type === 'error') throw new Error((payload.message as string) ?? 'Errore di stream');
    }
  }

  return content;
}

function getRetryMeta(responseStatus: number, payload: ApiErrorPayload | null): RetryMeta {
  const code = payload?.error?.code;
  const retryable = responseStatus >= 500
    || responseStatus === 429
    || code === 'INTERNAL_ERROR'
    || code === 'RATE_LIMIT_EXCEEDED';

  return { retryable };
}

function getBackoffDelayMs(attempt: number): number {
  const jitter = Math.floor(Math.random() * RETRY_JITTER_MS);
  return (RETRY_BASE_DELAY_MS * (2 ** (attempt - 1))) + jitter;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function withRetry<T>(
  action: () => Promise<T>,
  options?: {
    maxAttempts?: number;
    onRetry?: (attempt: number, maxAttempts: number, delayMs: number, errorMessage: string) => void;
  },
): Promise<T> {
  const maxAttempts = options?.maxAttempts ?? RETRY_MAX_ATTEMPTS;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await action();
    } catch (error) {
      lastError = error;
      const retryable = error instanceof RetryableRequestError;

      if (!retryable || attempt === maxAttempts) {
        throw error;
      }

      const delayMs = getBackoffDelayMs(attempt);
      options?.onRetry?.(
        attempt,
        maxAttempts,
        delayMs,
        error instanceof Error ? error.message : 'Errore temporaneo',
      );
      await sleep(delayMs);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Operazione fallita');
}

function getExtractionErrorMessage(errorPayload: ApiErrorPayload | null): string {
  const code = errorPayload?.error?.code;
  const reason = errorPayload?.error?.details?.reason;

  if (code === 'EXTRACTION_FAILED' && reason === 'budget_exceeded') {
    return 'Estrazione interrotta: limite costo per richiesta raggiunto. Riprova con un file piu breve o riduci il contenuto.';
  }

  return errorPayload?.error?.message ?? 'Estrazione fallita';
}

async function generateStream(request: {
  projectId: string;
  model: string;
  tone: (typeof TONES)[number];
  step: FunnelStepKey;
  extractionContext: string;
  notes?: string;
  optinOutput?: string;
  quizOutput?: string;
}): Promise<StreamResult> {
  const response = await fetch('/api/tools/funnel-pages/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as ApiErrorPayload | null;
    const retryMeta = getRetryMeta(response.status, data);
    const message = data?.error?.message ?? 'Generazione fallita';
    if (retryMeta.retryable) {
      throw new RetryableRequestError(message);
    }

    throw new Error(message);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Stream non disponibile');

  const decoder = new TextDecoder();
  let buffer = '';
  let content = '';
  let artifactId: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split('\n');
    buffer = parts.pop() ?? '';

    for (const line of parts) {
      if (!line.startsWith('data: ')) continue;
      const payload = JSON.parse(line.slice(6)) as Record<string, unknown>;
      if (payload.type === 'start') artifactId = (payload.artifactId as string) ?? artifactId;
      if (payload.type === 'token') content += (payload.token as string) ?? '';
      if (payload.type === 'error') throw new Error((payload.message as string) ?? 'Errore di stream');
    }
  }

  return { content, artifactId };
}

function parseTerminalOutcome(input: Record<string, unknown> | undefined): string | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const terminalState = input.terminalState as Record<string, unknown> | undefined;
  const outcome = terminalState?.completionOutcome;
  return typeof outcome === 'string' ? outcome : null;
}

function mapOutcomeToLifecycle(outcome: string | null): ExtractionLifecycleState {
  if (outcome === 'completed_partial') {
    return 'completed_partial';
  }

  if (outcome === 'completed_full') {
    return 'completed_full';
  }

  if (outcome === 'failed_hard') {
    return 'failed_hard';
  }

  return 'idle';
}

function parseStepFromArtifactInput(input: Record<string, unknown> | undefined): FunnelStepKey | null {
  if (!input || typeof input !== 'object') {
    return null;
  }

  const topic = input.topic;
  if (topic === 'funnel_optin') return 'optin';
  if (topic === 'funnel_quiz') return 'quiz';
  if (topic === 'funnel_vsl') return 'vsl';
  return null;
}

function FunnelPagesToolContent() {
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
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [extractionContext, setExtractionContext] = useState<string | null>(null);
  const [lastUploadedText, setLastUploadedText] = useState<string | null>(null);
  const [extractionLifecycle, setExtractionLifecycle] = useState<ExtractionLifecycleState>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<FunnelStepState[]>(initialSteps);
  const [retryNotice, setRetryNotice] = useState<string | null>(null);
  const [resumeNotice, setResumeNotice] = useState<string | null>(null);
  const [intent, setIntent] = useState<FunnelIntent>(initialIntent);
  const [hasRecoveredCheckpoint, setHasRecoveredCheckpoint] = useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(true);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = useState(false);
  const autoResumeAttemptKeyRef = useRef<string | null>(null);

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

  function updateStep(key: FunnelStepKey, patch: Partial<FunnelStepState>) {
    setSteps((prev) => prev.map((step) => (step.key === key ? { ...step, ...patch } : step)));
  }

  function resetAll() {
    setIntent(sourceArtifactId && (intent === 'regenerate' || intent === 'resume') ? 'regenerate' : 'new');
    setHasRecoveredCheckpoint(false);
    setPhase('idle');
    setUploadedFileName(null);
    setExtractionContext(null);
    setLastUploadedText(null);
    setExtractionLifecycle('idle');
    setUploadError(null);
    setExtractionError(null);
    setRetryNotice(null);
    setResumeNotice(null);
    setNotes('');
    setSteps(initialSteps);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileNameLower = file.name.toLowerCase();
    const hasAllowedExtension = ALLOWED_EXTENSIONS.some((ext) => fileNameLower.endsWith(ext));
    const hasAllowedMime = ALLOWED_MIME_TYPES.includes(file.type as (typeof ALLOWED_MIME_TYPES)[number]);

    if (!hasAllowedExtension && !hasAllowedMime) {
      setUploadError(`Formato non supportato. Usa: ${ALLOWED_EXTENSIONS.join(', ')}`);
      return;
    }

    if (!projectId) {
      setUploadError('Seleziona prima un progetto.');
      return;
    }

    setIntent(sourceArtifactId && (intent === 'regenerate' || intent === 'resume') ? 'regenerate' : 'new');
    setHasRecoveredCheckpoint(false);
    setUploadError(null);
    setExtractionError(null);
    setRetryNotice(null);
    setResumeNotice(null);
    setExtractionContext(null);
    setLastUploadedText(null);
    setSteps(initialSteps);
    setExtractionLifecycle('in_progress');
    setUploadedFileName(file.name);
    setPhase('uploading');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('projectId', projectId);

      const uploadRes = await fetch('/api/tools/funnel-pages/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        const data = (await uploadRes.json().catch(() => null)) as { error?: { message?: string } } | null;
        throw new Error(data?.error?.message ?? 'Upload fallito');
      }

      const uploadData = (await uploadRes.json()) as { data: { text: string } };
      setLastUploadedText(uploadData.data.text);

      if (!model) {
        setExtractionError('Upload completato, ma non e disponibile alcun modello per avviare l\'estrazione. Riprova tra pochi secondi.');
        setExtractionLifecycle('failed_hard');
        setPhase('idle');
        return;
      }

      setPhase('extracting');

      const rawOutput = await withRetry(async () => {
        const extractionRes = await fetch('/api/tools/extraction/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            model,
            tone,
            responseMode: 'text',
            rawContent: uploadData.data.text,
            fieldMap: FUNNEL_EXTRACTION_FIELD_MAP,
          }),
        });

        if (!extractionRes.ok) {
          const data = (await extractionRes.json().catch(() => null)) as ApiErrorPayload | null;
          const retryMeta = getRetryMeta(extractionRes.status, data);
          const message = getExtractionErrorMessage(data);
          if (retryMeta.retryable) {
            throw new RetryableRequestError(message);
          }

          throw new Error(message);
        }

        return streamToText(extractionRes);
      }, {
        onRetry: (attempt, maxAttempts, delayMs, errorMessage) => {
          setRetryNotice(`Estrazione: tentativo ${attempt + 1}/${maxAttempts} tra ${Math.ceil(delayMs / 1000)}s (${errorMessage}).`);
        },
      });

      setRetryNotice(null);
      setExtractionContext(rawOutput.trim());
      setExtractionLifecycle('completed_full');
      setPhase('review');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore inatteso';
      setExtractionError(message);
      setRetryNotice(null);
      setExtractionLifecycle('failed_hard');
      setPhase('idle');
    }
  }

  const handleResumeFromArtifacts = useCallback(async () => {
    if (!projectId) {
      setResumeNotice('Seleziona prima un progetto per riprendere una generazione.');
      return;
    }

    setResumeNotice(null);
    setRetryNotice(null);
    setHasRecoveredCheckpoint(false);

    try {
      const response = await fetch(`/api/artifacts?projectId=${projectId}&limit=100`);
      if (!response.ok) {
        throw new Error('Impossibile recuperare checkpoint artefatti.');
      }

      const payload = (await response.json()) as { items?: ResumeCandidateArtifact[] };
      const items = payload.items ?? [];

      const extractionArtifacts = items.filter((item) => {
        const workflow = item.workflowType ?? (item.input?.workflowType as string | undefined) ?? null;
        return item.type === 'extraction' && workflow === 'extraction' && item.content.trim().length > 0;
      });

      const prioritizedExtraction = extractionArtifacts.find((item) => item.status === 'generating')
        ?? extractionArtifacts.find((item) => parseTerminalOutcome(item.input) === 'completed_partial')
        ?? extractionArtifacts.find((item) => item.status === 'completed')
        ?? null;

      if (prioritizedExtraction) {
        setExtractionContext(prioritizedExtraction.content.trim());
        setExtractionLifecycle(
          prioritizedExtraction.status === 'generating'
            ? 'in_progress'
            : mapOutcomeToLifecycle(parseTerminalOutcome(prioritizedExtraction.input)),
        );
        setPhase('review');
      }

      const nextSteps = [...initialSteps];
      for (const item of items) {
        const workflow = item.workflowType ?? (item.input?.workflowType as string | undefined) ?? null;
        if (item.type !== 'content' || workflow !== 'funnel_pages') {
          continue;
        }

        const stepKey = parseStepFromArtifactInput(item.input);
        if (!stepKey) {
          continue;
        }

        const index = nextSteps.findIndex((step) => step.key === stepKey);
        if (index < 0) {
          continue;
        }

        const existing = nextSteps[index];
        const shouldReplace = !existing.artifactId
          || (existing.status !== 'done' && item.status === 'completed')
          || (existing.status === 'idle' && item.status === 'generating');

        if (!shouldReplace) {
          continue;
        }

        const status: FunnelStepState['status'] = item.status === 'completed'
          ? 'done'
          : item.status === 'generating'
            ? 'running'
            : 'error';

        nextSteps[index] = {
          ...existing,
          status,
          content: item.content,
          artifactId: item.id,
          error: status === 'error' ? 'Step precedente terminato con errore.' : null,
        };
      }

      const hasRecoveredSteps = nextSteps.some((step) => step.artifactId || step.content);
      if (hasRecoveredSteps) {
        setSteps(nextSteps);
        setPhase('generating');
      }

      if (!prioritizedExtraction && !hasRecoveredSteps) {
        setHasRecoveredCheckpoint(false);
        setResumeNotice('Nessun checkpoint utile trovato per questo progetto.');
        return;
      }

      if (!prioritizedExtraction && hasRecoveredSteps) {
        setIntent('new');
        setHasRecoveredCheckpoint(false);
        setResumeNotice('Checkpoint parziale recuperato, ma manca il contesto estratto per riprendere. Carica di nuovo il briefing per rigenerare il funnel.');
        return;
      }

      setIntent('resume');
      setHasRecoveredCheckpoint(true);
      setResumeNotice('Checkpoint recuperato. Puoi riprendere dalla fase attuale.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore durante il recupero del checkpoint.';
      setHasRecoveredCheckpoint(false);
      setResumeNotice(message);
    }
  }, [projectId, setResumeNotice, setRetryNotice, setHasRecoveredCheckpoint, setExtractionContext, setExtractionLifecycle, setPhase, setSteps, setIntent]);

  async function handleRegenerateFunnel() {
    if (!extractionContext || !projectId) {
      return;
    }

    setIntent('regenerate');
    setHasRecoveredCheckpoint(false);
    setSteps(initialSteps);
    await handleRunProcess();
  }

  useEffect(() => {
    if (intent !== 'resume' || !sourceArtifactId || !projectId) {
      return;
    }

    if (phase === 'uploading' || phase === 'extracting' || running) {
      return;
    }

    const attemptKey = `${projectId}:${sourceArtifactId}:${intent}`;
    if (autoResumeAttemptKeyRef.current === attemptKey) {
      return;
    }

    autoResumeAttemptKeyRef.current = attemptKey;
    void handleResumeFromArtifacts();
  }, [intent, sourceArtifactId, projectId, phase, running, handleResumeFromArtifacts]);

  async function handleRetryExtraction() {
    if (!projectId || !model || !lastUploadedText) {
      setExtractionError('Per riprovare l\'estrazione carica prima un documento valido.');
      return;
    }

    setExtractionError(null);
    setRetryNotice(null);
    setResumeNotice(null);
    setPhase('extracting');
    setExtractionLifecycle('in_progress');

    try {
      const rawOutput = await withRetry(async () => {
        const extractionRes = await fetch('/api/tools/extraction/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectId,
            model,
            tone,
            responseMode: 'text',
            rawContent: lastUploadedText,
            fieldMap: FUNNEL_EXTRACTION_FIELD_MAP,
          }),
        });

        if (!extractionRes.ok) {
          const data = (await extractionRes.json().catch(() => null)) as ApiErrorPayload | null;
          const retryMeta = getRetryMeta(extractionRes.status, data);
          const message = getExtractionErrorMessage(data);
          if (retryMeta.retryable) {
            throw new RetryableRequestError(message);
          }

          throw new Error(message);
        }

        return streamToText(extractionRes);
      }, {
        onRetry: (attempt, maxAttempts, delayMs, errorMessage) => {
          setRetryNotice(`Riprova estrazione: tentativo ${attempt + 1}/${maxAttempts} tra ${Math.ceil(delayMs / 1000)}s (${errorMessage}).`);
        },
      });

      setRetryNotice(null);
      setExtractionContext(rawOutput.trim());
      setExtractionLifecycle('completed_full');
      setPhase('review');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore inatteso';
      setExtractionError(message);
      setRetryNotice(null);
      setExtractionLifecycle('failed_hard');
      setPhase('idle');
    }
  }

  async function handleRunProcess() {
    if (!projectId || !extractionContext) return;

    setRetryNotice(null);
    setResumeNotice(null);
    setSteps((prev) => prev.map((step) => ({
      ...step,
      error: null,
      status: step.status === 'done' ? 'done' : 'idle',
    })));
    setRunning(true);
    setPhase('generating');
    let currentStep: FunnelStepKey = 'optin';
    let optinContent = steps.find((step) => step.key === 'optin')?.content ?? '';
    let quizContent = steps.find((step) => step.key === 'quiz')?.content ?? '';

    try {
      const optinStep = steps.find((step) => step.key === 'optin');
      if (!(optinStep?.status === 'done' && optinStep.content.trim().length > 0)) {
        updateStep('optin', { status: 'running', error: null });
        currentStep = 'optin';
        const optin = await withRetry(() => generateStream({
          projectId,
          model,
          tone,
          step: 'optin',
          extractionContext,
          notes: notes || undefined,
        }), {
          onRetry: (attempt, maxAttempts, delayMs, errorMessage) => {
            setRetryNotice(`Step optin: tentativo ${attempt + 1}/${maxAttempts} tra ${Math.ceil(delayMs / 1000)}s (${errorMessage}).`);
          },
        });
        optinContent = optin.content;
        updateStep('optin', { status: 'done', content: optin.content, artifactId: optin.artifactId });
      }

      const quizStep = steps.find((step) => step.key === 'quiz');
      if (!(quizStep?.status === 'done' && quizStep.content.trim().length > 0)) {
        updateStep('quiz', { status: 'running', error: null });
        currentStep = 'quiz';
        const quiz = await withRetry(() => generateStream({
          projectId,
          model,
          tone,
          step: 'quiz',
          extractionContext,
          notes: notes || undefined,
          optinOutput: optinContent,
        }), {
          onRetry: (attempt, maxAttempts, delayMs, errorMessage) => {
            setRetryNotice(`Step quiz: tentativo ${attempt + 1}/${maxAttempts} tra ${Math.ceil(delayMs / 1000)}s (${errorMessage}).`);
          },
        });
        quizContent = quiz.content;
        updateStep('quiz', { status: 'done', content: quiz.content, artifactId: quiz.artifactId });
      }

      const vslStep = steps.find((step) => step.key === 'vsl');
      if (!(vslStep?.status === 'done' && vslStep.content.trim().length > 0)) {
        updateStep('vsl', { status: 'running', error: null });
        currentStep = 'vsl';
        const vsl = await withRetry(() => generateStream({
          projectId,
          model,
          tone,
          step: 'vsl',
          extractionContext,
          notes: notes || undefined,
          optinOutput: optinContent,
          quizOutput: quizContent,
        }), {
          onRetry: (attempt, maxAttempts, delayMs, errorMessage) => {
            setRetryNotice(`Step vsl: tentativo ${attempt + 1}/${maxAttempts} tra ${Math.ceil(delayMs / 1000)}s (${errorMessage}).`);
          },
        });
        updateStep('vsl', { status: 'done', content: vsl.content, artifactId: vsl.artifactId });
      }

      setRetryNotice(null);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore inatteso';
      updateStep(currentStep, { status: 'error', error: message });
      setRetryNotice(null);
    } finally {
      setRunning(false);
    }
  }

  const reviewContextPreview = extractionContext
    ? extractionContext.slice(0, 1200)
    : '';
  const isBriefingProcessing = phase === 'uploading' || phase === 'extracting';
  const hasExtractionReady = Boolean(extractionContext?.trim());
  const hasCompletedSteps = steps.every((step) => step.status === 'done' && step.content.trim().length > 0);
  const hasRecoveredSteps = steps.some((step) => step.artifactId || step.content.trim().length > 0);
  const hasRecoveryData = hasRecoveredCheckpoint && (hasExtractionReady || hasRecoveredSteps);
  const latestArtifactId = steps.find((step) => step.key === 'vsl' && step.artifactId)?.artifactId
    ?? steps.find((step) => step.key === 'quiz' && step.artifactId)?.artifactId
    ?? steps.find((step) => step.key === 'optin' && step.artifactId)?.artifactId
    ?? null;

  let uiState: FunnelUiState;
  if (running) {
    uiState = 'running';
  } else if (isBriefingProcessing) {
    uiState = 'processing-briefing';
  } else if (hasCompletedSteps) {
    uiState = 'completed';
  } else if (!hasExtractionReady && hasRecoveredSteps && !hasRecoveredCheckpoint) {
    uiState = 'resume-needs-briefing';
  } else if (intent === 'resume' && hasRecoveryData) {
    uiState = 'paused-with-checkpoint';
  } else if (intent === 'regenerate' && Boolean(sourceArtifactId) && hasExtractionReady) {
    uiState = 'prefilled-regenerate';
  } else if (hasExtractionReady) {
    uiState = 'draft-ready';
  } else {
    uiState = 'draft-empty';
  }

  const canRunGeneration = Boolean(projectId && model && hasExtractionReady);
  const canResumeCheckpoint = Boolean(projectId && !running && !isBriefingProcessing);
  const canRetryExtraction = Boolean(projectId && model && lastUploadedText && !running && !isBriefingProcessing);

  const primaryAction = (() => {
    if (uiState === 'processing-briefing') {
      return {
        label: phase === 'uploading' ? 'Caricamento in corso...' : 'Estrazione in corso...',
        disabled: true,
        onClick: undefined as (() => void) | undefined,
      };
    }

    if (uiState === 'running') {
      return {
        label: 'Generazione in corso...',
        disabled: true,
        onClick: undefined as (() => void) | undefined,
      };
    }

    if (uiState === 'paused-with-checkpoint') {
      return {
        label: 'Riprendi dal checkpoint',
        disabled: !canRunGeneration,
        onClick: handleRunProcess,
      };
    }

    if (uiState === 'resume-needs-briefing') {
      return {
        label: 'Carica nuovo briefing',
        disabled: !projectId,
        onClick: () => fileInputRef.current?.click(),
      };
    }

    if (uiState === 'prefilled-regenerate') {
      return {
        label: 'Rigenera ora',
        disabled: !canRunGeneration,
        onClick: handleRegenerateFunnel,
      };
    }

    if (uiState === 'draft-ready') {
      return {
        label: 'Avvia generazione funnel',
        disabled: !canRunGeneration,
        onClick: handleRunProcess,
      };
    }

    if (uiState === 'completed' && latestArtifactId) {
      return {
        label: 'Apri ultimo artefatto',
        disabled: false,
        onClick: () => router.push(`/artifacts/${latestArtifactId}`),
      };
    }

    return {
      label: 'Completa dati obbligatori',
      disabled: true,
      onClick: undefined as (() => void) | undefined,
    };
  })();

  const secondaryActions: Array<{
    label: string;
    onClick: () => void;
    disabled?: boolean;
  }> = [];

  if ((uiState === 'draft-empty' || uiState === 'resume-needs-briefing') && canResumeCheckpoint) {
    secondaryActions.push({
      label: 'Riprendi da checkpoint',
      onClick: handleResumeFromArtifacts,
    });
  }

  if ((uiState === 'draft-empty' || uiState === 'draft-ready') && canRetryExtraction && extractionLifecycle === 'failed_hard') {
    secondaryActions.push({
      label: 'Riprova estrazione',
      onClick: handleRetryExtraction,
    });
  }

  if (uiState === 'paused-with-checkpoint' && hasExtractionReady) {
    secondaryActions.push({
      label: 'Rigenera da zero',
      onClick: handleRegenerateFunnel,
    });
  }

  if (uiState === 'completed' && hasExtractionReady) {
    secondaryActions.push({
      label: 'Rigenera funnel',
      onClick: handleRegenerateFunnel,
    });
  }

  if (uiState !== 'processing-briefing' && uiState !== 'running' && (uiState !== 'draft-empty' || Boolean(projectId || uploadedFileName || extractionContext))) {
    secondaryActions.push({
      label: uiState === 'completed' ? 'Nuova generazione' : 'Ricomincia',
      onClick: resetAll,
    });
  }

  const actionSummary: Record<FunnelUiState, string> = {
    'draft-empty': 'Completa progetto e briefing, o riprendi un checkpoint.',
    'processing-briefing': 'Briefing in elaborazione.',
    'draft-ready': 'Contesto pronto. Puoi generare.',
    'prefilled-regenerate': 'Dati pronti. Puoi rigenerare.',
    'paused-with-checkpoint': 'Checkpoint disponibile.',
    'resume-needs-briefing': 'Output parziali presenti: ricarica il briefing.',
    running: 'Generazione in corso sui 3 step.',
    completed: 'Output pronti. Puoi aprire o rigenerare.',
  };

  return (
    <PageShell width="workspace">

        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="app-title text-3xl font-semibold text-slate-900">HotLead Funnel</h1>
            <p className="text-sm text-muted-foreground">Scegli progetto, carica briefing, genera.</p>
            {sourceArtifactId && (
              <p className="mt-2 text-xs text-muted-foreground">Dati precompilati da artefatto (ID: {sourceArtifactId}).</p>
            )}
          </div>
          <Button variant="outline" asChild>
            <Link href="/artifacts">Vai agli artefatti</Link>
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="app-surface app-rise rounded-3xl">
            <CardHeader>
              <CardTitle className="text-base">Setup</CardTitle>
              <CardDescription>Completa i campi essenziali.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-6">
                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-3 border-b border-black/10 pb-2">
                    <div className="space-y-1">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Campi obbligatori</p>
                      <p className="text-base font-semibold text-slate-950">Progetto e briefing</p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        !projectId
                          ? 'border-amber-300 bg-amber-100 text-amber-950'
                          : uploadedFileName
                            ? 'border-emerald-300 bg-emerald-100 text-emerald-950'
                            : 'border-sky-300 bg-sky-100 text-sky-950'
                      }
                    >
                      {!projectId ? 'Manca progetto' : uploadedFileName ? 'Pronto' : 'Manca briefing'}
                    </Badge>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[1fr_2fr]">
                    <div className="min-w-0 space-y-4 rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm">
                      <div className="space-y-1.5">
                        <FieldLabel>Progetto</FieldLabel>
                        <Dialog.Root open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
                          <Dialog.Trigger asChild>
                            <Button
                              className="w-full min-w-0 max-w-full cursor-pointer justify-start overflow-hidden text-left"
                              variant="outline"
                              title={selectedProject?.name ?? undefined}
                            >
                              {selectedProject ? (
                                <span className="block min-w-0 flex-1 truncate">{selectedProject.name}</span>
                              ) : (
                                <span className="block min-w-0 flex-1 truncate text-muted-foreground">Scegli un progetto</span>
                              )}
                            </Button>
                          </Dialog.Trigger>
                          <Dialog.Portal>
                            <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
                            <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-96 max-h-96 -translate-x-1/2 -translate-y-1/2 rounded-lg border border-black/10 bg-white p-6 shadow-lg overflow-y-auto">
                              <Dialog.Title className="text-lg font-semibold mb-4">Scegli un progetto</Dialog.Title>
                              <Dialog.Description className="sr-only">Elenco progetti disponibili per il funnel</Dialog.Description>
                              <div className="space-y-2">
                                {projectsData?.projects?.map((project) => (
                                  <button
                                    key={project.id}
                                    onClick={() => {
                                      setProjectId(project.id);
                                      setIsProjectDialogOpen(false);
                                    }}
                                    className={`w-full cursor-pointer px-3 py-2 text-left rounded-lg border transition-colors ${
                                      projectId === project.id
                                        ? 'border-blue-500 bg-blue-50 text-blue-900'
                                        : 'border-transparent hover:bg-slate-100'
                                    }`}
                                  >
                                    <span className="font-medium">{project.name}</span>
                                  </button>
                                ))}
                              </div>
                              <Dialog.Close asChild>
                                <button className="absolute right-4 top-4 cursor-pointer text-muted-foreground hover:text-foreground">✕</button>
                              </Dialog.Close>
                            </Dialog.Content>
                          </Dialog.Portal>
                        </Dialog.Root>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-2xl border border-black/10 bg-white/80 p-4 shadow-sm">
                      <div className="space-y-1.5">
                        <FieldLabel htmlFor="funnel-file-input">Briefing</FieldLabel>
                        <p className="text-xs text-muted-foreground">.docx, .txt, .md</p>
                      </div>

                      <input
                        id="funnel-file-input"
                        type="file"
                        accept=".docx,.txt,.md,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
                        className="block w-full cursor-pointer rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm text-foreground outline-none transition-colors file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-xs file:font-medium focus-visible:border-blue-500/60 focus-visible:ring-3 focus-visible:ring-blue-500/25 disabled:cursor-not-allowed disabled:bg-slate-100/80"
                        onChange={handleFileChange}
                        disabled={phase === 'uploading' || phase === 'extracting' || running || !projectId}
                      />

                      <Badge variant="outline" className={EXTRACTION_LIFECYCLE_BADGE_CLASS[extractionLifecycle]}>
                        {EXTRACTION_LIFECYCLE_LABEL[extractionLifecycle]}
                      </Badge>
                    </div>
                  </div>

                  <aside
                    className={[
                      'rounded-2xl border p-4 shadow-sm transition-colors',
                      !projectId
                        ? 'border-amber-300 bg-amber-50/90'
                        : uploadedFileName
                          ? 'border-emerald-300 bg-emerald-50/90'
                          : 'border-sky-300 bg-sky-50/90',
                    ].join(' ')}
                    role="status"
                    aria-live="polite"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Stato rapido</p>
                    {!projectId && (
                      <>
                        <p className="mt-2 text-sm font-semibold text-amber-950">Scegli prima il progetto</p>
                        <p className="mt-1 text-xs leading-relaxed text-amber-900">Dopo puoi caricare il briefing.</p>
                      </>
                    )}
                    {projectId && !uploadedFileName && (
                      <>
                        <p className="mt-2 text-sm font-semibold text-sky-950">Progetto selezionato</p>
                        <p className="mt-1 text-xs leading-relaxed text-sky-900">Carica il briefing per continuare.</p>
                        <p className="mt-3 rounded-lg bg-white/70 px-3 py-2 text-xs text-slate-700">{selectedProject?.name ?? projectId}</p>
                      </>
                    )}
                    {projectId && uploadedFileName && (
                      <>
                        <p className="mt-2 text-sm font-semibold text-emerald-950">Pronto</p>
                        <p className="mt-1 text-xs leading-relaxed text-emerald-900">Progetto e file impostati.</p>
                        <div className="mt-3 space-y-2 text-xs text-slate-700">
                          <p className="rounded-lg bg-white/70 px-3 py-2">Progetto: {selectedProject?.name ?? projectId}</p>
                          <p className="rounded-lg bg-white/70 px-3 py-2">File: {uploadedFileName}</p>
                        </div>
                      </>
                    )}
                  </aside>
                </section>

                <section className="space-y-4 border-t border-black/10 pt-5">
                  <div className="space-y-3">
                    {(phase === 'uploading' || phase === 'extracting') && (
                      <div className="rounded-xl border border-black/10 bg-white/60 p-4 text-center" role="status" aria-live="polite" aria-atomic="true">
                        <p className="text-sm font-medium">{phase === 'uploading' ? 'Caricamento...' : 'Estrazione in corso...'}</p>
                      </div>
                    )}

                    {(uploadError || extractionError) && (
                      <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert" aria-live="assertive">
                        {uploadError ?? extractionError}
                      </p>
                    )}

                    {retryNotice && (
                      <p className="rounded-xl bg-amber-100 px-4 py-3 text-sm text-amber-900" role="status" aria-live="polite">
                        {retryNotice}
                      </p>
                    )}

                    {resumeNotice && (
                      <p className="rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-800" role="status" aria-live="polite">
                        {resumeNotice}
                      </p>
                    )}
                  </div>
                </section>

                <section className="space-y-4 border-t border-black/10 pt-5">
                  <details
                    open={isAdvancedOpen}
                    onToggle={(event) => setIsAdvancedOpen(event.currentTarget.open)}
                    className="group rounded-2xl border border-sky-200 bg-sky-50/50 px-4 py-3 shadow-sm"
                  >
                    <summary className="cursor-pointer list-none text-sm font-medium text-slate-900">
                      <span className="flex items-center justify-between gap-3">
                        <span className="flex items-center gap-3">
                          <span>Impostazioni avanzate</span>
                          <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                            {isAdvancedOpen ? 'Attive' : 'Chiuse'}
                          </span>
                        </span>
                        <span className="text-xs text-muted-foreground">{isAdvancedOpen ? 'Nascondi' : 'Mostra'}</span>
                      </span>
                    </summary>

                    <div className="mt-4 space-y-4">
                      <div className="space-y-1.5">
                        <FieldLabel htmlFor="funnel-model-select">Modello</FieldLabel>
                        <Select value={model} onValueChange={setManualModel}>
                          <SelectTrigger id="funnel-model-select" className="app-control" aria-label="Modello LLM">
                            <SelectValue placeholder="Seleziona modello" />
                          </SelectTrigger>
                          <SelectContent>
                            {modelsData?.models?.map((item) => (
                              <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <FieldLabel htmlFor="funnel-tone-select">Tono di voce</FieldLabel>
                        <Select value={tone} onValueChange={(value) => setTone(value as (typeof TONES)[number])}>
                          <SelectTrigger id="funnel-tone-select" className="app-control" aria-label="Tono di comunicazione">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TONES.map((item) => (
                              <SelectItem key={item} value={item}>{item}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs leading-relaxed text-muted-foreground">{TONE_HINTS[tone]}</p>
                      </div>
                    </div>
                  </details>
                </section>
              </div>

              {hasExtractionReady && (
                <>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Anteprima contesto</p>
                      <Badge variant="secondary">{Math.ceil((extractionContext?.length ?? 0) / 6)} token stimati</Badge>
                    </div>
                    <p className="max-h-52 overflow-y-auto whitespace-pre-wrap rounded-lg border border-emerald-200/70 bg-white/70 p-3 text-sm text-foreground">
                      {reviewContextPreview}
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <FieldLabel htmlFor="funnel-notes" required={false}>Note</FieldLabel>
                    <Textarea
                      id="funnel-notes"
                      className="app-control"
                      placeholder="Istruzioni extra (opzionale)"
                      rows={3}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                    />
                  </div>
                </>
              )}

              <section className="space-y-4 border-t border-black/10 pt-5">
                <div className="space-y-1">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Azione consigliata</p>
                  <p className="text-sm text-slate-700">{actionSummary[uiState]}</p>
                </div>

                <Button
                  className="w-full"
                  data-primary-action="true"
                  onClick={primaryAction.onClick}
                  disabled={primaryAction.disabled}
                >
                  {primaryAction.label}
                </Button>

                {secondaryActions.length > 0 && (
                  <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                    {secondaryActions.map((action) => (
                      <Button
                        key={action.label}
                        type="button"
                        variant="outline"
                        onClick={action.onClick}
                        disabled={action.disabled}
                        className="sm:flex-1"
                      >
                        {action.label}
                      </Button>
                    ))}
                  </div>
                )}
              </section>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <details className="group rounded-3xl border border-black/10 bg-white/60 px-4 py-3 shadow-sm">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium text-slate-900 [&::-webkit-details-marker]:hidden">
                <span>Guida rapida</span>
                <span className="text-xs text-muted-foreground group-open:hidden">Mostra</span>
                <span className="hidden text-xs text-muted-foreground group-open:inline">Nascondi</span>
              </summary>

              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <div className="rounded-2xl border border-black/10 bg-slate-50/90 px-3 py-3">
                  <p className="font-medium text-slate-900">1. Scegli il progetto</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Primo passaggio obbligatorio.</p>
                </div>
                <div className="rounded-2xl border border-black/10 bg-slate-50/90 px-3 py-3">
                  <p className="font-medium text-slate-900">2. Carica il briefing</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Il tool estrae il contesto in automatico.</p>
                </div>
                <div className="rounded-2xl border border-black/10 bg-slate-50/90 px-3 py-3">
                  <p className="font-medium text-slate-900">3. Avvia la generazione</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Usa il pulsante principale quando e pronto.</p>
                </div>
              </div>
            </details>

            {steps.map((step) => {
              const stepDisplay = formatArtifactContentForDisplay({
                type: 'content',
                status: step.status === 'error' ? 'failed' : step.content ? 'completed' : step.status === 'running' ? 'generating' : 'completed',
                content: step.content,
                workflowType: 'funnel_pages',
              });

              return (
                <Card key={step.key} className="app-surface app-rise rounded-2xl">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-3">
                      <CardTitle className="text-base">{step.title}</CardTitle>
                      <Badge variant="outline" className={STEP_STATUS_BADGE_CLASS[step.status]}>
                        {STEP_STATUS_LABEL[step.status]}
                      </Badge>
                    </div>
                    <CardDescription>
                      {step.key === 'optin' && 'Pagina optin'}
                      {step.key === 'quiz' && 'Domande di qualifica'}
                      {step.key === 'vsl' && 'Script video di vendita'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="sr-only" aria-live="polite">
                      {step.status === 'running' ? `${step.title} in generazione` : `${step.title} aggiornato`}
                    </p>
                    {step.content ? (
                      <div className="max-h-64 overflow-y-auto rounded-xl border border-black/10 bg-white/70 p-4" aria-live="polite">
                        <p className="break-words whitespace-pre-wrap text-sm leading-7 text-foreground">{stepDisplay.text}</p>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {step.status === 'running' ? stepDisplay.text : 'Nessun output ancora.'}
                      </p>
                    )}
                    {step.error && <p className="text-sm text-destructive" role="alert" aria-live="assertive">{step.error}</p>}
                    {step.artifactId && (
                      <Button variant="outline" size="sm" onClick={() => router.push(`/artifacts/${step.artifactId}`)}>
                        Apri artefatto
                      </Button>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
    </PageShell>
  );
}

export default function FunnelPagesToolPage() {
  return (
    <Suspense
      fallback={(
        <PageShell width="workspace">
          <div className="py-10 text-sm text-muted-foreground" role="status" aria-live="polite" aria-atomic="true">
            Caricamento HotLead Funnel...
          </div>
        </PageShell>
      )}
    >
      <FunnelPagesToolContent />
    </Suspense>
  );
}
