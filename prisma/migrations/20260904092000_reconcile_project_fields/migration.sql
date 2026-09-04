-- Reconcile project fields added after the original database migration.
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "leadOwnerId" TEXT;
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "preferredMeetingTime" TIMESTAMP(3);
