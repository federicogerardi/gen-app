/** @jest-environment node */

import { GET } from '@/app/api/artifacts/route';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));

jest.mock('@/lib/db', () => jest.requireActual('./db-mock').createDbMock());

const mockedAuth = auth as jest.MockedFunction<typeof auth>;
const findMany = db.artifact.findMany as jest.Mock;
const countArtifacts = db.artifact.count as jest.Mock;
const findProject = db.project.findUnique as jest.Mock;

const makeRequest = (qs: string = '') =>
  new Request(`http://localhost/api/artifacts${qs ? `?${qs}` : ''}`);

beforeEach(() => {
  jest.clearAllMocks();
  findMany.mockResolvedValue([]);
  countArtifacts.mockResolvedValue(0);
  findProject.mockResolvedValue(null);
});

describe('GET /api/artifacts', () => {
  it('returns 401 when unauthenticated', async () => {
    mockedAuth.mockResolvedValue(null as never);

    const res = await GET(makeRequest());
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 for invalid query parameter', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);

    const res = await GET(makeRequest('status=unknown'));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns paginated artifact list for authenticated user', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    const artifacts = [
      { id: 'art_1', type: 'content', status: 'completed', project: { id: 'proj_1', name: 'Test' } },
    ];
    findMany.mockResolvedValue(artifacts);
    countArtifacts.mockResolvedValue(1);

    const res = await GET(makeRequest());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.items).toEqual(artifacts);
    expect(data.total).toBe(1);
  });

  it('returns 404 when filtering by non-existent projectId', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    findProject.mockResolvedValue(null);

    const res = await GET(makeRequest('projectId=cjld2cyuq0000t3rmniod1foy'));
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error.code).toBe('NOT_FOUND');
  });

  it('returns 403 when filtering by project owned by another user', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    findProject.mockResolvedValue({ id: 'cjld2cyuq0000t3rmniod1foy', userId: 'other_user' });

    const res = await GET(makeRequest('projectId=cjld2cyuq0000t3rmniod1foy'));
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.code).toBe('FORBIDDEN');
  });

  it('returns artifacts filtered by owned project', async () => {
    const projectId = 'cjld2cyuq0000t3rmniod1foy';
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    findProject.mockResolvedValue({ id: projectId, userId: 'user_1' });
    findMany.mockResolvedValue([]);
    countArtifacts.mockResolvedValue(0);

    const res = await GET(makeRequest(`projectId=${projectId}`));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.total).toBe(0);
  });
});
