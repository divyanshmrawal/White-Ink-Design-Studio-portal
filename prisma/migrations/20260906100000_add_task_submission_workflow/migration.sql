ALTER TABLE "tasks" ADD COLUMN "submissionDescription" TEXT;
ALTER TABLE "tasks" ADD COLUMN "proofDetails" TEXT;
ALTER TABLE "tasks" ADD COLUMN "deliverableUrl" TEXT;
ALTER TABLE "tasks" ADD COLUMN "submittedById" TEXT;
ALTER TABLE "tasks" ADD COLUMN "submittedAt" TIMESTAMP(3);
ALTER TABLE "tasks" ADD COLUMN "clientApprovalStatus" "ApprovalStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "tasks" ADD COLUMN "clientReviewComments" TEXT;
ALTER TABLE "tasks" ADD COLUMN "reviewedById" TEXT;
ALTER TABLE "tasks" ADD COLUMN "reviewedAt" TIMESTAMP(3);