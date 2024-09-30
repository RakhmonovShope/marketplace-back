/*
  Warnings:

  - You are about to drop the column `status` on the `Badge` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Badge" DROP COLUMN "status",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT false;
