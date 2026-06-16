# VITMATERNA — Análisis completo del sistema

> Plataforma digital de **salud prenatal** para el **Centro de Salud Talavera**
> (Andahuaylas, Apurímac, Perú). Objetivo: subir la adherencia a los **controles
> prenatales** (meta OMS: 8+) y a la **suplementación con hierro/ácido fólico** en
> gestantes de zona rural andina, dando además a los obstetras herramientas de
> seguimiento y **alertas tempranas**.

---

## 1. Panorama general

Es un **monorepo** con dos aplicaciones independientes que se comunican solo por **REST + WebSocket**:

```
vitmaterna/
├── backend/     Node.js 22 + Express 5 + Prisma 6 + PostgreSQL 16 + Redis 7 + Socket.IO
├── frontend/    React Native 0.85 / Expo SDK 56 (iOS, Android y Web) + Expo Router
├── docs/        documentación
├── prd.md                    PRD v2.0 (1646 líneas)
└── implementation_plan.md    plan de implementación
```

- **3 roles**: `gestante` (paciente), `obstetra` (profesional), `admin`.
- **Identidad por DNI** (8 dígitos), no por email. Autenticación **JWT** (access 15 min + refresh 30 días).
- **Offline-first**: la app cachea lecturas y encola escrituras para zonas sin señal.
- **Contexto geográfico clave**: Talavera está a **2 926 msnm** → la hemoglobina se **corrige por altitud** (norma MINSA) antes de clasificar anemia y calcular riesgo.

### Estado verificado en esta instancia (datos del seed)
| Entidad | Filas | | Entidad | Filas |
|---|---|---|---|---|
| usuarios | 7 | | controles prenatales | 6 |
| gestantes | 4 | | supplement_logs | 35 |
| obstetras | 2 | | lab_results | 2 |
| citas | 7 | | mensajes chat | 3 |
| tratamientos | 2 | | contenido educativo | 3 |

La base tiene **27 tablas** de dominio. Servicios corriendo: backend `:3000`, Expo web `:8081`, PostgreSQL, Redis.

---

## 2. Arquitectura del Backend

### 2.1 Bootstrap (`src/server.ts`)
1. Conecta PostgreSQL (Prisma) → 2. Arranca el **cron de recordatorios** → 3. Conecta Redis (no bloqueante) → 4. Crea app Express → 5. Monta **Socket.IO** sobre el mismo servidor HTTP → 6. Registra la instancia de Socket en un `socketRegistry` global para que los servicios REST puedan emitir eventos en tiempo real → 7. Escucha en `:3000` con apagado elegante (SIGTERM/SIGINT).

### 2.2 Pipeline de la app (`src/config/app.ts`)
`requestId` → `helmet` → `cors` → estáticos `/uploads` (imágenes de chat) → body JSON (10 MB) → logging (Pino) → **rate limiter global** → `/docs` (Swagger) → `/health` → **auditoría automática** de mutaciones → router `/v1` → 404 → manejador de errores.

### 2.3 Estructura modular
Cada módulo en `src/modules/<x>/` sigue el patrón **routes → schema (Zod) → controller → service**:

```
auth · patients · appointments · clinical · home-visits · treatments(dentro de clinical)
education · notifications · chat · reports · sync · admin
```

Utilidades de **lógica de negocio** (`src/utils/`): `dateCalc`, `hemoglobinCorrection`, `imcClassification`, `riskCalculator`, `screeningThresholds`, `appointmentSlots`, `systemSettings`.

### 2.4 Middleware transversal
- **`authenticate`**: valida el Bearer JWT y rellena `req.user = {userId, dni, role}`. Distingue token expirado vs inválido.
- **`requireRole(...roles)` / `rbac`**: control de acceso por rol a nivel de ruta.
- **`auditLogger`**: intercepta `res.json`; toda mutación (POST/PUT/PATCH/DELETE) con respuesta 2xx se guarda en `audit_logs` (usuario, acción, entidad, id, body sin contraseñas, IP, user-agent). Excluye login/refresh/logout.
- **`rateLimiter`**: límite global + límite específico de auth (anti fuerza bruta).
- **`validate(schema)`**: valida body/params/query con Zod antes del controller.

### 2.5 Contrato de respuesta
Uniforme en toda la API:
```json
// éxito
{ "success": true, "data": ..., "meta": { "page": 1, "totalPages": 5 } }
// error
{ "success": false, "error": { "code": "NOT_FOUND", "message": "..." } }
```

---

## 3. Modelo de datos (PostgreSQL / Prisma — 27 tablas)

Organizado por módulos. Convención: UUID como PK, `created_at/updated_at` timestamptz, **soft-delete** (`deleted_at`) en las entidades centrales.

### Módulo 1 — Autenticación y usuarios
- **`users`** — núcleo de identidad: `dni` (único), `passwordHash` (bcrypt), `role`, nombres, teléfono, email, `isActive`, `isVerified`, `failedLoginAttempts`, `lockedUntil` (bloqueo 15 min tras 5 fallos), `lastSeenAt` (presencia tipo WhatsApp), `notificationPreferences` (JSONB: push/sms/whatsapp + `expoPushToken`), `consentAccepted` (consentimiento informado), `resetTokenHash` (recuperación de contraseña).
- **`user_sessions`** — sesiones con refresh token, info de dispositivo, IP, expiración.

### Módulo 2 — Gestión de la gestante
- **`gestantes`** — la ficha clínica más rica (≈60 campos): datos personales y geográficos (lat/lng del domicilio para visitas), **historia obstétrica** (gestaciones, partos, cesáreas, abortos, nacidos vivos/muertos), **antropometría** (peso, talla, IMC + clasificación), grupo sanguíneo y factor Rh (`rhSensitizado`), **fechas clave** (`fum`, `fppFum`, `fppEco`), examen físico, y dos campos que el sistema **calcula automáticamente**: `nivelRiesgo` (semáforo verde/amarillo/rojo) y `estado` (activa/parto/puerperio/inactiva).
- **`antecedentes`** — familiares/personales (alimentan el cálculo de riesgo).
- **`obstetras`** — perfil profesional: `cop` (colegiatura), especialidad, establecimiento, turno.

### Módulo 3 — Citas
- **`appointments`** — fecha, hora, `estado` (programada→confirmada→asistida/no_asistida, +solicitud_reprogramacion/reprogramada/cancelada), `modalidad` (establecimiento/domiciliaria), `numeroControl`, `egSemanas`, campos de reprogramación, flags `recordatorio3d/1d/2h`, `esAutoGenerada`.
- **`home_visits`** — acta de visita domiciliaria (formato MINSA): correlativo por gestante, motivo, acciones, acuerdos, GPS, firmas.

### Módulo 4 — Tratamientos y suplementación
- **`treatments`** — medicamento/suplemento (ácido fólico, sulfato ferroso, calcio, otro), dosis, frecuencia, hora de toma, duración, estado (activo/suspendido/completado), `adherenciaPct`.
- **`supplement_logs`** — registro diario de consumo (`@@unique([treatmentId, fecha])` → un registro por día = idempotencia natural).

### Módulo 5 — Seguimiento clínico
- **`prenatal_controls`** — el control prenatal completo (≈35 campos): EG, trimestre, peso, presión, pulso, altura uterina, situación/presentación/posición fetal, FCF, movimiento fetal, proteinuria, edema, indicaciones, orientación, próxima cita, nro. formato SIS, etc.
- **`lab_results`** — exámenes (Hb con `valorCorregido` por altitud, glucosa, VIH, VDRL, orina…).
- **`ultrasounds`** — ecografías (genética/morfológica/bienestar fetal).
- **`weight_records`** — curva de peso con `gananciaTotal` y clasificación (bajo/adecuado/alto según IMC pregestacional, guía IOM 2009).
- **`vaccination_records`** — vacunas (antitetánica, etc.).
- **`danger_signs`** — signos de alarma reportados por la gestante: severidad, estado (pendiente/atendido/derivado), `respondidoPor`, `tiempoRespuestaMin`.
- **`violence_screenings`** — tamizaje de violencia (positivo si puntaje ≥ 15).
- **`mental_health_screenings`** — **SRQ-18** (salud mental): 4 sub-puntajes.
- **`pathologies`** — diagnósticos CIE-10. **`dental_records`** — odontograma. **`nutritional_counseling`** — consejería nutricional.

### Módulo 6 — Contenido educativo
- **`educational_content`** — artículos/infografías/video/audio/FAQ por categoría, trimestre y rango de semanas, con `viewsCount`.

### Módulo 7 — Notificaciones
- **`notifications`** — bandeja in-app persistente: tipo, canal, título, mensaje, datos JSON (deep-link), estado, `leidaAt`.

### Módulo 8 — Mensajería
- **`conversations`** — hilo 1:1 gestante↔obstetra. **`messages`** — texto/imagen/`alerta_emergencia`, con `leido`/`leidoAt`.

### Módulo 9 — Auditoría y sistema
- **`audit_logs`** — bitácora de toda mutación. **`health_facilities`** — establecimientos (con **altitud msnm**). **`system_config`** — configuración editable por el admin (clave/valor JSONB), p.ej. credenciales SMS/WhatsApp, `autoGenerarCitas`, altitud.

---

## 4. Lógica de negocio clínica (el "cerebro")

Lo que diferencia a esta app de un CRUD genérico. Todo vive en `backend/src/utils/` y el **servidor es la fuente de verdad** (ignora cálculos que envíe el cliente).

### 4.1 Cálculos obstétricos (`dateCalc.ts`)
- **FPP** (fecha probable de parto) por **regla de Naegele**: `FUM + 7 días − 3 meses + 1 año`. Se calcula automáticamente al registrar la FUM si no se da una FPP explícita.
- **Edad gestacional (EG)**: semanas/días desde la FUM.
- **Trimestre**: 1 (≤13 sem), 2 (14–27), 3 (≥28). **Semanas restantes**: `40 − EG`.

### 4.2 Corrección de hemoglobina por altitud (`hemoglobinCorrection.ts`) ⭐
Pieza central y específica de la sierra peruana. A 2 926 msnm el factor de corrección MINSA es **−1.8 g/dL**.
```
Hb_corregida = Hb_observada + factor(altitud)   // factor negativo
```
Clasificación de anemia en gestantes sobre la Hb corregida:
`normal ≥11` · `leve 10–10.9` · `moderada 7–9.9` · `severa <7`.
Una Hb de 12 que parecería normal, corregida a 10.2 es **anemia leve** → puede subir el nivel de riesgo. Esto se aplica **automáticamente** al guardar un examen de Hb.

### 4.3 Cálculo automático de riesgo (`riskCalculator.ts`) ⭐
Sistema de **puntaje (semáforo)**. Suma factores y decide nivel:
`score ≥4 → rojo` · `≥2 → amarillo` · `else → verde`.

| Factor | Puntos |
|---|---|
| Edad <15 / >40 | +3 · adolescente <18 / >35 | +2 |
| IMC <18.5 (+2), ≥30 (+2), ≥35 (+3) | |
| Anemia: severa +4, moderada +2, leve +1 | |
| Presión: ≥140/90 (+3), ≥160/110 (+4) | |
| ≥2 cesáreas (+3), 1 cesárea (+1) | |
| Aborto habitual ≥3 (+3), óbito fetal (+3) | |
| Gran multigesta >5 (+2), Rh sensitizado (+3) | |
| Antecedentes (diabetes, HTA, preeclampsia, VIH, cardiopatía…) | +3 c/u |

El riesgo se **recalcula automáticamente** cada vez que cambia algo relevante: al guardar un **control prenatal**, un **resultado de laboratorio**, un **antecedente**, o al **editar la gestante**. Usa siempre el último control + último Hb + datos obstétricos.

### 4.4 Cronograma automático de 8 controles (`patient.service.ts`)
Al fijar la FUM (si `autoGenerarCitas` está activo), el sistema **genera 8 citas** en las semanas **12, 18, 23, 27, 31, 34, 37, 39** (esquema MINSA), a las 09:00, marcadas `esAutoGenerada`. Borra las autogeneradas futuras antes para no duplicar.

### 4.5 Agenda inteligente y anti-doble-booking (`appointmentSlots.ts`)
Horario 08:00–17:00, slots de 30 min, refrigerio 13:00–14:00 excluido. `getAvailability` devuelve los slots libres de un obstetra para un día; al crear/reprogramar valida horario laboral y **bloquea choques** (409) para citas de establecimiento.

### 4.6 Clasificación de IMC y ganancia de peso (`imcClassification.ts` + `clinical.service`)
4 categorías (bajo_peso/normal/sobrepeso/obesidad). La ganancia de peso se clasifica bajo/adecuado/alto según rangos **IOM 2009** que dependen del IMC pregestacional.

### 4.7 Umbrales de tamizaje (`screeningThresholds.ts`)
- **Violencia**: positivo si puntaje **≥ 15** → activa derivación automática.
- **SRQ-18 (salud mental)**: positivo si ≥9 en ítems 1–18 (trastorno mental), o ≥1 en 19–22 (psicótico), o pregunta 23 (epilepsia), o ≥1 en 24–28 (alcohol) → derivación.

### 4.8 Cron de alertas y recordatorios (`notification.service.ts`)
Corre al arrancar y **cada hora**. Seis escáneres:
1. **Recordatorios de cita** a la gestante y al acompañante: a **3 días, 1 día y 2 horas** (SMS + WhatsApp + push, flags anti-repetición).
2. **Recordatorio de suplemento** diario si pasó la hora de toma y no registró consumo.
3. **Inasistencias**: cita vencida +24h → marca `no_asistida` y alerta al obstetra (sugiere visita domiciliaria).
4. **Baja adherencia** (<50% con ≥7 días de tratamiento) → alerta al obstetra.
5. **FPP próxima** en hitos 30/15/7/3 días → avisa a gestante + acompañante.
6. **Exámenes obligatorios pendientes** (Hb, VIH, sífilis, glucosa, orina) según EG → alerta al obstetra.

---

## 5. Flujos clave (cómo funciona cada parte)

### 5.1 Registro de usuarios (3 vías)
1. **Auto-registro gestante** (`POST /auth/register`): crea `user`(gestante) + perfil `gestante` base; queda activa. Caso especial: si el obstetra ya la había precargado con DNI y contraseña = DNI ("cuenta sin reclamar"), el registro la **reclama** y actualiza datos.
2. **Auto-registro obstetra**: crea cuenta con `isVerified=false` → **pendiente de aprobación** del admin; **no** inicia sesión hasta ser aprobado.
3. **Alta por obstetra** (`POST /patients`): el obstetra crea a la gestante; contraseña inicial = su **DNI**, queda verificada, y se enlaza al obstetra con una primera cita "Registro Inicial". El admin también puede crear cualquier usuario ya activado.

### 5.2 Login y seguridad
`POST /auth/login` (DNI + contraseña) → si la cuenta está bloqueada (5 fallos → 15 min) responde 423; si las credenciales fallan suma intento; si acierta resetea intentos, actualiza `lastLoginAt/lastSeenAt` y devuelve **access + refresh token**. El frontend guarda tokens (SecureStore en nativo, localStorage en web) y los inyecta vía interceptor de Axios; ante un 401 hace **refresh automático** transparente con cola de peticiones.

### 5.3 Ciclo de vida de una cita
```
[obstetra crea] → programada
  gestante → confirmada → (obstetra) asistida / no_asistida
  gestante → solicitud_reprogramacion → obstetra aprueba (→programada nueva fecha) o rechaza (→estado previo)
  obstetra → convertir-domiciliaria (modalidad domiciliaria, notifica gestante)
  cron → no_asistida (si vence +24h)
```
Cada transición valida **rol + estado origen** y **notifica** a la contraparte. La asistencia se cierra al registrar el control prenatal o el acta de visita.

### 5.4 Atención prenatal (obstetra)
Abre la cita → registra **control prenatal** (signos vitales, mediciones fetales, indicaciones) → el sistema crea el control, **autonumera** el control, recalcula riesgo y permite agendar la próxima cita. Puede registrar labs, ecografías, vacunas, peso, tamizajes, patologías CIE-10, odontograma y consejería nutricional, todo colgado de la misma gestante.

### 5.5 Adherencia a suplementos (gestante)
La gestante marca "tomé mi pastilla" → `POST /clinical/treatments/:id/log`. Idempotente por día (`@@unique`). El frontend hace **actualización optimista** (refleja al instante adherencia, calendario y progreso) y reconcilia con el servidor. **Sin red**: la operación se **encola en la outbox** (SQLite/localStorage) con `dedupeKey` y se reenvía al reconectar.

### 5.6 Signos de alarma y botón de pánico ⭐
- **Reporte de signo** (`POST /clinical/danger-signs`): deduplicación de 10 min; si es **grave** notifica al obstetra (in-app + push) **y** publica un mensaje automático de emergencia en el chat clínico, emitido en tiempo real por Socket.IO.
- **Botón de pánico** (chat): la gestante envía su **GPS** → mensaje `alerta_emergencia` con link de Google Maps + push al obstetra con su ubicación, riesgo y teléfono. Es el flujo de mayor criticidad clínica.

### 5.7 Chat en tiempo real (Socket.IO)
Auth por JWT en el handshake. **Presencia global** estilo WhatsApp (en línea / "última vez"), salas por conversación, **"escribiendo…"**, **vistos** (read receipts), reconciliación de mensajes optimistas por `clientId` (no duplica). Imágenes vía base64 → guardadas en `/uploads/chat`. El obstetra además puede: **recomendar contenido educativo** a una gestante y enviar **mensajes masivos** filtrados por trimestre y nivel de riesgo.

### 5.8 Notificaciones (multicanal)
- **Push**: Expo Push (token guardado en `notificationPreferences`).
- **SMS/WhatsApp**: abstracción de canales que resuelve credenciales **en tiempo de envío** desde `system_config` (editable por admin) con respaldo en `.env`. Sin credenciales operan en **modo mock** (log en consola) — por eso en el arranque viste `[SMS MOCK]`/`[WHATSAPP MOCK]`. El admin puede activar Twilio y WhatsApp Business Cloud **sin reiniciar** el servidor.
- **In-app**: bandeja persistente con badge de no leídos.

### 5.9 Reportes e indicadores MINSA
`reports.service.ts` calcula KPIs: % gestantes con 6+ y 8+ controles, % inicio en 1er trimestre, % adherencia ≥80%, distribución de riesgo (semáforo), asistencia por mes, top-3 menor adherencia, visitas domiciliarias. El admin tiene un **dashboard** global (usuarios, gestantes activas/alto riesgo, citas hoy/próximas, alertas pendientes, estado de canales).

---

## 6. Arquitectura del Frontend (Expo Router)

### 6.1 Navegación por rol (carpetas en `app/`)
```
app/
├── index.tsx          splash → redirige según rol
├── (auth)/            login · register · forgot-password
├── (gestante)/(tabs)/ inicio · citas · tratamiento · educación · chat · perfil
│                      + alarmas, visitas, notificaciones
├── (obstetra)/(tabs)/ inicio · gestantes · cronograma · alertas · chat · reportes · perfil
│                      + atender/[appointmentId], control/nuevo, gestante/[id], gestante/nueva,
│                        tamizajes, mensaje-masivo
└── (admin)/(tabs)/    dashboard · usuarios · sedes · contenido · notificaciones · auditoría · config
                       + supervisión: gestantes, citas, reportes
```
`app/_layout.tsx` inicializa: red, persistencia de caché, outbox, fuentes, auth, base local, push y prefetch offline. `app/index.tsx` enruta por rol tras validar el token.

### 6.2 Capas del frontend
- **Estado de auth**: Zustand (`authStore`) — login/register/logout/refresh/loadStoredAuth/registerPushToken.
- **Datos de servidor**: TanStack Query (`api-queries.ts`, 1098 líneas) — todos los hooks `useX`, mutaciones con invalidación y **actualizaciones optimistas** (adherencia, notificaciones leídas).
- **HTTP**: Axios con interceptores (JWT + refresh + resolución de `mediaUrl`).
- **Tema**: sistema propio con paletas diferenciadas por rol (gestante, obstetra), modo oscuro, tipografía Inter, ~50 componentes UI propios (`AppButton`, `AppCard`, gráficas SVG de altura uterina/peso, `RiskIndicator`, `EmergencyAlert`, etc.).
- **Tiempo real**: `useSocket` + `useChat`.
- **Exportación**: PDF y Excel de reportes/historias (`exportPdf`, `exportExcel`).

### 6.3 Offline-first (clave para zona rural) ⭐
- **Lecturas**: caché de React Query persistida (AsyncStorage/localStorage, 7 días, `networkMode: offlineFirst`). Al reabrir sin señal, las pantallas muestran los últimos datos.
- **Escrituras**: **outbox** persistente (SQLite nativo / localStorage web). Operaciones críticas (consumo de suplemento, signo de alarma) se **encolan** con `dedupeKey`, se reintentan con backoff al reconectar, descartan 4xx y reintentan red/5xx. Idempotencia garantizada de extremo a extremo.
- **Sync** (`/sync`): endpoint pull/push incremental por `updatedAt` para sincronización masiva (estilo WatermelonDB).
- **Banner offline** + indicador de operaciones pendientes en la UI.

---

## 7. Seguridad y cumplimiento
- **JWT** access/refresh con secretos separados; refresh rota sesión.
- **Bcrypt** (12 rounds) para contraseñas; nunca se devuelven hashes.
- **Bloqueo de cuenta** tras 5 intentos; recuperación por código de 6 dígitos (hash + expiración 30 min) vía SMS/WhatsApp.
- **RBAC** por ruta + verificación de **propiedad** del recurso en los servicios (una gestante solo ve lo suyo; un obstetra, sus pacientes).
- **Auditoría** automática de toda mutación.
- **Consentimiento informado** registrado por usuario.
- **Soft-delete** en entidades clínicas; guardas para no borrar al último admin ni auto-eliminarse.
- Helmet, CORS configurable, rate limiting.

---

## 8. Cómo está corriendo ahora (este sandbox)
| Componente | Estado | URL |
|---|---|---|
| Backend API | ✅ `:3000` | http://localhost:3000/v1 |
| Swagger | ✅ | http://localhost:3000/docs |
| Frontend (Expo web) | ✅ `:8081` | http://localhost:8081 |
| PostgreSQL 16 / Redis 7 | ✅ nativos | — |

**Credenciales de prueba** (seed): admin `99999999 / Admin@2026`; obstetras `11111111`, `22222222` y gestantes `33333333` (Ana, bajo riesgo, 90% adherencia), `44444444` (Lucía, **alto riesgo / preeclampsia**, 60% adherencia), `55555555` (puerperio), `77777777` (con alerta de emergencia) — todas con `Test@1234`.

---

## 9. Síntesis: por qué este sistema es coherente
VITMATERNA no es un CRUD: es un **sistema de soporte a la decisión clínica** centrado en la gestante andina. Tres ideas lo articulan:
1. **El servidor calcula, no confía en el cliente**: FPP, EG, Hb corregida por altitud, riesgo (semáforo), adherencia y derivaciones se computan en el backend con normas MINSA/OMS.
2. **Proactividad**: el cron y las alertas convierten datos en acción (recordatorios a la gestante y al acompañante, alertas de inasistencia/baja adherencia/exámenes pendientes al obstetra, botón de pánico con GPS).
3. **Funciona sin internet**: offline-first de punta a punta (caché + outbox idempotente + sync) porque el contexto real es de conectividad intermitente.
