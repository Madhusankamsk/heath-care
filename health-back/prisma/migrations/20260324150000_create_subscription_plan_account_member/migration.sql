-- SubscriptionPlan / SubscriptionAccount / SubscriptionMember were missing because
-- 20260324005012_db_diagram_v37_apply shipped empty. This migration creates them
-- idempotently so fresh Postgres (e.g. Docker) can apply the later ALTER migrations.

CREATE TABLE IF NOT EXISTS "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "planTypeId" TEXT NOT NULL,
    "price" DECIMAL(65,30) NOT NULL,
    "maxMembers" INTEGER NOT NULL DEFAULT 1,
    "durationDays" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SubscriptionAccount" (
    "id" TEXT NOT NULL,
    "accountName" TEXT,
    "planId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "statusId" TEXT,

    CONSTRAINT "SubscriptionAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SubscriptionMember" (
    "id" TEXT NOT NULL,
    "subscriptionAccountId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionMember_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SubscriptionPlan_planTypeId_fkey') THEN
    ALTER TABLE "SubscriptionPlan" ADD CONSTRAINT "SubscriptionPlan_planTypeId_fkey"
      FOREIGN KEY ("planTypeId") REFERENCES "Lookup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SubscriptionAccount_planId_fkey') THEN
    ALTER TABLE "SubscriptionAccount" ADD CONSTRAINT "SubscriptionAccount_planId_fkey"
      FOREIGN KEY ("planId") REFERENCES "SubscriptionPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SubscriptionAccount_statusId_fkey') THEN
    ALTER TABLE "SubscriptionAccount" ADD CONSTRAINT "SubscriptionAccount_statusId_fkey"
      FOREIGN KEY ("statusId") REFERENCES "Lookup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SubscriptionMember_subscriptionAccountId_fkey') THEN
    ALTER TABLE "SubscriptionMember" ADD CONSTRAINT "SubscriptionMember_subscriptionAccountId_fkey"
      FOREIGN KEY ("subscriptionAccountId") REFERENCES "SubscriptionAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'SubscriptionMember_patientId_fkey') THEN
    ALTER TABLE "SubscriptionMember" ADD CONSTRAINT "SubscriptionMember_patientId_fkey"
      FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionMember_subscriptionAccountId_patientId_key"
  ON "SubscriptionMember"("subscriptionAccountId", "patientId");
