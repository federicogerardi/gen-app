import { createDbMock } from './db-mock';
/** @jest-environment node */

import { GET, POST } from '@/app/api/projects/route';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));

jest.mock('@/lib/db', () => ({
  db: {
    project: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

const mockedAuth = auth as jest.MockedFunction<typeof auth>;
const findMany = db.project.findMany as jest.Mock;
const createProject = db.project.create as jest.Mock;

const makePostRequest = (body: unknown) =>
  new Request('http://localhost/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

beforeEach(() => {
  jest.clearAllMocks();
  findMany.mockResolvedValue([]);
  createProject.mockResolvedValue({ id: 'proj_1', name: 'My Project', description: null });
});

describe('GET /api/projects', () => {
  it('returns 401 when unauthenticated', async () => {
    mockedAuth.mockResolvedValue(null as never);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('returns empty project list for authenticated user with no projects', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.projects).toEqual([]);
  });

  it('returns owned projects', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    const projects = [
      { id: 'proj_1', name: 'Project Alpha', _count: { artifacts: 3 } },
      { id: 'proj_2', name: 'Project Beta', _count: { artifacts: 0 } },
    ];
    findMany.mockResolvedValue(projects);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.projects).toHaveLength(2);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user_1' } }),
    );
  });
});

describe('POST /api/projects', () => {
  it('returns 401 when unauthenticated', async () => {
    mockedAuth.mockResolvedValue(null as never);

    const res = await POST(makePostRequest({ name: 'Test' }));
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 400 for missing project name', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);

    const res = await POST(makePostRequest({}));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for name exceeding max length', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);

    const res = await POST(makePostRequest({ name: 'x'.repeat(101) }));
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 for malformed JSON', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);

    const res = await POST(
      new Request('http://localhost/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not json',
      }),
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('creates project and returns 201', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    createProject.mockResolvedValue({ id: 'proj_new', name: 'My Project', description: 'desc' });

    const res = await POST(makePostRequest({ name: 'My Project', description: 'desc' }));
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.project.name).toBe('My Project');
    expect(createProject).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user_1', name: 'My Project' }),
      }),
    );
  });
});
