/*
  Warnings:

  - Added the required column `birthday` to the `Admin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firstName` to the `Admin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gender` to the `Admin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `Admin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `Admin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `roleId` to the `Admin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `subType` to the `Admin` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "GENDER" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "SUB_TYPE" AS ENUM ('ADMIN', 'CUSTOMER');

-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "birthday" TEXT NOT NULL,
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "gender" "GENDER" NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL,
ADD COLUMN     "phone" TEXT NOT NULL,
ADD COLUMN     "roleId" TEXT NOT NULL,
ADD COLUMN     "subType" "SUB_TYPE" NOT NULL;

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "nameUz" TEXT NOT NULL,
    "nameRu" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "permissions" TEXT[],

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
