# ---- Build stage ------------------------------------------------------------
FROM node:18-alpine AS builder
WORKDIR /app

# Nur Manifeste zuerst -> bessere Caches
COPY package*.json ./
# Kein Lockfile? -> npm install ist okay
RUN npm install

# Projekt kopieren und bauen (Classic, KEIN standalone)
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Runtime stage ----------------------------------------------------------
FROM node:18-alpine
WORKDIR /app

# Nur Runtime-Dependencies
COPY --from=builder /app/package*.json ./
RUN npm install --omit=dev

# Build-Artefakte + Public übernehmen
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# Sicherstellen, dass next im PATH ist (zusätzlich zu npm start fallback)
ENV PATH="/app/node_modules/.bin:${PATH}"

# Runtime-ENV
ENV NODE_ENV=production
ENV HOST=0.0.0.0
# Railway setzt $PORT automatisch
EXPOSE 3000

# Über npm starten -> npm setzt PATH korrekt auf node_modules/.bin
CMD [ "npm", "run", "start" ]
