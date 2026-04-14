/**
 * Shared database mock for integration tests.
 * Provides Prisma-like interface with support for:
 * - Basic CRUD operations (findUnique, create, update)
 * - Atomic transactions ($transaction)
 */

type DbCallback = (tx: ReturnType<typeof createDbBase>) => Promise<unknown>;

export function createDbBase() {
  return {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    project: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    quotaHistory: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    artifact: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    llmModel: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
  };
}

export function createDbMock() {
  const baseDb = createDbBase();

  return {
    db: {
      ...baseDb,
      $transaction: jest.fn(async (callback: DbCallback) => callback(baseDb)),
    },
  };
}
