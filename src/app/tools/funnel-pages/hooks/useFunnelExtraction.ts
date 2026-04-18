import { useCallback, useState, type ChangeEvent } from 'react';
import {
  RetryableRequestError,
  getExtractionErrorMessage,
  getRetryMeta,
  streamToText,
  withRetry,
} from '@/tools/shared';
import { FUNNEL_EXTRACTION_FIELD_MAP } from '@/lib/tool-prompts/funnel-extraction-field-map';
import type {
  ApiErrorPayload,
  ExtractionLifecycleState,
  FunnelIntent,
  Phase,
} from '../types';

const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
] as const;

const ALLOWED_EXTENSIONS = ['.docx', '.txt', '.md'] as const;

interface UseFunnelExtractionOptions {
  projectId: string;
  model: string;
  tone: string;
  setPhase: (phase: Phase) => void;
  setIntent: (intent: FunnelIntent) => void;
  intent: FunnelIntent;
  sourceArtifactId: string | null;
  setHasRecoveredCheckpoint: (value: boolean) => void;
  resetSteps: () => void;
  setRetryNotice: (value: string | null) => void;
  setResumeNotice: (value: string | null) => void;
}

export function useFunnelExtraction(options: UseFunnelExtractionOptions) {
  const {
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
  } = options;

  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [extractionContext, setExtractionContext] = useState<string | null>(null);
  const [lastUploadedText, setLastUploadedText] = useState<string | null>(null);
  const [extractionLifecycle, setExtractionLifecycle] = useState<ExtractionLifecycleState>('idle');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  const resetExtractionState = useCallback(() => {
    setUploadedFileName(null);
    setExtractionContext(null);
    setLastUploadedText(null);
    setExtractionLifecycle('idle');
    setUploadError(null);
    setExtractionError(null);
  }, []);

  const handleFileChange = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

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
    resetSteps();
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
  }, [
    intent,
    model,
    projectId,
    resetSteps,
    setHasRecoveredCheckpoint,
    setIntent,
    setPhase,
    setResumeNotice,
    setRetryNotice,
    sourceArtifactId,
    tone,
  ]);

  const handleRetryExtraction = useCallback(async () => {
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
  }, [lastUploadedText, model, projectId, setPhase, setResumeNotice, setRetryNotice, tone]);

  return {
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
  };
}
