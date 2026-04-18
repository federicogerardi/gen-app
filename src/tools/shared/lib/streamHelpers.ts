import type { ApiErrorPayload } from '../types/tool.types';

export async function streamToText(response: Response): Promise<string> {
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
      if (payload.type === 'error')
        throw new Error((payload.message as string) ?? 'Errore di stream');
    }
  }

  return content;
}

export function getExtractionErrorMessage(errorPayload: ApiErrorPayload | null): string {
  const code = errorPayload?.error?.code;
  const reason = errorPayload?.error?.details?.reason;

  if (code === 'EXTRACTION_FAILED' && reason === 'budget_exceeded') {
    return 'Estrazione interrotta: limite costo per richiesta raggiunto. Riprova con un file piu breve o riduci il contenuto.';
  }

  return errorPayload?.error?.message ?? 'Estrazione fallita';
}
