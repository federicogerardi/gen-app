/** @jest-environment node */

import { GET, PUT, DELETE } from '@/app/api/projects/[id]/route';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));

jest.mock('@/lib/db', () => ({
  db: {
    project: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}));

const mockedAuth = auth as jest.MockedFunction<typeof auth>;
const findProject = db.project.findUnique as jest.Mock;
const updateProject = db.project.update as jest.Mock;
const deleteProject = db.project.delete as jest.Mock;

const PROJECT_ID = 'proj_abc123';
const makeParams = (id = PROJECT_ID) => ({ params: Promise.resolve({ id }) });

const mockProject = { id: PROJECT_ID, userId: 'user_1', name: 'Test Project', artifacts: [] };

beforeEach(() => {
  jest.clearAllMocks();
  findProject.mockResolvedValue(mockProject);
  updateProject.mockResolvedValue({ ...mockProject, name: 'Updated' });
  deleteProject.mockResolvedValue({});
});

describe('GET /api/projects/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockedAuth.mockResolvedValue(null as never);

    const res = await GET(new Request('http://localhost'), makeParams());
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  it('returns 404 when project not found', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    findProject.mockResolvedValue(null);

    const res = await GET(new Request('http://localhost'), makeParams());
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error.code).toBe('NOT_FOUND');
  });

  it('returns 403 when project belongs to another user', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    findProject.mockResolvedValue({ ...mockProject, userId: 'other_user' });

    const res = await GET(new Request('http://localhost'), makeParams());
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.code).toBe('FORBIDDEN');
  });

  it('returns project for owner', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);

    const res = await GET(new Request('http://localhost'), makeParams());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.project.id).toBe(PROJECT_ID);
  });
});

describe('PUT /api/projects/[id]', () => {
  const makePutRequest = (body: unknown) =>
    new Request('http://localhost', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

  it('returns 401 when unauthenticated', async () => {
    mockedAuth.mockResolvedValue(null as never);

    const res = await PUT(makePutRequest({ name: 'New Name' }), makeParams());
    expect(res.status).toBe(401);
  });

  it('returns 404 when project not found', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    findProject.mockResolvedValue(null);

    const res = await PUT(makePutRequest({ name: 'New Name' }), makeParams());
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error.code).toBe('NOT_FOUND');
  });

  it('returns 403 when project belongs to another user', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    findProject.mockResolvedValue({ ...mockProject, userId: 'other_user' });

    const res = await PUT(makePutRequest({ name: 'New Name' }), makeParams());
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.code).toBe('FORBIDDEN');
  });

  it('returns 400 for invalid body (name too long)', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);

    const res = await PUT(makePutRequest({ name: 'x'.repeat(101) }), makeParams());
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  it('updates project and returns 200', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);

    const res = await PUT(makePutRequest({ name: 'Updated Name' }), makeParams());
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.project).toBeDefined();
    expect(updateProject).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: PROJECT_ID } }),
    );
  });
});

describe('DELETE /api/projects/[id]', () => {
  it('returns 401 when unauthenticated', async () => {
    mockedAuth.mockResolvedValue(null as never);

    const res = await DELETE(new Request('http://localhost'), makeParams());
    expect(res.status).toBe(401);
  });

  it('returns 404 when project not found', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    findProject.mockResolvedValue(null);

    const res = await DELETE(new Request('http://localhost'), makeParams());
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error.code).toBe('NOT_FOUND');
  });

  it('returns 403 when project belongs to another user', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);
    findProject.mockResolvedValue({ ...mockProject, userId: 'other_user' });

    const res = await DELETE(new Request('http://localhost'), makeParams());
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.code).toBe('FORBIDDEN');
  });

  it('deletes project and returns 204', async () => {
    mockedAuth.mockResolvedValue({ user: { id: 'user_1' } } as never);

    const res = await DELETE(new Request('http://localhost'), makeParams());

    expect(res.status).toBe(204);
    expect(deleteProject).toHaveBeenCalledWith({ where: { id: PROJECT_ID } });
  });
});
