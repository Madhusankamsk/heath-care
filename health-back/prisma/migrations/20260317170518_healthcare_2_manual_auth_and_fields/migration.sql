/*
  Warnings:

  - You are about to drop the column `profileId` on the `TeamMember` table. All the data in the column will be lost.
  - You are about to drop the `Profile` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[teamId,userId]` on the table `TeamMember` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `TeamMember` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "DispensedMedicine" DROP CONSTRAINT "DispensedMedicine_dispensedById_fkey";

-- DropForeignKey
ALTER TABLE "Profile" DROP CONSTRAINT "Profile_roleId_fkey";

-- DropForeignKey
ALTER TABLE "StockTransfer" DROP CONSTRAINT "StockTransfer_transferredById_fkey";

-- DropForeignKey
ALTER TABLE "TeamMember" DROP CONSTRAINT "TeamMember_profileId_fkey";

-- DropIndex
DROP INDEX "TeamMember_teamId_profileId_key";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "locationGps" TEXT;

-- AlterTable
ALTER TABLE "InventoryBatch" ALTER COLUMN "locationId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Medicine" ADD COLUMN     "genericName" TEXT,
ADD COLUMN     "minStockLevel" INTEGER;

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "address" TEXT,
ADD COLUMN     "gender" TEXT;

-- AlterTable
ALTER TABLE "StockTransfer" ALTER COLUMN "status" SET DEFAULT 'Pending';

-- AlterTable
ALTER TABLE "TeamMember" DROP COLUMN "profileId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "VisitRecord" ADD COLUMN     "clinicalNotes" TEXT,
ADD COLUMN     "completedAt" TIMESTAMP(3);

-- DropTable
DROP TABLE "Profile";

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "baseConsultationFee" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "roleId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamId_userId_key" ON "TeamMember"("teamId", "userId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_transferredById_fkey" FOREIGN KEY ("transferredById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DispensedMedicine" ADD CONSTRAINT "DispensedMedicine_dispensedById_fkey" FOREIGN KEY ("dispensedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
