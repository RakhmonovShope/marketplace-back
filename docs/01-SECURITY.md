# 01 — Xavfsizlik tuzatishlari (P0)

> Har bir band: **Muammo → Qayerda → Yechim → Tekshirish**. Tartib — xavf darajasi bo'yicha.

---

## S1. Public signup orqali super-admin bo'lish (KRITIK)

> ✅ Bajarildi (2026-09-05, STEP-02): `SignUp` DTO'dan `roleId/subType/active` olib tashlandi, `Role.code @unique` + `isSystem`
> (migratsiya `role_code`, backfill bilan), `ROLE_CODE` enum, seed `upsert` (SUPER_ADMIN barcha permission'lar bilan, CUSTOMER bo'sh).
> `signUp` serverda `CUSTOMER` rolini qo'yadi. Tekshirildi: `roleId` yuborilsa 400.

**Muammo.** `AuthDTO.SignUp` da `roleId`, `subType`, `active` majburiy maydon sifatida
mijozdan qabul qilinadi, `AuthService.signUp` esa `{ ...data, password }` ni to'g'ridan-to'g'ri
`user.create` ga uzatadi. Super-admin `roleId` (`bfdc30ce-…`) `prisma/seed.ts` da ochiq.
Natija: `POST /v1/auth/signup` bilan har kim `subType: ADMIN`, `active: true`, super-admin roli
bilan ro'yxatdan o'tadi (email tasdiqlash — yagona to'siq, u ham o'z emailiga keladi).

**Yechim.**
1. `SignUp` DTO'dan `roleId`, `subType`, `active` ni **olib tashlash**.
2. Serverda qat'iy belgilash:
   ```ts
   // auth.service.ts
   const customerRole = await this.prisma.role.findFirstOrThrow({
     where: { code: 'CUSTOMER' }, // 03-DATA-MODEL: Role.code @unique qo'shiladi
   });
   await this.prisma.user.create({
     data: {
       ...data,
       password: hashedPassword,
       subType: SUB_TYPE.CUSTOMER,
       roleId: customerRole.id,
       active: true,
     },
   });
   ```
3. Admin yaratish faqat `POST /v1/admin` (`ADMIN__CREATE`) orqali — bu allaqachon bor.
4. Seed'ga `CUSTOMER` roli (bo'sh yoki minimal permission'lar bilan) qo'shiladi.

**Tekshirish.** `curl -X POST /v1/auth/signup -d '{"roleId":"…"}'` → 400 `property roleId should not exist`.

---

## S2. Parol hash'i API javoblarida (KRITIK)

> ✅ Bajarildi (2026-09-05, STEP-03): `toUserResponse` mapper (`admin.mapper.ts`, oq ro'yxat) — `signUp`, `getMe`, admin CRUD/pageable/restore shu orqali qaytaradi; `UserResponseDto.password` o'chirildi, `deletedAt` qo'shildi. Tekshirildi: 4 ta endpoint javobida `password` yo'q.

**Muammo.** `signUp`, `getMe`, `GET /v1/admin/:id`, `POST /v1/admin/pageable`, `restore`
Prisma `User` obyektini to'liq qaytaradi — `password` bilan. `AdminDTO.UserResponseDto` da
`password` maydoni hatto Swagger'da hujjatlangan.

**Yechim (tanlang, 2-variant tavsiya).**
- **Variant A — Prisma `omit`** (Prisma 5.16+ da `omitApi` preview, 6.x da GA):
  ```ts
  // prisma.service.ts
  super({ omit: { user: { password: true } } });
  ```
  Parol kerak bo'lgan joyda (`signIn`) `select: { password: true, ... }` bilan aniq so'raladi.
- **Variant B — Serializer**: `UserResponseDto` ni `class-transformer` entity qilish, `@Exclude()`
  `password` ga, `TransformInterceptor` da `plainToInstance` → `instanceToPlain`. Har bir servis
  `toResponse()` mapper orqali qaytaradi (Store/File modullari allaqachon `mapTo…Dto` ishlatadi).
- Har ikkisida ham `UserResponseDto.password` ni **o'chirish**.

**Tekshirish.** e2e: `GET /v1/auth/get-me` javobida `password` kaliti yo'q (`expect(body.password).toBeUndefined()`).

---

## S3. WebSocket'da auth va identifikatsiya yo'q (KRITIK)

> ✅ Bajarildi (2026-09-05, STEP-06): socket.io middleware (`server.use`) handshake'da `AuthService.validateAccessToken` (imzo + sessiya) — o'tmasa `connect_error: UNAUTHORIZED`; xonalar `user:<id>`; `senderId` socket'dan; `SendMessage` DTO + `ValidationPipe` (WsException); HTTP `POST /messages` ham `@CurrentUser('id')`; `deleteMessage` faqat ikki xonaga; CORS — `ConfiguredIoAdapter` (`CORS_ORIGINS`). Tekshirildi: `test/manual/ws.js` (4 holat). B4/B5 message uchun ham bajarildi.

**Muammo.** `ChatGateway` (`@WebSocketGateway({ cors: true })`):
- `handleConnection` tokenni tekshirmaydi;
- `client.join(receiverId)` — `receiverId` query'dan, istalgan foydalanuvchi xonasiga kirish mumkin;
- `sendMessage` payload'idagi `senderId` ga ishoniladi — istalgan nomdan yozish mumkin;
- payload validatsiyasi yo'q (`ValidationPipe` WS'ga avtomatik qo'llanmaydi).

**Yechim.**
```ts
@WebSocketGateway({ cors: { origin: corsOrigins, credentials: true } })
@UsePipes(new ValidationPipe({ whitelist: true, transform: true }))
export class ChatGateway implements OnGatewayConnection {
  constructor(private jwt: JwtService, private prisma: PrismaService, ...) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token ?? client.handshake.headers.authorization?.split(' ')[1];
      const { id, sid } = this.jwt.verify<TokenPayload>(token);
      const session = await this.prisma.refreshToken.findUnique({ where: { id: sid } });
      if (!session || session.revokedAt || session.userId !== id) throw new Error();
      client.data.userId = id;
      client.join(`user:${id}`);
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('sendMessage')
  async handleMessage(client: Socket, payload: SendMessageDto) { // { receiverId, content }
    const senderId = client.data.userId; // payload'dan EMAS
    const msg = await this.messageService.create({ senderId, ...payload });
    this.server.to(`user:${payload.receiverId}`).to(`user:${senderId}`).emit('receiveMessage', msg);
  }
}
```
Qo'shimcha: `MessageController.delete` da `server.emit('deleteMessage')` **hammaga** yuboriladi —
faqat ikki tomon xonasiga yuborish kerak. Ko'p instans uchun `@socket.io/redis-adapter` (`06-PERFORMANCE`).

**Tekshirish.** Tokensiz `io.connect()` → `disconnect` eventi. Boshqa userning `receiverId` bilan ulanib
`receiveMessage` kelmasligi.

---

## S4. SVG orqali stored XSS (YUQORI)

**Muammo.** `POST /v1/files/upload` `fileFilter` faqat `file.mimetype` (mijoz e'lon qiladi) ni
tekshiradi va `svg` ni o'tkazadi. `GET /files/:y/:m/:d/:name` faylni `Content-Disposition: inline`
bilan qaytaradi. `<script>` li SVG brauzerda backend origin'ida bajariladi.

**Yechim (barchasi birga).**
1. **Magic-byte validatsiya**: `file-type` paketi bilan real turni aniqlash; mimetype'ga ishonmaslik.
2. **SVG**: yoki umuman rad etish, yoki `svgo`/`DOMPurify` (jsdom) bilan sanitizatsiya, **va**
   har doim `attachment` bilan qaytarish.
3. Fayl javoblariga sarlavhalar:
   ```ts
   res.set({
     'X-Content-Type-Options': 'nosniff',
     'Content-Security-Policy': "default-src 'none'; sandbox",
     'Cache-Control': 'public, max-age=31536000, immutable',
   });
   ```
4. Ideal: fayllarni **alohida domen/CDN** dan berish (`07-FILES-MEDIA.md`).

---

## S5. Swagger production'da ochiq (O'RTA)

**Yechim.** `main.ts`:
```ts
if (!isProd || configService.get('SWAGGER_ENABLED') === 'true') {
  if (isProd) app.use('/api', basicAuth({ users: { [SWAGGER_USER]: SWAGGER_PASS }, challenge: true }));
  SwaggerModule.setup('api', app, document);
}
```
`express-basic-auth` paketi. Env: `SWAGGER_ENABLED`, `SWAGGER_USER`, `SWAGGER_PASS` (Joi'ga qo'shish).

---

## S6. Login'da user enumeration + bcrypt rounds (O'RTA)

**Muammo.** `signIn`: user topilmasa `404 User not found`, parol xato bo'lsa `401`. Farq orqali
ro'yxatdan o'tgan telefon raqamlarni aniqlash mumkin. `bcrypt.genSalt(10)` — 2026 uchun kam.

**Yechim.**
```ts
const user = await this.prisma.user.findFirst({ where: { phone, deletedAt: null }, select: { id: true, password: true, emailVerified: true, active: true } });
const ok = user && (await bcrypt.compare(data.password, user.password));
if (!ok) throw new UnauthorizedException('Invalid credentials'); // bir xil xabar, bir xil status
```
- Timing farqini yo'qotish: user topilmasa ham `bcrypt.compare(password, DUMMY_HASH)` bajarish.
- `BCRYPT_ROUNDS=12` (env), yoki `argon2id` ga o'tish (`argon2` paketi).
- `user.active === false` bo'lsa ham kirishni rad etish (hozir tekshirilmaydi).
- Access token TTL: `JWT_SESSION_EXPIRATION=1d` → **15m** (refresh rotation bor, xavfsiz).

---

## S7. Filter'da ixtiyoriy maydon (O'RTA)

**Muammo.** `getWhereOperations(filter)` `f.name` ni tekshirmasdan `where[name]` qiladi.
Admin `POST /v1/admin/pageable` ga `{name:'password', operation:'=', value:'$2b$…'}` yuborib
hash'ni boolean-oracle bilan tekshirish, relation nomlarini yuborib Prisma 500 chiqarish mumkin.

**Yechim.** Har resurs uchun oq ro'yxat — `04-API-CONVENTIONS.md` §2 (`FILTERABLE_FIELDS`).

---

## S8. Sirlar va PII repo'da (O'RTA)

- `prisma/seed.ts`: real ism, telefon, email, bcrypt hash → env'dan o'qish:
  `SEED_ADMIN_PHONE`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` (hash seed ichida hisoblanadi).
- `uploads/files/2026/6/30/*.webp` git'da: `git rm -r --cached uploads && echo 'uploads/' >> .gitignore`.
- `AudioController` `S3Client` ni import vaqtida `process.env` dan yaratadi — `ConfigService`
  validatsiyasidan **oldin**. `S3_CLIENT` provider qilib `ConfigService` orqali inject qilish.
- `.env` git'da yo'q — yaxshi. `.env.example` yaratish (`12-CODEGEN-DX-DOCS.md`).

---

## S9. Kichik, lekin kerakli

| Muammo | Fayl | Yechim |
|---|---|---|
| `getMe` tokenni qo'lda `jwtService.verify` qiladi, `JwtStrategy` mantig'ini takrorlaydi | `auth.controller.ts:100` | `@UseGuards(AuthGuard())` + `@Req()` (yoki `@CurrentUser()` dekorator) |
| `src/api/auth/auth.guard.ts` — o'lik kod (`user.roles` mavjud emas) | | O'chirish |
| `createAdmin` `ADMIN__UPDATE` permission bilan | `admin.controller.ts:503` | `ADMIN__CREATE` |
| `Role.delete` hard delete; foydalanuvchilar bog'langan bo'lsa FK xato → 400 | `role.service.ts` | Avval `user.count({roleId})` → 409 `ROLE_IN_USE` |
| `logout` refresh tokenni body'da oladi, `AuthGuard` yo'q — maqbul, lekin `logout-all` bilan bir xil qilish yaxshi | | Ixtiyoriy |
| `trust proxy` yo'q — nginx ortida `req.ip` hamma uchun bir xil → throttler global bo'lib qoladi | `main.ts` | `app.getHttpAdapter().getInstance().set('trust proxy', 1)` |
| Throttler `getTracker` IP asosida; login qilgan foydalanuvchi uchun `user.id` bo'yicha cheklash | `app.module.ts` | `ThrottlerGuard` ni extend qilib `getTracker` override |
| Hisob bloklash yo'q (brute-force telefon+parol) | `auth.service.ts` | Redis'da `login:fail:<phone>` counter, 10 urinish → 15 min lock |
| `helmet` CSP dev'da o'chiq — OK; prod'da Swagger uchun CSP `unsafe-inline` kerak bo'ladi | `main.ts` | Swagger prod'da yopiq bo'lsa muammo yo'q |

---

## Qarorlar

- (bo'sh — qabul qilingan qarorlar shu yerga yoziladi)
