/*
  Warnings:

  - A unique constraint covering the columns `[phone]` on the table `Admin` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Admin_email_key";

-- CreateIndex
CREATE UNIQUE INDEX "Admin_phone_key" ON "Admin"("phone");
