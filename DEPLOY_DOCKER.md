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
| `backend/Dockerfile` | Imagen multi-stage (deps → build → migrator → runtime) |
| `backend/.dockerignore` | Mantiene el contexto de build limpio |
| `docker-compose.prod.yml` | Orquestación de producción |
| `Caddyfile` | Reverse proxy + HTTPS |
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

# 5. SOLO la primera vez: siembra datos iniciales (idempotente)
docker compose -f docker-compose.prod.yml --profile seed run --rm seed
```

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

## El frontend (Expo)

El frontend de `frontend/` es una app Expo / React Native. **No** se despliega en
este stack Docker (que es solo el backend/API). Opciones:

- **App móvil:** compila el APK/AAB con EAS (`eas build`) — ver `GUIA_APK.md`.
- **Web:** `expo export -p web` genera estáticos que puedes servir con Caddy/Nginx
  o un hosting estático (Vercel, Netlify, Cloudflare Pages).

En ambos casos, apunta `EXPO_PUBLIC_API_URL` a `https://TU_DOMINIO/v1`.

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
