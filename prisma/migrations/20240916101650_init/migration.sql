/*
  Warnings:

  - You are about to drop the column `roleId` on the `Admin` table. All the data in the column will be lost.
  - Added the required column `password` to the `Admin` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Admin" DROP CONSTRAINT "Admin_roleId_fkey";

-- AlterTable
ALTER TABLE "Admin" DROP COLUMN "roleId",
ADD COLUMN     "password" TEXT NOT NULL;
