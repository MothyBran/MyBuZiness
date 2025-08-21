# ---- Builder ---------------------------------------------------------------
FROM node:20-alpine AS builder
WORKDIR /app

# Nur package-Dateien kopieren, um Layer-Caching für deps zu nutzen
COPY package*.json ./
RUN npm ci

# Rest des Codes
COPY . .

# Telemetrie aus
ENV NEXT_TELEMETRY_DISABLED=1

# Build
RUN npm run build

# ---- Runtime ---------------------------------------------------------------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Prod-Dependencies installieren
COPY package*.json ./
RUN npm ci --omit=dev

# Build-Artefakte + statische Assets
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.js ./next.config.js

# (Optional) nur wenn du dynamisch noch etwas brauchst:
# COPY --from=builder /app/src ./src
# COPY --from=builder /app/app ./app

EXPOSE 3000
CMD ["npm", "start"]
