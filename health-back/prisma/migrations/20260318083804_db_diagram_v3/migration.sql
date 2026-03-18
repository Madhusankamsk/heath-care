-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "statusId" TEXT;

-- AlterTable
ALTER TABLE "InventoryBatch" ADD COLUMN     "locationTypeId" TEXT;

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN     "paymentStatusId" TEXT;

-- AlterTable
ALTER TABLE "Medicine" ADD COLUMN     "uomId" TEXT;

-- AlterTable
ALTER TABLE "OpdQueue" ADD COLUMN     "statusId" TEXT;

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "genderId" TEXT;

-- AlterTable
ALTER TABLE "StockTransfer" ADD COLUMN     "statusId" TEXT;

-- AlterTable
ALTER TABLE "Vehicle" ADD COLUMN     "statusId" TEXT;

-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" TEXT NOT NULL,
    "companyName" TEXT NOT NULL,
    "companyEmail" TEXT,
    "companyPhone" TEXT,
    "companyAddress" TEXT,
    "logoUrl" TEXT,
    "primaryColor" TEXT,
    "secondaryColor" TEXT,
    "currencyCode" TEXT,
    "travelCostPerKm" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "taxPercentage" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "invoicePrefix" TEXT NOT NULL DEFAULT 'INV-',
    "isSetupCompleted" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LookupCategory" (
    "id" TEXT NOT NULL,
    "categoryName" TEXT NOT NULL,

    CONSTRAINT "LookupCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lookup" (
    "id" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "lookupKey" TEXT NOT NULL,
    "lookupValue" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Lookup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LookupCategory_categoryName_key" ON "LookupCategory"("categoryName");

-- CreateIndex
CREATE INDEX "Lookup_categoryId_idx" ON "Lookup"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Lookup_categoryId_lookupKey_key" ON "Lookup"("categoryId", "lookupKey");

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "Lookup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_genderId_fkey" FOREIGN KEY ("genderId") REFERENCES "Lookup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "Lookup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Medicine" ADD CONSTRAINT "Medicine_uomId_fkey" FOREIGN KEY ("uomId") REFERENCES "Lookup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryBatch" ADD CONSTRAINT "InventoryBatch_locationTypeId_fkey" FOREIGN KEY ("locationTypeId") REFERENCES "Lookup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "Lookup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_paymentStatusId_fkey" FOREIGN KEY ("paymentStatusId") REFERENCES "Lookup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpdQueue" ADD CONSTRAINT "OpdQueue_statusId_fkey" FOREIGN KEY ("statusId") REFERENCES "Lookup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lookup" ADD CONSTRAINT "Lookup_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "LookupCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
