# ---------- build stage ----------
FROM node:18-alpine AS builder
WORKDIR /app

# 1) System deps (optional, je nach Projekt)
RUN apk add --no-cache libc6-compat

# 2) Nur package-Dateien kopieren, damit npm ci gecached werden kann
COPY package*.json ./

# Für reproduzierbare Builds
ENV NODE_ENV=production
RUN npm ci

# 3) Restlichen Code kopieren
# WICHTIG: .dockerignore nutzen, damit keine alten .next/node_modules aus deinem Repo reinkommen
COPY . .

# 4) Commit/Build-Infos reinreichen (zur Anzeige im UI)
# Railway setzt bei Git-Builds i. d. R. diese Vars; falls nicht vorhanden, bleiben sie leer.
ARG GIT_SHA
ARG GIT_BRANCH
ARG BUILD_TIME

# Diese ENV sind zur Laufzeit im Next-Frontend verfügbar:
ENV NEXT_PUBLIC_BUILD_SHA=${GIT_SHA}
ENV NEXT_PUBLIC_BUILD_BRANCH=${GIT_BRANCH}
ENV NEXT_PUBLIC_BUILD_TIME=${BUILD_TIME}

# 5) Next.js Build
RUN npm run build

# ---------- runtime stage ----------
FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Nur notwendige Dateien rüberkopieren
COPY --from=builder /app/package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

# (Optional) Falls du serverseitige Routen (app/api) brauchst:
COPY --from=builder /app/app ./app
COPY --from=builder /app/next.config.js ./next.config.js

# Port von Railway
ENV PORT=3000
EXPOSE 3000

# Start (Next.js standalone wäre noch schlanker, falls aktiviert)
CMD ["npx", "next", "start", "-p", "3000"]
