-- Role.code: kod ichida ishlatiladigan barqaror identifikator (SUPER_ADMIN, CUSTOMER, ...).
-- Jadvalda yozuvlar bor, shuning uchun avval NULL bilan qo'shib, backfill qilib, keyin NOT NULL qilamiz.

-- AlterTable
ALTER TABLE "Role" ADD COLUMN "code" TEXT,
ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT false;

-- Backfill: seed qilingan super-admin roli
UPDATE "Role" SET "code" = 'SUPER_ADMIN', "isSystem" = true
WHERE "id" = 'bfdc30ce-9442-4729-9f2c-4513d851052c';

-- Backfill: qolgan rollar vaqtinchalik unikal kod oladi (admin panel orqali qayta nomlanadi)
UPDATE "Role" SET "code" = 'ROLE_' || upper(replace("id"::text, '-', '_'))
WHERE "code" IS NULL;

ALTER TABLE "Role" ALTER COLUMN "code" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");
