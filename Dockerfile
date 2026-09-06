# syntax=docker/dockerfile:1.7
# ============================================================================
# marketplace-backend — multi-stage image
#   deps   : dependency'lar (native modullar uchun build toolchain bilan)
#   build  : prisma generate + nest build, keyin prod dependency'larga prune
#   runner : faqat dist + prod node_modules, non-root user
#
# Migratsiyalar bu image'da EMAS: `prisma` CLI devDependency (prune qilinadi).
# Ularni `build` stage'dan alohida job bilan bajaring:
#   docker compose -f docker-compose.prod.yml run --rm migrate
# ============================================================================

ARG NODE_VERSION=24
ARG PNPM_VERSION=8.12.1

# ---------- deps ----------
FROM node:${NODE_VERSION}-alpine AS deps
ARG PNPM_VERSION
# openssl — Prisma `generate` OpenSSL versiyasini aniqlab to'g'ri engine'ni tanlashi uchun
# (aks holda musl'da 1.1.x engine tanlanib, runtime'da libssl.so.1.1 topilmaydi).
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate \
 && apk add --no-cache libc6-compat openssl python3 make g++
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
RUN --mount=type=cache,id=pnpm,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

# ---------- build ----------
FROM deps AS build
COPY . .
RUN pnpm prisma generate && pnpm build \
 && pnpm prune --prod

# ---------- runner ----------
FROM node:${NODE_VERSION}-alpine AS runner
ENV NODE_ENV=production
RUN apk add --no-cache libc6-compat openssl wget \
 && addgroup -S app && adduser -S app -G app \
 && mkdir -p /app/uploads && chown -R app:app /app
WORKDIR /app
COPY --from=build --chown=app:app /app/node_modules ./node_modules
COPY --from=build --chown=app:app /app/dist ./dist
COPY --from=build --chown=app:app /app/package.json ./
USER app
EXPOSE 3000
# uploads/ — volume sifatida ulanadi (docker-compose.prod.yml)
VOLUME ["/app/uploads"]
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1
CMD ["node", "dist/main"]
