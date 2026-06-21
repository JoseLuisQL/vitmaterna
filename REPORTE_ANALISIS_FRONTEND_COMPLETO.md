# VITMATERNA — Reporte de Análisis Completo del Frontend

> Análisis técnico de la arquitectura de diseño, jerarquía/herencia de estilos,
> carga de UI, funciones complejas (web + móvil) y flujos de los tres roles
> (administrador, obstetra, gestante). Elaborado tras clonar el repositorio,
> levantar el stack completo (PostgreSQL 16 + Redis 7 + API Node + Expo Web) y
> recorrer la aplicación en vivo en navegador con las tres cuentas de prueba.

---

## 0. Cómo se levantó el proyecto (entorno verificado)

| Componente | Versión / detalle | Estado |
|---|---|---|
| Node.js | 22.23 (el backend exige `>=22`, Expo 56 exige `>=20`) | ✅ |
| PostgreSQL | 16 (DB `vitmaterna_dev`, usuario `vitmaterna`) | ✅ migrado + seed |
| Redis | 7 (presencia de chat, BullMQ de notificaciones) | ✅ conectado |
| Backend API | Express 5 + Prisma 6 + Socket.IO 4 — puerto `3000`, prefijo `/v1` | ✅ `healthy` |
| Frontend | Expo 56 / React Native 0.85 / React 19 (Expo Router) — `expo start --web` puerto `8081` | ✅ bundle 17 MB OK |

Pasos ejecutados: `git clone` → instalar Postgres/Redis/Node22 →
`prisma migrate deploy` (7 migraciones) → `prisma db seed` →
`npm run dev` (backend) → `npx expo start --web` (frontend).

**Credenciales sembradas (login por DNI):**

| Rol | DNI | Contraseña | Nombre |
|---|---|---|---|
| Administrador | `99999999` | `Admin@2026` | Administrador Sistema |
| Obstetra | `11111111` / `22222222` | `Test@1234` | María Fernández |
| Gestante | `33333333` (Ana), `44444444`, `55555555`, `77777777` | `Test@1234` | Ana Gómez, Sofía, Lucía, María Elena |

Verificación en vivo: las tres portales renderizan correctamente en web
(sidebar por rol, KPIs, tablas, chat). El login por API funciona para los tres
roles; el portal web monta sidebar fijo + topbar + contenido por rol.

---

## 1. Stack y forma del proyecto

Monorepo con tres piezas:

```
vitmaterna/
├── frontend/     Expo Router (React Native + React Native Web)  ← una sola base de código web+móvil
├── backend/      Express 5 + Prisma + PostgreSQL + Redis + Socket.IO
└── StartApp/     prototipo shadcn/Vite (no es la app de producción)
```

**Frontend — dependencias clave** (`frontend/package.json`):
- **Expo Router ~56** con `typedRoutes` → navegación basada en archivos.
- **@tanstack/react-query 5** + persistencia (`query-async-storage-persister`) → caché offline-first.
- **zustand 5** → estado de autenticación.
- **react-hook-form 7 + zod 4** → formularios validados.
- **socket.io-client 4** → chat/presencia en tiempo real.
- **expo-sqlite** (outbox offline nativo), **expo-secure-store** (tokens nativo),
  **expo-notifications** (push), **expo-location** (emergencia GPS),
  **expo-linear-gradient**, **react-native-reanimated 4** (animaciones),
  **@shopify/flash-list** (listas densas), **react-native-svg** (gráficos), **xlsx** (export).
- Tipografía: **@expo-google-fonts/inter** (familia única Inter).

El archivo `frontend/AGENTS.md` codifica el sistema de diseño como **regla no
negociable**, con una puerta de calidad: `npm run verify`
(`tsc` + `audit:design:strict` + `jest`). Existe un linter de diseño propio
(`scripts/audit-design.mjs`) que **prohíbe en `app/`**: literales `#hex`/`rgba()`,
`Alert.alert`, `<Modal>` de RN, `SafeAreaView` de `react-native` y `zIndex` numérico suelto.

---

## 2. Arquitectura de diseño: jerarquía y herencia de estilos

El sistema de diseño está estructurado en **5 capas estrictas, de abajo hacia
arriba** (definido en `AGENTS.md` y materializado en `src/`). Cada capa solo
consume la inferior — esta es la "herencia" del diseño:

```
┌─ 5. Pantallas        app/**             solo composición + datos, sin "chrome"
├─ 4. Plantilla        layout/ScreenLayout  el molde único de toda pantalla
├─ 3. Patrones         components/patterns  ListScreen, DetailScreen, FormScreen, Dashboard…
├─ 2. Primitivas       components/ui        AppButton, Field, AppCard, StatusChip…
└─ 1. Tokens           theme/               color, tipografía, espacio, sombra, radio, z, motion
```

### 2.1 Capa 1 — Tokens (`src/theme/`) — única fuente de valores

| Token | Archivo | Contenido |
|---|---|---|
| Color | `colors.ts` | Neutros (`commonColors`), un **acento por rol**, semánticos, semáforo de riesgo, `chatColors`, `dentalColors`. Incluye paleta `commonColorsDark` (preparada, hoy desactivada). |
| Tipografía | `typography.ts` | Familia única **Inter** (4 pesos). Escala con alias legacy. **Cuerpo mínimo 15px** (decisión por baja alfabetización digital de la población objetivo). |
| Espacio | `spacing.ts` | **Grid de 8pt** + tokens semánticos `stack` (tight/element/group/section/block) + `layout` + `webLayout` (tokens exclusivos del portal de escritorio). |
| Sombra | `shadows.ts` | `shadows.card/modal` + `coloredGlow()` (glow del color de acento). |
| Radio | `spacing.ts` | `borderRadius` xs…full. |
| Movimiento | `motion.ts`, `animations.ts` | Springs + respeto a *reduce-motion*. |
| Z-index | `zIndex.ts` | Capas nombradas (`nav`, etc.), prohibido el número suelto. |
| Gradientes | `gradients.ts` | Un gradiente por rol para los headers. |
| Responsive | `responsive.ts` | Breakpoints + `useResponsive()` (núcleo de la bifurcación web/móvil). |

**Acentos por rol** (la identidad visual hereda de aquí):
- **Gestante** → lavanda sereno `#7468C4` (gradiente `#9389D6→#7468C4`).
- **Obstetra** → azul confianza `#4A90D9` (gradiente `#5FA3E0→#4A90D9`).
- **Admin** → slate azulado `#3D5A80` (gradiente `#4A6E96→#3D5A80`).

Filosofía cromática (documentada en `colors.ts`): base neutra cálida casi blanca
(`#F7F8FA`), superficies blancas flotantes, **la jerarquía la dan las sombras
suaves, no los bordes** (bordes casi invisibles). Cada color semántico/riesgo
expone 3 variantes: sólido / `Mid` (chips) / `Light` (fondos suaves).

### 2.2 Capa 2 — Primitivas (`src/components/ui/`, ~50 componentes)

Componentes átomo que **solo leen tokens**. Ejemplo de herencia en
`AppButton.tsx`: define `VARIANT_STYLES` (primary/secondary/outline/danger/ghost)
y `SIZE_STYLES` (sm 40h / md 52h / lg 60h, todos ≥48 recomendado por a11y)
exclusivamente a partir de `gestanteColors`, `commonColors`, `semanticColors`,
`spacing`, `borderRadius`, `shadows`, `typography`. Soporta `themeColor` para
re-teñir según el rol activo, gradiente opcional, animación spring (reanimated),
haptics y respeto a `useReducedMotion()`. Catálogo destacado: `Field`
(TextField/SelectField/SearchField/TextAreaField/NumberField), `AppCard`,
`AppBadge`, `StatusChip`, `RiskIndicator`, `KpiCard`, `ProgressRing`,
`CircularProgress`, `LineChartSvg`, `ChartBar`, skeletons, `Overlay`/`BottomSheet`,
`ToastProvider`, `ConfirmHost`.

### 2.3 Capa 3 — Patrones (`src/components/patterns/`)

Plantillas de pantalla completas que encapsulan los 4 estados y el patrón dual
web/móvil. El ejemplo canónico es **`ListScreen.tsx`**: "tabla en web ↔ tarjetas
en móvil" en un solo componente. La pantalla solo aporta `data`, `renderCard`
(móvil), `columns` (web tabla), `filters` y `onCreate`; el patrón resuelve
toolbar (búsqueda+chips+CTA), skeleton 1:1, vacío con CTA, error con reintento.
Reduce pantallas de ~500 a ~120 líneas. Otros: `DetailScreen`, `FormScreen`/
`FormSheet`, `DashboardScreen`, `SectionCard`, `Overlay`, `ConfirmSheet`.

### 2.4 Capa 4 — Plantilla `ScreenLayout` (`src/components/layout/`)

El **molde único** de toda pantalla (`ScreenLayout.tsx`, 377 líneas). Resuelve:
- Header con **gradiente por rol** en móvil; header **plano** en web (el color de
  rol vive en el sidebar/topbar, no en un gradiente gigante).
- Cuerpo responsive con ancho de contenido `readable | wide | full` (solo afecta
  web/tablet; en móvil siempre *full-bleed*).
- Estados estándar `loading` (skeleton) / `error` (con reintento) / `isEmpty`
  (con CTA) / contenido — para que ninguna pantalla los reimplemente.
- Safe-area correcta y espacio inferior para el tab-bar flotante.

### 2.5 Capa 5 — Pantallas (`app/`)

Organizadas por **grupos de ruta por rol** (Expo Router):

```
app/
├── (auth)/      login, register, forgot-password, cambiar-password
├── (gestante)/  (tabs): index, citas, tratamiento, chat, educacion, perfil
│                + alarmas, visitas, notificaciones, educacion/[id]
├── (obstetra)/  (tabs): index, gestantes, cronograma, chat, reportes, perfil
│                + gestante/[id], gestante/nueva, gestante/tamizajes,
│                  control/nuevo, atender/[appointmentId], mensaje-masivo
└── (admin)/     (tabs): index, usuarios, contenido, sedes, config, notificaciones, auditoria
                 + supervision/{gestantes,citas,reportes}, avisos
```

### 2.6 Tema claro/oscuro

`ThemeContext.tsx` provee `useThemedColors()` / `useThemedStyles()`. La
infraestructura de modo oscuro está completa (`commonColorsDark`) pero **forzada
a `light`** ("modo oscuro/sistema en desarrollo"). Las pantallas migradas a
`useThemedColors()` reaccionarían automáticamente cuando se reactive.

---

## 3. Carga de diseño y bifurcación web vs móvil

### 3.1 El switch maestro: `useResponsive().webShell`

Toda la diferencia entre experiencia móvil y portal web de escritorio pasa por
**una sola bandera** (`theme/responsive.ts`):

```ts
webShell = IS_WEB && width >= 840   // navegador Y ancho ≥ lg
```

Breakpoints: `xs<360, sm≥360, md≥600, lg≥840, xl≥1240, xxl≥1536`. La regla del
proyecto es **bifurcar con `webShell`, nunca con estilos sueltos** y mantener una
sola base de código.

### 3.2 Cáscara web (`components/web/`)

`WebShell.tsx` es el contenedor raíz (montado en `app/_layout.tsx`):
- `webShell === false` (móvil/nativo/web angosto) → **passthrough total**: la app
  se comporta exactamente como en móvil, sin encajonar.
- `webShell === true` + sesión con rol → monta **WebSidebar** (lateral fijo,
  colapsable, persistido en `localStorage`) + **WebTopBar** + área de contenido.
- Web ancho sin sesión (login/registro) → contenido a pantalla completa.

`WebSidebar.tsx` consume la **misma fuente de navegación** que el móvil
(`navigation/menu.ts`), resalta el ítem activo (`usePathname` + `stripGroups`
para resolver los grupos `(tabs)`), aplica el acento por rol y ofrece colapso a
solo-iconos. `DataTable.tsx` aporta la tabla densa de escritorio (cabecera
sticky, orden por columna, filas clicables, celdas `interactive` para evitar
botones anidados).

**Verificado en vivo:** al entrar como obstetra en web, "Gestantes" muestra una
**tabla** con columnas *Gestante · DNI/HC · Semanas · Riesgo · FPP* + búsqueda +
chips de riesgo + breadcrumb; el patrón equivalente en móvil renderiza tarjetas
vía `FlashList`.

### 3.3 Estrategia de carga (loading)

Regla del sistema: **skeleton 1:1** (vía `ScreenLayout loading` o skeletons de
dominio); `ActivityIndicator` solo para micro-cargas (botón enviando, "cargando
más"). Cada pantalla cubre los 4 estados: cargando / vacío (con CTA) / error (con
reintento) / contenido.

**Precarga offline** (`useOfflinePrefetch.ts`): tras autenticarse y si hay red,
precarga en la caché de React Query los datos clave según el rol (dashboard,
citas, tratamientos, educación, perfil para gestante; dashboard, citas de hoy,
pacientes para obstetra). Corre una sola vez por sesión.

### 3.4 Fuentes y arranque

`app/_layout.tsx` carga Inter (4 pesos) con `useFonts` y **no renderiza** hasta
que las fuentes y la sesión (`loadStoredAuth`) están listas (evita FOUT y saltos).
Antes de montar el árbol inicializa, idempotentemente: red (`initNetwork`),
persistencia de caché (`startQueryPersistence`) y la cola offline
(`initOutbox`). En web inyecta CSS de scrollbar fino.

---

## 4. Funciones complejas del frontend

### 4.1 Capa de datos — React Query offline-first

`services/queryClient.ts`: `networkMode: 'offlineFirst'`, `staleTime` 60s
(reduce consumo de datos móviles en zona rural), `gcTime`/persistencia **7 días**
en AsyncStorage (nativo) o localStorage (web). Solo persiste queries `success`.
`services/api-queries.ts` (1471 líneas) define **~90 hooks** `useQuery`/
`useMutation`/`useInfiniteQuery` con keys jerárquicas (`['patient', id]`,
`['patientsInfinite', search, riesgo]`, `['obstetraDashboard']`, etc.) e
invalidaciones cruzadas tras mutar.

### 4.2 Cola de escrituras offline (Outbox) — `services/outbox.ts`

Patrón *outbox* robusto para escrituras sin conexión (consumo de suplemento,
signo de alarma):
- **Persistente**: SQLite en nativo, localStorage en web.
- **Idempotente**: cada operación lleva `dedupeKey`; no se encola dos veces.
- **Reintentos con backoff**: descarta 4xx (operación inválida) salvo 408/429;
  reintenta red/5xx; máximo 8 intentos; se vacía al reconectar
  (`subscribeOnline`) y al volver a *foreground* (`AppState`).

### 4.3 Chat en tiempo real — `hooks/useChat.ts` + `sockets/chat.socket.ts`

Lógica compartida gestante/obstetra (291 líneas en el hook):
- **Mensajes optimistas con `clientId`**: al enviar se pinta de inmediato; cuando
  el servidor reenvía el mensaje real con el mismo `clientId`, se **reemplaza** el
  optimista en lugar de duplicarlo (resuelve el bug clásico de duplicado).
- **Paginación hacia atrás** (cargar más antiguos) con dedupe por `id`.
- **Indicador "escribiendo…"** con debounce (2.5s).
- **Presencia global estilo WhatsApp**: el backend mantiene `onlineCounts` por
  usuario; "en línea" si tiene ≥1 socket, y persiste `lastSeenAt` al desconectar.
- **Vistos (read receipts)** en tiempo real (`messages_read`).
- El socket crea **notificación push** al destinatario solo si **no** está viendo
  esa conversación (igual que WhatsApp).

### 4.4 Emergencia con GPS — `components/shared/EmergencyAlert.tsx`

Flujo multi-fase (confirm → locating → sending → success/error) con obtención de
ubicación **multiplataforma**: `expo-location` en nativo (alta precisión +
permisos), `navigator.geolocation` en web, y **coordenadas de respaldo** (centro
de salud) si se deniega/falla. En éxito ofrece botón directo `tel:` al
establecimiento. POST a `/chat/emergencia`.

### 4.5 Feature flags — `hooks/useFeatureFlags.ts`

El **admin** activa/desactiva módulos opcionales (ecografías, registros de peso,
tamizaje de violencia, salud mental, patologías, odontograma, consejería
nutricional). El frontend lee `GET /admin/feature-flags` y **oculta secciones**
en consecuencia. Ejemplo de uso: el flujo "Atender cita" del obstetra solo
muestra el paso "Tamizajes" si al menos uno de esos módulos está activo.

### 4.6 Otras funciones complejas

- **Gráficos SVG de dominio**: `AlturaUterinaChart`, `LineChartSvg`, `ChartBar`,
  odontograma con `dentalColors`.
- **Exportación**: `exportPdf` (`expo-print`), `exportExcel`/`xlsx`,
  `reportTemplate` — para reportes clínicos/MINSA del obstetra y admin.
- **Push notifications** (`usePushNotifications`, `registerPushToken`): solo en
  dispositivo físico; degrada con elegancia en web/Expo Go.
- **Realtime hooks**: `useAppointmentRealtime`, `useNotificationRealtime`,
  `usePendingSync`, `useRefetchOnFocus`.
- **WhatsApp / llamada**: `utils/whatsapp.ts`, `utils/maps.ts` — acciones directas
  desde la ficha del paciente.

### 4.7 Diferencias funcionales web ↔ móvil (resumen)

| Capacidad | Móvil/nativo | Web |
|---|---|---|
| Navegación | Tab-bar inferior (`PillTabBar`) + drawer | Sidebar fijo colapsable + topbar |
| Listas densas | Tarjetas (`FlashList`) | Tabla (`DataTable`) con orden |
| Overlays | `BottomSheet` | `AppModal` (vía `Overlay`) |
| Token seguro | `expo-secure-store` | `localStorage` |
| Outbox offline | SQLite | localStorage |
| GPS emergencia | `expo-location` | `navigator.geolocation` |
| Push | nativo (dispositivo físico) | no aplica (degrada) |

---

## 5. Seguridad de acceso y autenticación (transversal)

- **Login por DNI + contraseña**, JWT access (15m) + refresh (30d).
  `services/api.ts` inyecta el token e implementa **auto-refresh en 401** con cola
  de peticiones en vuelo; no intenta refrescar en endpoints de auth.
- **`store/authStore.ts`** (zustand): login/register/logout/loadStoredAuth/
  refreshToken/changePassword + registro de push token. Al cerrar sesión limpia la
  caché persistida de React Query (evita filtrar datos entre usuarios del mismo
  dispositivo).
- **`RoleGuard`** (defensa en profundidad en el cliente): en cada `_layout.tsx`
  de rol; espera la sesión, redirige a login si no hay sesión, **redirige a su
  propia área si el rol no coincide** (bloquea deep-links cruzados) y fuerza
  `cambiar-password` si `mustChangePassword`.
- **Backend**: `requireRole(...)` (RBAC) por endpoint; el socket de chat valida
  JWT en el handshake y comprueba que el usuario sea **participante** de la
  conversación antes de emitir/marcar leído.

---

## 6. Flujos completos por rol e interacciones

### 6.1 GESTANTE (acento lavanda · backgroundWarm)

**Navegación**: tabs `Inicio · Citas · Tratamiento · Chat` + secciones
`Educación · Signos de alarma · Visitas domiciliarias · Mi perfil`.

**Flujo principal (verificado en vivo, home de Ana Gómez):**
1. **Onboarding FUM**: si no hay fecha de última regla, el home muestra
   "Empecemos por tu embarazo" → captura FUM → calcula semanas de gestación
   (memoizado, acotado 0–42) y muestra "Semana N", anillo de progreso y trimestre.
2. **Tratamiento del día**: tarjeta con "0/1 medicamentos tomados, 0% completado"
   → marcar suplemento como tomado (escritura que pasa por el **outbox** si está
   offline).
3. **Próxima cita**: ver citas / **confirmar asistencia** (`useConfirmAppointment`).
4. **Riesgo**: badge "RIESGO BAJO" (semáforo verde/ámbar/rojo).
5. **Acciones rápidas**: Reportar signo de alarma · **Emergencia (GPS)** ·
   Educación.

**Interacciones de la gestante:**
- **Chat** con su obstetra (texto + foto + "reportar síntoma"); ve presencia y
  vistos en tiempo real. (Verificado: input "Escribe un mensaje…", adjuntar foto,
  reportar síntoma.)
- **Emergencia**: envía alerta con ubicación GPS a su obstetra + centro de salud.
- **Signos de alarma** (`alarmas.tsx`): reporta síntomas con severidad.
- **Educación**: consume contenido por trimestre/categoría; el progreso se
  registra (`useEducationProgress`); puede recibir contenido **recomendado** por
  su obstetra (aparece como tarjeta clicable en el chat, tipo `educacion`).
- **Citas / Tratamiento / Visitas domiciliarias / Perfil (FUM, datos)**.
- Recibe **notificaciones** (recordatorios de cita/suplemento, mensajes, contenido
  recomendado) por campana in-app + push + SMS/WhatsApp (según preferencias).

### 6.2 OBSTETRA (acento azul · backgroundCool)

**Navegación**: tabs `Inicio · Gestantes · Agenda · Chat` + `Reportes ·
Mensaje masivo · Mi perfil`.

**Flujo principal (verificado en vivo, María Fernández):**
1. **Panel de trabajo**: KPIs *Citas hoy · Pacientes (4) · Alertas (1)*, accesos a
   reportes y "ver todas".
2. **Gestantes** (web = tabla, móvil = tarjetas): buscar por nombre/DNI, filtrar
   por riesgo (Todas/Sin riesgo/Moderado/Alto), crear **Nueva gestante**, abrir
   ficha.
3. **Ficha clínica del paciente** (`gestante/[id].tsx`, **2764 líneas — la vista
   más compleja**): 4 pestañas jerárquicas alineadas a objetivos de tesis —
   **Resumen** (datos personales/obstétricos/antecedentes/embarazo) ·
   **Seguimiento** (controles prenatales + visitas domiciliarias) ·
   **Tratamiento** (medicinas/suplementos + vacunas) · **Clínico** (laboratorio
   con interpretación Normal/Alerta/Pendiente + signos de alarma). Soporta
   deep-links antiguos vía `TAB_ALIASES`. Acciones directas: **Llamar**,
   **WhatsApp**, **Recomendar contenido educativo**.

**Flujo encadenado "Atender cita"** (`atender/[appointmentId].tsx`): desde la
agenda, el obstetra registra en orden *Control prenatal → Laboratorios →
Tamizajes (si el flag está activo) → Tratamiento*; cada paso reutiliza los
formularios existentes pasando `patientId`+`appointmentId` (los registros quedan
ligados a la cita), con barra de progreso; al finalizar marca la cita como
**asistida** y notifica a la gestante (confirmación si quedan pasos pendientes).

**Interacciones del obstetra:**
- Crea/edita gestantes, controles prenatales, resultados de laboratorio,
  tratamientos, vacunas, tamizajes (violencia, salud mental SRQ-18, patologías,
  peso, odontograma, consejería nutricional — sujetos a feature flags).
- **Agenda/Cronograma** de citas; **Chat** con badge de no leídos
  (`useUnreadChatCount`) estilo WhatsApp.
- Recibe **alertas de emergencia** con GPS de sus gestantes.
- **Reportes** clínicos y MINSA (exportables a PDF/Excel).
- **Mensaje masivo** a varias gestantes.
- Recomienda contenido educativo a una gestante (llega a su chat).

### 6.3 ADMINISTRADOR (acento slate)

**Navegación**: tabs `Inicio · Usuarios · Contenido` + secciones
`Supervisión (Reportes · Gestantes · Citas)`, `Sistema (Sedes · Configuración ·
Notificaciones)`, `Seguridad (Auditoría y backup)`.

**Flujo principal (verificado en vivo):**
1. **Dashboard**: KPIs *Usuarios (7) · Gestantes activas (3) · Alto riesgo (1) ·
   Citas hoy (0)* + "Estado del sistema" + "Gestión".
2. **Usuarios** (`usuarios.tsx`, 1165 líneas): administra accesos y roles, buscar,
   crear nuevo usuario, **aprobar obstetras pendientes** (al registrarse, un
   obstetra queda `requiresApproval` y **no** inicia sesión hasta aprobación —
   ver `authStore.register`), activar/desactivar, gestionar tabla (Usuario · DNI ·
   Rol · Estado).
3. **Contenido educativo** (`contenido.tsx`, 750 líneas): CRUD del catálogo por
   tipo/categoría/trimestre.
4. **Supervisión global**: reportes (KPIs clínicos/MINSA), todas las gestantes,
   agenda global de citas (vistas de solo-supervisión).
5. **Sistema**: sedes/establecimientos de salud, configuración (parámetros,
   **feature flags** que encienden/apagan módulos en toda la app), canales de
   notificación SMS/WhatsApp (estado de proveedor; mock por defecto).
6. **Seguridad**: registro de **auditoría** + respaldo (`AuditLog`).

**Interacciones del admin:** gobierna el alcance funcional (feature flags),
aprueba obstetras, administra usuarios/contenido/sedes, supervisa indicadores y
audita. Es el único rol con visión transversal de todos los datos.

### 6.4 Mapa de interacciones entre roles

```
GESTANTE  ──chat / fotos / síntomas──▶  OBSTETRA
GESTANTE  ──alerta emergencia (GPS)──▶  OBSTETRA + centro de salud
GESTANTE  ──confirma cita / toma suplemento / reporta signo──▶  (datos clínicos)
OBSTETRA  ──registra control/lab/tratamiento/tamizaje──▶  ficha de la GESTANTE
OBSTETRA  ──recomienda contenido / mensaje masivo──▶  GESTANTE (chat + notificación)
OBSTETRA  ──atiende cita──▶  marca "asistida" + notifica a GESTANTE
ADMIN     ──aprueba──▶  OBSTETRA (habilita login)
ADMIN     ──feature flags / config──▶  visibilidad de módulos para OBSTETRA y GESTANTE
ADMIN     ──supervisa/audita──▶  todos los datos
```

El backend respalda estas interacciones con módulos dedicados (`auth`,
`patients`, `appointments`, `clinical`, `education`, `home-visits`, `chat`,
`notifications`, `reports`, `sync`, `admin`), 11 rutas montadas bajo `/v1`, RBAC
por endpoint, Socket.IO para chat/presencia, BullMQ+Redis para envío de
notificaciones y cron de recordatorios.

---

## 7. Observaciones y hallazgos

**Fortalezas**
- Sistema de diseño **disciplinado y verificado por tooling** (linter de diseño +
  `npm run verify`): tokens como única fuente, herencia limpia en 5 capas, una
  sola base de código para web y móvil con un único switch (`webShell`).
- **Offline-first serio**: caché persistente 7 días + outbox idempotente con
  backoff — apropiado para zonas rurales con conectividad intermitente.
- **Tiempo real maduro**: chat con optimistic+reconciliación por `clientId`,
  presencia global y vistos.
- **Accesibilidad pensada**: cuerpo mínimo 15px, áreas táctiles ≥48,
  `accessibilityRole/Label`, respeto a reduce-motion.
- Decisiones de producto bien justificadas en comentarios (FUM, semáforo de
  riesgo nunca solo por color, copys en voz activa).

**Riesgos / pendientes detectados**
- **Modo oscuro desactivado**: la infraestructura existe (`commonColorsDark`,
  `useThemedColors`) pero `ThemeProvider` fuerza `light`. Coexisten pantallas que
  leen `commonColors` directo y otras temables → migración incompleta.
- **Token web en `localStorage`**: cómodo, pero menos seguro que SecureStore
  (susceptible a XSS). Aceptable para un portal interno; revisar para producción.
- **Rama conocida** `fix/expo-web-sqlite-blank-screen`: indica fricción histórica
  de `expo-sqlite` en web; hoy la web resuelve la persistencia con `localStorage`
  y el bundle compila/renderiza correctamente (verificado).
- La ficha del paciente (`gestante/[id].tsx`, 2764 líneas) y `usuarios.tsx`
  (1165) son **archivos muy grandes**; candidatos a descomposición para
  mantenibilidad.
- 23 vulnerabilidades de npm reportadas en backend (22 moderadas, 1 alta) y
  warnings de deprecación (uuid, glob) — conviene `npm audit` antes de producción.

---

## 8. Conclusión

VITMATERNA es una plataforma de salud prenatal **bien arquitecturada en el
frontend**: un sistema de diseño en capas con herencia estricta de tokens, una
única base de código que se adapta de móvil a portal web de escritorio mediante
`webShell`, carga con skeletons 1:1 y los 4 estados cubiertos, y funciones
complejas de nivel producción (offline-first con outbox, chat en tiempo real con
presencia/vistos, emergencia con GPS multiplataforma, feature flags que gobiernan
el alcance). Los tres roles —**administrador**, **obstetra** y **gestante**—
tienen flujos claros, navegación propia por acento de color y un mapa de
interacciones coherente respaldado por un backend modular con RBAC y tiempo real.
El stack se levantó y validó end-to-end; las tres portales funcionan en vivo.
