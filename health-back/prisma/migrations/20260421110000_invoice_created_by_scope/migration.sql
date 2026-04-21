-- Add optional creator ownership on invoices for scope-based access.
ALTER TABLE "Invoice"
ADD COLUMN "createdById" TEXT;

CREATE INDEX "Invoice_createdById_idx" ON "Invoice"("createdById");

ALTER TABLE "Invoice"
ADD CONSTRAINT "Invoice_createdById_fkey"
FOREIGN KEY ("createdById") REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
