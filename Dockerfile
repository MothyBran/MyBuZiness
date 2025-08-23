# ---------- build stage ----------
FROM node:18-alpine AS builder
WORKDIR /app

# System-Deps (stabil auf Alpine)
RUN apk add --no-cache libc6-compat

# 1) Nur package-Dateien kopieren
COPY package*.json ./

# 2) Install (Lockfile bevorzugt, sonst Fallback)
ENV NODE_ENV=production
RUN if [ -f package-lock.json ]; then \
      echo "Using npm ci (lockfile found)"; npm ci; \
    else \
      echo "Using npm install (no lockfile)"; npm install; \
    fi

# 3) Restlichen Code
COPY . .

# 4) Build-Metadaten (optional)
ARG GIT_SHA
ARG GIT_BRANCH
ARG BUILD_TIME
ENV NEXT_PUBLIC_BUILD_SHA=${GIT_SHA}
ENV NEXT_PUBLIC_BUILD_BRANCH=${GIT_BRANCH}
ENV NEXT_PUBLIC_BUILD_TIME=${BUILD_TIME}
ENV NEXT_TELEMETRY_DISABLED=1

# 5) Next Build (standalone)
RUN npx next build

# ---------- runtime stage (standalone) ----------
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Nur die Standalone-App + statics + public kopieren
# -> keine dev-Abhängigkeiten nötig
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# (Optional) env files NICHT reinkopieren – Railway liefert ENV selbst
# EXPOSE ist für lokale Doku, Railway ignoriert es, aber egal:
EXPOSE 3000

# Wichtig: Standalone startet über server.js (von Next generiert)
CMD ["node", "server.js"]
