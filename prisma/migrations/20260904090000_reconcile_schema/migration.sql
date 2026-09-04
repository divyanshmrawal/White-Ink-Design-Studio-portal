-- Reconcile databases created before the current Prisma schema.
ALTER TYPE "TaskStatus" ADD VALUE IF NOT EXISTS 'REVISION_REQUESTED';

ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "revisionRequest" TEXT;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "estimatedBudget" DOUBLE PRECISION;
