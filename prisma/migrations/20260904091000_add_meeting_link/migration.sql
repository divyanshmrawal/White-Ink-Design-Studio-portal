-- Add the configurable meeting link used by client-facing settings.
ALTER TABLE "system_settings" ADD COLUMN IF NOT EXISTS "meetingLink" TEXT;
