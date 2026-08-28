# Influencer Discovery & Analytics Platform — Hujjatlar to'plami

Bu papka **4 ta alohida repo** uchun yozilgan AI-agent hujjatlari to'plamidir.
Har bir repo ochilganda mos papkadagi fayllarni o'sha repo ichiga ko'chiring.

## Repolar

| Repo nomi | Stack | Hujjatlar |
|---|---|---|
| `influencer-backend` | NestJS 10 + Prisma 5 + PostgreSQL + Redis | `backend/` + barcha `0X-*.md` |
| `influencer-web` | Next.js 15 (App Router) | `web/` + `01`, `03` |
| `influencer-miniapp` | Vite + React + `@telegram-apps/sdk-react` | `miniapp/` + `01`, `03` |
| `influencer-admin` | Vite + React + Ant Design | `admin/` + `01`, `03` |

> Agar admin panel uchun alohida repo ochmoqchi bo'lmasangiz, `admin/` hujjatlarini
> `influencer-web` repo ichida `apps/admin/` sifatida ishlating — hujjatlar shunga moslashgan.

## Umumiy hujjatlar (hamma repoga tegishli)

| Fayl | Nima uchun |
|---|---|
| `00-CONTEXT-AND-DECISIONS.md` | Loyiha g'oyasi + **qabul qilingan barcha qarorlar jurnali (ADR)**. Yangi AI sessiya birinchi navbatda shuni o'qishi shart. |
| `01-ARCHITECTURE.md` | Tizim arxitekturasi, auth strategiyasi, Swagger bo'linishi, ma'lumot oqimi |
| `02-DATA-MODEL.md` | To'liq Prisma schema + indekslar + hisoblash qoidalari (faqat backend) |
| `03-API-CONTRACT.md` | Barcha endpointlar ro'yxati, audience bo'yicha bo'lingan |

## Har bir repo papkasida

| Fayl | Nima uchun |
|---|---|
| `AGENTS.md` | O'sha repo uchun agent qo'llanmasi — stack, konvensiyalar, taqiqlar |
| `ROADMAP.md` | **Kichik, ketma-ket qadamlar.** Har bir qadam: maqsad, fayllar, bajarish, DoD, tekshirish |

## AI bilan ishlash tartibi

1. Yangi repo oching, hujjatlarni `docs/` papkasiga ko'chiring.
2. Repo ildizida `CLAUDE.md` yarating:
   ```md
   # CLAUDE.md
   Loyiha konteksti: `docs/00-CONTEXT-AND-DECISIONS.md`
   Arxitektura: `docs/01-ARCHITECTURE.md`
   Agent qo'llanmasi: `docs/AGENTS.md`
   Ish rejasi: `docs/ROADMAP.md` — qadamlarni **ketma-ket** bajaring.
   Har bir qadam tugagach `ROADMAP.md` dagi `- [ ]` ni `- [x]` ga o'zgartiring.
   ```
3. AI'ga aniq qadam bering: *"ROADMAP.md dagi STEP-B-08 ni bajar"*. Bir vaqtda 1–3 qadamdan ortiq bermang.
4. Har qadam oxirida `Tekshirish` bo'limidagi buyruqni ishga tushiring.

## Ishlab chiqish tartibi (repolar orasida)

```
Backend  B-01 … B-17   ─┐  (auth + user management tayyor)
                        ├─> Admin   A-01 … A-12   (influencer kiritish boshlanadi)
Backend  B-18 … B-30   ─┤
                        ├─> MiniApp M-01 … M-24
Backend  B-31 … B-43   ─┤
                        └─> Web     W-01 … W-28
Backend  B-44 … B-50
```

Backend har doim oldinda yuradi. Frontend qadamlari o'zi bog'liq bo'lgan backend qadamini
`Talab qilinadi:` bo'limida ko'rsatadi.
