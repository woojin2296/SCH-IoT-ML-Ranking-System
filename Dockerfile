# syntax=docker/dockerfile:1.6

ARG NODE_VERSION=20

# ── 0단계: 공통 베이스 ──
FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /app
RUN apk add --no-cache libc6-compat python3 make g++

# ── 1단계: 의존성 설치 ──
FROM base AS deps
COPY package*.json ./
RUN npm ci \
  && npm rebuild better-sqlite3 --build-from-source

# ── 2단계: 개발 환경 ──
FROM base AS dev
ENV NODE_ENV=development
COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY . .
CMD ["npm", "run", "dev"]

# ── 3단계: 빌드 ──
FROM base AS builder
ARG APP_ENV=production
ENV NODE_ENV=$APP_ENV
COPY package*.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ── 4단계: 런타임(standalone) ──
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

# next standalone 출력물 복사
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# ✅ 캐시/DB용 디렉토리 권한 확보
RUN addgroup -g 1001 nodejs \
    && adduser -S nextjs -u 1001 -G nodejs \
    && mkdir -p /app/.next/cache \
    && chown -R nextjs:nodejs /app

# 권한 낮추기
USER nextjs

EXPOSE 3000
CMD ["node", "server.js"]
