'use client';

import { useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Navbar } from '@/components/layout/Navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatArtifactContentForDisplay } from '@/lib/artifact-preview';
import { FUNNEL_EXTRACTION_FIELD_MAP, normalizeExtractedFields } from '@/lib/tool-prompts/funnel-extraction-field-map';

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

type StreamResult = {
  content: string;
  artifactId: string | null;
};

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

function FieldLabel({ htmlFor, required = true, children }: FieldLabelProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <Label htmlFor={htmlFor}>{children}</Label>
      <span
        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
          required ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
        }`}
      >
        {required ? 'Obbligatorio' : 'Opzionale'}
      </span>
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

function parseJsonFromLLMOutput(rawOutput: string): Record<string, unknown> {
  const fencedMatch = rawOutput.match(/```json\s*([\s\S]*?)```/);
  if (fencedMatch) {
    return JSON.parse(fencedMatch[1].trim()) as Record<string, unknown>;
  }

  const objectMatch = rawOutput.match(/\{[\s\S]*\}/);
  if (objectMatch) {
    return JSON.parse(objectMatch[0]) as Record<string, unknown>;
  }

  throw new Error('Nessun JSON trovato nella risposta del modello di estrazione');
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
  extractedFields: Record<string, unknown>;
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
    const data = (await response.json().catch(() => null)) as { error?: { message?: string } } | null;
    throw new Error(data?.error?.message ?? 'Generazione fallita');
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

export default function FunnelPagesToolPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [projectId, setProjectId] = useState('');
  const [manualModel, setManualModel] = useState('');
  const [tone, setTone] = useState<(typeof TONES)[number]>('professional');
  const [notes, setNotes] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [extractedFields, setExtractedFields] = useState<Record<string, unknown> | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [steps, setSteps] = useState<FunnelStepState[]>(initialSteps);

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

  function updateStep(key: FunnelStepKey, patch: Partial<FunnelStepState>) {
    setSteps((prev) => prev.map((step) => (step.key === key ? { ...step, ...patch } : step)));
  }

  function resetAll() {
    setPhase('idle');
    setUploadedFileName(null);
    setExtractedFields(null);
    setUploadError(null);
    setExtractionError(null);
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

    if (!model) {
      setUploadError('Seleziona prima un modello.');
      return;
    }

    setUploadError(null);
    setExtractionError(null);
    setExtractedFields(null);
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
      setPhase('extracting');

      const extractionRes = await fetch('/api/tools/extraction/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          model,
          tone,
          rawContent: uploadData.data.text,
          fieldMap: FUNNEL_EXTRACTION_FIELD_MAP,
        }),
      });

      if (!extractionRes.ok) {
        const data = (await extractionRes.json().catch(() => null)) as ApiErrorPayload | null;
        throw new Error(getExtractionErrorMessage(data));
      }

      const rawOutput = await streamToText(extractionRes);
      const parsed = parseJsonFromLLMOutput(rawOutput);
      setExtractedFields(normalizeExtractedFields(parsed));
      setPhase('review');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore inatteso';
      setExtractionError(message);
      setPhase('idle');
    }
  }

  async function handleRunProcess() {
    if (!projectId || !extractedFields) return;

    setSteps(initialSteps);
    setRunning(true);
    setPhase('generating');
    let currentStep: FunnelStepKey = 'optin';

    try {
      updateStep('optin', { status: 'running', error: null });
      currentStep = 'optin';
      const optin = await generateStream({
        projectId,
        model,
        tone,
        step: 'optin',
        extractedFields,
        notes: notes || undefined,
      });
      updateStep('optin', { status: 'done', content: optin.content, artifactId: optin.artifactId });

      updateStep('quiz', { status: 'running', error: null });
      currentStep = 'quiz';
      const quiz = await generateStream({
        projectId,
        model,
        tone,
        step: 'quiz',
        extractedFields,
        notes: notes || undefined,
        optinOutput: optin.content,
      });
      updateStep('quiz', { status: 'done', content: quiz.content, artifactId: quiz.artifactId });

      updateStep('vsl', { status: 'running', error: null });
      currentStep = 'vsl';
      const vsl = await generateStream({
        projectId,
        model,
        tone,
        step: 'vsl',
        extractedFields,
        notes: notes || undefined,
        optinOutput: optin.content,
        quizOutput: quiz.content,
      });
      updateStep('vsl', { status: 'done', content: vsl.content, artifactId: vsl.artifactId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore inatteso';
      updateStep(currentStep, { status: 'error', error: message });
    } finally {
      setRunning(false);
    }
  }

  const reviewFields = extractedFields
    ? [
        ['Tipo business', extractedFields.business_type],
        ['Settore/Nicchia', extractedFields.sector_niche],
        ['Target', extractedFields.target_profile],
        ['Problema principale', extractedFields.core_problem],
        ['Promessa optin', extractedFields.optin_title_promise],
        ['Obiettivo funnel', extractedFields.funnel_primary_goal],
      ].filter((entry): entry is [string, unknown] => Boolean(entry[1]))
    : [];

  return (
    <>
      <Navbar />
      <main className="app-shell app-copy relative mx-auto flex-1 w-full max-w-6xl overflow-hidden p-6" id="main-content">
        <div className="pointer-events-none absolute inset-0 app-grid-overlay" />

        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="app-title text-3xl font-semibold text-slate-900">Generatore Pagine del Funnel</h1>
            <p className="text-sm text-muted-foreground">Carica un documento di briefing e genera automaticamente optin, quiz e script VSL.</p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/artifacts">Vai agli artefatti</Link>
          </Button>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="app-surface app-rise rounded-3xl">
            <CardHeader>
              <CardTitle className="text-base">Input funnel</CardTitle>
              <CardDescription>Form minimale: progetto, modello, tono di voce e documento di briefing.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <FieldLabel htmlFor="funnel-project-select">Progetto</FieldLabel>
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger id="funnel-project-select" className="app-control" aria-label="Seleziona progetto">
                    <SelectValue placeholder="Seleziona progetto" />
                  </SelectTrigger>
                  <SelectContent>
                    {projectsData?.projects?.map((project) => (
                      <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
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
                </div>
              </div>

              <div className="space-y-2">
                <FieldLabel htmlFor="funnel-file-input">Documento di briefing</FieldLabel>
                <input
                  id="funnel-file-input"
                  type="file"
                  accept=".docx,.txt,.md,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
                  className="block w-full cursor-pointer rounded-xl border border-black/10 bg-white/60 px-3 py-2 text-sm text-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1 file:text-xs file:font-medium"
                  onChange={handleFileChange}
                  disabled={phase === 'uploading' || phase === 'extracting' || running || !projectId || !model}
                />
                {!projectId && <p className="text-xs text-amber-700">Seleziona prima un progetto per abilitare il caricamento.</p>}
                {projectId && !model && <p className="text-xs text-amber-700">Seleziona un modello per continuare.</p>}
                {uploadedFileName && <p className="text-xs text-muted-foreground">File selezionato: {uploadedFileName}</p>}
              </div>

              {(phase === 'uploading' || phase === 'extracting') && (
                <div className="rounded-xl border border-black/10 bg-white/60 p-4 text-center">
                  <p className="text-sm font-medium">{phase === 'uploading' ? 'Caricamento documento...' : 'Estrazione campi in corso...'}</p>
                </div>
              )}

              {(uploadError || extractionError) && (
                <p className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
                  {uploadError ?? extractionError}
                </p>
              )}

              {phase === 'review' && extractedFields && (
                <>
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Campi estratti</p>
                      <Badge variant="secondary">{Object.keys(extractedFields).length}</Badge>
                    </div>
                    <dl className="space-y-2">
                      {reviewFields.length > 0 ? (
                        reviewFields.map(([label, value]) => (
                          <div key={label} className="flex flex-col gap-0.5">
                            <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
                            <dd className="text-sm text-foreground line-clamp-2">{String(value)}</dd>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">Il modello non ha restituito campi riassuntivi leggibili. Puoi comunque avviare la generazione.</p>
                      )}
                    </dl>
                  </div>

                  <div className="space-y-1.5">
                    <FieldLabel htmlFor="funnel-notes" required={false}>Note aggiuntive</FieldLabel>
                    <Textarea
                      id="funnel-notes"
                      className="app-control"
                      placeholder="Istruzioni extra per la generazione (opzionale)"
                      rows={3}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <Button onClick={handleRunProcess} disabled={running || !projectId || !model} className="flex-1">
                      {running ? 'Generazione in corso...' : 'Avvia generazione funnel'}
                    </Button>
                    <Button variant="outline" onClick={resetAll} disabled={running}>
                      Ricomincia
                    </Button>
                  </div>
                </>
              )}

              {phase === 'generating' && !running && (
                <Button variant="outline" className="w-full" onClick={resetAll}>
                  Nuova generazione
                </Button>
              )}
            </CardContent>
          </Card>

          <div className="space-y-4">
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
                      <Badge variant={step.status === 'done' ? 'secondary' : step.status === 'error' ? 'destructive' : 'outline'}>
                        {step.status}
                      </Badge>
                    </div>
                    <CardDescription>
                      {step.key === 'optin' && 'Landing page di acquisizione lead'}
                      {step.key === 'quiz' && 'Questionario di qualificazione'}
                      {step.key === 'vsl' && 'Script Video Sales Letter'}
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
                        {step.status === 'running' ? stepDisplay.text : 'Output non ancora generato.'}
                      </p>
                    )}
                    {step.error && <p className="text-sm text-destructive" role="alert">{step.error}</p>}
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
      </main>
    </>
  );
}
