-- AlterTable (idempotent: columns may already exist from db push or manual DDL)
ALTER TABLE "SubscriptionAccount" ADD COLUMN IF NOT EXISTS "registrationNo" TEXT;
ALTER TABLE "SubscriptionAccount" ADD COLUMN IF NOT EXISTS "billingAddress" TEXT;
ALTER TABLE "SubscriptionAccount" ADD COLUMN IF NOT EXISTS "contactEmail" TEXT;
ALTER TABLE "SubscriptionAccount" ADD COLUMN IF NOT EXISTS "contactPhone" TEXT;
ALTER TABLE "SubscriptionAccount" ADD COLUMN IF NOT EXISTS "whatsappNo" TEXT;

