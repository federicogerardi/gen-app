/** @jest-environment node */

import { POST } from '@/app/api/tools/funnel-pages/upload/route';
import { auth } from '@/lib/auth';
import { parseDocument } from '@/lib/document-parser';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/rate-limit', () => ({ rateLimit: jest.fn() }));
jest.mock('@/lib/document-parser', () => ({
  parseDocument: jest.fn(),
  ALLOWED_MIME_TYPES: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
  ],
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
}));

jest.mock('@/lib/db', () => ({
  db: {
    project: { findUnique: jest.fn() },
  },
}));

const mockedAuth = auth as jest.MockedFunction<typeof auth>;
const mockedRateLimit = rateLimit as jest.MockedFunction<typeof rateLimit>;
const mockedParseDocument = parseDocument as jest.MockedFunction<typeof parseDocument>;
const findProject = db.project.findUnique as jest.Mock;

const projectId = 'cjld2cyuq0000t3rmniod1foy';

function makeMultipartRequest(formData: FormData) {
  return new Request('http://localhost/api/tools/funnel-pages/upload', {
    method: 'POST',
    body: formData,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
  mockedRateLimit.mockResolvedValue({ allowed: true, remaining: 10 });
  findProject.mockResolvedValue({ id: projectId, userId: 'user_1' });
  mockedParseDocument.mockResolvedValue({
    ok: true,
    data: {
      text: 'Briefing estratto',
      mimeType: 'text/plain',
      sizeBytes: 18,
      fileName: 'briefing.txt',
    },
  });
});

describe('POST /api/tools/funnel-pages/upload', () => {
  it('returns 401 when unauthenticated', async () => {
    mockedAuth.mockResolvedValue(null as never);

    const formData = new FormData();
    formData.append('projectId', projectId);
    formData.append('file', new File(['briefing'], 'briefing.txt', { type: 'text/plain' }));

    const response = await POST(makeMultipartRequest(formData));

    expect(response.status).toBe(401);
  });

  it('returns 429 when rate limit is exceeded', async () => {
    mockedRateLimit.mockResolvedValue({ allowed: false, remaining: 0 });

    const formData = new FormData();
    formData.append('projectId', projectId);
    formData.append('file', new File(['briefing'], 'briefing.txt', { type: 'text/plain' }));

    const response = await POST(makeMultipartRequest(formData));

    expect(response.status).toBe(429);
  });

  it('returns 403 when project does not belong to the authenticated user', async () => {
    findProject.mockResolvedValue({ id: projectId, userId: 'other_user' });

    const formData = new FormData();
    formData.append('projectId', projectId);
    formData.append('file', new File(['briefing'], 'briefing.txt', { type: 'text/plain' }));

    const response = await POST(makeMultipartRequest(formData));

    expect(response.status).toBe(403);
  });

  it('returns 400 when file field is missing', async () => {
    const formData = new FormData();
    formData.append('projectId', projectId);

    const response = await POST(makeMultipartRequest(formData));
    const json = (await response.json()) as { error: { code: string } };

    expect(response.status).toBe(400);
    expect(json.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 415 when file mime type is not supported', async () => {
    const formData = new FormData();
    formData.append('projectId', projectId);
    formData.append('file', new File(['binary'], 'briefing.csv', { type: 'text/csv' }));

    const response = await POST(makeMultipartRequest(formData));
    const json = (await response.json()) as { error: { code: string; message: string } };

    expect(response.status).toBe(415);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.message).toContain('not supported');
  });

  it('returns 422 when parser cannot extract text from the uploaded document', async () => {
    mockedParseDocument.mockResolvedValue({
      ok: false,
      error: {
        code: 'EMPTY_CONTENT',
        message: 'The document appears to be empty or unreadable.',
      },
    });

    const formData = new FormData();
    formData.append('projectId', projectId);
    formData.append('file', new File(['briefing content'], 'briefing.txt', { type: 'text/plain' }));

    const response = await POST(makeMultipartRequest(formData));
    const json = (await response.json()) as { error: { code: string; message: string } };

    expect(response.status).toBe(422);
    expect(json.error.code).toBe('VALIDATION_ERROR');
    expect(json.error.message).toBe('The document appears to be empty or unreadable.');
  });

  it('returns parsed document payload for a valid upload', async () => {
    const formData = new FormData();
    formData.append('projectId', projectId);
    formData.append('file', new File(['briefing content'], 'briefing.txt', { type: 'text/plain' }));

    const response = await POST(makeMultipartRequest(formData));
    const json = (await response.json()) as {
      ok: boolean;
      data: { text: string; fileName: string; mimeType: string; sizeBytes: number };
    };

    expect(response.status).toBe(200);
    expect(mockedParseDocument).toHaveBeenCalledWith(expect.any(Buffer), 'text/plain', 'briefing.txt');
    expect(json).toEqual({
      ok: true,
      data: {
        text: 'Briefing estratto',
        fileName: 'briefing.txt',
        mimeType: 'text/plain',
        sizeBytes: 18,
      },
    });
  });
});
