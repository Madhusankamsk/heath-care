-- Replace VisitRecord clinical fields with a single remark field.
ALTER TABLE "VisitRecord"
ADD COLUMN "remark" TEXT;

UPDATE "VisitRecord"
SET "remark" = COALESCE(
  NULLIF(BTRIM("diagnosis"), ''),
  NULLIF(BTRIM("clinicalNotes"), '')
)
WHERE "remark" IS NULL;

ALTER TABLE "VisitRecord"
DROP COLUMN "diagnosis",
DROP COLUMN "vitals",
DROP COLUMN "clinicalNotes";
