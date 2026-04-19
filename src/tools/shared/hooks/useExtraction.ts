import { useState, useCallback } from 'react';
import type { ExtractionLifecycleState, ApiErrorPayload } from '../types/tool.types';
import { withRetry, RetryableRequestError, getRetryMeta } from '../lib/retryLogic';
import { streamToText, getExtractionErrorMessage } from '../lib/streamHelpers';

const ALLOWED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
] as const;

const ALLOWED_EXTENSIONS = ['.docx', '.txt', '.md'] as const;

export interface UseExtractionConfig {
  projectId: string;
  model: string;
  tone: string;
  fieldMap: Record<string, string>;
  extractionEndpoint: string;
  uploadEndpoint: string;
}

export function useExtraction(config: UseExtractionConfig) {
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [extractionContext, setExtractionContext] = useState<string | null>(null);
  const [lastUploadedText, setLastUploadedText] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [extractionLifecycle, setExtractionLifecycle] =
    useState<ExtractionLifecycleState>('idle');
  const [retryNotice, setRetryNotice] = useState<string | null>(null);

  const handleFileChange = useCallback(
    async (file: File): Promise<void> => {
      const fileNameLower = file.name.toLowerCase();
      const hasAllowedExtension = ALLOWED_EXTENSIONS.some((ext) =>
        fileNameLower.endsWith(ext),
      );
      const hasAllowedMime = ALLOWED_MIME_TYPES.includes(
        file.type as (typeof ALLOWED_MIME_TYPES)[number],
      );

      if (!hasAllowedExtension && !hasAllowedMime) {
        setUploadError(`Formato non supportato. Usa: ${ALLOWED_EXTENSIONS.join(', ')}`);
        return;
      }

      setUploadError(null);
      setExtractionError(null);
      setRetryNotice(null);
      setExtractionContext(null);
      setLastUploadedText(null);
      setExtractionLifecycle('in_progress');
      setUploadedFileName(file.name);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('projectId', config.projectId);

        const uploadRes = await fetch(config.uploadEndpoint, {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          const data = (await uploadRes.json().catch(() => null)) as {
            error?: { message?: string };
          } | null;
          throw new Error(data?.error?.message ?? 'Upload fallito');
        }

        const uploadData = (await uploadRes.json()) as { data: { text: string } };
        setLastUploadedText(uploadData.data.text);

        if (!config.model) {
          setExtractionError('Upload completato, ma modello non disponibile.');
          setExtractionLifecycle('failed_hard');
          return;
        }

        const rawOutput = await withRetry(
          async () => {
            const extractionRes = await fetch(config.extractionEndpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                projectId: config.projectId,
                model: config.model,
                tone: config.tone,
                responseMode: 'text',
                rawContent: uploadData.data.text,
                fieldMap: config.fieldMap,
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
          },
          {
            onRetry: (attempt, maxAttempts, delayMs, errorMessage) => {
              setRetryNotice(
                `Estrazione: tentativo ${attempt + 1}/${maxAttempts} tra ${Math.ceil(delayMs / 1000)}s (${errorMessage}).`,
              );
            },
          },
        );

        setRetryNotice(null);
        setExtractionContext(rawOutput.trim());
        setExtractionLifecycle('completed_full');
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Errore inatteso';
        setExtractionError(message);
        setRetryNotice(null);
        setExtractionLifecycle('failed_hard');
      }
    },
    [config],
  );

  const handleRetryExtraction = useCallback(async (): Promise<void> => {
    if (!config.projectId || !config.model || !lastUploadedText) {
      setExtractionError('Per riprovare l\'estrazione carica prima un documento valido.');
      return;
    }

    setExtractionError(null);
    setRetryNotice(null);
    setExtractionLifecycle('in_progress');

    try {
      const rawOutput = await withRetry(
        async () => {
          const extractionRes = await fetch(config.extractionEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: config.projectId,
              model: config.model,
              tone: config.tone,
              responseMode: 'text',
              rawContent: lastUploadedText,
              fieldMap: config.fieldMap,
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
        },
        {
          onRetry: (attempt, maxAttempts, delayMs) => {
            setRetryNotice(
              `Riprova: tentativo ${attempt + 1}/${maxAttempts} tra ${Math.ceil(delayMs / 1000)}s.`,
            );
          },
        },
      );

      setRetryNotice(null);
      setExtractionContext(rawOutput.trim());
      setExtractionLifecycle('completed_full');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Errore inatteso';
      setExtractionError(message);
      setRetryNotice(null);
      setExtractionLifecycle('failed_hard');
    }
  }, [config, lastUploadedText]);

  const reset = useCallback((): void => {
    setUploadedFileName(null);
    setExtractionContext(null);
    setLastUploadedText(null);
    setUploadError(null);
    setExtractionError(null);
    setExtractionLifecycle('idle');
    setRetryNotice(null);
  }, []);

  return {
    uploadedFileName,
    extractionContext,
    lastUploadedText,
    uploadError,
    extractionError,
    extractionLifecycle,
    retryNotice,
    handleFileChange,
    handleRetryExtraction,
    reset,
  };
}
