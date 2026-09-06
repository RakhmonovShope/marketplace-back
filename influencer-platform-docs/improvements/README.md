# Influencer Platform — MVP'dan keyingi audit, optimizatsiya va g'oyalar

> Sana: 2026-09-06. To'rtta repo to'liq o'qib chiqildi: `influencer-backend` (52 qadam),
> `influencer-web` (28), `influencer-admin` (28), `influencer-miniapp` (24) — barchasi MVP holatida.
> Bu papka MVP'ni **production-sifat + o'sish** darajasiga olib chiqish uchun kichik hujjatlar to'plami.

Master nusxa: `marketplace-backend/influencer-platform-docs/improvements/`.
Har bir repo'da nusxasi: `docs/improvements/` (ROADMAP kabi sinxronlanadi).

## Hujjatlar

| # | Fayl | Mavzu | Repo | Ustuvorlik |
|---|------|-------|------|-----------|
| 00 | [00-AUDIT-SUMMARY.md](./00-AUDIT-SUMMARY.md) | Holat, kuchli tomonlar, top topilmalar | hammasi | Avval o'qing |
| 01 | [01-BACKEND-SECURITY.md](./01-BACKEND-SECURITY.md) | `trust proxy`, `requestContact` imzosi, log redaction, Swagger prod, `xlsx`/`multer`, OptionalAuthGuard, Prisma xato mapping | backend | **P0** |
| 02 | [02-BACKEND-PERFORMANCE.md](./02-BACKEND-PERFORMANCE.md) | JWT user cache, search/count cache, `recountViews`, aggregate invalidatsiya, import/sync batching, static cache, worker ajratish | backend | P1 |
| 03 | [03-DATA-QUALITY-ANALYTICS.md](./03-DATA-QUALITY-ANALYTICS.md) | `influencerCount` bugi, import slug-merge xavfi, ma'lumot olish strategiyasi, auditoriya sifati, benchmark'lar | backend + admin | P1 |
| 04 | [04-WEB.md](./04-WEB.md) | `next/image` ochiq proxy, anonim kesh + SEO canonical, sessiya nozikliklari, analytics, PWA | web | P1 |
| 05 | [05-ADMIN.md](./05-ADMIN.md) | Lazy route'lar, bulk endpoint'lar, ma'lumot sifati paneli, eksport, audit log | admin | P1 |
| 06 | [06-MINIAPP.md](./06-MINIAPP.md) | Ikki marta qidiruv, rasm fallback, CloudStorage, deep link'lar, share card | miniapp | P2 |
| 07 | [07-DEVOPS-OBSERVABILITY.md](./07-DEVOPS-OBSERVABILITY.md) | Sentry (hozir ishlamaydi), metrikalar, health live/ready, CI (SHA tag, audit, OpenAPI drift), backup, nginx | hammasi | **P0/P1** |
| 08 | [08-TESTING.md](./08-TESTING.md) | Backend e2e oqimlari, kontrakt testlari, frontend vitest/playwright | hammasi | P1 |
| 09 | [09-FEATURE-IDEAS.md](./09-FEATURE-IDEAS.md) | Mahsulot backlog'i: creator claim/connect, brief/lead, ro'yxatlar, media kit, alertlar, benchmark, SEO sahifalar, team akkauntlar, to'lov | hammasi | P2/P3 |
| — | [ROADMAP-V2.md](./ROADMAP-V2.md) | **Ketma-ket qadamlar** (B2-/W2-/A2-/M2-xx) — Maqsad / Fayllar / Bajarish / DoD / Tekshirish | hammasi | Ish rejasi |

Ustuvorlik: **P0** — real trafikdan oldin (1 hafta). **P1** — birinchi 1–2 oy. **P2** — o'sish bosqichi. **P3** — backlog.

## AI agent bilan ishlash

1. Repo'ni oching; `docs/improvements/00-AUDIT-SUMMARY.md` → kerakli mavzu hujjati.
2. `docs/improvements/ROADMAP-V2.md` dan qadam bering: *"ROADMAP-V2 dagi B2-03 ni bajar"*. Bir vaqtda 1–2 qadam.
3. Qadam tugagach `- [ ]` → `- [x]`; hujjatdagi bandga "✅ (sana)" yoziladi; har qadam alohida commit.
4. Har qadam oxirida repo'ning odatiy tekshiruvi: backend `pnpm lint && pnpm build && pnpm test`;
   web `pnpm lint && pnpm typecheck && pnpm build`; admin/miniapp `pnpm typecheck && pnpm lint && pnpm build`.
5. Mavjud ADR'lar (`00-CONTEXT-AND-DECISIONS.md`) kuchda. Bu hujjatlar ularni **buzmaydi**; yangi qaror
   kerak bo'lsa ADR-016+ sifatida `00-CONTEXT` ga qo'shiladi (taklif qilinganlari `09-FEATURE-IDEAS` oxirida).

## Sinxronizatsiya

Master → repolar: `for r in backend web admin miniapp; do cp -r improvements ~/Documents/influencer/influencer-$r/docs/; done`
(repo ichida bajarilgan belgilar master'ga qaytariladi — ROADMAP bilan bir xil tartib).
