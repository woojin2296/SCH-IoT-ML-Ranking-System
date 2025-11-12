# ─────────────── 1단계: 빌드 ───────────────
FROM node:20-alpine AS builder
WORKDIR /app

# 기본 빌드 도구 설치 (better-sqlite3는 C++로 컴파일됨)
RUN apk add --no-cache python3 make g++

COPY package*.json ./
RUN npm install --ignore-scripts
RUN npm rebuild better-sqlite3 --build-from-source
RUN npm rebuild sqlite3 --build-from-source

COPY . .
RUN npm run build

# ─────────────── 2단계: 런타임 ───────────────
FROM node:20-alpine
WORKDIR /app

RUN apk add --no-cache sqlite
RUN mkdir -p /app/db /app/.next/cache/images && chown -R node:node /app

COPY --from=builder /app ./

USER node

ENTRYPOINT ["/bin/sh", "-c", "\
  if [ ! -f /app/db/app.db ]; then \
    echo '📀 Initializing SQLite database...'; \
    sqlite3 /app/db/app.db < /app/schema.sql; \
  else \
    echo '✅ Existing DB found, skipping initialization.'; \
  fi; \
  npm run start \
"]

EXPOSE 3000
