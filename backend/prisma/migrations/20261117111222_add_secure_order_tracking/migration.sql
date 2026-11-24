/*
  Warnings:

  - A unique constraint covering the columns `[trackingTokenHash]` on the table `Order` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "trackingTokenEncrypted" VARCHAR(255),
ADD COLUMN     "trackingTokenHash" VARCHAR(64);

-- CreateIndex
CREATE UNIQUE INDEX "Order_trackingTokenHash_key" ON "Order"("trackingTokenHash");
