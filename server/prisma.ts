import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | null | undefined;
}

export const isPrismaConfigured = Boolean(
  process.env.DATABASE_URL && process.env.DATABASE_URL.trim() !== ''
);

// Instantiate with log: [] so unconfigured/unreachable database errors are handled programmatically rather than dumped to stderr
export const prisma: PrismaClient | null = isPrismaConfigured
  ? (global.__prisma ||
      new PrismaClient({
        log: [],
      }))
  : null;

if (process.env.NODE_ENV !== 'production' && prisma) {
  global.__prisma = prisma;
}

export default prisma;


