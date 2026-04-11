import { auth } from '@/lib/auth';
import { parseDocument, ALLOWED_MIME_TYPES, MAX_FILE_SIZE_BYTES } from '@/lib/document-parser';
import { db } from '@/lib/db';
import { detectFileTypeFromBuffer } from '@/lib/file-signature';
import { rateLimit } from '@/lib/rate-limit';
import { apiError } from '@/lib/tool-routes/responses';
import { z } from 'zod';

const uploadQuerySchema = z.object({
  projectId: z.string().cuid(),
});

function isLikelyTextBuffer(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096));
  if (sample.length === 0) return true;

  for (const byte of sample) {
    if (byte === 0) return false;
  }

  let printableAsciiCount = 0;
  for (const byte of sample) {
    if ((byte >= 9 && byte <= 13) || (byte >= 32 && byte <= 126)) {
      printableAsciiCount++;
    }
  }

  return printableAsciiCount / sample.length >= 0.8;
}

function resolveValidatedMimeType(declaredMimeType: string, detectedMimeType: string | null, buffer: Buffer): string | null {
  const allowedTypes = ALLOWED_MIME_TYPES as readonly string[];

  if (detectedMimeType) {
    if (!allowedTypes.includes(detectedMimeType)) return null;
    return detectedMimeType;
  }

  const isDeclaredTextType = declaredMimeType === 'text/plain' || declaredMimeType === 'text/markdown';
  if (isDeclaredTextType && isLikelyTextBuffer(buffer)) {
    return declaredMimeType;
  }

  return null;
}

export async function POST(request: Request) {
  // Auth
  const session = await auth();
  if (!session?.user?.id) {
    return apiError('UNAUTHORIZED', 'Authentication required', 401);
  }

  const userId = session.user.id;

  // Rate limit
  const limiter = await rateLimit(userId);
  if (!limiter.allowed) {
    return apiError('RATE_LIMIT_EXCEEDED', 'Too many requests', 429);
  }

  // Parse multipart form
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return apiError('VALIDATION_ERROR', 'Expected multipart/form-data request', 400);
  }

  // Validate projectId from form field
  const rawProjectId = formData.get('projectId');
  const parsedQuery = uploadQuerySchema.safeParse({ projectId: rawProjectId });
  if (!parsedQuery.success) {
    return apiError('VALIDATION_ERROR', 'Missing or invalid projectId', 400, parsedQuery.error.flatten());
  }

  const { projectId } = parsedQuery.data;

  // Ownership check
  const project = await db.project.findUnique({ where: { id: projectId } });
  if (!project) {
    return apiError('NOT_FOUND', 'Project not found', 404);
  }

  if (project.userId !== userId) {
    return apiError('FORBIDDEN', 'Access denied', 403);
  }

  // File validation
  const fileEntry = formData.get('file');
  if (!(fileEntry instanceof File)) {
    return apiError('VALIDATION_ERROR', 'No file provided in field "file"', 400);
  }

  if (fileEntry.size > MAX_FILE_SIZE_BYTES) {
    return apiError(
      'VALIDATION_ERROR',
      `File exceeds maximum size of ${MAX_FILE_SIZE_BYTES / 1024 / 1024} MB.`,
      413,
    );
  }

  // Read buffer and extract text
  const arrayBuffer = await fileEntry.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const detectedType = await detectFileTypeFromBuffer(buffer);
  const validatedMimeType = resolveValidatedMimeType(fileEntry.type, detectedType?.mime ?? null, buffer);
  if (!validatedMimeType) {
    return apiError(
      'VALIDATION_ERROR',
      'File type is not supported or does not match file content. Accepted formats: PDF, DOCX, TXT, Markdown.',
      415,
    );
  }

  const parsed = await parseDocument(buffer, validatedMimeType, fileEntry.name);
  if (!parsed.ok) {
    const statusMap = {
      UNSUPPORTED_TYPE: 415,
      FILE_TOO_LARGE: 413,
      PARSE_ERROR: 422,
      EMPTY_CONTENT: 422,
    } as const;

    return apiError('VALIDATION_ERROR', parsed.error.message, statusMap[parsed.error.code]);
  }

  return Response.json({
    ok: true,
    data: {
      text: parsed.data.text,
      fileName: parsed.data.fileName,
      mimeType: parsed.data.mimeType,
      sizeBytes: parsed.data.sizeBytes,
    },
  });
}
