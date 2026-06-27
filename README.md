<div align="center">

<img src="vitmaterna_logo.png" alt="VITMATERNA" width="180" />

# VITMATERNA

**Plataforma digital de salud prenatal para gestantes de zona rural andina**

Centro de Salud Talavera · Andahuaylas, Apurímac, Perú · 2.926 msnm

[![Node](https://img.shields.io/badge/Node-22-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Expo](https://img.shields.io/badge/Expo-SDK%2056-000020?logo=expo&logoColor=white)](https://expo.dev)
[![React Native](https://img.shields.io/badge/React%20Native-0.85-61DAFB?logo=react&logoColor=black)](https://reactnative.dev)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)

</div>

---

## Tabla de contenidos

- [¿Qué es VITMATERNA?](#qué-es-vitmaterna)
- [Características principales](#características-principales)
- [El cerebro clínico](#el-cerebro-clínico)
- [Arquitectura](#arquitectura)
- [Stack tecnológico](#stack-tecnológico)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Puesta en marcha](#puesta-en-marcha)
- [Generar el APK (Android)](#generar-el-apk-android)
- [Despliegue en producción (Docker / VPS)](#despliegue-en-producción-docker--vps)
- [Variables de entorno](#variables-de-entorno)
- [Roles y flujos de usuario](#roles-y-flujos-de-usuario)
- [Motor de alertas proactivas](#motor-de-alertas-proactivas)
- [Estrategia offline-first](#estrategia-offline-first)
- [API REST](#api-rest)
- [Tiempo real (WebSocket)](#tiempo-real-websocket)
- [Modelo de datos](#modelo-de-datos)
- [Seguridad y cumplimiento](#seguridad-y-cumplimiento)
- [Feature flags (alcance configurable)](#feature-flags-alcance-configurable)
- [Credenciales de prueba](#credenciales-de-prueba)
- [Scripts disponibles](#scripts-disponibles)
- [Pruebas](#pruebas)

---

## ¿Qué es VITMATERNA?

VITMATERNA **no es un CRUD médico**: es un **sistema de soporte a la decisión clínica** centrado en la gestante andina. Su objetivo es elevar dos indicadores críticos de salud materna en una zona de conectividad intermitente y a gran altitud:

1. **Adherencia a los controles prenatales** (meta OMS: 8+ controles).
2. **Adherencia a la suplementación** con hierro y ácido fólico.

Para lograrlo entrega a las gestantes una app de seguimiento de su embarazo y a los obstetras herramientas de monitoreo con **alertas tempranas automáticas**.

Tres principios articulan todo el sistema:

| Principio | Qué significa |
|---|---|
| **El servidor calcula, no confía en el cliente** | FPP, edad gestacional, hemoglobina corregida por altitud, nivel de riesgo y adherencia se computan en el backend con normas MINSA/OMS. |
| **Proactividad** | Un cron horario convierte datos en acción: recordatorios, alertas de inasistencia, baja adherencia, exámenes pendientes y botón de pánico con GPS. |
| **Funciona sin internet** | Offline-first de punta a punta (caché de lecturas + outbox idempotente de escrituras + sincronización incremental). |

---

## Características principales

- 📅 **Cronograma automático de 8 controles prenatales** según esquema MINSA (semanas 12, 18, 23, 27, 31, 34, 37, 39).
- 🩸 **Corrección de hemoglobina por altitud** y clasificación automática de anemia.
- 🚦 **Cálculo automático de nivel de riesgo** (semáforo verde / amarillo / rojo).
- 💊 **Seguimiento de adherencia a suplementos** con registro diario idempotente.
- 🆘 **Botón de pánico con GPS** y reporte de signos de alarma en tiempo real.
- 💬 **Chat clínico en tiempo real** (presencia, "escribiendo…", vistos) vía Socket.IO.
- 🔔 **Notificaciones multicanal**: push (Expo), SMS (Twilio), WhatsApp Business e in-app.
- 📊 **Reportes e indicadores MINSA** para obstetras y dashboard global para el admin.
- 📴 **Modo offline real** para zonas sin señal.
- 🏠 **Visitas domiciliarias** con acta en formato MINSA y geolocalización.
- 🔐 **Identidad por DNI** (no por email) con JWT, RBAC y auditoría automática.

---

## El cerebro clínico

Lo que diferencia a VITMATERNA de un sistema genérico vive en `backend/src/utils/`. El backend es la **fuente de verdad** e ignora cualquier cálculo que envíe el cliente.

### Corrección de hemoglobina por altitud ⭐

A 2.926 msnm el factor de corrección MINSA es **−1,8 g/dL**:

```
Hb_corregida = Hb_observada + factor(altitud)   // el factor es negativo
```

Una Hb de **12 g/dL** que parecería normal, corregida a **10,2 g/dL** es **anemia leve** → puede elevar el nivel de riesgo. Se aplica automáticamente al guardar un examen de hemoglobina.

Clasificación de anemia (sobre la Hb corregida): `normal ≥ 11` · `leve 10–10.9` · `moderada 7–9.9` · `severa < 7`.

### Cálculo automático de riesgo (semáforo) ⭐

Sistema de puntaje que decide el nivel: `score ≥ 4 → rojo` · `≥ 2 → amarillo` · `resto → verde`.

| Factor | Puntos |
|---|---|
| Edad < 15 / > 40 | +3 |
| Adolescente < 18 / > 35 | +2 |
| IMC < 18.5 (+2) · ≥ 30 (+2) · ≥ 35 (+3) | |
| Anemia: severa (+4) · moderada (+2) · leve (+1) | |
| Presión ≥ 140/90 (+3) · ≥ 160/110 (+4) | |
| ≥ 2 cesáreas (+3) · 1 cesárea (+1) | |
| Aborto habitual ≥ 3 (+3) · óbito fetal (+3) | |
| Gran multigesta > 5 (+2) · Rh sensitizado (+3) | |
| Antecedentes (diabetes, HTA, preeclampsia, VIH, cardiopatía…) | +3 c/u |

El riesgo se **recalcula automáticamente** al guardar un control prenatal, un resultado de laboratorio, un antecedente o al editar la ficha de la gestante.

### Cálculos obstétricos

- **FPP** (fecha probable de parto) por **regla de Naegele**: `FUM + 7 días − 3 meses + 1 año`.
- **Edad gestacional**: semanas/días desde la FUM.
- **Trimestre**: 1 (≤ 13 sem) · 2 (14–27) · 3 (≥ 28). **Semanas restantes**: `40 − EG`.

### Agenda inteligente

Horario 08:00–17:00, slots de 30 min, refrigerio 13:00–14:00 excluido. Valida horario laboral y **bloquea choques de cita** (HTTP 409) para citas de establecimiento.

---

## Arquitectura

```
┌─────────────────────────────┐         REST  /v1          ┌──────────────────────────────┐
│        FRONTEND (Expo)       │ ◄────────────────────────► │        BACKEND (Express)       │
│  iOS · Android · Web         │       WebSocket (Socket.IO)│                                │
│  Expo Router · React Query   │ ◄────────────────────────► │  Auth · Patients · Appointments│
│  Zustand · Axios             │                            │  Clinical · Chat · Reports     │
│  Outbox offline (SQLite)     │                            │  Notifications · Admin · Sync  │
└─────────────────────────────┘                            └───────────────┬────────────────┘
                                                                            │
                                                            ┌───────────────┼───────────────┐
                                                            │               │               │
                                                      ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼──────┐
                                                      │PostgreSQL │   │   Redis   │   │ Cron horario│
                                                      │ (Prisma)  │   │  (BullMQ) │   │  (alertas)  │
                                                      └───────────┘   └───────────┘   └─────────────┘
```

Monorepo con dos aplicaciones independientes que se comunican **solo por REST + WebSocket**. El backend monta Socket.IO sobre el mismo servidor HTTP y expone una instancia global (`socketRegistry`) para que los servicios REST emitan eventos en tiempo real.

---

## Stack tecnológico

### Backend
- **Node.js 22** + **Express 5** + **TypeScript**
- **Prisma 6** ORM sobre **PostgreSQL 16**
- **Redis 7** + **BullMQ** (colas)
- **Socket.IO** (tiempo real)
- **JWT** (`jsonwebtoken`) + **bcrypt** (12 rounds)
- **Zod** (validación) · **Helmet** · **express-rate-limit** · **Pino** (logging)
- **Swagger** (documentación de API) · **Expo Server SDK** (push)

### Frontend
- **React Native 0.85** / **Expo SDK 56** (iOS, Android y Web)
- **Expo Router** (navegación por carpetas)
- **TanStack Query** (datos de servidor + caché offline) + **Zustand** (estado de auth)
- **Axios** con interceptores (JWT + refresh automático)
- **expo-sqlite** (outbox/base local) · **expo-notifications** · **expo-location** · **expo-secure-store**
- Sistema de tema propio con paletas por rol, modo oscuro y ~50 componentes UI

---

## Estructura del repositorio

```
vitmaterna/
├── backend/                  API Node.js (Express + Prisma + PostgreSQL + Redis + Socket.IO)
│   ├── prisma/               schema.prisma · migraciones · seed
│   ├── src/
│   │   ├── config/           bootstrap de la app, Swagger, socketRegistry
│   │   ├── middleware/        authenticate · rbac · validate · auditLogger · rateLimiter · featureFlag
│   │   ├── modules/          auth · patients · appointments · clinical · home-visits
│   │   │                     education · notifications · chat · reports · sync · admin
│   │   │                     (cada módulo: routes → schema (Zod) → controller → service)
│   │   ├── sockets/          handlers de Socket.IO (chat, presencia)
│   │   ├── utils/            dateCalc · hemoglobinCorrection · riskCalculator · imcClassification
│   │   │                     screeningThresholds · appointmentSlots · adherence · featureFlags
│   │   └── server.ts         punto de entrada
│   └── docker-compose.yml    PostgreSQL + Redis
│
├── frontend/                 App Expo / React Native
│   ├── app/                  rutas (Expo Router)
│   │   ├── (auth)/           login · register · forgot-password
│   │   ├── (gestante)/       inicio · citas · tratamiento · educación · chat · perfil · alarmas · visitas
│   │   ├── (obstetra)/       inicio · gestantes · cronograma · alertas · chat · reportes · atender · control
│   │   └── (admin)/          dashboard · usuarios · sedes · contenido · auditoría · config · supervisión
│   └── src/                  components · hooks · services · store · theme · database · utils
│
├── docs/                     documentación de planes y análisis
├── StartApp/                 bundle de diseño (Figma) — auxiliar
├── prd.md                    PRD del producto
├── implementation_plan.md    plan de implementación
└── ANALISIS_SISTEMA_COMPLETO.md
```

---

## Puesta en marcha

> Esta sección es para **desarrollo local**. Para desplegar en un servidor con
> Docker, ve a **[Despliegue en producción (Docker / VPS)](#despliegue-en-producción-docker--vps)**.

### Requisitos

- **Node.js ≥ 22**
- **Docker** y **Docker Compose** (para PostgreSQL y Redis), o instancias nativas equivalentes
- **npm**

### 1. Clonar el repositorio

```bash
git clone https://github.com/JoseLuisQL/vitmaterna.git
cd vitmaterna
```

### 2. Backend

```bash
cd backend

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env        # ajusta DATABASE_URL y secretos si es necesario

# Levantar PostgreSQL y Redis
docker compose up -d

# Generar el cliente de Prisma
npm run prisma:generate

# Aplicar migraciones
npm run prisma:migrate

# Sembrar datos de prueba
npm run prisma:seed

# Iniciar el servidor en modo desarrollo
npm run dev
```

La API queda disponible en `http://localhost:3000`:
- **Swagger**: http://localhost:3000/docs
- **Health check**: http://localhost:3000/health

### 3. Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Configurar la URL de la API
# edita frontend/.env → EXPO_PUBLIC_API_URL=http://localhost:3000/v1
#   (usa la IP de tu máquina en LAN si pruebas en un dispositivo físico)

# Web
npm run web              # http://localhost:8081

# Android / iOS
npm run android
npm run ios
```

---

## Generar el APK (Android)

Guía rápida para construir el instalable `.apk`. La guía completa
(paso a paso, build en la nube o local, solución de problemas) está en
**[GUIA_APK.md](GUIA_APK.md)**.

### Cómo se conecta con el backend

La app elige su backend con dos variables (en `frontend/eas.json`, campo `env`
de cada perfil, o en `frontend/.env` durante el desarrollo):

| Variable | Qué hace | Ejemplo |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | URL del backend que usa la app | `http://192.168.18.21:3000/v1` |
| `APP_ENV` | `local` o `production` (controla el HTTP en claro) | `local` |

> En **local**, `app.config.js` habilita el tráfico HTTP en claro (Android 9+ lo
> bloquea por defecto). En **producción** se exige HTTPS automáticamente.

### Preparar (una sola vez)

```bash
npm install -g eas-cli && eas login
cd frontend && npm install && eas init   # vincula el proyecto a tu cuenta Expo
```

### APK de prueba (backend en tu PC)

```bash
# 1) Averigua la IP de tu PC:  Windows → ipconfig | Linux/Mac → ip a
# 2) Ponla en frontend/eas.json, perfil "apk-local":
#       "EXPO_PUBLIC_API_URL": "http://TU_IP:3000/v1"
# 3) Levanta el backend (cd backend && npm run dev) en la MISMA red Wi-Fi
cd frontend
npm run build:apk:local
```

### APK de producción (backend público por HTTPS)

```bash
# El backend de producción ya está fijado en frontend/eas.json (mismo origen que
# el despliegue Docker): "EXPO_PUBLIC_API_URL": "https://vitmaterna.qware.me/api/v1"
# Si cambias de dominio, edítalo en los perfiles "production-apk" / "production".
cd frontend
npm run build:apk:prod     # APK para repartir directamente
npm run build:aab:prod     # .aab para subir a Google Play
```

| Comando | Perfil | Resultado |
|---|---|---|
| `npm run build:apk:local` | `apk-local` | APK que apunta a tu PC (LAN) |
| `npm run build:apk:preview` | `preview` | APK de prueba con backend de producción |
| `npm run build:apk:prod` | `production-apk` | **APK final** de producción |
| `npm run build:aab:prod` | `production` | `.aab` para Google Play |

> Añade el sufijo `:here` (`build:apk:local:here`, `build:apk:prod:here`) para
> compilar en tu propia PC (requiere Android Studio + JDK 17) en vez de la nube.

### Actualizaciones OTA (sin reinstalar el APK)

La app usa **EAS Update**: los cambios de código JS/TS llegan a los dispositivos
ya instalados sin regenerar el APK. Solo necesitas un APK nuevo cuando cambias algo
**nativo** (nueva librería nativa, permisos, Expo SDK).

```bash
cd frontend
eas update --branch production --message "describe tu cambio"
```

Setup inicial (una vez): `eas init && eas update:configure`. Detalle completo en
**[GUIA_APK.md](GUIA_APK.md)** (sección "Actualizaciones OTA").

---

## Despliegue en producción (Docker / VPS)

Un solo comando levanta **todo** el sistema en tu VPS: frontend web + API +
PostgreSQL + Redis + HTTPS automático + migraciones. La guía detallada (backups,
operación diaria, hardening) está en **[DEPLOY_DOCKER.md](DEPLOY_DOCKER.md)**.

### Qué se levanta

Todo se orquesta con `docker-compose.prod.yml` (6 servicios, en orden automático
gracias a `depends_on` + healthchecks):

```
Internet ─▶ web/Caddy (80/443, HTTPS automático)
              ├─ /        → frontend web estático (Expo export)
              └─ /api/*   → reverse proxy ─▶ api (Node 22, :3000)
                                               │  (red privada, sin puerto público)
                                  ┌────────────┼────────────┐
                                  ▼            ▼            ▼
                              postgres:16   redis:7     migrate (job 1 sola vez)
```

| Servicio | Función | Arranque |
|---|---|---|
| `postgres` | Base de datos (privada, sin puerto al host) | automático |
| `redis` | Cache/colas BullMQ (privado, con contraseña) | automático |
| `migrate` | `prisma migrate deploy` (corre y termina) | automático |
| `api` | Backend Node 22 (detrás de Caddy) | automático |
| `web` | **Frontend web + Caddy (HTTPS, proxy `/api`)** | automático |
| `seed` | Crea **solo** el usuario admin (sin datos demo) | **manual, 1ª vez** |

> El **frontend web sí queda corriendo** con el mismo `docker compose up`. La app
> Android (`.apk`/`.aab`) **no** se construye con Docker: se compila aparte con EAS
> (ver [Generar el APK](#generar-el-apk-android)).

### Requisitos en el VPS

- **Docker Engine 24+** con el plugin **Docker Compose v2** (`docker compose`).
  Instalación en Ubuntu/Debian: `curl -fsSL https://get.docker.com | sh`
- Un **dominio** (cualquiera que controles) con un registro DNS **A/AAAA**
  apuntando a la IP pública del VPS.
- Puertos **80** y **443** abiertos en el firewall: `ufw allow 80,443/tcp`

### El dominio es configurable

No está fijado a `vitmaterna.pe`. Se define en **una sola variable**, `APP_DOMAIN`,
de tu archivo `.env`. Úsalo con el dominio o subdominio que quieras
(p. ej. `app.midominio.com`). Ese valor:

- Caddy lo usa para emitir el **certificado HTTPS** (Let's Encrypt) de ese dominio.
- Se **"hornea" en el bundle web** en tiempo de build como
  `EXPO_PUBLIC_API_URL=https://APP_DOMAIN/api/v1`.

> **El DNS debe apuntar antes de levantar**, o Caddy no podrá emitir el certificado
> HTTPS. Si **cambias de dominio** más adelante, **reconstruye la imagen web**
> (`docker compose -f docker-compose.prod.yml up -d --build web`); no basta con
> reiniciar, porque el dominio queda incrustado en el JS del frontend.

### Pasos de despliegue

```bash
# 1. Clona el repo en el VPS
git clone https://github.com/JoseLuisQL/vitmaterna.git
cd vitmaterna

# 2. Crea el archivo de entorno a partir de la plantilla
cp .env.production.example .env

# 3. Edita .env con valores REALES (ver tabla abajo)
#    Genera secretos fuertes con:  openssl rand -base64 36
nano .env

# 4. Construye las imágenes y levanta TODO el stack
#    (postgres/redis sanos → migrate → api → web, gestionado automáticamente)
docker compose -f docker-compose.prod.yml up -d --build

# 5. SOLO la primera vez: crea el usuario admin (seed de producción, idempotente)
docker compose -f docker-compose.prod.yml --profile seed run --rm seed
```

### Variables mínimas a rellenar en `.env`

| Variable | Qué poner |
|---|---|
| `APP_DOMAIN` | Tu dominio real (con DNS ya apuntando al VPS) |
| `POSTGRES_PASSWORD` | Contraseña fuerte (`openssl rand -base64 36`) |
| `REDIS_PASSWORD` | Contraseña fuerte (`openssl rand -base64 36`) |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Secretos distintos, **≥ 32 caracteres** cada uno |
| `CORS_ORIGINS` | `https://APP_DOMAIN` (mismo origen) |
| `ADMIN_PASSWORD` | Contraseña fuerte del admin **antes** de sembrar |

> Los canales SMS/WhatsApp vienen en `mock` (solo registran en consola). Para envío
> real, completa las credenciales de Twilio/WhatsApp en `.env` o actívalos en
> caliente desde el panel de admin. El resto de variables tienen valores por defecto
> sensatos.

### Verificar el despliegue

```bash
docker compose -f docker-compose.prod.yml ps           # todo "Up"/"healthy"
docker compose -f docker-compose.prod.yml logs -f api   # logs de la API
curl https://TU_DOMINIO/health                          # {"success":true,...}
```

- **Frontend web** → `https://TU_DOMINIO/`
- **API** → `https://TU_DOMINIO/api/v1`
- **Swagger** → `https://TU_DOMINIO/docs`

### Operación diaria

```bash
# Aplicar una nueva versión del código (reconstruye y re-migra)
git pull
docker compose -f docker-compose.prod.yml up -d --build

# Reiniciar solo la API
docker compose -f docker-compose.prod.yml restart api

# Apagar todo (los datos persisten en los volúmenes)
docker compose -f docker-compose.prod.yml down

# Backup de la base de datos
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup_$(date +%F).sql
```

> Más detalle (restore, backup desde el panel de admin, hardening, build en
> Apple Silicon para VPS x86) en **[DEPLOY_DOCKER.md](DEPLOY_DOCKER.md)**.

---

## Variables de entorno

### Backend (`backend/.env`)

| Variable | Descripción | Ejemplo |
|---|---|---|
| `NODE_ENV` | Entorno de ejecución | `development` |
| `PORT` | Puerto del servidor | `3000` |
| `API_PREFIX` | Prefijo de la API | `/v1` |
| `DATABASE_URL` | Cadena de conexión PostgreSQL | `postgresql://user:pass@localhost:5432/vitmaterna_dev?schema=public` |
| `REDIS_HOST` / `REDIS_PORT` / `REDIS_PASSWORD` | Conexión Redis | `localhost` / `6379` |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Secretos JWT (≥ 32 chars) | — |
| `JWT_ACCESS_EXPIRES_IN` / `JWT_REFRESH_EXPIRES_IN` | Vigencia de tokens | `15m` / `30d` |
| `CORS_ORIGINS` | Orígenes permitidos (coma) | `http://localhost:8081` |
| `RATE_LIMIT_*` | Límites de tasa | — |
| `DEFAULT_ALTITUDE_MSNM` | Altitud por defecto (corrección Hb) | `2926` |
| `SMS_PROVIDER` / `WHATSAPP_PROVIDER` | `mock`, `twilio`, `whatsapp_cloud` | `mock` |
| `TWILIO_*` / `WHATSAPP_*` | Credenciales de canales (opcional) | — |
| `BCRYPT_SALT_ROUNDS` | Rondas de bcrypt | `12` |

> Sin credenciales de SMS/WhatsApp, los canales operan en **modo mock** (registran en consola). El admin puede activar Twilio o WhatsApp Business **en caliente** desde el panel de configuración, sin reiniciar el servidor.

### Frontend (`frontend/.env`)

| Variable | Descripción |
|---|---|
| `EXPO_PUBLIC_API_URL` | URL base de la API, p.ej. `http://localhost:3000/v1` |

---

## Roles y flujos de usuario

El sistema tiene **3 roles** con navegación y permisos diferenciados.

### 👩 Gestante (paciente)

- **Inicio**: estado del embarazo (EG, trimestre, semanas para la FPP), próxima cita, recordatorio de la pastilla del día y su nivel de riesgo.
- **Citas**: confirma sus citas o solicita reprogramación (queda pendiente de aprobación del obstetra).
- **Tratamiento**: marca el consumo diario de suplementos (idempotente por día) con actualización optimista; sin red se encola en la outbox.
- **Educación**: artículos, infografías y videos por trimestre y semana de gestación.
- **Chat**: mensajería en tiempo real con su obstetra.
- **Alarmas (signos de alarma)** ⭐: reporta síntomas; si son graves se notifica al obstetra (push + in-app) y se publica un mensaje de emergencia en el chat clínico al instante.
- **Botón de pánico**: envía su ubicación GPS al obstetra con enlace a Google Maps.
- **Visitas** domiciliarias y **bandeja de notificaciones**.

### 🩺 Obstetra (profesional)

- **Inicio**: panel con citas del día y alertas pendientes.
- **Gestantes**: lista de sus pacientes con semáforo de riesgo; ficha clínica completa; alta de nuevas gestantes (contraseña inicial = su DNI).
- **Cronograma**: agenda con disponibilidad y anti-doble-booking.
- **Atender cita → control prenatal**: registra signos vitales y mediciones fetales; el sistema autonumera el control, recalcula el riesgo y agenda la próxima cita.
- Registra **laboratorios**, **vacunas**, **antecedentes** (y módulos opcionales si están activos: ecografías, peso, tamizajes, patologías, odontograma, consejería).
- **Mensaje masivo** filtrado por trimestre y nivel de riesgo; **recomendación de contenido educativo**.
- **Reportes**: indicadores MINSA y de la tesis (adherencia, asistencia, distribución de riesgo).

### 🛠️ Administrador

- **Dashboard** global: usuarios, gestantes activas/de alto riesgo, citas, alertas y estado de los canales.
- **Usuarios**: aprueba obstetras (el auto-registro queda pendiente de verificación), crea/edita/desactiva y resetea contraseñas.
- **Sedes**: establecimientos de salud con su altitud (msnm).
- **Contenido educativo**: CRUD completo.
- **Notificaciones / canales**: activa Twilio y WhatsApp Business sin reiniciar.
- **Auditoría**: bitácora de toda mutación del sistema.
- **Configuración y feature flags**: enciende/apaga módulos opcionales.

### Ciclo de vida de una cita

```
[obstetra crea] → programada
  gestante → confirmada → (obstetra) asistida / no_asistida
  gestante → solicitud_reprogramacion → obstetra aprueba (nueva fecha) o rechaza (estado previo)
  obstetra → convertir-domiciliaria (modalidad domiciliaria, notifica a la gestante)
  cron → no_asistida (si vence +24h)
```

---

## Motor de alertas proactivas

Un cron arranca con el servidor y corre **cada hora** (`notification.service.ts`), ejecutando seis escáneres:

1. **Recordatorios de cita** a la gestante y al acompañante: a **3 días, 1 día y 2 horas** (push + SMS + WhatsApp, con flags anti-repetición).
2. **Recordatorio de suplemento** diario si pasó la hora de toma y no hay registro de consumo.
3. **Inasistencias**: cita vencida +24 h → se marca `no_asistida` y se alerta al obstetra.
4. **Baja adherencia** (< 50 % con ≥ 7 días de tratamiento) → alerta al obstetra.
5. **FPP próxima** en hitos de 30 / 15 / 7 / 3 días → aviso a gestante y acompañante.
6. **Exámenes obligatorios pendientes** (Hb, VIH, sífilis, glucosa, orina) según edad gestacional → alerta al obstetra.

---

## Estrategia offline-first

Diseñada para la conectividad intermitente de la zona rural andina:

- **Lecturas**: caché de TanStack Query persistida (AsyncStorage/localStorage, 7 días, `networkMode: offlineFirst`). Al reabrir sin señal, las pantallas muestran los últimos datos.
- **Escrituras**: **outbox** persistente (SQLite en nativo / localStorage en web). Las operaciones críticas (consumo de suplemento, signo de alarma) se encolan con `dedupeKey`, se reintentan con backoff al reconectar, descartan errores 4xx y reintentan errores de red/5xx. La idempotencia se garantiza también del lado del servidor.
- **Sincronización** (`/sync`): endpoint pull/push incremental por `updatedAt`.
- **UI**: banner de modo offline e indicador de operaciones pendientes.

---

## API REST

Todas las rutas cuelgan del prefijo `/v1`. Contrato de respuesta uniforme:

```json
// éxito
{ "success": true, "data": { }, "meta": { "page": 1, "totalPages": 5 } }
// error
{ "success": false, "error": { "code": "NOT_FOUND", "message": "…" } }
```

| Módulo | Base | Endpoints destacados |
|---|---|---|
| **Auth** | `/auth` | `POST /register` · `POST /login` · `POST /refresh` · `POST /logout` · `GET /me` · `PATCH /me` · `POST /forgot-password` · `POST /reset-password` |
| **Patients** | `/patients` | `POST /` · `GET /` · `GET /buscar` · `GET /:id` · `PATCH /:id` · `PATCH /:id/ubicacion` |
| **Appointments** | `/appointments` | `POST /` · `GET /` · `GET /availability` · `PATCH /:id/reschedule` · `PATCH /:id/status` · `PATCH /:id/confirm` · `PATCH /:id/request-reschedule` · `PATCH /:id/resolve-reschedule` · `PATCH /:id/convertir-domiciliaria` |
| **Clinical** | `/clinical` | `controls` · `treatments` (+ `/:id/log`) · `antecedentes` · `danger-signs` · `labs` · `vaccines` · y módulos opcionales: `ultrasounds`, `weight-records`, `screenings/mental`, `screenings/violence`, `pathologies`, `dental`, `nutritional-counseling` |
| **Home Visits** | `/home-visits` | `POST /` · `GET /:gestanteId` · `PATCH /visit/:id` · `DELETE /visit/:id` |
| **Education** | `/education` | `GET /` · `GET /catalog` · `POST /:id/view` |
| **Notifications** | `/notifications` | `GET /` · `GET /unread-count` · `PATCH /:id/read` · `PATCH /read-all` · `POST /token` · `DELETE /token` · `channels/*` |
| **Chat** | `/chat` | `GET /conversations` · `GET /conversation` · `GET /history/:conversationId` · `POST /emergencia` · `POST /upload` · `POST /broadcast` · `POST /recommend-content` |
| **Reports** | `/reports` | `GET /adherence` · `GET /attendance` · `GET /clinic` · `GET /indicadores` |
| **Sync** | `/sync` | `GET /` (pull) · `POST /` (push) |
| **Admin** | `/admin` | `GET /dashboard` · `users/*` · `config/*` · `education/*` · `audit-logs` · `facilities/*` · `feature-flags` · `backup` |

> La documentación interactiva completa está en **Swagger**: `http://localhost:3000/docs`.

---

## Tiempo real (WebSocket)

Socket.IO con autenticación por JWT en el handshake:

- **Eventos del cliente**: `join_conversation`, `leave_conversation`, `typing`, `mark_read`, `get_presence`.
- **Eventos del servidor**: `receive_message`, `typing`, `messages_read`, `presence`, `error`.
- **Funcionalidades**: presencia global estilo WhatsApp ("en línea" / "última vez"), indicador de "escribiendo…", confirmaciones de lectura (vistos), reconciliación de mensajes optimistas por `clientId` y emisión en vivo de alertas de emergencia.

---

## Modelo de datos

**28 tablas** modeladas con Prisma sobre PostgreSQL. Convenciones: UUID como PK, `created_at` / `updated_at` (timestamptz) y **soft-delete** (`deleted_at`) en las entidades centrales.

| Dominio | Tablas |
|---|---|
| Identidad | `users` · `user_sessions` |
| Gestante | `gestantes` (≈60 campos) · `antecedentes` · `obstetras` |
| Citas | `appointments` · `home_visits` |
| Tratamientos | `treatments` · `supplement_logs` |
| Clínico | `prenatal_controls` · `lab_results` · `ultrasounds` · `weight_records` · `vaccination_records` · `danger_signs` · `violence_screenings` · `mental_health_screenings` · `pathologies` · `dental_records` · `nutritional_counseling` |
| Educación | `educational_content` |
| Notificaciones | `notifications` |
| Mensajería | `conversations` · `messages` |
| Sistema | `audit_logs` · `health_facilities` · `system_config` |

---

## Seguridad y cumplimiento

- **JWT** access/refresh con secretos separados; el refresh rota la sesión y el cliente lo renueva de forma transparente ante un 401.
- **Bcrypt** (12 rounds) para contraseñas; los hashes nunca se exponen.
- **Bloqueo de cuenta** tras 5 intentos fallidos (15 min); recuperación por código de 6 dígitos (hasheado, expira en 30 min) vía SMS/WhatsApp.
- **RBAC** por ruta + verificación de **propiedad** del recurso en los servicios (una gestante solo ve lo suyo; un obstetra, sus pacientes).
- **Auditoría automática** de toda mutación (POST/PUT/PATCH/DELETE con respuesta 2xx) en `audit_logs`.
- **Consentimiento informado** registrado por usuario.
- **Soft-delete** en entidades clínicas, con guardas para no eliminar al último admin ni auto-eliminarse.
- **Helmet**, **CORS** configurable y **rate limiting** global + específico de autenticación.

---

## Feature flags (alcance configurable)

Siete módulos clínicos pueden **activarse u ocultarse sin borrar código ni datos**, controlados desde `SystemConfig` (editable por el admin en `PUT /admin/feature-flags`). Por defecto vienen **desactivados** porque quedan fuera del alcance medido por los objetivos del proyecto; los módulos core (citas, controles, tratamientos, chat, alertas) están siempre activos.

| Flag | Módulo |
|---|---|
| `ecografias` | Ecografías |
| `pesoRegistros` | Registros de peso |
| `tamizajeViolencia` | Tamizaje de violencia |
| `tamizajeSaludMental` | Tamizaje de salud mental (SRQ-18) |
| `patologias` | Patologías (CIE-10) |
| `odontograma` | Odontograma |
| `consejeriaNutricional` | Consejería nutricional |

---

## Credenciales de prueba

Generadas por el seed (`npm run prisma:seed`):

| Rol | DNI | Contraseña | Notas |
|---|---|---|---|
| Admin | `99999999` | `Admin@2026` | — |
| Obstetra | `11111111` | `Test@1234` | — |
| Obstetra | `22222222` | `Test@1234` | — |
| Gestante | `33333333` | `Test@1234` | Ana — bajo riesgo, 90 % adherencia |
| Gestante | `44444444` | `Test@1234` | Lucía — alto riesgo / preeclampsia, 60 % adherencia |
| Gestante | `55555555` | `Test@1234` | Puerperio |
| Gestante | `77777777` | `Test@1234` | Con alerta de emergencia |

---

## Scripts disponibles

### Backend (`backend/`)

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo con hot reload |
| `npm run build` | Compila TypeScript a JavaScript |
| `npm start` | Ejecuta la build de producción |
| `npm run typecheck` | Verificación de tipos sin emitir |
| `npm test` | Suite de pruebas (Jest) |
| `npm run prisma:generate` | Genera el cliente de Prisma |
| `npm run prisma:migrate` | Aplica migraciones |
| `npm run prisma:seed` | Siembra la base de datos |
| `npm run smoke` / `perf` / `e2e` / `simulate` | Pruebas de humo, rendimiento, e2e y simulación integral |

### Frontend (`frontend/`)

| Script | Descripción |
|---|---|
| `npm run start` | Inicia Expo |
| `npm run web` | App en navegador |
| `npm run android` / `npm run ios` | Build nativa |
| `npm run tsc` | Verificación de tipos |
| `npm test` | Pruebas (jest-expo) |

---

## Pruebas

- **Backend**: Jest con suites unitarias e de integración (`backend/tests/`), más scripts de humo, rendimiento, chat e2e y simulación integral del sistema.
- **Frontend**: `@testing-library/react-native` con `jest-expo` (`frontend/__tests__/`).

```bash
# Backend
cd backend && npm test

# Frontend
cd frontend && npm test
```

---

<div align="center">

**VITMATERNA** · Salud prenatal digital para la sierra peruana 🇵🇪

</div>
