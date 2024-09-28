/*
  Warnings:

  - A unique constraint covering the columns `[url]` on the table `File` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "File_url_key" ON "File"("url");
