import { createDbMock } from './db-mock';
/** @jest-environment node */

import { GET, DELETE, PUT } from '@/app/api/artifacts/[id]/route';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));

jest.mock('@/lib/db', () => ({
  db: {
    artifact: {
      findUnique: jest.fn(),
      delete: jest.fn(),
      update: jest.fn(),
    },
  },
}));

const mockedAuth = auth as jest.MockedFunction<typeof auth>;
const findArtifact = db.artifact.findUnique as jest.Mock;
const deleteArtifact = db.artifact.delete as jest.Mock;
const updateArtifact = db.artifact.update as jest.Mock;

const ARTIFACT_ID = 'art_abc123';
const makeParams = (id = ARTIFACT_ID) => ({ params: Promise.resolve({ id }) });

const mockArtifact = {
  id: ARTIFACT_ID,
  userId: 'user_1',
  type: 'content',
  status: 'completed',
  content: 'lorem ipsum',
};

beforeEach(() => {
  jest.clearAllMocks();
  findArtifact.mockResolvedValue(mockArtifact);
  deleteArtifact.mockResolvedValue({});
  updateArtifact.mockResolvedValue({ ...mockArtifact, content: 'updated' });
});

describe('GET /api/artifacts/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockedAuth.mockResolvedValue(null as never);

    const res = await GET(new Request('http://localhost'), makeParams());
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 404 when artifact not found', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    findArtifact.mockResolvedValue(null);

    const res = await GET(new Request('http://localhost'), makeParams());
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error.code).toBe('NOT_FOUND');
  });

  it('returns 403 when artifact belongs to another user', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    findArtifact.mockResolvedValue({ ...mockArtifact, userId: 'other_user' });

    const res = await GET(new Request('http://localhost'), makeParams());
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.code).toBe('FORBIDDEN');
  });

  it('returns artifact for owner', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);

    const res = await GET(new Request('http://localhost'), makeParams());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.artifact.id).toBe(ARTIFACT_ID);
  });
});

describe('DELETE /api/artifacts/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockedAuth.mockResolvedValue(null as never);

    const res = await DELETE(new Request('http://localhost'), makeParams());

    expect(res.status).toBe(401);
  });

  it('returns 404 when artifact not found', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    findArtifact.mockResolvedValue(null);

    const res = await DELETE(new Request('http://localhost'), makeParams());
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error.code).toBe('NOT_FOUND');
  });

  it('returns 403 when artifact belongs to another user', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    findArtifact.mockResolvedValue({ ...mockArtifact, userId: 'other_user' });

    const res = await DELETE(new Request('http://localhost'), makeParams());
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.code).toBe('FORBIDDEN');
  });

  it('returns 204 on successful delete', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);

    const res = await DELETE(new Request('http://localhost'), makeParams());

    expect(res.status).toBe(204);
    expect(deleteArtifact).toHaveBeenCalledWith({ where: { id: ARTIFACT_ID } });
  });
});

describe('PUT /api/artifacts/[id]', () => {
  const makeUpdateRequest = (body: unknown) =>
    new Request('http://localhost', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  it('returns 401 when unauthenticated', async () => {
    mockedAuth.mockResolvedValue(null as never);

    const res = await PUT(makeUpdateRequest({ content: 'new' }), makeParams());

    expect(res.status).toBe(401);
  });

  it('returns 404 when artifact not found', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    findArtifact.mockResolvedValue(null);

    const res = await PUT(makeUpdateRequest({ content: 'new' }), makeParams());
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error.code).toBe('NOT_FOUND');
  });

  it('returns 403 when artifact belongs to another user', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    findArtifact.mockResolvedValue({ ...mockArtifact, userId: 'other_user' });

    const res = await PUT(makeUpdateRequest({ content: 'new' }), makeParams());
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.code).toBe('FORBIDDEN');
  });

  it('returns 400 for invalid body (empty content)', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);

    const res = await PUT(makeUpdateRequest({ content: '' }), makeParams());
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for malformed JSON body', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);

    const res = await PUT(
      new Request('http://localhost', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      }),
      makeParams(),
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  describe('S1-08: state transition guard – non-terminal artifacts', () => {
    it('returns 409 Conflict when artifact is in generating status', async () => {
      mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
      findArtifact.mockResolvedValue({ ...mockArtifact, status: 'generating' });

      const res = await PUT(makeUpdateRequest({ content: 'new content' }), makeParams());
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.error.code).toBe('CONFLICT');
      expect(updateArtifact).not.toHaveBeenCalled();
    });

    it('returns 409 Conflict when artifact is in failed status', async () => {
      mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
      findArtifact.mockResolvedValue({ ...mockArtifact, status: 'failed', failureReason: 'error' });

      const res = await PUT(makeUpdateRequest({ content: 'recovery attempt' }), makeParams());
      const data = await res.json();

      expect(res.status).toBe(409);
      expect(data.error.code).toBe('CONFLICT');
      expect(updateArtifact).not.toHaveBeenCalled();
    });

    it('allows PUT on completed artifact (terminal state)', async () => {
      mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
      findArtifact.mockResolvedValue({ ...mockArtifact, status: 'completed' });

      const res = await PUT(makeUpdateRequest({ content: 'corrected content' }), makeParams());
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(updateArtifact).toHaveBeenCalled();
    });
  });

  it('returns updated artifact on success', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);

    const res = await PUT(makeUpdateRequest({ content: 'updated content' }), makeParams());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.artifact).toBeDefined();
    expect(updateArtifact).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ARTIFACT_ID },
        data: expect.objectContaining({ content: 'updated content' }),
      }),
    );
  });
});
