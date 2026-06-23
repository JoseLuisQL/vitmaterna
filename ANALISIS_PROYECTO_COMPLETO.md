# VITMATERNA — Análisis completo del proyecto

> Plataforma digital de salud prenatal para gestantes de zona rural andina
> (Centro de Salud Talavera · Andahuaylas, Apurímac, Perú · 2.926 msnm).
> Monorepo: **backend** (Node 22 + Express 5 + Prisma + PostgreSQL 16 + Redis + Socket.IO) y **frontend** (Expo SDK 56 / React Native 0.85, web incluido).

---

## 0. Estado del levantamiento (verificado en esta sesión)

| Servicio | Estado | URL / Puerto | Verificación |
|---|---|---|---|
| PostgreSQL 16 | ✅ corriendo | `localhost:5432` | migraciones + seed OK |
| Redis 7 | ✅ corriendo | `localhost:6379` | `PONG` |
| Backend API | ✅ corriendo | `http://localhost:3000` | `/health` = healthy, login admin OK |
| Swagger | ✅ | `http://localhost:3000/docs` | HTTP 301→UI |
| Frontend (Expo Web) | ✅ corriendo | `http://localhost:8081` | bundle web OK (4402 módulos) |

**Pasos de arranque realizados:** instalación de Node 22 (el sandbox traía 18), PostgreSQL 16 y Redis nativos (no había Docker); `.env` del backend copiado del ejemplo (la `DATABASE_URL` ya coincidía); `prisma generate` + `migrate deploy` (6 migraciones) + `seed`; `npm run dev`. Frontend: `.env` ajustado a `http://localhost:3000/v1`, `npm install`, `npx expo start --web`.

**Pruebas ejecutadas:** backend `npm test` → **198/198 pasan** (24 suites). Frontend: 16 archivos de test (~127 casos) presentes.

### Credenciales de prueba (del seed)
| Rol | DNI | Contraseña |
|---|---|---|
| Admin | `99999999` | `Admin@2026` |
| Obstetra | `11111111` / `22222222` | `Test@1234` |
| Gestante | `33333333` (Ana, bajo riesgo) | `Test@1234` |
| Gestante | `44444444` (Lucía, alto riesgo) | `Test@1234` |
| Gestante | `55555555` (puerperio) / `77777777` (emergencia) | `Test@1234` |

---

## 1. Qué es y cómo está construido

VITMATERNA **no es un CRUD médico**: es un **sistema de soporte a la decisión clínica**. Tres principios lo articulan:

1. **El servidor calcula, no confía en el cliente** — FPP, edad gestacional, Hb corregida por altitud, nivel de riesgo y adherencia se computan en el backend con normas MINSA/OMS.
2. **Proactividad** — un cron horario convierte datos en acción (recordatorios, alertas, botón de pánico con GPS).
3. **Funciona sin internet** — offline-first (caché de lecturas + outbox idempotente de escrituras).

**Tamaño:** backend ~12.5k LOC TS, frontend ~36k LOC TS/TSX, 341 commits, schema Prisma de 936 líneas (~40 modelos + enums).

---

## 2. Backend — arquitectura

**Pipeline Express 5 (ESM):** request-id → helmet → CORS → body(10MB) → logger (pino) → rate-limit global → swagger → health → audit transversal → rutas. El bootstrap arranca DB, **cron horario in-process**, Redis (no bloqueante), cola BullMQ y luego Socket.IO sobre el mismo servidor HTTP.

### Módulos (`backend/src/modules/`, 12)
- **auth** — JWT con refresh rotatorio (sesiones en BD), bloqueo por intentos fallidos, reset por OTP, **gate de aprobación** de obstetras (auto-registro queda pendiente). Identidad por **DNI**, no email.
- **patients** — recálculo de riesgo, derivación de IMC/FPP/edad, **autoagenda MINSA de 8 controles** (semanas 12/18/23/27/31/34/37/39), predicción de inasistencia.
- **appointments** — slots de 30 min (08–17h, refrigerio 13–14h excluido), **anti-doble-booking (HTTP 409)**, máquina de estados por rol, solicitud/aprobación de reprogramación.
- **clinical** — núcleo (~1.000 LOC): controles prenatales, tratamientos + gamificación, alertas de signos de alarma, corrección de Hb por altitud, tamizajes (violencia, salud mental SRQ-18).
- **chat** — REST + alerta de emergencia con GPS + mensaje masivo.
- **reports** — KPIs MINSA + indicadores de tesis (adherencia, asistencia, distribución de riesgo).
- **sync** — sincronización offline.
- **admin / notifications / education / system** — gestión, canales, contenido educativo, configuración y feature flags.

Cada módulo sigue `routes → schema (Zod) → controller → service`.

### El "cerebro clínico" (`backend/src/utils/`)
Determinista y unit-testeado:
- **riskCalculator** — semáforo: `score ≥ 4 → rojo`, `≥ 2 → amarillo`, resto verde (factores: edad, IMC, anemia, presión, cesáreas, antecedentes…).
- **hemoglobinCorrection** — tabla por altitud; clasificación de anemia `normal ≥ 11 · leve 10–10.9 · moderada 7–9.9 · severa < 7`.
- **dateCalc** — FPP por regla de Naegele, edad gestacional, trimestre.
- **adherence** — `tomados ÷ esperados × 100`, ≥ 80% buena.
- **appointmentSlots**, **imcClassification**, **noShowPrediction**, **gamification**.

### Motor proactivo (cron horario)
7 escáneres por hora: recordatorios de cita (3d/1d/2h), recordatorio de suplemento, inasistencias (vencida +24h → `no_asistida`), baja adherencia (<50%), FPP próxima (30/15/7/3 días), exámenes obligatorios pendientes, retención de notificaciones leídas (30 días). Entrega vía BullMQ con backoff; en mock registra en consola.

### Tiempo real (Socket.IO)
Autenticado por JWT; presencia global estilo WhatsApp; "escribiendo…"; vistos; supresión de notificaciones mientras se ve el chat; reconciliación optimista por `clientId`.

---

## 3. Frontend — arquitectura

**Expo Router** (rutas por carpetas) con 4 grupos: `(auth)`, `(gestante)`, `(obstetra)`, `(admin)`; 48 pantallas, 79 componentes, 16 tests. Build web = portal SaaS responsive desde el mismo código.

- **Estado:** Zustand solo para auth (`authStore.ts`); **TanStack Query** es la capa de datos real (optimistic updates con rollback, query keys compartidas, badges con poll de 60s). Persistencia de caché 7 días (`offlineFirst`).
- **Servicios:** Axios con interceptor de **refresh de token single-flight** (cola de 401 concurrentes); storage en `secure-store` (nativo) / `localStorage` (web).
- **Offline-first:** lecturas = caché persistente de Query (+ prefetch al iniciar sesión); escrituras = **outbox SQLite/localStorage** idempotente por `dedupeKey`, FIFO, descarta 4xx, reintenta 5xx/red (máx. 8 intentos). Solo encola `supplement_log` y `danger_sign`. Es la parte **mejor testeada** (16 casos).
- **Diseño:** sistema de tokens (Inter, grid 8pt), paletas por rol (gestante teal, obstetra azul, admin slate), semáforo de riesgo, ~50 primitivas UI. **Gobernanza real:** `audit-design.mjs` prohíbe hex/rgba sueltos, `Alert.alert`, `<Modal>` RN, etc.; `npm run verify` (tsc + audit + jest) atado a git hook.

---

## 4. Modelo de datos (Prisma, ~40 modelos)

Usuarios/sesiones; Gestante + Antecedentes + Obstetra; Citas + Visitas domiciliarias; Tratamientos + Logs de suplemento; Controles prenatales, Laboratorios, Ecografías, Peso, Vacunas; Signos de alarma, Tamizajes (violencia, salud mental), Patologías, Consejería nutricional, Odontograma; Contenido educativo + recomendado; Notificaciones; Conversaciones + Mensajes; AuditLog; HealthFacility (con altitud msnm); SystemConfig (feature flags y canales en caliente).

---

## 5. Hallazgos: riesgos y mejoras

### 🔴 Seguridad (prioridad alta)
1. **IDOR / RBAC ausente** en `/patients` (sin middleware rbac) y en la mayoría de lecturas `/clinical`, además de `/sync` global sin scope → posible exposición de PHI entre obstetras/pacientes.
2. **Secretos por defecto comprometidos** — `JWT_*` con valor `change_me_…` y una contraseña de BD real-looking en `.env.example`; admin de seed `99999999`/`Admin@2026`. Deben rotarse y salir del repo antes de producción.
3. **CORS `*`** en Socket.IO y cualquier origen en modo dev.
4. **`mustChangePassword` no se fuerza** en backend; imágenes clínicas en `/uploads` sin autenticación.

### 🟠 Correctitud / arquitectura
5. **Discrepancia doc vs código en la corrección de Hb** ⚠️ — el README afirma factor **−1.8** a 2.926 msnm (Hb 12 → 10.2, "anemia leve"), pero el código (`hemoglobinCorrection.ts:29`) ubica 2.926 en el tramo 2500–2999 = **−1.3** (Hb 12 → **10.7**, también "leve" pero distinto valor). Los tests confirman −1.3. Es el dato clínico estrella del producto: hay que decidir cuál es correcto según MINSA y alinear README/código/tests.
6. **Cron in-process no idempotente** — no es cluster-safe; si se pierde un tick, se saltan ventanas exactas (2h, etc.).
7. **Múltiples websockets por usuario** — `useSocket`, `useNotificationRealtime`, `useAppointmentRealtime` abren cada uno su conexión (2–3 simultáneas); conviene un socket compartido.
8. **Doble mecanismo de refresh** en frontend (store + interceptor); el del store está prácticamente muerto.

### 🟡 Mantenibilidad / rendimiento
9. **Pantallas gigantes** — `gestante/[id].tsx` **2.804 líneas**, `usuarios.tsx` 1.162, `citas.tsx` 907 (contra la propia regla "pantallas = composición" del AGENTS.md).
10. **Capa de datos muy `any`** — `api-queries.ts` con ~46 `any`; mappers sin tipar; UI clínica que **degrada en silencio** ante error (un dashboard fallido se ve igual que "0 pacientes").
11. **Dark mode shippeado pero deshabilitado** (forzado a light) y **React Compiler instalado pero no activado** en `babel.config.js`.
12. **Polling redundante** (badges cada 60s + eventos socket) en conexiones rurales medidas; edad fallback hardcodeada `28` en `mapPatient`.

### ✅ Fortalezas
- Lógica clínica centralizada, determinista y bien testeada (198 tests verde).
- Diseño offline de escrituras sólido y probado; refresh de token single-flight; limpieza de caché al cerrar sesión (sin fuga entre usuarios).
- Sistema de diseño gobernado por linter propio + git hook.
- UX cuidada: chat optimista con reintento, deep-linking de push, gate de mantenimiento, errores en español.

---

## 6. Recomendaciones priorizadas

1. **Auditar y cerrar RBAC/IDOR** en `/patients`, `/clinical` y `/sync` (lo más crítico para PHI).
2. **Rotar secretos** y sacarlos del repo; forzar `mustChangePassword`; proteger `/uploads`.
3. **Resolver la corrección de Hb** (−1.3 vs −1.8) con fuente MINSA y alinear doc/código/tests.
4. **Unificar el socket** en un servicio compartido y eliminar el refresh duplicado.
5. **Tipar la capa de datos** del frontend y dejar de tragar errores en UI clínica.
6. **Refactor de pantallas gigantes** y activar React Compiler si se quiere su optimización.
7. Endurecer **CORS** y hacer el **cron idempotente / cluster-safe** (o moverlo a un worker dedicado).
