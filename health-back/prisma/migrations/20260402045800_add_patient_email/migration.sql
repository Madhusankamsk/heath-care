-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "email" TEXT;

-- RenameIndex
ALTER INDEX "PaymentCollectorSettlement_collectorId_settledDate_paymentMetho" RENAME TO "PaymentCollectorSettlement_collectorId_settledDate_paymentM_key";
