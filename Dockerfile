# -------------------- Build Stage --------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Nur package-Dateien kopieren (für Layer-Caching)
COPY package*.json ./

# Abhängigkeiten installieren:
# - Wenn package-lock.json vorhanden: npm ci
# - Sonst: npm install
RUN if [ -f package-lock.json ]; then \
      echo "🔒 Lockfile gefunden → npm ci"; \
      npm ci; \
    else \
      echo "ℹ️ Kein Lockfile → npm install"; \
      npm install; \
    fi

# Restlichen Quellcode kopieren
COPY . .

# Telemetrie aus
ENV NEXT_TELEMETRY_DISABLED=1

# Build
RUN npm run build


# -------------------- Runtime Stage --------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Prod-Dependencies installieren (erneut mit Fallback)
COPY package*.json ./
RUN if [ -f package-lock.json ]; then \
      echo "🔒 Lockfile gefunden → npm ci --omit=dev"; \
      npm ci --omit=dev; \
    else \
      echo "ℹ️ Kein Lockfile → npm install --omit=dev"; \
      npm install --omit=dev; \
    fi

# Build-Artefakte + nötige Dateien übernehmen
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./next.config.js
# (Optional) falls du serverseitige Dateien zur Laufzeit brauchst:
# COPY --from=builder /app/app ./app
# COPY --from=builder /app/src ./src

EXPOSE 3000
CMD ["npm", "start"]
