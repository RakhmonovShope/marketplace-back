/*
  Warnings:

  - You are about to drop the column `productId` on the `File` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "File" DROP CONSTRAINT "File_productId_fkey";

-- AlterTable
ALTER TABLE "File" DROP COLUMN "productId";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "images" TEXT[];
