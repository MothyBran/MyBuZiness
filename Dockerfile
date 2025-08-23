# ---------- build stage ----------
FROM node:18-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat

# 1) Nur package-Dateien kopieren (besseres Caching)
COPY package*.json ./

ENV NODE_ENV=production
# Lockfile bevorzugt, Fallback ohne Lockfile
RUN if [ -f package-lock.json ]; then \
      echo "Using npm ci (lockfile found)"; npm ci; \
    else \
      echo "Using npm install (no lockfile)"; npm install; \
    fi

# 2) Restlicher Code
COPY . .

# 3) Build-Metadaten (optional)
ARG GIT_SHA
ARG GIT_BRANCH
ARG BUILD_TIME
ENV NEXT_PUBLIC_BUILD_SHA=${GIT_SHA}
ENV NEXT_PUBLIC_BUILD_BRANCH=${GIT_BRANCH}
ENV NEXT_PUBLIC_BUILD_TIME=${BUILD_TIME}
ENV NEXT_TELEMETRY_DISABLED=1

# 4) Next Build (erzeugt .next/standalone)
RUN npx next build

# ---------- runtime stage (standalone) ----------
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Nur die Standalone-App + statics + public kopieren
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3000
CMD ["node", "server.js"]
