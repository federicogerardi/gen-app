/**
 * Inline document parser — extracts raw text from uploaded file buffers.
 * Supports: PDF, DOCX, TXT, MD.
 * No external storage; everything is processed in-memory.
 */

export type SupportedMimeType =
  | 'application/pdf'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  | 'text/plain'
  | 'text/markdown';

export const ALLOWED_MIME_TYPES: SupportedMimeType[] = [
  'application/pdf',
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

async function extractPdfText(buffer: Buffer): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(buffer),
    disableWorker: true,
    useWorkerFetch: false,
  } as Parameters<typeof pdfjs.getDocument>[0]);

  const pdf = await loadingTask.promise;

  try {
    const pages: string[] = [];

    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/[ \t]{2,}/g, ' ')
        .trim();

      if (pageText.length > 0) {
        pages.push(pageText);
      }
    }

    return pages.join('\n\n');
  } finally {
    await pdf.destroy();
  }
}

async function extractDocxText(buffer: Buffer): Promise<string> {
  // DOCX is a ZIP with XML nodes: normalize paragraph/line/table boundaries before stripping tags.
  const JSZip = (await import('jszip')).default;
  const zip = await JSZip.loadAsync(buffer);
  const documentXml = zip.file('word/document.xml');

  if (!documentXml) {
    throw new Error('Invalid DOCX: word/document.xml not found');
  }

  const xmlContent = await documentXml.async('string');
  // Preserve text boundaries to give the extractor a coherent semantic context.
  const text = xmlContent
    .replace(/<w:tab\s*\/?\s*>/g, '\t')
    .replace(/<w:br\s*\/?>/g, '\n')
    .replace(/<\/w:p>/g, '\n')
    .replace(/<\/w:tr>/g, '\n')
    .replace(/<\/w:tc>/g, '\t')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

  return text;
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
        message: `File type "${mimeType}" not supported. Accepted formats: PDF, DOCX, TXT, Markdown.`,
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

    if (mimeType === 'application/pdf') {
      text = await extractPdfText(buffer);
    } else if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      text = await extractDocxText(buffer);
    } else {
      // text/plain or text/markdown
      text = buffer.toString('utf-8');
    }

    const trimmed = text.trim();
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
