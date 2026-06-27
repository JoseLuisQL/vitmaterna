# syntax=docker/dockerfile:1.7
# ============================================================================
# VITMATERNA Backend — Dockerfile de producción (multi-stage)
#
# Stack: Node 22 (ESM) + TypeScript + Prisma 6 + Express 5 + Socket.io + BullMQ
#
# Decisiones clave:
#  - Base "node:22-bookworm-slim" (glibc + OpenSSL 3) en lugar de Alpine:
#    evita los problemas de compilación de bcrypt (musl) y de resolución de
#    engines de Prisma. El target de Prisma es "debian-openssl-3.0.x".
#  - Prisma Client se genera DENTRO del contenedor (nunca se copia node_modules
#    del host), para que el engine coincida con la plataforma del runtime.
#  - El runtime corre como usuario no-root, sin compiladores ni dev-deps, con
#    dumb-init como PID 1 para reenviar SIGTERM y permitir el apagado ordenado
#    (drena trabajos de BullMQ, cierra sockets, DB y Redis).
#  - Stage "migrator" separado conserva el CLI de Prisma para `migrate deploy`.
#    El runtime queda limpio (sin el CLI), más pequeño y seguro.
# ============================================================================

ARG NODE_VERSION=22

# ----------------------------------------------------------------------------
# Stage 1 — base: librerías de sistema comunes a build y runtime
# ----------------------------------------------------------------------------
FROM node:${NODE_VERSION}-bookworm-slim AS base
WORKDIR /app
# openssl  → requerido por el engine de Prisma en Debian bookworm (OpenSSL 3)
# dumb-init→ PID 1 que reenvía señales (SIGTERM/SIGINT) al proceso Node
# ca-certificates → TLS de salida (Twilio, WhatsApp Cloud API, etc.)
RUN apt-get update \
    && apt-get install -y --no-install-recommends openssl ca-certificates dumb-init \
    && rm -rf /var/lib/apt/lists/*

# ----------------------------------------------------------------------------
# Stage 2 — deps: instala TODAS las dependencias (incl. dev) y genera Prisma
# ----------------------------------------------------------------------------
FROM base AS deps
WORKDIR /app
# Toolchain solo para compilar módulos nativos (bcrypt). Nunca llega al runtime.
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*

# Cache de capas: primero los manifests; el schema antes del install para que
# el postinstall de @prisma/client encuentre prisma/schema.prisma.
COPY package.json package-lock.json ./
COPY prisma ./prisma

# npm ci = instalación reproducible desde el lockfile.
RUN --mount=type=cache,target=/root/.npm npm ci
# Genera el Prisma Client para la plataforma del contenedor.
RUN npx prisma generate

# ----------------------------------------------------------------------------
# Stage 3 — build: compila TypeScript a dist/ y poda dev-deps
# ----------------------------------------------------------------------------
FROM deps AS build
WORKDIR /app
COPY tsconfig.json ./
COPY src ./src
# Compila TS → dist/  (salida: dist/src/server.js, dist/prisma/seed.js)
RUN npm run build
# node_modules de solo-producción (conserva el Prisma Client ya generado).
RUN --mount=type=cache,target=/root/.npm npm prune --omit=dev

# ----------------------------------------------------------------------------
# Stage 4 — migrator: imagen de un solo uso para `prisma migrate deploy`
#           Conserva el CLI de Prisma (dev-deps del stage "deps") + dist/.
# ----------------------------------------------------------------------------
FROM deps AS migrator
WORKDIR /app
ENV NODE_ENV=production
# dist/ trae el seed compilado (dist/prisma/seed.js) para sembrar sin tsx.
COPY --from=build /app/dist ./dist
USER node
# Comando por defecto; el compose lo sobreescribe para seed cuando hace falta.
CMD ["npx", "prisma", "migrate", "deploy"]

# ----------------------------------------------------------------------------
# Stage 5 — runtime: imagen final mínima, no-root, sin compiladores ni CLI
# ----------------------------------------------------------------------------
FROM base AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    PORT=3000

# Solo lo imprescindible para ejecutar, con dueño node:node.
COPY --chown=node:node --from=build /app/node_modules ./node_modules
COPY --chown=node:node --from=build /app/dist ./dist
COPY --chown=node:node --from=build /app/package.json ./package.json
# Schema + migraciones por si se quiere inspeccionar/depurar desde el contenedor.
COPY --chown=node:node --from=build /app/prisma ./prisma

USER node
EXPOSE 3000

# Healthcheck usando el fetch nativo de Node 22 (sin curl/wget en la imagen).
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "const p=process.env.PORT||3000;fetch('http://127.0.0.1:'+p+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# dumb-init como PID 1 → reenvía SIGTERM/SIGINT a Node (apagado ordenado).
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/src/server.js"]
