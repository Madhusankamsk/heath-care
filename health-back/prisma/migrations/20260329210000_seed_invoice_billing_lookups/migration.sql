-- Required by subscription billing (createSubscriptionInvoiceWithLedger). Safe to run if seed already inserted these.
DO $$
DECLARE
  cat_id TEXT;
BEGIN
  SELECT "id" INTO cat_id FROM "LookupCategory" WHERE "categoryName" = 'INVOICE_PAYMENT_STATUS' LIMIT 1;
  IF cat_id IS NULL THEN
    cat_id := gen_random_uuid()::text;
    INSERT INTO "LookupCategory" ("id", "categoryName") VALUES (cat_id, 'INVOICE_PAYMENT_STATUS');
  END IF;

  INSERT INTO "Lookup" ("id", "categoryId", "lookupKey", "lookupValue", "isActive")
  SELECT gen_random_uuid()::text, cat_id, v.k, v.v, true
  FROM (VALUES
    ('UNPAID', 'Unpaid'),
    ('PARTIAL', 'Partial'),
    ('PAID', 'Paid')
  ) AS v(k, v)
  ON CONFLICT ("categoryId", "lookupKey") DO UPDATE SET
    "lookupValue" = EXCLUDED."lookupValue",
    "isActive" = true;
END $$;

DO $$
DECLARE
  cat_id TEXT;
BEGIN
  SELECT "id" INTO cat_id FROM "LookupCategory" WHERE "categoryName" = 'ACCOUNT_TRANSACTION_TYPE' LIMIT 1;
  IF cat_id IS NULL THEN
    cat_id := gen_random_uuid()::text;
    INSERT INTO "LookupCategory" ("id", "categoryName") VALUES (cat_id, 'ACCOUNT_TRANSACTION_TYPE');
  END IF;

  INSERT INTO "Lookup" ("id", "categoryId", "lookupKey", "lookupValue", "isActive")
  SELECT gen_random_uuid()::text, cat_id, v.k, v.v, true
  FROM (VALUES
    ('DEBIT', 'Debit'),
    ('CREDIT', 'Credit')
  ) AS v(k, v)
  ON CONFLICT ("categoryId", "lookupKey") DO UPDATE SET
    "lookupValue" = EXCLUDED."lookupValue",
    "isActive" = true;
END $$;

DO $$
DECLARE
  cat_id TEXT;
BEGIN
  SELECT "id" INTO cat_id FROM "LookupCategory" WHERE "categoryName" = 'PAYMENT_METHOD' LIMIT 1;
  IF cat_id IS NULL THEN
    cat_id := gen_random_uuid()::text;
    INSERT INTO "LookupCategory" ("id", "categoryName") VALUES (cat_id, 'PAYMENT_METHOD');
  END IF;

  INSERT INTO "Lookup" ("id", "categoryId", "lookupKey", "lookupValue", "isActive")
  SELECT gen_random_uuid()::text, cat_id, v.k, v.v, true
  FROM (VALUES
    ('CASH', 'Cash'),
    ('CARD', 'Card'),
    ('ONLINE', 'Online'),
    ('BANK_TRANSFER', 'Bank transfer')
  ) AS v(k, v)
  ON CONFLICT ("categoryId", "lookupKey") DO UPDATE SET
    "lookupValue" = EXCLUDED."lookupValue",
    "isActive" = true;
END $$;
