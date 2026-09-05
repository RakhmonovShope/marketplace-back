# 07 — Fayllar va media (P2, xavfsizlik qismi P0)

> Mavjud pipeline (`src/api/file/`) — kuchli: durable original, Postgres holati, BullMQ, recovery.
> Bu hujjat uni **xavfsiz, masshtablanadigan va tartibli** qilish haqida. Xavfsizlik bandlari `01-SECURITY` S4 da.

---

## 1. Ikki upload yo'li — bittaga keltirish

| Route | Hozir | Qaror |
|---|---|---|
| `POST /v1/files/upload` (sync, diskStorage, jpg/png/svg, 5MB, optimizatsiyasiz) | Kategoriya/brend rasmlari uchun ishlatilgan | **Deprecate**: faqat SVG/PDF kabi "rasm bo'lmagan" fayllar uchun `POST /v1/files/documents` (sanitizatsiya + attachment) |
| `POST /v1/files/image` (async, memoryStorage, sharp, 10MB) | Asosiy | Asosiy bo'lib qoladi; javobga `pollUrl` qo'shish |

`fileFilter` ikkalasida ham **magic-byte** (`file-type` v16 CJS yoki `sharp(buffer).metadata()` — `format` ni beradi).
`saveOriginalBuffer` kengaytmani `originalName` dan oladi — buning o'rniga aniqlangan formatdan (`metadata.format`).

---

## 2. Storage abstraksiyasi

```ts
export interface StorageProvider {
  put(key: string, body: Buffer | Readable, opts: { contentType: string; cacheControl?: string }): Promise<{ url: string }>;
  get(key: string): Promise<Readable>;
  delete(key: string): Promise<void>;
  exists(key: string): Promise<boolean>;
  presignedPut?(key: string, contentType: string, ttlSec: number): Promise<string>;
}
```
Implementatsiyalar: `LocalDiskStorage` (hozirgi `uploads/`), `S3Storage` (`@aws-sdk/client-s3` — allaqachon bor; MinIO bilan mos).
`STORAGE_DRIVER=local|s3`, `S3_ENDPOINT` (MinIO uchun), `S3_PUBLIC_URL` (CDN). `FileService` faqat interfeys bilan ishlaydi.
Audio moduli ham shu provider'ga o'tadi (`multerS3` va import-vaqtidagi `S3Client` yo'qoladi).

Migratsiya: `pnpm files:migrate-to-s3` skripti — `File` jadvali bo'ylab yurib, diskdan S3 ga ko'chiradi, `url` ni yangilaydi (idempotent).

---

## 3. Variantlar va formatlar

Hozir: `optimized` (1600px webp q80) + `thumbnail` (300×300 cover q70).
Kengaytma (`ImageService.process` → `variants[]`):

| Nom | O'lcham | Format | Qayerda |
|---|---|---|---|
| `thumb` | 300×300 cover | webp | ro'yxat, savat |
| `card` | 600w | webp + **avif** | katalog kartasi |
| `large` | 1600w | webp | mahsulot sahifasi |
| `og` | 1200×630 cover | jpeg | OpenGraph (Telegram preview) |

`ImageUpload.variants Json` (`{ thumb: url, card: url, cardAvif: url, ... }`). `sharp` `.avif({ quality: 50, effort: 4 })` — sekinroq (2–3×), worker'da muammo emas.
EXIF: `.rotate()` orientation'ni qo'llaydi va metadata'ni tashlaydi (GPS ketmaydi) — hozir to'g'ri.
Placeholder: `blurhash` yoki 16px base64 (`variants.placeholder`) — frontend LQIP.

---

## 4. Poll o'rniga push

Hozir mijoz `GET /v1/files/images/:id` ni poll qiladi. Variantlar:
- **SSE** `GET /v1/files/images/:id/events` (`@Sse()`), `image.done` event → yopiladi. Oddiy, WS'siz.
- WS (`ChatGateway` bor) — `user:<id>` xonasiga `image.done`.
- Kichik fayllar (< 500KB) uchun **sinxron** yo'l: `?sync=true` → 2 s ichida tayyor bo'lsa 200 + natija, bo'lmasa 202.

---

## 5. Egalik va tozalash

- `ImageUpload.uploadedById`, `File.uploadedById` — kim yuklagan; permission: o'z yuklaganini ko'rish (`FILE__VIEW_OWN`) — mijoz reviews uchun kerak bo'ladi.
- **Orphan cleanup cron** (haftalik): `File` yozuvi hech qaysi `Product.images`, `Category.image`, `Brand.logo/cover`, `Store`, `Banner`, `Badge.icon`, `Comment.images` da ishlatilmasa va 7 kundan eski → `deletedAt`, 30 kundan keyin diskdan/S3 dan o'chirish.
  Buning uchun `FileUsage { fileId, entity, entityId }` jadvali yoki har entity saqlanganda `File.refCount` yangilash — birinchisi aniqroq.
- `FAILED` ImageUpload originallari: 30 kundan keyin o'chirish (hozir abadiy qoladi).
- Original'ni `DONE` dan keyin o'chirish — hozir shunday; qayta ishlash kerak bo'lsa (yangi variant qo'shilganda) original kerak.
  Qaror: **S3 ga o'tgach original saqlanadi** (`originals/` prefiks, Glacier/IA lifecycle), diskda — o'chiriladi.

---

## 6. Katta fayllar va to'g'ridan-to'g'ri yuklash

Video/katta rasm uchun: `presignedPut` → mijoz S3 ga yuklaydi → `POST /v1/files/confirm { key }` → job.
Nest jarayoni orqali 100MB o'tkazish shart emas. Mobil uchun `tus` protokoli — keyin.

---

## 7. Xavfsizlik (qisqa, S4 ga havola)

- Magic-byte, SVG sanitizatsiya/`attachment`, `nosniff`, `CSP sandbox`, alohida domen (`cdn.example.uz`).
- Rasm hajmi/pixel limiti bor (`limitInputPixels`). `sharp` `failOn: 'truncated'` — OK.
- Antivirus (`clamav` container, `clamdjs`) — hujjat (PDF) upload'i paydo bo'lsa.
- Yuklash kvotasi: foydalanuvchi/soat (Redis counter) — spam himoyasi.

---

## 8. Kuzatuv

Metrikalar: `image_jobs_total{status}`, `image_job_duration_seconds`, navbat uzunligi (`queue.getJobCounts()` → gauge), disk bo'sh joyi (`DiskHealthIndicator`, `08-OBSERVABILITY`). Bull Board (`@bull-board/nestjs`) — dev/staging'da `/admin/queues`.

---

## Qarorlar

- Storage: production'da S3-compatible (MinIO self-host yoki bulut); dev'da local.
- Variant nomlari: `thumb/card/large/og` (taklif).
