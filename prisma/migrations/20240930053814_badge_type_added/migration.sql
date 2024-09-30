/*
  Warnings:

  - Changed the type of `type` on the `Badge` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "BADGE_TYPE" AS ENUM ('STATIC', 'DYNAMIC');

-- AlterTable
ALTER TABLE "Badge" DROP COLUMN "type",
ADD COLUMN     "type" "BADGE_TYPE" NOT NULL;
