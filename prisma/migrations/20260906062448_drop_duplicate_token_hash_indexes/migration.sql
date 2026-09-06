-- tokenHash @unique allaqachon indeks yaratadi; alohida @@index dublikat edi (docs/02-BUGS B14).
-- DropIndex
DROP INDEX "RefreshToken_tokenHash_idx";
-- DropIndex
DROP INDEX "VerificationToken_tokenHash_idx";
