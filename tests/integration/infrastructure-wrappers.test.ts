/** @jest-environment node */

describe('infrastructure wrappers', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    delete (globalThis as { prisma?: unknown }).prisma;
  });

  it('builds request-scoped child logger with redaction defaults', () => {
    const child = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    const baseLogger = {
      child: jest.fn(() => child),
    };

    const pinoFactory = jest.fn(() => baseLogger);

    jest.doMock('pino', () => ({
      __esModule: true,
      default: pinoFactory,
    }));

    jest.doMock('@/lib/env', () => ({
      env: {
        NODE_ENV: 'test',
        LOG_LEVEL: 'info',
      },
    }));

    let getRequestLogger!: (context: { requestId: string; route: string; method?: string; userId?: string }) => unknown;
    let logger!: unknown;

    jest.isolateModules(() => {
      const loggerModule = jest.requireActual('@/lib/logger') as {
        getRequestLogger: typeof getRequestLogger;
        logger: unknown;
      };
      getRequestLogger = loggerModule.getRequestLogger;
      logger = loggerModule.logger;
    });

    const scoped = getRequestLogger({
      requestId: 'req_1',
      route: '/api/test',
      method: 'POST',
      userId: 'user_1',
    });

    expect(pinoFactory).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        redact: expect.objectContaining({
          paths: expect.arrayContaining(['authorization', 'token']),
          censor: '[REDACTED]',
        }),
        base: expect.objectContaining({
          service: 'gen-app',
          env: 'test',
        }),
      }),
    );
    expect((logger as { child: unknown }).child).toBeDefined();
    expect(baseLogger.child).toHaveBeenCalledWith(expect.objectContaining({ requestId: 'req_1', route: '/api/test' }));
    expect(scoped).toBe(child);
  });

  it('reuses prisma singleton in non-production runtime', () => {
    const prismaInstance = {
      user: {},
      project: {},
      artifact: {},
      quotaHistory: {},
    };

    const PrismaClient = jest.fn(() => prismaInstance);
    const PrismaPg = jest.fn(() => ({ adapter: 'pg' }));

    jest.doMock('@/generated/prisma', () => ({ PrismaClient }));
    jest.doMock('@prisma/adapter-pg', () => ({ PrismaPg }));
    jest.doMock('@/lib/env', () => ({
      env: {
        DATABASE_URL: 'postgresql://localhost:5432/test',
        NODE_ENV: 'test',
      },
    }));

    let dbA: unknown;
    let dbB: unknown;

    jest.isolateModules(() => {
      dbA = (jest.requireActual('@/lib/db') as { db: unknown }).db;
      dbB = (jest.requireActual('@/lib/db') as { db: unknown }).db;
    });

    expect(PrismaPg).toHaveBeenCalledWith({ connectionString: 'postgresql://localhost:5432/test' });
    expect(PrismaClient).toHaveBeenCalledTimes(1);
    expect(dbA).toBe(prismaInstance);
    expect(dbB).toBe(prismaInstance);
    expect((globalThis as { prisma?: unknown }).prisma).toBe(prismaInstance);
  });
});
