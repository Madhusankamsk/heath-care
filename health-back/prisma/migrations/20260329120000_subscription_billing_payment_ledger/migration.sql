-- AlterTable
ALTER TABLE "Patient" ADD COLUMN IF NOT EXISTS "outstandingBalance" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "SubscriptionAccount" ADD COLUMN IF NOT EXISTS "outstandingBalance" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "SubscriptionAccount" ADD COLUMN IF NOT EXISTS "creditLimit" DECIMAL(65,30) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "subscriptionAccountId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "paidAmount" DECIMAL(65,30) NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "balanceDue" DECIMAL(65,30);

UPDATE "Invoice" SET "balanceDue" = "totalAmount" - COALESCE("paidAmount", 0) WHERE "balanceDue" IS NULL;

ALTER TABLE "Invoice" ALTER COLUMN "balanceDue" SET NOT NULL;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Invoice_subscriptionAccountId_idx" ON "Invoice"("subscriptionAccountId");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Invoice_subscriptionAccountId_fkey'
  ) THEN
    ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_subscriptionAccountId_fkey"
      FOREIGN KEY ("subscriptionAccountId") REFERENCES "SubscriptionAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "Payment" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "amountPaid" DECIMAL(65,30) NOT NULL,
    "paymentMethodId" TEXT NOT NULL,
    "transactionRef" TEXT,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "collectedById" TEXT NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Payment_invoiceId_idx" ON "Payment"("invoiceId");

ALTER TABLE "Payment" ADD CONSTRAINT "Payment_invoiceId_fkey"
  FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_paymentMethodId_fkey"
  FOREIGN KEY ("paymentMethodId") REFERENCES "Lookup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_collectedById_fkey"
  FOREIGN KEY ("collectedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE IF NOT EXISTS "AccountTransaction" (
    "id" TEXT NOT NULL,
    "patientId" TEXT,
    "subscriptionAccountId" TEXT,
    "transactionTypeId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountTransaction_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AccountTransaction_subscriptionAccountId_idx" ON "AccountTransaction"("subscriptionAccountId");
CREATE INDEX IF NOT EXISTS "AccountTransaction_patientId_idx" ON "AccountTransaction"("patientId");

ALTER TABLE "AccountTransaction" ADD CONSTRAINT "AccountTransaction_patientId_fkey"
  FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AccountTransaction" ADD CONSTRAINT "AccountTransaction_subscriptionAccountId_fkey"
  FOREIGN KEY ("subscriptionAccountId") REFERENCES "SubscriptionAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AccountTransaction" ADD CONSTRAINT "AccountTransaction_transactionTypeId_fkey"
  FOREIGN KEY ("transactionTypeId") REFERENCES "Lookup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
