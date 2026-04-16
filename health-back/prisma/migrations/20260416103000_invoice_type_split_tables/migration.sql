-- CreateEnum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InvoiceType') THEN
    CREATE TYPE "InvoiceType" AS ENUM ('MEMBERSHIP', 'VISIT');
  END IF;
END $$;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "invoiceType" "InvoiceType";

UPDATE "Invoice"
SET "invoiceType" = CASE
  WHEN "subscriptionAccountId" IS NOT NULL THEN 'MEMBERSHIP'::"InvoiceType"
  ELSE 'VISIT'::"InvoiceType"
END
WHERE "invoiceType" IS NULL;

ALTER TABLE "Invoice" ALTER COLUMN "invoiceType" SET DEFAULT 'VISIT';
ALTER TABLE "Invoice" ALTER COLUMN "invoiceType" SET NOT NULL;

-- CreateTable
CREATE TABLE IF NOT EXISTS "MembershipInvoice" (
  "invoiceId" TEXT NOT NULL,
  "subscriptionAccountId" TEXT NOT NULL,
  "patientId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MembershipInvoice_pkey" PRIMARY KEY ("invoiceId")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "VisitInvoice" (
  "invoiceId" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "patientId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "VisitInvoice_pkey" PRIMARY KEY ("invoiceId")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MembershipInvoice_subscriptionAccountId_idx" ON "MembershipInvoice"("subscriptionAccountId");
CREATE INDEX IF NOT EXISTS "MembershipInvoice_patientId_idx" ON "MembershipInvoice"("patientId");
CREATE UNIQUE INDEX IF NOT EXISTS "VisitInvoice_bookingId_key" ON "VisitInvoice"("bookingId");
CREATE INDEX IF NOT EXISTS "VisitInvoice_patientId_idx" ON "VisitInvoice"("patientId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MembershipInvoice_invoiceId_fkey') THEN
    ALTER TABLE "MembershipInvoice"
      ADD CONSTRAINT "MembershipInvoice_invoiceId_fkey"
      FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MembershipInvoice_subscriptionAccountId_fkey') THEN
    ALTER TABLE "MembershipInvoice"
      ADD CONSTRAINT "MembershipInvoice_subscriptionAccountId_fkey"
      FOREIGN KEY ("subscriptionAccountId") REFERENCES "SubscriptionAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MembershipInvoice_patientId_fkey') THEN
    ALTER TABLE "MembershipInvoice"
      ADD CONSTRAINT "MembershipInvoice_patientId_fkey"
      FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VisitInvoice_invoiceId_fkey') THEN
    ALTER TABLE "VisitInvoice"
      ADD CONSTRAINT "VisitInvoice_invoiceId_fkey"
      FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VisitInvoice_bookingId_fkey') THEN
    ALTER TABLE "VisitInvoice"
      ADD CONSTRAINT "VisitInvoice_bookingId_fkey"
      FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VisitInvoice_patientId_fkey') THEN
    ALTER TABLE "VisitInvoice"
      ADD CONSTRAINT "VisitInvoice_patientId_fkey"
      FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Backfill split tables from existing Invoice rows
INSERT INTO "MembershipInvoice" ("invoiceId", "subscriptionAccountId", "patientId", "createdAt")
SELECT i."id", i."subscriptionAccountId", i."patientId", i."createdAt"
FROM "Invoice" i
WHERE i."subscriptionAccountId" IS NOT NULL
ON CONFLICT ("invoiceId") DO NOTHING;

INSERT INTO "VisitInvoice" ("invoiceId", "bookingId", "patientId", "createdAt")
SELECT i."id", i."bookingId", i."patientId", i."createdAt"
FROM "Invoice" i
WHERE i."bookingId" IS NOT NULL
  AND i."subscriptionAccountId" IS NULL
ON CONFLICT ("invoiceId") DO NOTHING;
