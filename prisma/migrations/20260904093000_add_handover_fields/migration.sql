-- Add handover fields to projects table
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "handoverNote" TEXT;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "driveUrl" TEXT;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "handoverDocs" TEXT;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "handoverCompletedAt" TIMESTAMP(3);
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "estimatedBudget" DOUBLE PRECISION;
