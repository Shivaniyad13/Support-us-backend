CREATE TYPE "BeneficiaryType" AS ENUM ('PERSON', 'ORGANIZATION', 'PROGRAM');
CREATE TYPE "DonationStatus" AS ENUM ('PENDING', 'SUCCESSFUL', 'FAILED');

CREATE TABLE "Beneficiary" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "BeneficiaryType" NOT NULL,
    "description" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Beneficiary_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Donation" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "beneficiaryId" TEXT,
    "beneficiaryName" TEXT NOT NULL,
    "beneficiaryType" "BeneficiaryType" NOT NULL,
    "donorName" TEXT,
    "donorEmail" TEXT NOT NULL,
    "donorPhone" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "DonationStatus" NOT NULL DEFAULT 'PENDING',
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Beneficiary_slug_key" ON "Beneficiary"("slug");
CREATE INDEX "Beneficiary_isActive_sortOrder_idx" ON "Beneficiary"("isActive", "sortOrder");
CREATE UNIQUE INDEX "Donation_orderId_key" ON "Donation"("orderId");
CREATE INDEX "Donation_status_createdAt_idx" ON "Donation"("status", "createdAt");
CREATE INDEX "Donation_beneficiaryId_createdAt_idx" ON "Donation"("beneficiaryId", "createdAt");
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_beneficiaryId_fkey"
FOREIGN KEY ("beneficiaryId") REFERENCES "Beneficiary"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
