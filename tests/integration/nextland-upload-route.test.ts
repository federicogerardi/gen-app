/** @jest-environment node */

import { POST } from '@/app/api/tools/nextland/upload/route';
import { auth } from '@/lib/auth';
import { parseDocument } from '@/lib/document-parser';
import { db } from '@/lib/db';
import { rateLimit } from '@/lib/rate-limit';
import { detectFileTypeFromBuffer } from '@/lib/file-signature';

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/rate-limit', () => ({ rateLimit: jest.fn() }));
jest.mock('@/lib/file-signature', () => ({ detectFileTypeFromBuffer: jest.fn() }));
jest.mock('@/lib/document-parser', () => ({
  parseDocument: jest.fn(),
  ALLOWED_MIME_TYPES: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/markdown',
  ],
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024,
}));

jest.mock('@/lib/db', () => jest.requireActual('./db-mock').createDbMock());

const mockedAuth = auth as jest.MockedFunction<typeof auth>;
const mockedRateLimit = rateLimit as jest.MockedFunction<typeof rateLimit>;
const mockedParseDocument = parseDocument as jest.MockedFunction<typeof parseDocument>;
const mockedDetectFileTypeFromBuffer = detectFileTypeFromBuffer as jest.MockedFunction<typeof detectFileTypeFromBuffer>;
const findProject = db.project.findUnique as jest.Mock;

const projectId = 'cjld2cyuq0000t3rmniod1foy';

function makeMultipartRequest(formData: FormData) {
  return new Request('http://localhost/api/tools/nextland/upload', {
    method: 'POST',
    body: formData,
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
  mockedRateLimit.mockResolvedValue({ allowed: true, remaining: 10 });
  findProject.mockResolvedValue({ id: projectId, userId: 'user_1' });
  mockedDetectFileTypeFromBuffer.mockResolvedValue(undefined);
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

describe('POST /api/tools/nextland/upload', () => {
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
    expect(json.ok).toBe(true);
    expect(json.data.fileName).toBe('briefing.txt');
  });
});