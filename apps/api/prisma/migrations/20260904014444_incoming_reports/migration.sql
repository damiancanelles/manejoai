-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'CONVERTED', 'DISMISSED');

-- CreateTable
CREATE TABLE "IncomingReport" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'telegram',
    "senderName" TEXT,
    "rawText" TEXT,
    "photoUrls" TEXT[],
    "suggestedTitle" TEXT,
    "suggestedDescription" TEXT,
    "suggestedPropertyText" TEXT,
    "matchedPropertyId" TEXT,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "jobId" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),
    "reviewedById" TEXT,

    CONSTRAINT "IncomingReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IncomingReport_jobId_key" ON "IncomingReport"("jobId");

-- AddForeignKey
ALTER TABLE "IncomingReport" ADD CONSTRAINT "IncomingReport_matchedPropertyId_fkey" FOREIGN KEY ("matchedPropertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomingReport" ADD CONSTRAINT "IncomingReport_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomingReport" ADD CONSTRAINT "IncomingReport_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
