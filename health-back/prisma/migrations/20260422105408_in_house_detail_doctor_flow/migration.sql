/*
  Warnings:

  - You are about to drop the column `admittedAt` on the `VisitRecord` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "InHouseStatus" AS ENUM ('PENDING', 'ADMITTED', 'DISCHARGED');

-- AlterTable
ALTER TABLE "VisitRecord" DROP COLUMN "admittedAt";

-- CreateTable
CREATE TABLE "InHouseDetail" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "assignedDoctorId" TEXT,
    "status" "InHouseStatus" NOT NULL DEFAULT 'PENDING',
    "admittedAt" TIMESTAMP(3),
    "dischargedAt" TIMESTAMP(3),
    "admissionReason" TEXT,
    "roomNo" TEXT,
    "bedNo" TEXT,
    "vitalsSummary" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InHouseDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InHouseEligibleDoctor" (
    "userId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InHouseEligibleDoctor_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE UNIQUE INDEX "InHouseDetail_bookingId_key" ON "InHouseDetail"("bookingId");

-- CreateIndex
CREATE INDEX "InHouseDetail_status_idx" ON "InHouseDetail"("status");

-- CreateIndex
CREATE INDEX "InHouseDetail_assignedDoctorId_idx" ON "InHouseDetail"("assignedDoctorId");

-- AddForeignKey
ALTER TABLE "InHouseDetail" ADD CONSTRAINT "InHouseDetail_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InHouseDetail" ADD CONSTRAINT "InHouseDetail_assignedDoctorId_fkey" FOREIGN KEY ("assignedDoctorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InHouseEligibleDoctor" ADD CONSTRAINT "InHouseEligibleDoctor_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
