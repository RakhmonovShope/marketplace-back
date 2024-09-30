/*
  Warnings:

  - You are about to drop the column `text_color` on the `Badge` table. All the data in the column will be lost.
  - Added the required column `textColor` to the `Badge` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Badge" DROP COLUMN "text_color",
ADD COLUMN     "textColor" TEXT NOT NULL;
