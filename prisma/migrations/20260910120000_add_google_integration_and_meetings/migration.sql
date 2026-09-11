-- CreateEnum
CREATE TYPE "MeetingStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "ProjectStatus" ADD VALUE 'PENDING';

-- DropIndex
DROP INDEX IF EXISTS "issued_credentials_userId_idx";

-- AlterTable
ALTER TABLE "attendances" ADD COLUMN IF NOT EXISTS "sheetsRowIndex" INTEGER,
ADD COLUMN IF NOT EXISTS "sheetsSyncedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "clients" ADD COLUMN IF NOT EXISTS "driveFolderId" TEXT,
ADD COLUMN IF NOT EXISTS "driveFolderUrl" TEXT;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN IF NOT EXISTS "calendarEventId" TEXT,
ADD COLUMN IF NOT EXISTS "driveFolderId" TEXT,
ADD COLUMN IF NOT EXISTS "meetingLink" TEXT;

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN IF NOT EXISTS "driveFileId" TEXT,
ADD COLUMN IF NOT EXISTS "driveFileMimeType" TEXT,
ADD COLUMN IF NOT EXISTS "driveFileName" TEXT,
ADD COLUMN IF NOT EXISTS "driveFileSize" INTEGER;

-- CreateTable
CREATE TABLE IF NOT EXISTS "meetings" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "calendarEventId" TEXT,
    "meetLink" TEXT,
    "status" "MeetingStatus" NOT NULL DEFAULT 'SCHEDULED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meetings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "google_integrations" (
    "id" TEXT NOT NULL DEFAULT 'primary',
    "connectedEmail" TEXT,
    "encryptedRefreshToken" TEXT,
    "accessToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "scopes" TEXT,
    "isConnected" BOOLEAN NOT NULL DEFAULT false,
    "driveRootFolderId" TEXT,
    "sheetsAttendanceSpreadsheetId" TEXT,
    "sheetsAttendanceSheetName" TEXT DEFAULT 'Attendance_Log',
    "calendarId" TEXT DEFAULT 'primary',
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "google_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "meetings_projectId_idx" ON "meetings"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "issued_credentials_userId_key" ON "issued_credentials"("userId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'meetings_projectId_fkey'
    ) THEN
        ALTER TABLE "meetings" ADD CONSTRAINT "meetings_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
