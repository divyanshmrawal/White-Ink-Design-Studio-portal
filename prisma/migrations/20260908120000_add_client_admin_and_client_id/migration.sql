-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'CLIENT_ADMIN';

-- AlterTable
ALTER TABLE "users" ADD COLUMN "clientId" TEXT;

-- CreateIndex
CREATE INDEX "users_clientId_idx" ON "users"("clientId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill clientId
UPDATE "users" u
SET "clientId" = c.id
FROM "clients" c
WHERE LOWER(u.email) = LOWER(c.email);
