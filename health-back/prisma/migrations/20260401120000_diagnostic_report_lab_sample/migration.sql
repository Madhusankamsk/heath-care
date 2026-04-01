-- VisitRecord clinical attachments (schema existed in Prisma but tables were never migrated)
-- Idempotent: safe if tables/FKs already exist (e.g. drift or partial apply).

CREATE TABLE IF NOT EXISTS "DiagnosticReport" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "visitId" TEXT,
    "reportName" TEXT NOT NULL,
    "reportTypeId" TEXT,
    "fileUrl" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiagnosticReport_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LabSample" (
    "id" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "visitId" TEXT,
    "sampleType" TEXT NOT NULL,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "collectedById" TEXT NOT NULL,
    "statusId" TEXT,
    "labName" TEXT,
    "resultReportUrl" TEXT,
    "resultReceivedAt" TIMESTAMP(3),

    CONSTRAINT "LabSample_pkey" PRIMARY KEY ("id")
);

DO $$ BEGIN
  ALTER TABLE "DiagnosticReport" ADD CONSTRAINT "DiagnosticReport_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "DiagnosticReport" ADD CONSTRAINT "DiagnosticReport_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "VisitRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "DiagnosticReport" ADD CONSTRAINT "DiagnosticReport_reportTypeId_fkey" FOREIGN KEY ("reportTypeId") REFERENCES "Lookup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "DiagnosticReport" ADD CONSTRAINT "DiagnosticReport_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "LabSample" ADD CONSTRAINT "LabSample_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "LabSample" ADD CONSTRAINT "LabSample_visitId_fkey" FOREIGN KEY ("visitId") REFERENCES "VisitRecord"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "LabSample" ADD CONSTRAINT "LabSample_collectedById_fkey" FOREIGN KEY ("collectedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN
  ALTER TABLE "LabSample" ADD CONSTRAINT "LabSample_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "Lookup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
