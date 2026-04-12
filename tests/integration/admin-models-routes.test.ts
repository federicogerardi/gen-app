/** @jest-environment node */

import { GET, POST } from '@/app/api/admin/models/route';
import { PUT, DELETE } from '@/app/api/admin/models/[modelId]/route';
import { auth } from '@/lib/auth';
import { db } from '@/lib/db';

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }));
jest.mock('@/lib/db', () => jest.requireActual('./db-mock').createDbMock());

const mockedAuth = auth as jest.MockedFunction<typeof auth>;
const findManyModels = db.llmModel.findMany as jest.Mock;
const createModel = db.llmModel.create as jest.Mock;
const updateModel = db.llmModel.update as jest.Mock;
const updateManyModels = db.llmModel.updateMany as jest.Mock;
const findUniqueModel = db.llmModel.findUnique as jest.Mock;
const deleteModel = db.llmModel.delete as jest.Mock;
const dbTransaction = db.$transaction as jest.Mock;

const adminSession = { user: { id: 'admin_1', role: 'admin' } };
const userSession = { user: { id: 'user_1', role: 'user' } };

const makeJsonRequest = (method: string, body?: unknown) =>
  new Request('http://localhost', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

beforeEach(() => {
  jest.clearAllMocks();

  dbTransaction.mockImplementation(async (callback: (tx: typeof db) => Promise<unknown>) => callback(db));
  findManyModels.mockResolvedValue([
    {
      id: 'model_1',
      modelId: 'openai/gpt-4-turbo',
      name: 'GPT-4 Turbo',
      inputCostPer1k: 0.01,
      outputCostPer1k: 0.03,
      isActive: true,
      isDefault: true,
      pricingReviewedAt: new Date('2026-04-11T00:00:00.000Z'),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);
  createModel.mockResolvedValue({ id: 'model_2' });
  findUniqueModel.mockResolvedValue({ id: 'model_2', isDefault: false });
  updateModel.mockResolvedValue({ id: 'model_2', isDefault: true });
  updateManyModels.mockResolvedValue({ count: 1 });
  deleteModel.mockResolvedValue({ id: 'model_2' });
});

describe('Admin model routes', () => {
  it('GET returns 403 for non-admin', async () => {
    mockedAuth.mockResolvedValue(userSession as never);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(403);
    expect(data.error.code).toBe('FORBIDDEN');
  });

  it('GET returns models for admin', async () => {
    mockedAuth.mockResolvedValue(adminSession as never);

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.models).toHaveLength(1);
  });

  it('GET returns actionable error when model table is missing', async () => {
    mockedAuth.mockResolvedValue(adminSession as never);
    findManyModels.mockRejectedValue({ code: 'P2021' });

    const res = await GET();
    const data = await res.json();

    expect(res.status).toBe(500);
    expect(data.error.code).toBe('INTERNAL_ERROR');
    expect(data.error.message).toContain('Run prisma migrate deploy');
  });

  it('POST creates model for admin', async () => {
    mockedAuth.mockResolvedValue(adminSession as never);

    const res = await POST(makeJsonRequest('POST', {
      modelId: 'openai/gpt-4.1',
      name: 'GPT-4.1',
      inputCostPer1k: 0.002,
      outputCostPer1k: 0.006,
      isActive: true,
      isDefault: false,
    }) as never);

    expect(res.status).toBe(201);
    expect(createModel).toHaveBeenCalled();
  });

  it('PUT updates a model', async () => {
    mockedAuth.mockResolvedValue(adminSession as never);

    const res = await PUT(
      makeJsonRequest('PUT', { isDefault: true }),
      { params: Promise.resolve({ modelId: 'model_2' }) },
    );

    expect(res.status).toBe(200);
    expect(updateManyModels).toHaveBeenCalled();
    expect(updateModel).toHaveBeenCalled();
  });

  it('DELETE blocks default model deletion', async () => {
    mockedAuth.mockResolvedValue(adminSession as never);
    findUniqueModel.mockResolvedValue({ id: 'model_1', isDefault: true });

    const res = await DELETE(
      makeJsonRequest('DELETE'),
      { params: Promise.resolve({ modelId: 'model_1' }) },
    );
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });
});
