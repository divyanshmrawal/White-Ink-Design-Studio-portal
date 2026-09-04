-- AlterEnum
ALTER TYPE "TaskStatus" ADD VALUE 'REVISION_REQUESTED';

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "revisionRequest" TEXT;
