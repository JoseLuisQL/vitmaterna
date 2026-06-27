# Despliegue en producción con Docker (VPS)

Guía para desplegar el **backend de VITMATERNA** en un VPS usando Docker. La
configuración fue probada de extremo a extremo (build de la imagen, migraciones,
seed, arranque del stack completo, login por HTTPS a través de Caddy y apagado
ordenado).

## Arquitectura

```
Internet ──▶ Caddy (80/443, HTTPS automático) ──▶ api (Node 22, :3000)
                                                     │
                          red privada "internal" ────┼──▶ postgres:16  (sin puerto público)
                                                     └──▶ redis:7      (sin puerto público)
```

- **Caddy** es el único servicio con puertos públicos (80/443). Obtiene y renueva
  certificados Let's Encrypt automáticamente y proxya WebSockets (Socket.io) sin
  configuración extra.
- **postgres** y **redis** viven en una red privada de Docker — **no** publican
  puertos al host, así que no son accesibles desde Internet.
- Las **migraciones** y el **seed** corren como jobs de un solo uso, no en el
  arranque de la app.

## Archivos relevantes

| Archivo | Propósito |
|---|---|
| `backend/Dockerfile` | Imagen backend multi-stage (deps → build → migrator → runtime) |
| `backend/.dockerignore` | Mantiene el contexto de build del backend limpio |
| `frontend/Dockerfile.web` | Build del frontend web (Expo export → Caddy estático) |
| `frontend/.dockerignore` | Mantiene el contexto de build del frontend limpio |
| `docker-compose.prod.yml` | Orquestación de producción (backend + web + datos) |
| `Caddyfile.web` | Edge proxy: sirve el frontend + COOP/COEP + proxy `/api` |
| `Caddyfile` | (Alternativa) proxy solo-API para arquitectura de subdominios |
| `.env.production.example` | Plantilla de variables (cópiala a `.env`) |

## Requisitos en el VPS

- Docker Engine 24+ y el plugin Docker Compose v2 (`docker compose`).
- Un dominio (p. ej. `api.vitmaterna.pe`) con un registro DNS **A/AAAA**
  apuntando a la IP pública del VPS.
- Puertos **80** y **443** abiertos en el firewall (`ufw allow 80,443/tcp`).

Instalar Docker en Ubuntu/Debian:

```bash
curl -fsSL https://get.docker.com | sh
```

## Pasos de despliegue

```bash
# 1. Clona el repo en el VPS
git clone https://github.com/JoseLuisQL/vitmaterna.git
cd vitmaterna

# 2. Crea el archivo de entorno a partir de la plantilla
cp .env.production.example .env

# 3. Edita .env y rellena valores REALES
#    - API_DOMAIN con tu dominio real
#    - contraseñas de Postgres y Redis (genera con: openssl rand -base64 36)
#    - secretos JWT (mínimo 32 caracteres cada uno)
#    - CORS_ORIGINS con los dominios de tu frontend
nano .env

# 4. Construye las imágenes y arranca el stack.
#    El orden está gestionado por depends_on + healthchecks:
#    postgres/redis sanos → migrate corre y termina → api arranca → caddy arranca
docker compose -f docker-compose.prod.yml up -d --build

# 5. SOLO la primera vez: crea el usuario admin (seed de producción).
#    Este seed NO inserta datos demo; crea únicamente el admin. Es idempotente.
docker compose -f docker-compose.prod.yml --profile seed run --rm seed
```

> El seed de producción usa las variables `ADMIN_*` del `.env`. Define
> `ADMIN_PASSWORD` con una contraseña fuerte **antes** de sembrar (o cámbiala
> tras el primer login). Credenciales por defecto: DNI `99999999` /
> contraseña `Admin@2026`.

Verifica:

```bash
docker compose -f docker-compose.prod.yml ps          # todo "Up"/"healthy"
docker compose -f docker-compose.prod.yml logs -f api  # logs de la API
curl https://TU_DOMINIO/health                          # {"success":true,...}
```

Documentación Swagger disponible en `https://TU_DOMINIO/docs`.

## Operación diaria

```bash
# Ver estado / logs
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f api

# Aplicar una nueva versión del código
git pull
docker compose -f docker-compose.prod.yml up -d --build   # reconstruye y re-migra

# Reiniciar solo la API
docker compose -f docker-compose.prod.yml restart api

# Apagar todo (los datos persisten en los volúmenes)
docker compose -f docker-compose.prod.yml down

# Apagar y BORRAR datos (¡cuidado!)
docker compose -f docker-compose.prod.yml down -v
```

## Migraciones

- Producción usa **`prisma migrate deploy`** (solo aplica migraciones ya
  commiteadas; nunca `migrate dev`).
- Corren en el servicio `migrate`, un contenedor de un solo uso. El servicio
  `api` espera a que termine con éxito (`service_completed_successfully`) antes
  de arrancar, evitando que la app reciba tráfico contra un esquema a medias.
- **Antes de una migración importante en producción, respalda la base de datos**
  (ver más abajo).

## Backups de PostgreSQL

```bash
# Backup
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup_$(date +%F).sql

# Restore
cat backup_2026-06-27.sql | docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U "$POSTGRES_USER" "$POSTGRES_DB"
```

Programa el backup con un cron en el host.

### Backup desde el panel de admin (descarga `.sql`)

El backend expone un endpoint que genera y descarga una copia de seguridad
**completa y restaurable** de la base de datos en formato `.sql`:

```
GET /v1/admin/backup
```

- **Solo accesible para el usuario admin** (requiere token JWT con rol `admin`;
  cualquier otro rol recibe `403`).
- Internamente ejecuta `pg_dump --format=plain --clean --if-exists --no-owner
  --no-privileges` y transmite el resultado en streaming (sin cargar todo en
  memoria), por lo que funciona también con bases de datos grandes.
- Cada descarga queda registrada en el log de la API (`backup.start` /
  `backup.success` con el ID del admin, sin exponer credenciales).
- El archivo se descarga como `vitmaterna-<db>-<timestamp>.sql`.

Restaurar ese archivo en una base limpia:

```bash
psql -v ON_ERROR_STOP=1 -h <host> -U <user> -d <db_destino> -f vitmaterna-....sql
```

> Requiere `postgresql-client-16` dentro de la imagen (ya incluido en el
> `Dockerfile`), que coincide con el servidor Postgres 16.

## El frontend (Expo)

El frontend de `frontend/` es una app Expo / React Native. **No** corre con
`expo start` en producción: se **exporta a un sitio estático** (`expo export -p
web` → carpeta `dist/`) y se sirve con un servidor web.

### Web — incluido en este stack (mismo dominio)

El stack ya incluye el servicio **`web`** (`frontend/Dockerfile.web` +
`Caddyfile.web`). Es el proxy de borde con HTTPS y:

- Sirve el `dist/` estático en `https://APP_DOMAIN/`.
- Hace reverse proxy de `https://APP_DOMAIN/api/*` al backend → **mismo origen,
  sin CORS**.
- Envía las cabeceras **COOP/COEP** que `expo-sqlite` (WASM + SharedArrayBuffer)
  necesita; sin ellas la app carga pero crashea al iniciar su base local.
- Fallback **SPA** (rutas desconocidas → `index.html`) y MIME `application/wasm`.

`EXPO_PUBLIC_API_URL` se "hornea" en el bundle en tiempo de build (como
`--build-arg`); el compose lo fija a `https://APP_DOMAIN/api/v1`
automáticamente. Si cambias de dominio, **reconstruye** la imagen `web`.

Verificar tras desplegar:

```bash
curl -skI https://APP_DOMAIN/ | grep -i cross-origin   # COOP + COEP presentes
# En la consola del navegador, sobre el sitio desplegado:
#   window.crossOriginIsolated === true
```

> **App móvil (APK/AAB):** se compila aparte con EAS (`eas build`) — ver
> `GUIA_APK.md`. Ahí `EXPO_PUBLIC_API_URL` debe apuntar a `https://APP_DOMAIN/api/v1`.

## Notas de seguridad y hardening

- El `.env` con secretos **nunca** se commitea (está en `.gitignore`).
- Postgres y Redis no exponen puertos al host; Redis además exige contraseña.
- La API corre como usuario **no-root** (`node`) dentro del contenedor.
- Cabeceras de seguridad básicas configuradas en el `Caddyfile` (puedes activar
  HSTS cuando confirmes HTTPS estable).
- Para escalar a varias réplicas de `api` necesitarías además el
  `@socket.io/redis-adapter` y sticky sessions en el proxy (no necesario para una
  sola instancia).

## Si construyes en Mac (Apple Silicon) y despliegas en un VPS x86

Los binarios nativos (bcrypt) y el engine de Prisma son específicos de la
arquitectura. Si construyes la imagen en una máquina ARM para un VPS amd64, usa:

```bash
docker buildx build --platform linux/amd64 --target runtime -t vitmaterna-backend:latest ./backend
```

Lo más simple: construir directamente **en el VPS** (como en los pasos de arriba).
