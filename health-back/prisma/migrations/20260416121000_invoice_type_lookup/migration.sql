-- Ensure INVOICE_TYPE lookup category and values exist
INSERT INTO "LookupCategory" ("id", "categoryName")
SELECT gen_random_uuid()::text, 'INVOICE_TYPE'
WHERE NOT EXISTS (
  SELECT 1 FROM "LookupCategory" WHERE "categoryName" = 'INVOICE_TYPE'
);

WITH invoice_type_category AS (
  SELECT "id" FROM "LookupCategory" WHERE "categoryName" = 'INVOICE_TYPE' LIMIT 1
)
INSERT INTO "Lookup" ("id", "categoryId", "lookupKey", "lookupValue", "isActive")
SELECT gen_random_uuid()::text, c."id", v.lookup_key, v.lookup_value, true
FROM invoice_type_category c
CROSS JOIN (VALUES
  ('MEMBERSHIP', 'Membership'),
  ('VISIT', 'Visit')
) AS v(lookup_key, lookup_value)
WHERE NOT EXISTS (
  SELECT 1
  FROM "Lookup" l
  WHERE l."categoryId" = c."id"
    AND l."lookupKey" = v.lookup_key
);

-- Add lookup-backed invoice type column
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "invoiceTypeId" TEXT;

-- Backfill from enum column if present, else infer from existing FK shape
DO $$
DECLARE
  category_id TEXT;
  membership_id TEXT;
  visit_id TEXT;
  has_enum_column BOOLEAN;
BEGIN
  SELECT "id" INTO category_id FROM "LookupCategory" WHERE "categoryName" = 'INVOICE_TYPE' LIMIT 1;
  SELECT "id" INTO membership_id FROM "Lookup" WHERE "categoryId" = category_id AND "lookupKey" = 'MEMBERSHIP' LIMIT 1;
  SELECT "id" INTO visit_id FROM "Lookup" WHERE "categoryId" = category_id AND "lookupKey" = 'VISIT' LIMIT 1;

  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Invoice'
      AND column_name = 'invoiceType'
  ) INTO has_enum_column;

  IF has_enum_column THEN
    EXECUTE format(
      'UPDATE "Invoice" SET "invoiceTypeId" = CASE WHEN "invoiceType"::text = %L THEN %L ELSE %L END WHERE "invoiceTypeId" IS NULL',
      'MEMBERSHIP', membership_id, visit_id
    );
  ELSE
    UPDATE "Invoice"
    SET "invoiceTypeId" = CASE
      WHEN "subscriptionAccountId" IS NOT NULL THEN membership_id
      ELSE visit_id
    END
    WHERE "invoiceTypeId" IS NULL;
  END IF;
END $$;

ALTER TABLE "Invoice" ALTER COLUMN "invoiceTypeId" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "Invoice_invoiceTypeId_idx" ON "Invoice"("invoiceTypeId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Invoice_invoiceTypeId_fkey') THEN
    ALTER TABLE "Invoice"
      ADD CONSTRAINT "Invoice_invoiceTypeId_fkey"
      FOREIGN KEY ("invoiceTypeId") REFERENCES "Lookup"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

-- Remove enum-backed column when present
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'Invoice'
      AND column_name = 'invoiceType'
  ) THEN
    ALTER TABLE "Invoice" DROP COLUMN "invoiceType";
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InvoiceType') THEN
    DROP TYPE "InvoiceType";
  END IF;
END $$;
