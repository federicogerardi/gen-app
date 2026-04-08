import { PrismaPg } from '@prisma/adapter-pg';

type PrismaClientInstance = any;

function createPrismaClient(): PrismaClientInstance {
  // Keep runtime construction dynamic to avoid typecheck failures when Prisma client codegen is unavailable in CI.
  const { PrismaClient } = require('@prisma/client') as {
    PrismaClient: new (args: unknown) => PrismaClientInstance;
  };
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClientInstance };

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
