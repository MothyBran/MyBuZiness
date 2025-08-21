# ---- Build stage ------------------------------------------------------------
FROM node:18-alpine AS builder
WORKDIR /app

# schnellerer Install: nur package.json + lockfile zuerst
COPY package*.json ./
RUN npm ci

# Rest des Projekts
COPY . .

# Classic Next-Build (kein standalone)
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Runtime stage ----------------------------------------------------------
FROM node:18-alpine
WORKDIR /app

# nur Runtime-Dependencies übernehmen
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

# Build-Artefakte + public kopieren
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# ENV / Port-Bindings
ENV HOST=0.0.0.0
# Railway setzt $PORT selbst – nicht hart verdrahten
EXPOSE 3000

# Start: klassisch, bindet auf 0.0.0.0 und $PORT
CMD [ "sh", "-c", "next start -H 0.0.0.0 -p ${PORT:-3000}" ]
