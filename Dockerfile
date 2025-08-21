# -------------------- Build Stage --------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Nur package-Dateien kopieren, damit Layer-Caching greift
# (COPY package*.json kopiert package.json und – falls vorhanden – package-lock.json)
COPY package*.json ./

# Abhängigkeiten installieren:
# - Wenn package-lock.json vorhanden: npm ci
# - Sonst: npm install (erzeugt kein Lockfile im Image, ist aber robust)
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

# Build durchführen
RUN npm run build


# -------------------- Runtime Stage --------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Nur Prod-Dependencies installieren (wieder mit robustem Fallback)
COPY package*.json ./
RUN if [ -f package-lock.json ]; then \
      echo "🔒 Lockfile gefunden → npm ci --omit=dev"; \
      npm ci --omit=dev; \
    else \
      echo "ℹ️ Kein Lockfile → npm install --omit=dev"; \
      npm install --omit=dev; \
    fi

# Build-Artefakte und benötigte Dateien aus dem Builder übernehmen
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./next.config.js

# (Optional) Falls du während der Laufzeit serverseitige Dateien brauchst (API-Routen sind im Build enthalten):
# COPY --from=builder /app/app ./app
# COPY --from=builder /app/src ./src

EXPOSE 3000
CMD ["npm", "start"]

docker build --no-cache -t mybuziness .
