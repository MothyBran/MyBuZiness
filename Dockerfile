# ---- Build stage ------------------------------------------------------------
FROM node:18-alpine AS builder
WORKDIR /app

# 1) Nur Manifeste zuerst -> schnellere Caches
COPY package*.json ./
# Falls du KEINE package-lock.json im Repo hast, bleibt 'npm install' korrekt:
RUN npm install

# 2) Rest des Projekts kopieren und bauen (Classic, KEIN standalone)
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Runtime stage ----------------------------------------------------------
FROM node:18-alpine
WORKDIR /app

# 3) Nur Runtime-Dependencies installieren
COPY --from=builder /app/package*.json ./
RUN npm install --omit=dev

# 4) Build-Artefakte + Public übernehmen
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# 5) Runtime-ENV
ENV NODE_ENV=production
ENV HOST=0.0.0.0
# Railway setzt $PORT automatisch
EXPOSE 3000

# 6) Healthcheck (nutzt unsere Health-Route)
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:${PORT:-3000}/api/health || exit 1

# 7) Start (klassisch, bindet korrekt)
CMD [ "sh", "-c", "next start -H 0.0.0.0 -p ${PORT:-3000}" ]
