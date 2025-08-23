# ---------- build stage ----------
FROM node:18-alpine AS builder
WORKDIR /app

# System-Deps (optional, stabil auf Alpine)
RUN apk add --no-cache libc6-compat

# 1) Nur package-Dateien, damit der Install-Step sauber gecached wird
COPY package*.json ./

# Für reproduzierbare Builds (wenn Lockfile vorhanden)
ENV NODE_ENV=production
# Auto-Fallback: npm ci falls package-lock.json existiert, sonst npm install
RUN if [ -f package-lock.json ]; then \
      echo "Using npm ci (lockfile found)"; npm ci; \
    else \
      echo "Using npm install (no lockfile)"; npm install; \
    fi

# 2) Restlichen Code kopieren (durch .dockerignore geschützt)
COPY . .

# 3) Build-Metadaten (optional, schön für Health-Check / Footer)
ARG GIT_SHA
ARG GIT_BRANCH
ARG BUILD_TIME
ENV NEXT_PUBLIC_BUILD_SHA=${GIT_SHA}
ENV NEXT_PUBLIC_BUILD_BRANCH=${GIT_BRANCH}
ENV NEXT_PUBLIC_BUILD_TIME=${BUILD_TIME}

# 4) Next.js Build
# Falls du envs fürs Build brauchst, hier als ENV/ARG setzen.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---------- runtime stage ----------
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Nur benötigte Files übernehmen
COPY --from=builder /app/package*.json ./

# Prod-Install mit Auto-Fallback (omit dev)
RUN if [ -f package-lock.json ]; then \
      echo "Using npm ci --omit=dev"; npm ci --omit=dev; \
    else \
      echo "Using npm install --omit=dev"; npm install --omit=dev; \
    fi

# Next Output + Public Assets
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# (Optional) Wenn du serverseitige Routen in /app (Next App Router) brauchst:
COPY --from=builder /app/app ./app
COPY --from=builder /app/next.config.js ./next.config.js

EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]
