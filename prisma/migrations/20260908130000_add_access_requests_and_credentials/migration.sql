-- CreateEnum
CREATE TYPE "AccessRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "access_requests" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "requestedRole" "Role" NOT NULL,
    "companyName" TEXT,
    "status" "AccessRequestStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" TEXT,
    "reviewedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "access_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issued_credentials" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "plaintextPassword" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issued_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "access_requests_status_idx" ON "access_requests"("status");

-- CreateIndex
CREATE INDEX "access_requests_email_idx" ON "access_requests"("email");

-- CreateIndex
CREATE INDEX "issued_credentials_userId_idx" ON "issued_credentials"("userId");

-- CreateIndex
CREATE INDEX "issued_credentials_createdById_idx" ON "issued_credentials"("createdById");

-- CreateIndex
CREATE INDEX "issued_credentials_email_idx" ON "issued_credentials"("email");

-- AddForeignKey
ALTER TABLE "access_requests" ADD CONSTRAINT "access_requests_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issued_credentials" ADD CONSTRAINT "issued_credentials_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issued_credentials" ADD CONSTRAINT "issued_credentials_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
