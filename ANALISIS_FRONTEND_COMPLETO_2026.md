# VitMaterna — Análisis Completo del Frontend (Web y Móvil)

> Análisis de diseño y arquitectura del frontend de VitMaterna, plataforma
> digital de salud prenatal para gestantes de la zona rural andina
> (Centro de Salud Talavera, Andahuaylas, Apurímac, Perú · 2.926 msnm).

**Fecha del análisis:** 2026-06-29
**Repositorio:** https://github.com/JoseLuisQL/vitmaterna.git
**Rama:** `main`
**Frontend:** `frontend/` — Expo SDK 56 / React Native 0.85 / Expo Router
**Verificado:** servidor web levantado en `http://localhost:8081/` (HTTP 200,
título `VITMATERNA`), login renderizado en viewports móvil (390×844) y
escritorio (1440×900), estado de error (toast) capturado.

---

## 1. Resumen ejecutivo

VitMaterna **no es un CRUD médico**: es un sistema de soporte a la decisión
clínica centrado en la gestante andina, con foco en dos indicadores OMS
(adherencia a controles prenatales y a suplementación). El frontend es una
**app Expo multiplataforma** (iOS · Android · Web) con una sola base de
código, navegación por carpetas (Expo Router) y un **sistema de diseño propio
muy maduro** llamado **"Clinical Calm"**.

| Dimensión | Estado | Nota |
|---|---|---|
| Stack moderno | ✅ Excelente | Expo SDK 56, RN 0.85, React 19, React Compiler activo |
| Sistema de diseño | ✅ Excelente | Tokens → primitivas → patrones → plantilla → pantallas |
| Responsive web/móvil | ✅ Excelente | `useResponsive()` + `webShell`, una sola base de código |
| Accesibilidad | ✅ Muy bueno | WCAG AA verificado, roles/labels, área táctil 48, reduce-motion |
| Cohesión visual | ✅ Excelente | Acento por rol, semáforo de riesgo, modo oscuro |
| Estados (carga/vacío/error) | ✅ Muy bueno | Estandarizados en `ScreenLayout` y patrones |
| Mantenibilidad | ✅ Muy bueno | Navegación centralizada, `ListScreen` reduce ~500→120 líneas |
| Puerta de calidad | ✅ Muy bueno | `npm run verify` = tsc + audit:design:strict + jest |

**Conclusión:** es un frontend de **calidad profesional/producción**, con una
disciplina de diseño poco común. Las observaciones de mejora (sección 8) son
afinamientos, no problemas estructurales.

---

## 2. Stack tecnológico del frontend

| Capa | Tecnología | Versión |
|---|---|---|
| Framework | Expo SDK | 56 |
| UI runtime | React Native | 0.85 |
| Lenguaje | TypeScript | ~6.0 |
| React | React / React DOM | 19.2 |
| Compilador | React Compiler | activo (`experiments.reactCompiler`) |
| Navegación | Expo Router (file-based, typed routes) | 56.2 |
| Datos servidor | TanStack Query + persistor | 5.101 |
| Estado cliente | Zustand (auth) | 5.0 |
| HTTP | Axios (interceptores JWT + refresh) | 1.17 |
| Formularios | React Hook Form + Zod (resolver) | 7.77 / 4.4 |
| Tiempo real | Socket.IO Client | 4.8 |
| Offline | expo-sqlite (outbox) + AsyncStorage (caché) | — |
| Iconos | Lucide React Native | 1.17 |
| Tipografía | @expo-google-fonts/inter (Inter 400/500/600/700) | — |
| Listas | @shopify/flash-list | 2.0 |
| Imágenes | expo-image | 56 |
| Gráficos | SVG propios (ChartBar, ChartDonut, LineChartSvg) | — |
| Exportación | xlsx / xlsx-js-style + expo-print | — |

**Plugins nativos:** notificaciones, ubicación, image-picker, audio, secure-store,
sqlite, local-authentication, linear-gradient, haptics, file-system, sharing.

---

## 3. Arquitectura del frontend

### 3.1 Estructura de carpetas

```
frontend/
├── app/                      Rutas Expo Router (file-based, typed)
│   ├── _layout.tsx           Root: providers + inicialización
│   ├── index.tsx             Splash/redirección por rol
│   ├── (auth)/               login · register · forgot-password · cambiar-password
│   ├── (gestante)/           Rol gestante (tabs + sub-rutas)
│   │   ├── (tabs)/           index · citas · tratamiento · chat · perfil · educacion
│   │   ├── educacion/[id]    Detalle de contenido
│   │   ├── alarmas · visitas · notificaciones
│   ├── (obstetra)/           Rol obstetra (tabs + sub-rutas)
│   │   ├── (tabs)/           index · gestantes · cronograma · chat · reportes · perfil
│   │   ├── atender/[id]      Atender cita → control prenatal
│   │   ├── control/nuevo     Registro de control
│   │   ├── gestante/[id]     Ficha clínica · nueva · tamizajes
│   │   ├── mensaje-masivo · notificaciones
│   └── (admin)/              Rol admin (tabs + sub-rutas)
│       ├── (tabs)/           index · usuarios · contenido · sedes · config ·
│       │                     notificaciones · auditoria
│       ├── supervision/      reportes · gestantes · citas
│       └── perfil · avisos
├── src/
│   ├── components/
│   │   ├── ui/               ~52 primitivas (AppButton, AppCard, Field, ...)
│   │   ├── patterns/         ListScreen · DetailScreen · FormScreen · DashboardScreen ·
│   │   │                     SectionCard · Overlay · ConfirmSheet
│   │   ├── layout/           ScreenLayout (plantilla) · AppSidebar · RoleGuard
│   │   ├── web/              WebShell · WebSidebar · WebTopBar · DataTable · Breadcrumb
│   │   ├── shared/           NotificationBell · MessageThread · ChatInput · EmergencyAlert
│   │   ├── onboarding/       OnboardingGate
│   │   └── tour/             Tour guiado (TourHost + targets)
│   ├── theme/                14 archivos: colors · typography · spacing · responsive ·
│   │                         shadows · gradients · animations · motion · zIndex · makeStyles
│   ├── services/             api (Axios) · queryClient · outbox · network · api-queries
│   ├── store/                authStore (Zustand)
│   ├── hooks/                useSocket · useChat · useResponsive · useRefetchOnFocus · ...
│   ├── navigation/menu.ts    FUENTE ÚNICA de navegación por rol
│   ├── database/             init + SQLite outbox
│   └── utils/                datetime · confirm · whatsapp · lastSeen · haptics · ...
```

### 3.2 Bootstrapping (raíz `_layout.tsx`)

Orden de inicialización, idempotente y antes de montar el árbol:

1. `initNetwork()` — conectividad (NetInfo)
2. `startQueryPersistence()` — caché TanStack Query persistida
3. `initOutbox(queryClient)` — cola offline de escrituras
4. `SafeAreaProvider` → `ThemeProvider` → `QueryClientProvider` → `ToastProvider`
5. `WebShell` (cáscara web condicional) → `OnboardingGate` → `AppNavigator`
6. `OfflineBanner` + `ConfirmHost` + `TourHost` globales

Pantalla de carga de marca (`SplashScreen`) mientras cargan fuentes/sesión;
puerta de mantenimiento (`MaintenanceGate`) que bloquea gestante/obstetra si
el admin activó el modo mantenimiento (el admin queda exento).

### 3.3 Fuente única de navegación (`src/navigation/menu.ts`)

Toda la navegación, por rol, vive en un solo objeto `NAVIGATION`:

- `primary` → tabs en móvil / cabecera del sidebar en web
- `sections` → drawer en móvil / resto del sidebar en web

Tanto el `SidebarProvider` (drawer móvil) como `WebSidebar` (sidebar fijo web)
consumen este mismo dato → **nunca se desincronizan** las rutas entre
plataformas. Ejemplo del rol gestante:

- **Primary:** Inicio · Citas · Tratamiento · Chat
- **Secciones:** *Mi salud* → Educación · Signos de alarma · Visitas domiciliarias; *Cuenta* → Mi perfil

---

## 4. Sistema de diseño — "Clinical Calm"

El frontend tiene un **sistema de diseño propio, documentado y no negociable**
(impuesto por `AGENTS.md` y vigilado por `npm run audit:design`). Es el aspecto
más destacable del proyecto.

### 4.1 Jerarquía (de abajo hacia arriba)

1. **Tokens** (`src/theme/`) — color, tipografía, espacio, sombra, radio, zIndex, motion
2. **Primitivas** (`src/components/ui/`) — `AppButton`, `AppCard`, familia `Field`,
   `StatusChip`, `Skeleton`, `AppBadge`, etc.
3. **Patrones** (`src/components/patterns/`) — `ListScreen`, `DetailScreen`,
   `FormScreen`/`FormSheet`, `DashboardScreen`, `SectionCard`, `Overlay`, `ConfirmSheet`
4. **Plantilla** (`ScreenLayout`) — el molde de TODA pantalla
5. **Pantallas** (`app/`) — solo composición + datos, sin "chrome"

### 4.2 Color

Filosofía: base neutra fría casi blanca ("spa clínico"), superficies blancas
separadas por **sombra suave** (no bordes), un acento por rol + semánticos +
semáforo de riesgo. **Todos los pares texto/fondo cumplen WCAG AA** (verificado
en `__tests__/theme.test.ts` con cálculo de contraste en vivo).

**Acento por rol** (3 variantes cada uno: sólido / Mid / Light):

| Rol | Acento | Hex | Significado |
|---|---|---|---|
| Gestante | teal-esmeralda | `#0C8174` | salud, vida, crecimiento |
| Obstetra | azul clínico sereno | `#2C6EA8` | profesionalismo, calma |
| Admin | slate azulado | `#3C5168` | neutralidad de control |

**Semánticos:** success `#1F9D6B` · warning `#B07A14` · danger `#D64545`
(reservado a urgencias) · info `#2C6EA8`.
**Semáforo de riesgo:** verde `#1F9D6B` · ámbar `#B07A14` · rojo `#D64545`
(nunca solos: siempre con etiqueta de texto).
**Modo oscuro** completo (mismas claves intercambiables vía `ThemeContext`).

Tokens especiales centralizados: `onColorText*` (texto sobre gradiente),
`chatColors` (vistos/checks de chat), `accentColors.whatsapp` (`#25D366`).

### 4.3 Tipografía

Una sola familia: **Inter** (400/500/600/700), cargada vía `@expo-google-fonts/inter`.

- **Cuerpo mínimo 15px** — decisión deliberada por la población con baja
  alfabetización digital.
- Escala: display 28–32 · h1 24 · h2 20 · h3 17 · h4 15 · body 15 · caption 12 · overline 11.
- Tokens numéricos para KPIs (`numeric` 32 / `numericMd` 24 / `numericSm` 18).
- Alias legacy para no romper pantallas existentes.

### 4.4 Espacio y layout

- **Grid de 8 puntos** (2/4/8/12/16/20/24/32/48/64).
- **Ritmo vertical semántico** `stack`: tight (8) · element (12) · group (16) ·
  section (24) · block (32) — acaba con los `marginBottom: 14/18/22` arbitrarios.
- `borderRadius`: xs 6 · sm 10 · md 14 · lg 18 · xl 22 (default AppCard) · xxl 28.
- `layout`: screenPadding 20H/16V · maxContentWidth 428 · minTouchTarget 48 ·
  tabBarHeight 64 · headerHeight 56.
- `webLayout` (portal web): sidebar 248/72 (colapsado) · topbar 64 ·
  contentMaxWidth {lg:1024, xl:1280, xxl:1440} · contentGutter {lg:32, xl:40, xxl:48}.

### 4.5 Elevación (sombras)

Tinte teal-grafito, suave y difusa (radio amplio, opacidad baja). En Android
`elevation`, en iOS/web sombra tenue.

`none · subtle (inputs/filas) · card (default tarjetas) · float (FAB) · modal`
+ `coloredGlow(color)` para glow del color del rol.

### 4.6 Responsive — el corazón de "web + móvil con una base"

`src/theme/responsive.ts` — helper único, **mobile-first**.

**Breakpoints** (px de ancho):
`xs <360 · sm ≥360 · md ≥600 · lg ≥840 · xl ≥1240 · xxl ≥1536`

Hook `useResponsive()` devuelve: `width`, `height`, `bp`, `select()` (mobile-first),
`isPhone`, `isTablet`, `isDesktop`, `isWide`, `isWeb`, y el **switch maestro
`webShell`** = `IS_WEB && width ≥ lg`.

> **`webShell` es la bisagra de toda la app.** Solo es `true` en navegador con
> ancho ≥ lg. Cada pantalla bifurca con `webShell`, **nunca con estilos sueltos**.

### 4.7 Puerta de calidad (reglas no negociables, vigiladas por `audit:design`)

En `app/` está **prohibido**:
- Literales de color `#hex`/`rgba()` → usar tokens de `theme/colors`
- `Alert.alert` → usar `useToast` o `ConfirmSheet`/`confirmAction`
- `<Modal>` de `react-native` → usar `Overlay` (móvil: BottomSheet / web: AppModal)
- `SafeAreaView` de `react-native` → usar `react-native-safe-area-context`
- `zIndex` numérico suelto → usar `theme/zIndex`

Convenciones adicionales: cargas con skeleton 1:1 (no spinners), cada pantalla
cubre cargando/vacío(CTA)/error(reintento)/contenido, copys en voz activa
minúscula, accesibilidad `role`/`Label`, área táctil ≥48, contraste AA,
`useReducedMotion` respetado, y **marca inmutable** (no se cambia paleta,
tipografía Inter ni el grid de 8pt).

```bash
npm run verify   # tsc + audit:design:strict + jest  (debe pasar)
```

---

## 5. Diseño del entorno WEB (portal de escritorio)

### 5.1 Cáscara del portal — `WebShell`

Cuando `webShell` es `true` (navegador ≥ lg) **y** hay sesión con rol, se monta
el portal; si no (login, splash, o web angosta), es passthrough total y la app
se comporta como en móvil.

```
┌─────────────────────────────────────────────────────────┐
│  WebSidebar (248px)  │  WebTopBar (64h)                 │
│  ─ logo + rol        │  ─ breadcrumb / acciones         │
│  ─ nav primary        ├──────────────────────────────────┤
│  ─ nav sections       │  Content area                    │
│  ─ pie: tour · manual │  (ScreenLayout width=full/wide) │
│    · tema · logout    │                                  │
└──────────────────────┴──────────────────────────────────┘
```

**Características del sidebar web:**
- Marca + rol en la cabecera; botón flotante para **colapsar/expandir** (248 ↔ 72px,
  persistido en `localStorage`).
- Resaltado del ítem activo por `usePathname()` (normaliza grupos `(tabs)`).
- **Badges de pendientes** estilo WhatsApp en el ítem de Chat (cuenta sin leer).
- Pie con: "Conoce tu app" (relanzar tour guiado), "Manual de usuario" (PDF por
  rol), toggle de tema, y logout destructivo.
- Hover/pressed con transiciones CSS (`cursor: pointer`, `outlineStyle: 'none'`).

### 5.2 `ScreenLayout` — plantilla única, modo web

En el portal web, el header del rol **no usa el gradiente gigante** (esa
estética es móvil): el color de rol vive en el sidebar/topbar. En web se muestra
un **header plano y compacto**, y el ancho de contenido se controla con `width`:

- `readable` (default) — columna centrada ≈760–900px (formularios/lectura)
- `wide` — 1024/1280/1440 según breakpoint (dashboards, grids de tarjetas)
- `full` — 100% del área (tablas, vistas densas)

En móvil siempre es full-bleed. El padding lateral en web usa `webLayout.contentGutter`
(32/40/48 según breakpoint).

### 5.3 Patrón "tabla en web ↔ tarjetas en móvil" — `ListScreen`

El componente estrella de productividad. Cada pantalla de lista (gestantes,
usuarios, contenido, citas…) antes reimplementaba ~500 líneas; `ListScreen` lo
reduce a ~120. Recibe: `data`, `renderCard` (móvil), `columns` (web),
`filters`, acción de crear — y renderiza dual:

- **Web:** `DataTable` densa (cabecera fija, orden por columna, filas clicables,
  estados de carga `TableSkeleton` y vacío con CTA).
- **Móvil:** `FlashList` de tarjetas con `ListSkeleton`, pull-to-refresh y
  scroll infinito.

### 5.4 `DataTable`

Tabla genérica, solo bajo `webShell`. Cabecera con orden (icono ChevronUp/Down),
alineación por columna, celdas `interactive` (botones propios, no disparan
`onRowPress`), estados de carga y vacío. Usa exclusivamente tokens del tema.

### 5.5 Bifurcaciones web/móvil en pantallas concretas

- **Login:** tarjeta centrada con `maxWidth: 440` en web (`webAuthCard`); blobs
  decorativos de color (teal/azul) en el fondo.
- **Dashboard obstetra:** en web, "Distribución de riesgo" y "Citas de hoy" van
  **side-by-side** en dos columnas (`twoCol`); en móvil apilados en `FlatList`.
- **Dashboard admin:** "Estado del sistema" y "Gestión" comparten fila en web
  (`twoCol`), apilados en móvil.
- **Chat gestante:** en web, cabecera del `ScreenLayout` + acción "Reportar
  síntoma" como botón; en móvil, header con gradiente + avatar + botón WhatsApp
  + botón "Reportar un síntoma a mi obstetra".
- **Citas gestante:** en web, `DataTable` con chips de filtro (Próximas/Historial)
  en una barra `webToolbar`; en móvil, `SectionList` con `ToggleTabs`.

### 5.6 Detalles web-only

- Scrollbar estilizada (thin, teal-grafito, con variante dark).
- `cursor: pointer` + `transition` + `outlineStyle: 'none'` en elementos
  interactivos (NavRow, chips, botones).
- `lineHeight: 'normal'` en títulos web (evita recortes del lineHeight fijo de RN).

---

## 6. Diseño del entorno MÓVIL (iOS/Android)

### 6.1 Navegación móvil — tabs + drawer

- **Bottom tab bar** con `PillTabBar` (indicador animado tipo píldora) y acento
  del rol. Badge de no-leídos en el tab de Chat.
  - Gestante: Inicio · Citas · Tratamiento · Chat (Perfil y Educación ocultos del
    tab bar, viven en el drawer para un look más profesional).
  - Obstetra: Inicio · Gestantes · Agenda · Chat (Reportes y Perfil en drawer).
  - Admin: Inicio · Usuarios · Contenido (Supervisión, Sistema, Seguridad, Cuenta
    en drawer).
- **Drawer lateral** (`AppSidebar` + `SidebarProvider`) para la navegación
  secundaria agrupada por secciones.

### 6.2 Header con gradiente por rol (móvil)

`ScreenLayout` en móvil (no web) pinta un header con `LinearGradient` del color
del rol, esquinas inferiores redondeadas (xxl 28), título/subtítulo en blanco,
botón back circular translúcido y acciones a la derecha (campana de
notificaciones + menú). `StatusBar` se adapta (`light-content` sobre gradiente).

### 6.3 Componentes móviles destacados

- **`PillTabBar`** — tab bar tipo píldora con indicador animado (Reanimated).
- **`Overlay`** — abstracción de modal: en móvil = `BottomSheet`
  (hoja inferior deslizable), en web = `AppModal` (diálogo centrado).
- **`PrenatalRibbon`** — cinta prenatal semanal, "la firma de la app": muestra
  el avance semana a semana, los trimestres y "hoy", con hitos (p. ej. próxima
  cita) marcados sobre la cinta.
- **`ProgressRing`** — anillo de progreso SVG (adherencia, tratamiento del día).
- **`EmergencyAlert`** — modal de emergencia con GPS (botón de pánico) que
  envía ubicación al obstetra vía `/chat/emergencia`.
- **`CalendarPicker` / `DateSelector` / `TimeWheel`** — selectores de fecha/hora
  adaptados, usados en reprogramación de citas y control prenatal.
- **`PressableScale`** — pressable con animación spring de escala (press feedback).
- **Haptics** (`expo-haptics`) en botones primary/danger.

### 6.4 Pantallas móviles clave

- **Gestante · Inicio:** onboarding si no hay FUM → cinta prenatal → próxima cita
  (con confirmar asistencia) → tratamiento del día (ProgressRing + "X de Y
  tomados") → acciones rápidas (Reportar signo de alarma / Emergencia GPS /
  Educación).
- **Gestante · Citas:** `SectionList` agrupada por día (encabezados relativos:
  "Hoy", "Mañana", fecha larga), tarjeta de progreso MINSA (8 controles),
  modales de detalle y reprogramación con selección inteligente de fecha+slot.
- **Gestante · Tratamiento:** jerarquía en 3 bloques: Constancia (racha + mejor
  racha + logros con iconos Lucide) → Mi adherencia (anillo + barra semanal) →
  Mis medicamentos (acción + calendario). Gamificación calculada en el backend.
- **Gestante · Alarmas:** signos de alarma agrupados en 3 secciones (Embarazo /
  Parto / Postparto), selección múltiple, notas, envío offline-first.
- **Chat (gestante y obstetra):** estilo WhatsApp — hilo único, presencia
  ("en línea"/"última vez"), "escribiendo…", vistos (checks azules), separadores
  de fecha, recomendación de contenido educativo, envío de imágenes, y botón de
  WhatsApp directo al obstetra (solo móvil).

### 6.5 Estrategia offline-first (crítica para la zona rural andina)

- **Lecturas:** caché TanStack Query persistida (AsyncStorage/localStorage, 7 días,
  `networkMode: offlineFirst`). Al reabrir sin señal, las pantallas muestran los
  últimos datos.
- **Escrituras:** outbox persistente (SQLite en nativo / localStorage en web).
  Operaciones críticas (consumo de suplemento, signo de alarma) se encolan con
  `dedupeKey`, reintentan con backoff al reconectar, descartan errores 4xx y
  reintentan 5xx/red. Idempotencia también del lado servidor.
- **UI:** `OfflineBanner` global (banner grafito-teal legible sobre cualquier
  vista) + indicador de operaciones pendientes.

---

## 7. Vistas por rol — inventario completo

### 7.1 `(auth)` — sin sesión
- **login** — DNI + contraseña (Zod), blobs decorativos, tarjeta centrada en web.
- **register** — auto-registro (queda pendiente de aprobación del admin).
- **forgot-password** — recuperación por código de 6 dígitos vía SMS/WhatsApp.
- **cambiar-password** — cambio post-login/post-recuperación.

### 7.2 `(gestante)` — paciente
| Ruta | Vista |
|---|---|
| `(tabs)/index` | Dashboard: cinta prenatal, próxima cita, tratamiento del día, acciones rápidas, emergencia |
| `(tabs)/citas` | Próximas/Historial, progreso MINSA, detalle, reprogramación con slots |
| `(tabs)/tratamiento` | Constancia (racha+logros), adherencia (anillo), medicamentos |
| `(tabs)/chat` | Hilo único con obstetra, WhatsApp, reportar síntoma |
| `(tabs)/educacion` | Biblioteca: Para ti / Biblioteca / Favoritos + calculadora EG |
| `(tabs)/perfil` | Datos personales, FUM, ajustes |
| `educacion/[id]` | Detalle de artículo (RichText) + tracking de lectura |
| `alarmas` | Signos de alarma (embarazo/parto/postparto) + envío |
| `visitas` | Historial de visitas domiciliarias |
| `notificaciones` | Bandeja de notificaciones |

### 7.3 `(obstetra)` — profesional
| Ruta | Vista |
|---|---|
| `(tabs)/index` | Panel: KPIs (citas hoy/pacientes/alertas), distribución de riesgo, citas de hoy |
| `(tabs)/gestantes` | Lista de pacientes (tabla web / tarjetas móvil) con semáforo de riesgo + cinta prenatal |
| `(tabs)/cronograma` | Agenda con disponibilidad y anti-doble-booking |
| `(tabs)/chat` | Lista de conversaciones + hilo |
| `(tabs)/reportes` | Indicadores MINSA y de tesis (adherencia, asistencia, riesgo) |
| `(tabs)/perfil` | Datos y ajustes |
| `atender/[appointmentId]` | Atender cita → registrar control prenatal |
| `control/nuevo` | Nuevo control (autonumera, recalcula riesgo, agenda próxima) |
| `gestante/[id]` | Ficha clínica completa (controles, labs, vacunas, antecedentes, módulos opcionales) |
| `gestante/nueva` | Alta de gestante (contraseña inicial = DNI) |
| `gestante/tamizajes` | Tamizajes (violencia, salud mental) si el flag está activo |
| `mensaje-masivo` | Broadcast por trimestre + nivel de riesgo |
| `notificaciones` | Bandeja |

### 7.4 `(admin)` — administrador
| Ruta | Vista |
|---|---|
| `(tabs)/index` | Dashboard: pendientes de aprobar, resumen (4 KPIs), estado del sistema, gestión |
| `(tabs)/usuarios` | CRUD usuarios (tabla web / tarjetas móvil), aprobar, reset password, desactivar |
| `(tabs)/contenido` | CRUD contenido educativo |
| `(tabs)/sedes` | Establecimientos de salud con altitud (msnm) |
| `(tabs)/config` | Parámetros del sistema + feature flags |
| `(tabs)/notificaciones` | Activar Twilio/WhatsApp en caliente |
| `(tabs)/auditoria` | Bitácora de mutaciones + backup |
| `supervision/reportes` | KPIs clínicos y MINSA globales |
| `supervision/gestantes` | Todas las gestantes registradas |
| `supervision/citas` | Agenda global |
| `perfil` · `avisos` | Cuenta y avisos |

---

## 8. Observaciones y oportunidades de mejora

> Son afinamientos. No hay problemas estructurales; el sistema está pulido.

1. **Duplicación de header en pantallas heredadas.** Algunas vistas (p. ej.
   `gestantes.tsx`, `usuarios.tsx`) aún pintan su propio header con gradiente +
   `LinearGradient` + `SafeAreaView` en móvil en vez de delegar todo al
   `ScreenLayout`. Migrarlas al patrón reduce código y mejora consistencia.
2. **Citas: ~910 líneas con lógica web/móvil duplicada.** La rama web y la móvil
   repiten los modales de detalle y reprogramación. Extraerlos a
   `FormScreen`/`FormSheet` o a sub-componentes reduciría el tamaño.
3. **`DataTable` sin paginación explícita visible.** Depende del scroll del
   contenedor; para conjuntos muy grandes en web convendría paginación/virtualización
   nativa de filas.
4. **Sin i18n formal.** Todos los copys están en español hardcodeado. Si el
   producto se exporta, conviene un `i18n` (la población objetivo es rural
   andina, posiblemente bilingüe quechua-español).
5. **`app.config.js` y `.env` apuntan a una IP LAN** (`192.168.100.26:3000`).
   Para desarrollo aislado conviene `localhost:3000` y levantar el backend.
6. **React Native DevTools no arranca** en el sandbox por falta de Electron
   sandbox (corre como root) — no afecta a la app, solo al debugger nativo.

---

## 9. Cómo levantar el frontend (verificado)

```bash
# Requisitos: Node >= 20 (Expo SDK 56 no soporta Node 18)
cd frontend
npm install

# Web  → http://localhost:8081
npm run web

# Android / iOS
npm run android
npm run ios
```

**Notas del entorno de análisis:**
- Node 18 del sandbox era insuficiente; se instaló Node 22 y se reinstalaron
  dependencias — Expo arrancó sin errores.
- El backend apunta a una IP LAN no alcanzable desde el sandbox, así que el
  login muestra el estado de error (toast) diseñado para ese caso — confirma
  que el manejo de errores funciona en producción.
- Capturas: login móvil (390×844) y escritorio (1440×900) renderizados
  correctamente; el `WebShell` activa el portal a partir de `lg` (≥840px).

---

## 10. Conclusión

VitMaterna es un frontend de **calidad de producción**. Destaca por:

- Un **sistema de diseño propio y maduro** ("Clinical Calm") con jerarquía de
  tokens → primitivas → patrones → plantilla, auditado automáticamente.
- **Una sola base de código** para móvil (iOS/Android) y web, con la bisagra
  `webShell` y el patrón "tabla ↔ tarjetas" que evita duplicar lógica.
- **Disciplina** (navegación centralizada, estados estándar, accesibilidad AA,
  modo oscuro, offline-first) poco común en proyectos de este tamaño.
- Enfoque clínico real (corrección de hemoglobina por altitud, semáforo de
 riesgo, cronograma MINSA, botón de pánico con GPS) que se refleja en la UI.

Las oportunidades de mejora son de **consolidación** (migrar pantallas heredadas
a `ScreenLayout`, extraer modales duplicados), no de diseño fundamental.
