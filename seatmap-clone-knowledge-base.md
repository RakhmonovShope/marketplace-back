# Seatmap.pro uslubidagi interaktiv o'rindiq sxemalari platformasini qurish — Bilimlar bazasi

> Bu hujjat `seatmap.pro`, `editor.seatmap.pro` va `@seatmap.pro/renderer` npm paketini (v1.71.5) teskari tahlil qilish asosida yozilgan. Maqsad — xuddi shunaqa "SVG/canvas asosida interaktiv o'rindiq sxemasi yasaydigan" mahsulotni noldan qurish uchun kerak bo'ladigan barcha texnik bilimlarni bir joyda jamlash.
>
> Yaratilgan sana: 2026-08-20

---

## 0. TL;DR — eng muhim 5 ta xulosa

1. **Bu SVG loyihasi emas, rendering-engine loyihasi.** 170 000 tagacha o'rindiqni ko'rsatish uchun SVG/DOM emas, **Canvas 2D + WebGL** kerak. SVG faqat fon (venue rasmi), sektor konturi va import/export uchun ishlatiladi.
2. **Ikkita alohida mahsulot:** (a) og'ir **Editor** (admin sxema chizadi, Fabric.js/canvas), (b) yengil **Renderer/SDK** (xaridor tanlaydi, tashqi saytga embed qilinadi, WebGL).
3. **Ma'lumot data-driven:** o'rindiq = `{id, rowId, sectorId, x, y, name, priceId, state}` obyekt. Har biri alohida SVG element EMAS. Geometriya + holat + narx zonasi ajratilgan.
4. **Performance sirlarini spatial index (kdbush k-d tree), level-of-detail va tiling** hal qiladi. GPU'ni "probe" qilib zaif qurilmalarni himoya qilish.
5. **Booking real-time:** o'rindiqni sotib olishdan oldin qisqa muddatga (TTL) "lock" qilish. Redis + WebSocket.

---

## 1. Mahsulot nima va biznes-modeli

Seatmap.pro — teatr, stadion, arena, konsert zallari uchun **interaktiv o'rindiq tanlash qatlami**. U mavjud ticketing tizimini almashtirmaydi, unga o'rindiq tanlash imkoniyatini qo'shadi (embed). 20+ ticketing tizimi ishlatadi.

Ikki foydalanuvchi turi:
- **Admin/venue operatori** → Editor'da zal sxemasini chizadi, narx zonalarini belgilaydi, event yaratadi.
- **Xaridor** → tashqi ticketing saytida renderer orqali o'rindiq tanlaydi, savatchaga qo'shadi, sotib oladi.

Deploy modellari: **Cloud SaaS (EU hosting)** + **on-premise** (Docker image + Helm chart). Pricing: bepul tarif (sxema publik/clone qilinadigan bo'ladi) + pullik (privat sxema).

---

## 2. Aniqlangan texnologiya steki

### 2.1 Editor (`editor.seatmap.pro`)
Production bundle tahlilidan (Vite build, hex-obfuskatsiya):

| Qatlam | Texnologiya | Dalil |
|---|---|---|
| Framework | **React** | `react-core-*.js` chunk, `modulepreload` |
| Build tool | **Vite** | `/assets/index-*.js`, `modulepreload crossorigin`, chunk nomlari |
| Canvas editor | **Fabric.js** | bundle'da `fabric` 30+ marta, `getContext` 30+ marta editor chunk'da |
| State | **Redux + Immer** | `redux` 16×, `immer` 6× vendor chunk'da |
| Styling | **styled-components** | `vendor-styled-*.js` chunk |
| GraphQL | **graphql** klient (ehtimol admin API uchun) | `graphql` 5× vendor'da |
| HTTP | **axios** | `axios` vendor'da |
| Monitoring | **Sentry / GlitchTip** | `window.__RUNTIME_CONFIG__.SENTRY_DSN`, `glitchtip.seatmap.dev` |
| Shrift ikonlar | icomoon (custom icon font) | `@font-face icomoon`, `.icon-accessible` |

### 2.2 Renderer / booking SDK (`@seatmap.pro/renderer`)
npm paket, to'liq TypeScript, 807 KB unpacked, 3865 qatorlik `.d.ts`. Bog'liqliklar (bor-yo'g'i 5 ta — juda "yengil"):

| Paket | Vazifasi |
|---|---|
| **robot3** (1.1.1) | Finite state machine — renderer holati (yuklanmoqda → tayyor → tanlash rejimi). `RendererMachine`, `RendererMachineContext`. |
| **kdbush** (^4) | Spatial index (k-d tree) — minglab o'rindiq ichidan sichqoncha ostidagini `O(log n)` da topish. **Eng muhim performance sir.** |
| **nanoid** (^5) | Qisqa unikal ID (marker/id generatsiya). |
| **throttle-debounce** (^5) | Mousemove/zoom eventlarini optimallash. |
| **@sentry/browser** (^7) | Xatolarni monitoring. |

Renderer ichida (dependency'siz, o'z kodi): **Canvas 2D va WebGL** ikkilamchi rendering, **layer** tizimi (`Layer`, `OutlineLayer`, `SeatStateLayer`, `SelectionLayer`, `SectionViewLayer`), **GPU probe + tiling**, **3D view + rotation animatsiya**.

### 2.3 Backend / API
- REST API v2, base path: `/api/private/v2.0/...`
- Auth: `X-API-Key: {token}` header. Tenant uchun qo'shimcha `X-Organization-ID`. Token editor login javobidan olinadi.
- Xatolar: **RFC 7807 Problem Details** formati (field-level validation bilan).
- ID turlari: **Long (raqamli)** — venue, schema, sektor, narx; **UUID** — event.

---

## 3. Ma'lumotlar modeli (haqiqiy DTO'lar `.d.ts`dan)

Ierarxiya: **Venue → Schema → Sector → Row → Seat**, ustiga **Event → Price → Booking**.

### 3.1 Schema (butun zal)
```ts
interface ISchemaDTO {
  plainSeats?: IPlainSeatsDTO;   // tez yuklash uchun ixcham format
  seats: ISeatDTO[];              // barcha o'rindiqlar
  rows: IRowDTO[];               // qatorlar
  sectors: ISectorDTO[];         // sektorlar
  background: ISVGBackgroundDTO; // fon (SVG/PNG)
  configuration?: IConfigurationDTO;
  instanceId?: string;
  componentVersion?: string;
  branding?: BrandingLevel;
}
```

### 3.2 Seat (o'rindiq) — model yuragi
```ts
interface IBaseSeat {
  id: number;
  rowId: number;
  sectorId: number;
  x: number;          // sektor ichidagi koordinata
  y: number;
  ix?: number;        // transformdan oldingi grid koordinatasi (block-select uchun)
  iy?: number;
  name: string;       // o'rindiq raqami/nomi
  isAccessible?: boolean; // nogironlar uchun
  isMarked?: boolean;
  customState?: string;
}

interface ISeat extends IBaseSeat {
  priceId?: IPriceId;             // narx zonasi
  locked?: boolean;              // band/bloklangan
  filtered?: boolean;            // filtr bilan yashirilgan
  special?: ISpecialState;
  state?: SeatInteractionState;  // 'default'|'hovered'|'selected'|'unavailable'|'loading'|'error'
}
```
**Diqqat:** o'rindiq — bu koordinatali data obyekt. Render vaqtida canvas'ga chiziladi, DOM'da yashamaydi.

### 3.3 Row (qator) va Sector
```ts
interface IRowDTO { id: number; rowNumber: number; sectorId: number; name: string; seatName: string; }

interface IBaseSector {
  id: number;
  guid?: string;
  isGa: boolean;       // General Admission (raqamsiz "standing" zona)
  name: string;
  angle?: number|null; // aylantirish burchagi (gradus)
  type?: string|null;
  disabled?: boolean;
  // + labelStyle, coords ...
}
```

### 3.4 Background — SVG bu yerda ishlatiladi
```ts
interface ISVGBackgroundDTO {
  svg?: string | null;           // fon SVG (sahna, devorlar, chiroyli grafika)
  viewBox: { x; y; width; height };
  svgLink?: string;
  images?: IPngBackgroundDTO;     // PNG variant (tile'lar bilan)
  outlineSvg?: string | null;    // sektor konturlari
}

interface IPngBackgroundDTO {
  blurred; preview; full;
  tiles?: ITileGrid;             // xaritalar uslubidagi tile grid
  lods?: IPngFromUrl[];          // Level-Of-Detail piramidasi
}
```
Ya'ni **SVG — bu venue'ning statik grafik foni** (sahna, koridorlar, dekor). O'rindiqlar uning ustiga canvas/WebGL bilan chiziladi. Katta zallar uchun fon PNG tile'larga bo'linadi (Google Maps kabi).

### 3.5 Configuration
```ts
interface IConfigurationDTO { accessible: number[]; marked: number[]; eventName?: string; }
```

---

## 4. Rendering arxitekturasi (eng texnik qism)

Bu — loyihaning eng qiyin va eng qimmatli qismi. Seatmap.pro qanday qilib 170 000 o'rindiqni 60 fps'da ko'rsatadi:

### 4.1 Nega SVG/DOM emas
- 170k SVG `<circle>` → brauzer o'ladi (layout, memory, hit-testing).
- Yechim: bitta `<canvas>`, hamma o'rindiqni imperativ chizish.
- `webGl: true` sozlamasi bilan Canvas 2D → WebGL'ga o'tadi (10 000+ o'rindiq 60 fps).

### 4.2 Layer tizimi
Renderer ichida topilgan qatlamlar (`class`lar):
- `Layer` (bazaviy), `OutlineLayer` (sektor konturlari), `SectionViewLayer`, `SeatStateLayer` (o'rindiq holatlari), `SelectionLayer` (tanlash to'rtburchagi), `Context` (canvas konteksti).
- `SeatStateEngine` — o'rindiq holatini (default/hover/selected/...) boshqaradi.

### 4.3 Spatial index — kdbush
- Barcha o'rindiq koordinatalari k-d tree'ga joylanadi.
- Sichqoncha harakati / click → `O(log n)` da eng yaqin o'rindiqni topish.
- Busiz katta zalda hover ishlamaydi (har mousemove'da 170k tekshiruv = o'lim).

### 4.4 Level-of-Detail (LOD) + tiling
- **Uzoqdan:** faqat sektorlar (rangli bloklar) ko'rinadi, alohida o'rindiq yo'q.
- **Yaqinlashtirilganda:** o'rindiqlar chiziladi, keyin raqamlari.
- Fon rasm LOD piramidasi (`lods`) va tile grid (`ITileGrid`, `DetailTiles`) bilan zoom darajasiga mos rezolyutsiyada yuklanadi.
- `visibilitySettings` orqali qaysi zoomda nima ko'rinishi sozlanadi.

### 4.5 GPU probe — zaif qurilmalarni himoya qilish
```ts
interface GpuProbeResult {
  renderer: string;         // GPU nomi
  maxTextureSize: number;
  deviceMemory: number | undefined;
  benchmarkMs: number;      // texture upload benchmark (past = tez GPU)
}
interface DeviceCapabilities {
  tier: 'high' | 'constrained';  // GpuTier
  maxCanvasDimension: number;
  gpu: GpuProbeResult | null;
}
```
Renderer ishga tushganda GPU'ni o'lchaydi (benchmark), keyin "constrained" qurilmalarda detallashtirish/canvas o'lchamini pasaytiradi. *(Sizning repongizdagi `ProbeWidget` shu konsepsiya bilan bog'liq.)*

### 4.6 State machine (robot3)
Renderer holati FSM bilan: `idle → loading → ready → selecting → ...`. `RendererMachine`, `IRendererMachineContext`, `RendererMachineReducer`. Bu murakkab interaktivlikni (drag, rect-select, pan, zoom) tartibli qiladi.

---

## 5. Renderer public API (integratsiya yuzasi)

Ikki asosiy klass: `SeatmapBookingRenderer` (xaridor uchun) va `SeatmapAdminRenderer` (admin uchun). Ikkalasi ham bazaviy `Renderer`'dan meros oladi.

### 5.1 Ishga tushirish
```ts
import { SeatmapBookingRenderer } from '@seatmap.pro/renderer';

const renderer = new SeatmapBookingRenderer(element, {
  publicKey: 'PUBLIC_API_KEY',
  env: 'production',        // 'local' | 'stage' | 'production'
  webGl: true,
  selectionLimit: 6,       // max tanlanadigan o'rindiq
  groupSize: 2,
  theme: { /* ranglar */ },
  markers: { /* belgilar */ },
});

await renderer.loadEvent(eventId);       // yoki loadSchema(schemaId)
```

### 5.2 Asosiy metodlar (bazaviy `Renderer`)
**Ma'lumot olish:** `getSeats()`, `getRows()`, `getSections()`, `getVisibleSeats()`, `getSeatSelection()`, `getPrices()`, `getSectionsWithCoords()`.

**Tanlash:** `setSeatSelection(seats)`, `setSectionSelection()`, `selectSeatBlock(anchor, focus)` (admin), `clearSelection()`.

**Savat (cart):** `initCart()`, `addSeatsToCart()`, `removeSeatsFromCartByIds()`, `addGaToCart()`, `getCart()`.

**Holat/qulf:** `setSeatsState(seats, stateKey)`, `disableSeatsByIds()`, `enableSeatsByIds()`, `updateSeatLocks(filter)`, `filterSeatsByIds()`.

**Sektor:** `disableSectionsByIds()`, `enableSectionsByNames()`, `highlightSector(id)`.

**Narx/kategoriya:** `setSeatsCategory()`, `setExternalPrices()`, `getCategoryColor()`, `resetCategories()`.

**Zoom/pan:** `zoomIn()`, `zoomOut()`, `zoomToFit()`, `zoomToSection(section)`, `zoomTo(scale)`, `zoomToDestination(scale, point)`, `getZoom()`, `getMinZoom()`, `getMaxZoom()`.

**3D view (!):** `update3DView()`, `get3DViewParams()`, `animateTo3DParams()`, `animateRotation(angle)`, `stopRotationAnimation()` — ya'ni "o'rindiqdan ko'rinish" / 3D aylantirish.

**Minimap:** `showMinimap()`, `hideMinimap()`, `setMinimapPosition('top-left'|...)`, `setMinimapPinsEnabled()`.

**Markerlar:** `addMarker()`, `removeMarker()`, `getResolvedMarkers()` — sahnaga/zonaga belgi qo'yish.

### 5.3 Event tizimi (source → destination)
Ikki qatlamli event modeli:
- **SrcEventType** (xom kirish): `CLICK`, `MOUSE_MOVE`, `DRAG_START`, `DRAG_MOVE`, `DRAG_END`.
- **DestEventType** (ma'noli natija): `SEAT_SELECT`, `SEAT_CART_SWITCH`, `SECTION_CLICK`, `SEAT_MOUSE_ENTER/LEAVE`, `SECTION_MOUSE_ENTER/LEAVE`, `PAN`, `PAN_ZOOM`, `RECT_SELECT`, `DESELECT`.

Callback'lar: `onSeatSelect`, `onSchemaDataLoaded`, `onLoadProgress` va h.k. Ticketing tizim shu eventlarga ulanadi.

### 5.4 API klient
```ts
class BookingApiClient {
  fetchSchema(schemaId): Promise<ISchemaDTO>;
  fetchSchemaForEvent(eventId): Promise<ISchemaDTO>;
  fetchSchemaForVenue(venueId): Promise<...>;
  fetchSectionGridForEvent(eventId, sectorId): Promise<ISectionGridDTO>;
  fetchPricesForEvent(eventId): Promise<IPriceListDTO>;
  fetchRowsSvgForEvent(eventId): Promise<RequestMetrics>;
}
```

---

## 6. Backend / REST API v2

Auth: `X-API-Key` (+ tenant uchun `X-Organization-ID`).

| Amal | Metod | Endpoint |
|---|---|---|
| Event yaratish | POST | `/api/private/v2.0/events/` |
| Event ro'yxati | GET | `/api/private/v2.0/events/` |
| Event yangilash | PUT | `/api/private/v2.0/events/` |
| Event o'chirish | DELETE | `/api/private/v2.0/events/{id}` |
| O'rindiq lock | POST | `/api/private/v2.0/booking/lock` |
| O'rindiq unlock | POST | `/api/private/v2.0/booking/unlock` |
| To'g'ridan sotish | POST | `/api/private/v2.0/booking/directsale` |
| Narx yaratish | POST | `/api/private/v2.0/event/{eventId}/prices/` |
| Narx biriktirish | POST | `/api/private/v2.0/event/{eventId}/prices/assignments/` |

Resurslar: **Venues** (fizik joy), **Schemas** (zal layout), **Pricing Zones + Prices**, **Events** (UUID), **Bookings** (real-time lock/sale), **Selections**.

---

## 7. Editor imkoniyatlari (chizish vositalari)

Editor (Fabric.js canvas) quyidagilarni beradi:
- O'rindiq, qator, sektor, stol (table), standing/GA zona qo'shish.
- **Qator generatsiyasi:** bir marta N ta o'rindiqni avtomatik joylash (grid).
- **Egri qator / aylantirish (`angle`):** sektorni gradusda burish.
- **Label/raqamlash:** o'rindiq va qator nomlash sxemalari (1,2,3 / A,B,C / teskari).
- **Kategoriya/narx zonalari:** o'rindiqlarni rangli zonalarga guruhlash.
- **Accessible/marked** belgilash (nogironlar o'rni, maxsus holat).
- **SVG import/export:** tashqi grafikadan fon olish, sxemani SVG'ga chiqarish.
- **Background rasm:** venue fonini yuklash (sahna, koridor).
- **Hotkeylar** (admin renderer): `pan`, `clearSelection`, `selectAll`, `zoomIn/Out`, `zoomToFit`, `flatSection`.
- **Flat section view:** bitta sektorni "yassi" ko'rinishda ochish (`setFlatSectionView`).

---

## 8. Booking (sotish) oqimi — konkurentlik

Eng nozik biznes-logika: ikki xaridor bitta o'rindiqni bir vaqtda olmasligi kerak.

1. Xaridor o'rindiq tanlaydi → frontend `POST /booking/lock` (o'rindiq ID'lari).
2. Backend Redis'da `seat:{eventId}:{seatId}` kalitini **TTL bilan** (masalan 5–10 daqiqa) yozadi.
3. Lock muvaffaqiyatli → o'rindiq boshqalarga "unavailable" (WebSocket orqali barcha ochiq sessiyalarga push).
4. To'lov → `POST /booking/directsale` yoki tashqi to'lov, keyin lock → sotilgan holatga.
5. Timeout / bekor → `POST /booking/unlock`, TTL tugasa avtomatik bo'shaydi.

Kerak: **Redis (atomik lock, TTL)** + **WebSocket (Socket.io)** real-time holat tarqatish.

---

## 9. Siz nima qurishingiz kerak — komponentlar ro'yxati

```
┌─────────────────────────────────────────────────────────────┐
│ 1. EDITOR (React + Fabric.js/Konva)                          │
│    - canvas chizish, o'rindiq/qator/sektor CRUD              │
│    - grid generatsiya, aylantirish, raqamlash                │
│    - SVG import/export, background yuklash                    │
│    - narx zonalari, save/load (JSON schema)                  │
├─────────────────────────────────────────────────────────────┤
│ 2. RENDERER SDK (vanilla TS + Canvas/WebGL, framework-free)  │
│    - kdbush hover/click, zoom/pan, LOD                        │
│    - seat state, selection, cart, event API                  │
│    - npm paket + React/Vue wrapper                            │
├─────────────────────────────────────────────────────────────┤
│ 3. BACKEND (NestJS)                                          │
│    - REST: venues/schemas/events/prices                      │
│    - WebSocket + Redis: seat lock/booking                    │
│    - multi-tenant auth (API key)                             │
├─────────────────────────────────────────────────────────────┤
│ 4. DB: PostgreSQL (schema JSONB) + Redis (lock/cache)        │
├─────────────────────────────────────────────────────────────┤
│ 5. MARKETING/DOCS: Next.js (landing, playground, docs)       │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Texnologiya tanlovi (tavsiya)

| Qatlam | Tavsiya | Muqobil | Izoh |
|---|---|---|---|
| Backend | **NestJS** | Express, Fastify | Modulli, REST+WS, DI, TypeScript |
| DB | **PostgreSQL** | — | Relyatsion + JSONB geometriya uchun |
| ORM | **Prisma** yoki **TypeORM** | — | Prisma DX yaxshiroq |
| Cache/lock | **Redis** | — | Seat lock TTL, pub/sub |
| Real-time | **Socket.io** | native WS | Booking holati push |
| Editor canvas | **Fabric.js** | **Konva.js** | Fabric = seatmap.pro yo'li; Konva = zamonaviyroq, React-friendly |
| Renderer | **PixiJS** (WebGL) | xom WebGL, **Canvas 2D**dan boshlash | Katta zal uchun WebGL shart |
| Spatial index | **kdbush** yoki **rbush** | — | Hover/click O(log n) |
| Frontend meta | **Next.js** | Vite+React | Landing/docs + admin panel |
| State (editor) | **Zustand** yoki Redux Toolkit | — | Zustand yengilroq |
| i18n | **i18next** | — | ko'p tilli (uz/ru/en) |
| Monitoring | **Sentry** / GlitchTip | — | seatmap.pro GlitchTip ishlatadi |

**Muhim qaror:** Renderer'ni frameworkка bog'lamang. Uni **vanilla TypeScript** yozib, keyin React/Vue uchun ingichka wrapper bering — shunda har qanday ticketing sayti embed qila oladi. Seatmap.pro aynan shunday qilgan (React, Vue, Angular, Svelte, vanilla mos).

---

## 11. Roadmap (bosqichma-bosqich)

### Faza 0 — Tadqiqot va data model (1–2 hafta)
- [ ] seatmap.pro editor/playground'ni jonli sinash
- [ ] Data model: `Venue → Schema → {Sector, Row, Seat}`, `Event`, `PriceZone`, `Booking`
- [ ] SVG import/export format qарори
- [ ] Monorepo setup (pnpm workspaces: `editor`, `renderer`, `backend`, `web`)

### Faza 1 — Editor MVP (4–6 hafta)
- [ ] React + Fabric.js/Konva canvas
- [ ] O'rindiq/qator/sektor qo'shish, drag, tanlash, ko'chirish
- [ ] Qator generatsiyasi (N ta o'rindiq bir marta)
- [ ] Aylantirish (`angle`), raqamlash sxemalari
- [ ] Background rasm/SVG yuklash
- [ ] Save/load schema → PostgreSQL JSONB
- [ ] Undo/redo

### Faza 2 — Renderer SDK (4–6 hafta)
- [ ] Vanilla TS + Canvas 2D'dan boshlash
- [ ] kdbush bilan hover/click
- [ ] Zoom/pan, LOD (uzoqda sektor, yaqinda o'rindiq)
- [ ] Seat state (default/hover/selected/unavailable)
- [ ] Selection + cart + `selectionLimit`
- [ ] Event API: `onSeatSelect`, `onLoad`, `onError`
- [ ] npm paket + React wrapper
- [ ] **Keyin:** WebGL/PixiJS'ga o'tish (katta zal)

### Faza 3 — Backend + booking (3–4 hafta)
- [ ] NestJS REST: venues/schemas/events/prices CRUD
- [ ] Multi-tenant auth (API key + org id)
- [ ] Seat lock: Redis + TTL
- [ ] WebSocket real-time holat
- [ ] RFC 7807 xato formati

### Faza 4 — Performance & scale (uzluksiz)
- [ ] GPU probe, device tier
- [ ] Fon tiling (LOD piramidasi)
- [ ] 10k+ o'rindiq 60 fps benchmark
- [ ] Mobil/touch, pinch-zoom
- [ ] Accessibility (screen reader, keyboard nav)

### Faza 5 — Marketing va docs (2–3 hafta)
- [ ] Next.js landing, pricing
- [ ] Interaktiv playground
- [ ] API docs, SDK guide

**Vaqt bahosi:** 2–3 kishilik jamoada MVP ~4–6 oy, to'liq mahsulot ~12 oy.

---

## 12. Keng tarqalgan xatolar (pitfalls)

1. **Hamma narsani SVG bilan qilish** → katta zal qotib qoladi. Canvas/WebGL shart.
2. **Spatial index yo'qligi** → har mousemove'da barcha o'rindiqni tekshirish → laglar. kdbush/rbush ishlating.
3. **Booking lock'siz** → double-booking, jahl xaridorlar. Redis TTL + atomiklik.
4. **Renderer'ni React'ga bog'lash** → tashqi sayt embed qila olmaydi. Vanilla core.
5. **Bitta katta JSON** → 170k o'rindiqni bir marta yuborish sekin. `plainSeats` kabi ixcham format + progressive loading + tiling.
6. **Zoom'da hamma narsani chizish** → LOD yo'q. Uzoqda faqat sektor, yaqinda o'rindiq.
7. **GPU'ni hisobga olmaslik** → arzon telefonlar qotadi. Device tier + fallback.
8. **Koordinata tizimini chalkashtirish** → world ↔ screen ↔ section-local transform'larni aniq ajrating (`x/y` vs `ix/iy`).

---

## 13. O'rganish resurslari

**Canvas/WebGL rendering:**
- MDN Canvas API va WebGL tutorial
- PixiJS docs (`pixijs.com`) — WebGL 2D rendering
- Fabric.js docs (`fabricjs.com`) / Konva.js (`konvajs.org`) — interaktiv canvas editor

**Spatial index:**
- `kdbush` va `rbush` (mapbox, GitHub) — README'lari qisqa va aniq

**State machine:**
- `robot3` (`thisrobot.life`) — kichik FSM
- XState (kattaroq muqobil)

**Backend/real-time:**
- NestJS docs (`docs.nestjs.com`) — WebSocket gateway, guards
- Redis `SET key val NX PX <ttl>` — atomik lock pattern

**Referens mahsullar (o'rganish uchun):**
- seatmap.pro (bu hujjat manbasi)
- seats.io (raqib, yaxshi docs)
- Mapbox GL JS (tiling/LOD arxitekturasi ideal namuna)

**Renderer'ni chuqur o'rganish:**
- `npm pack @seatmap.pro/renderer` → `lib/index.d.ts` (3865 qator, barcha tip va API)
- README: `seatmap.pro/knowledge-base/renderer/spec/`, `.../api/v2/`, `.../renderer/playground/`

---

## 14. Xulosa

Bu loyihaning **80% qiyinchiligi rendering va performance**da, 20% esa CRUD/business logic. Agar siz Canvas/WebGL rendering, spatial index va LOD'ni to'g'ri qursangiz — qolgani (NestJS backend, PostgreSQL, React UI) standart web-dasturlash. Boshidanoq **data-driven + canvas** arxitekturani tanlang, SVG'ni faqat fon va import/export uchun qoldiring.

Birinchi amaliy qadam: **kichik proof-of-concept** — 5 000 ta o'rindiqni Canvas'ga chizib, kdbush bilan hover/click qilib ko'ring. Agar bu 60 fps'da ishlasa, to'g'ri yo'ldasiz.
