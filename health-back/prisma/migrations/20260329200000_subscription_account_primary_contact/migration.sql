-- Primary contact patient for subscription account (billing / invoice anchor).
ALTER TABLE "SubscriptionAccount" ADD COLUMN IF NOT EXISTS "primaryContactId" TEXT;

-- Allow accounts created before a primary member is chosen (family/corporate).
ALTER TABLE "SubscriptionAccount" ALTER COLUMN "primaryContactId" DROP NOT NULL;

CREATE INDEX IF NOT EXISTS "SubscriptionAccount_primaryContactId_idx" ON "SubscriptionAccount"("primaryContactId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'SubscriptionAccount_primaryContactId_fkey'
  ) THEN
    ALTER TABLE "SubscriptionAccount"
      ADD CONSTRAINT "SubscriptionAccount_primaryContactId_fkey"
      FOREIGN KEY ("primaryContactId") REFERENCES "Patient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
