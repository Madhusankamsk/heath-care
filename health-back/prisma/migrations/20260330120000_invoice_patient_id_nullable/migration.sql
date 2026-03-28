-- Corporate subscription invoices may have no patient (bill to account only).
ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_patientId_fkey";

ALTER TABLE "Invoice" ALTER COLUMN "patientId" DROP NOT NULL;

ALTER TABLE "Invoice"
  ADD CONSTRAINT "Invoice_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
