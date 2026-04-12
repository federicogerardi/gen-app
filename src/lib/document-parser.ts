/**
 * Inline document parser — extracts raw text from uploaded file buffers.
 * Supports: DOCX, TXT, MD.
 * No external storage; everything is processed in-memory.
 */

import * as mammoth from 'mammoth';

export type SupportedMimeType =
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'text/plain'
  | 'text/markdown';

export const ALLOWED_MIME_TYPES: SupportedMimeType[] = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'text/markdown',
];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export type ParsedDocument = {
  text: string;
  mimeType: SupportedMimeType;
  sizeBytes: number;
  fileName: string;
};

export type DocumentParseError = {
  code: 'UNSUPPORTED_TYPE' | 'FILE_TOO_LARGE' | 'PARSE_ERROR' | 'EMPTY_CONTENT';
  message: string;
};

export type DocumentParseResult =
  | { ok: true; data: ParsedDocument }
  | { ok: false; error: DocumentParseError };

export function isSupportedMimeType(mimeType: string): mimeType is SupportedMimeType {
  return (ALLOWED_MIME_TYPES as string[]).includes(mimeType);
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return result.value;
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));
}

function normalizeExtractedText(input: string): string {
  return decodeHtmlEntities(input)
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();
}

export async function parseDocument(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
): Promise<DocumentParseResult> {
  if (!isSupportedMimeType(mimeType)) {
    return {
      ok: false,
      error: {
        code: 'UNSUPPORTED_TYPE',
        message: `File type "${mimeType}" not supported. Accepted formats: DOCX, TXT, Markdown.`,
      },
    };
  }

  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      error: {
        code: 'FILE_TOO_LARGE',
        message: `File exceeds maximum size of ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.`,
      },
    };
  }

  try {
    let text: string;

    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      text = await extractDocxText(buffer);
    } else {
      // text/plain or text/markdown
      text = buffer.toString('utf-8');
    }

    const trimmed = normalizeExtractedText(text);
    if (trimmed.length === 0) {
      return {
        ok: false,
        error: {
          code: 'EMPTY_CONTENT',
          message: 'The document appears to be empty or unreadable.',
        },
      };
    }

    return {
      ok: true,
      data: {
        text: trimmed,
        mimeType,
        sizeBytes: buffer.length,
        fileName,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: {
        code: 'PARSE_ERROR',
        message: err instanceof Error ? err.message : 'Failed to parse document.',
      },
    };
  }
}
