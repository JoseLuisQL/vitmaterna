# Análisis completo del Frontend — VITMATERNA (web + móvil, todas las vistas)

> **Autor:** Kortix Agent · **Fecha:** 2026-06-29
> **Base:** clon real de `github.com/JoseLuisQL/vitmaterna` (rama `main`, commit `aff8eee`).
> **Método:** lectura y verificación directa del código (`app/`, `src/theme/`, `src/components/`),
> ejecución del `audit:design`, build estático web (`expo export`) y captura visual en navegador
> (Chromium headless). Cada afirmación concreta de este reporte fue verificada contra el código.

---

## 0. Resumen ejecutivo

VITMATERNA es una **plataforma de salud prenatal** (gestante / obstetra / admin) construida como
**aplicación Expo + React Native 0.85** que compila para **iOS, Android y Web desde una sola base
de código**. El frontend expone **48 pantallas** en 4 grupos de rutas (`auth`, `gestante`,
`obstetra`, `admin`) y se apoya en un **sistema de diseño propio llamado "Clinical Calm"**:

- **Tokens centralizados** (14 archivos en `src/theme/`): color por rol, semáforo de riesgo,
  semánticos, tipografía Inter, grid 8pt, sombras, zIndex, motion, gradientes. Contraste WCAG AA
  verificado por tests.
- **51 primitivas UI**, **8 patrones** (`DashboardScreen`, `ListScreen`, `DetailScreen`,
  `FormScreen`, `Overlay`, etc.), **6 componentes web** (`WebShell`, `WebSidebar`, `WebTopBar`,
  `DataTable`, `Breadcrumb`, `WebMaxWidth`) y **4 de layout** (`ScreenLayout`, `AppSidebar`,
  `SidebarProvider`, `RoleGuard`).
- **Web ↔ móvil unificados por un único booleano `webShell`** (= navegador **y** ancho ≥ 840px):
  en web se pinta un portal con sidebar fija + topbar + breadcrumb; en móvil/nativo se usa la
  `PillTabBar` y un drawer. Las pantallas densas (listas de gestantes/usuarios/contenido)
  renderizan **`DataTable` en web ↔ tarjetas en móvil**.
- **Auditoría de diseño limpia** (`npm run audit:design` → 0 violaciones bloqueantes), con
  fuerte disciplina de accesibilidad, estados de carga skeleton 1:1, UX offline y RBAC por ruta.

**Veredicto:** es un sistema de diseño **maduro, disciplinado y muy bien pensado** para un
producto clínico de doble objetivo (móvil rural + portal web SaaS). La deuda es **de migración,
no de diseño**: los patrones `DashboardScreen`/`ListScreen`/`DetailScreen`/`FormScreen` existen
pero las pantallas aún no los adoptan del todo (la ficha `gestante/[id].tsx` sigue siendo un
monolito de **2 804 líneas**); hay 4 pantallas admin con el **acento de rol equivocado**; el
**modo oscuro está totalmente definido pero deshabilitado**; y el audit tiene un **punto ciego
para hex de 3 dígitos** que deja pasar un `#000` real.

---

## 1. Stack y arquitectura del frontend

| Capa | Tecnología |
|---|---|
| App shell | **Expo SDK 56** · **React Native 0.85** · **React 19** · TypeScript 5 |
| Routing | **Expo Router** (navegación por carpetas en `app/`) |
| Datos | **TanStack Query** (caché offline-first persistida) + **Axios** (JWT + refresh) |
| Estado | **Zustand** (auth) |
| Local/offline | **expo-sqlite** (outbox idempotente) · **expo-secure-store** · **AsyncStorage** |
| Tiempo real | **Socket.IO** (chat, presencia, alertas de emergencia) |
| Tema | Sistema propio (`src/theme/`), fuente **Inter** (`@expo-google-fonts/inter`) |
| Web | **react-native-web** · salida `single` (un `index.html` + bundle JS) |

> **Nota sobre `StartApp/`**: no es el frontend. Es un **bundle de diseño exportado desde Figma**
> (`@figma/my-make-file`, Vite + MUI + Radix/shadcn). Sirve de referencia visual auxiliar. El
> frontend real es `frontend/`.

### Capa de providers (`app/_layout.tsx`)
`SafeAreaProvider → ThemeProvider → QueryClientProvider → ToastProvider → (ThemedStatusBar,
MaintenanceGate, WebShell, OnboardingGate, ConfirmHost, TourHost, OfflineBanner)`. La
conectividad, persistencia de Query y la cola offline se inicializan **una sola vez** a nivel de
módulo (`initNetwork`, `startQueryPersistence`, `initOutbox`), antes de montar el árbol. Mientras
cargan fuentes/sesión se muestra una `SplashScreen` de marca (no pantalla en blanco).

---

## 2. Sistema de diseño "Clinical Calm"

### 2.1 Filosofía
Base neutra fría casi blanca (`#F6F8F8`), superficies blancas limpias separadas por **sombra
suave (no por bordes)** y un acento de salud **teal/esmeralda** que transmite vida y confianza
clínica. **Un acento por rol** + semánticos + semáforo de riesgo. Cada color semántico y de
riesgo expone 3 variantes (`sólido` / `Mid` = chips / `Light` = fondo de tarjeta).

### 2.2 Color (`src/theme/colors.ts`) — verificado
**Neutros** (`commonColors`): fondo `#F6F8F8`, superficie `#FFFFFF`, texto `#16242B` (slate-teal
profundo, no negro), texto secundario `#566873` (AA 5.4:1), bordes casi invisibles `#E7ECEE`.
Incluye tokens `onColor*` (blancos translúcidos) para superficies **sobre** los gradientes de
rol — esto eliminó la duplicación de "blancos a mano" por pantalla.

**Acentos por rol:**
| Rol | Color | Gradiente (header) |
|---|---|---|
| Gestante | teal-esmeralda `#0C8174` | `[#16A394, #0C8174]` |
| Obstetra | azul clínico `#2C6EA8` | `[#3D86C4, #2C6EA8]` |
| Admin | slate azulado `#3C5168` | `[#4C657F, #3C5168]` |

**Semáforo de riesgo** (`riskColors`, **nunca se usa solo, siempre + etiqueta de texto**):
verde `#1F9D6B` / ámbar `#B07A14` / rojo `#D64545`. **Semánticos**: success/warning/danger/info.
**Chat** (`chatColors`): doble check "visto" azul `#9BE7FF`. **WhatsApp** de marca `#25D366`.

**Modo oscuro** (`commonColorsDark`): **definido por completo** (fondo grafito-teal `#0C1417`,
superficies elevadas, bordes, `onColor*`) pero **NO cableado** — `ThemeContext.tsx:42-57` fuerza
`mode='light'` y `setMode` solo acepta `'light'` (comentario: *"modo oscuro/sistema está en
desarrollo"*). Existen `useThemedColors()`/`useThemedStyles()` para migrar incrementalmente.

### 2.3 Tipografía (`typography.ts`)
Familia única **Inter** (400/500/600/700). Escala: `displayXl 32 → h1 24 → h2 20 → h3 17 →
h4 15 → bodyLg 16 / body 15 / bodySm 13 → label/caption/overline/micro → button`. Tokens
numéricos aparte para KPIs (`numeric 32 / numericMd 24 / numericSm 18`). **El cuerpo mínimo es
15 px** — decisión consciente para usuarios de baja alfabetización digital.

### 2.4 Espaciado (`spacing.ts`)
**Grid de 8 pt** (`sm 8, md 16, lg 24, xl 32, xxl 48, xxxl 64`) + finos (`xs2 2, xs 4, sm2 12,
md2 20`) y un **ritmo vertical semántico** `stack` (`tight 8 / element 12 / group 16 / section
24 / block 32`). `borderRadius` 6→34→`full`. `layout` define `tabBarHeight 64`,
`minTouchTarget 48` (área táctil accesible), `maxContentWidth 428`. **`webLayout`** fija la
geometría del portal: `sidebar 248/72`, `topbar 64`, `contentMaxWidth {lg:1024, xl:1280,
xxl:1440}`, `contentGutter {lg:32, xl:40, xxl:48}`.

### 2.5 Sombras, zIndex y motion
- **Shadows** (`shadows.ts`): teñidas de teal (`#16242B`), 5 niveles
  (`none/subtle/card/float/modal`) + `coloredGlow(color)`; diferenciación Android `elevation`
  vs iOS/web sombra difusa.
- **zIndex** (`zIndex.ts`): escala semántica ordenada `base 0 → raised 10 → sticky 100 → nav 200
  → fab 300 → overlay 1000 → modal 1100 → popover 1200 → toast 1300 → banner 1400` (prohíbe el
  `zIndex` numérico suelto).
- **Motion** (`animations.ts` + `motion.ts`): presets de spring, duraciones y easings con
  nombres por intención; `useReducedMotion()`/`prefersReducedMotionSync()` respetan la
  preferencia de accesibilidad (matchMedia en web, `AccessibilityInfo` en nativo).

### 2.6 Componentes — inventario verificado
- **`src/components/ui/` (51):** `AppButton` (5 variantes × 3 tamaños, gradiente, háptico,
  spring press), `IconButton`, `LinkButton`, `AppCard` (pressable, glow), `AppBadge`,
  `StatusChip` (mapea estado→color para citas/tratamientos/riesgo), `AppText`, `AppHeader`,
  `AppModal`, `BottomSheet`, `AppInput` (react-hook-form), **familia `Field`**
  (`TextField/SelectField/SearchField/TextAreaField/NumberField` + `DateTimeField/DateSelector`),
  `AutoGrid`, `Accordion`, `ToggleTabs`, `PillTabBar`, **`PrenatalRibbon`** (cinta de semana
  gestacional — la firma visual de marca), `ProgressRing/ProgressBar/CircularProgress`,
  `KpiCard`, `InfoRow`, `ListItem`, `DiagnosisPill`, `RiskIndicator`, **gráficos**
  (`ChartBar/ChartDonut/LineChartSvg`), `CalendarPicker`, `TimeWheel`, `RichText`/`RichTextEditor`,
  **`SkeletonLoader`** (`DashboardSkeleton/ListSkeleton/TableSkeleton/KpiRowSkeleton/FormSkeleton/
  DetailHeaderSkeleton`), `EmptyState`, `LoadingScreen`, `SplashScreen`, `MaintenanceScreen`,
  `OfflineBanner`, `PressableScale`, `ProfileInfoModal`, `SectionHeader`, `ConfirmDialog`/
  `ConfirmHost`, `ToastProvider`, `ThemeToggle`, `VitMaternaLogo`, `WhatsAppIcon`.
- **`src/components/patterns/` (8):** `DashboardScreen`, `ListScreen` (auto tabla↔tarjetas),
  `DetailScreen`, `FormScreen`, `FormSheet`, `SectionCard`, **`Overlay`** (BottomSheet móvil ↔
  AppModal web), `ConfirmSheet`.
- **`src/components/web/` (6):** `WebShell`, `WebSidebar`, `WebTopBar`, `WebMaxWidth`,
  `DataTable`, `Breadcrumb`.
- **`src/components/layout/` (4):** `ScreenLayout` (el molde universal de pantalla),
  `AppSidebar` (drawer móvil), `SidebarProvider`, `RoleGuard`.
- **`src/components/shared/` (9):** `NotificationsScreen` (web-aware), `NotificationBell`,
  `MessageThread`, `ConversationListItem`, `ChatInput`, `TypingDots`, `EmergencyAlert`,
  `EmergencyMessageCard`, `AlturaUterinaChart`.

### 2.7 Reglas de diseño que vigila `npm run audit:design`
Script `scripts/audit-design.mjs`. Escanea todo `.tsx/.ts` en `app/` (salvo `_layout.tsx`, que
tiene CSS global de scrollbar web). Reglas:
- **R1** sin hex `#rrggbb` (bloqueante) · **R2** sin `rgba()` crudo (bloqueante) · **R3** sin
  `Alert.alert` (bloqueante) · **R4** sin `<Modal>` de RN crudo (bloqueante) · **R5** sin
  `SafeAreaView` desde `'react-native'` (bloqueante) · **R6** sin `zIndex` numérico suelto (no
  bloqueante). `npm run verify` = `tsc + audit:design:strict + jest`.
- **Estado actual (ejecutado):** **0 violaciones** en todas las reglas. R3/R4/R5 = 0 hits reales.
  ⚠️ Pero **R1 tiene un punto ciego**: su regex es `/#[0-9A-Fa-f]{6}\b/g`, que **solo captura hex
  de 6 dígitos**. Un `#000` (3 dígitos) real en `app/(obstetra)/(tabs)/cronograma.tsx:559`
  (`shadowColor: '#000'`) **se escapa**. Ver sección 10.2.

---

## 3. Web vs Móvil — arquitectura responsive (la pregunta clave)

### 3.1 El switch maestro: `useResponsive().webShell`
Definido en `src/theme/responsive.ts:96-117`. **`webShell = (Platform.OS === 'web') && (width ≥
840)`**. Breakpoints (mobile-first): `xs <360 · sm ≥360 · md ≥600 · lg ≥840 · xl ≥1240 ·
xxl ≥1536`. El hook expone además `select({...})` (resolver mobile-first), `isPhone/isTablet/
isDesktop/isWide` e `isWeb`. **35 pantallas** importan `useResponsive`; **32** usan `webShell`.

### 3.2 El portal web — `WebShell` (`src/components/web/WebShell.tsx`)
- Si **no** `webShell` → passthrough `<View style={flex:1}>` (móvil/nativo/web angosto intactos).
- Si `webShell` **y** autenticado con rol **y** no en splash → `row(sidebar + main(topbar +
  content))`. Login/register/splash se ven a pantalla completa incluso en web ancho.
- El colapso de la sidebar se persiste en `localStorage`.
- **No impone un `maxWidth` global** — cada pantalla lo decide vía `ScreenLayout width=
  "readable|wide|full"` y `WebMaxWidth`.

### 3.3 `WebSidebar` (248 px / 72 px colapsada)
Cabecera de marca (logo + rol), botón de colapso, navegación principal + secciones agrupadas
(una sola fuente `src/navigation/menu.ts`), resaltado de ruta activa, **badges de no-leídos en
chat** estilo WhatsApp, pie con tour "Conoce tu app", manual en PDF, `ThemeToggle` y logout
(vía `confirmAction` + toast). Todos los colores de `useThemedColors()`.

### 3.4 `WebTopBar` (64 px) + `Breadcrumb`
Breadcrumb a la izquierda (deriva de `menu.ts` + pathname, suprime UUIDs/ids), `NotificationBell`
y chip de usuario (avatar inicial + nombre + rol). Fija el `document.title`.

### 3.5 Cómo bifurcan las pantallas (patrones verificados)
1. **Tabla ↔ tarjetas** (la seña de identidad): `gestantes.tsx`, `usuarios.tsx`,
   `contenido.tsx` → `DataTable` en web + toolbar web; `FlashList` de tarjetas + FAB en móvil.
2. **Dos columnas en web / apilado en móvil** (dashboards): `obstetra/index`, `admin/index` →
   `webShell ? styles.twoCol : undefined`.
3. **Master-detail**: `obstetra/chat` y `gestante/chat` → web `flexDirection:'row'` (lista ‖
   hilo + placeholder); móvil navegación push lista→hilo.
4. **`select({...})` por breakpoint**: anchos máx. de listas (`tratamiento`, `educación`,
   `citas`) → `webLayout.contentMaxWidth.{lg:1024, xl:1280, xxl:1440}`.
5. **Show/hide en web**: acciones de header (`NotificationBell`/`Menu` solo en móvil), FABs
   (`!webShell && <FAB/>`).
6. **`Overlay`**: `webShell → AppModal` (diálogo centrado ≤440 px); móvil → `BottomSheet`.
7. **`PillTabBar`** se auto-oculta en web (`webShell` → `<View hidden/>`): el *estado* del
   navegador de tabs se conserva, pero la barra inferior no se pinta; la navegación pasa a la
   `WebSidebar`.

> **Logro notable:** `Platform.OS === 'web'` aparece **una sola vez** en `app/`. Toda la
> bifurcación web/móvil se hace con `IS_WEB`/`webShell`/`select()`, sin `Platform.select`
> disperso ni una app web separada.

### 3.6 Mobile shell
`PillTabBar` (fondo, accent de rol), drawer `AppSidebar` (abierto desde el botón Menú del
header), y `ScreenLayout` con **gradiente de rol** en el header (`role` prop → `ROLE_GRADIENT`).
`RoleGuard` bloquea deep-links entre roles y fuerza `mustChangePassword`.

---

## 4. Mapa de vistas por rol

### 4.1 `(auth)` — sin layout de rol, `Stack` con fade
| Pantalla | Propósito | Web vs móvil |
|---|---|---|
| `login.tsx` | DNI + contraseña (react-hook-form + zod), blobs decorativos, `VitMaternaLogo` | `isWeb ? maxWidth 440 centrado`; pantalla completa vía passthrough de `WebShell` (no autenticado). **Verificado visualmente** (ver §11). |
| `register.tsx` | Auto-registro de gestante | Formulario centrado en web. |
| `forgot-password.tsx` | Recuperación por código | — |
| `cambiar-password.tsx` | Cambio forzado/voluntario (issue #14), checklist de reglas en vivo | No usa `FormScreen`/`ScreenLayout` — se apoya en el passthrough de `WebShell`. |

### 4.2 `(gestante)` — acento teal, tabs
Tabs (`PillTabBar`): **inicio · citas · tratamiento · chat** (badge no-leídos).
`perfil` y `educación` están ocultos como tab (`href:null`) y viven en el sidebar.
| Pantalla | Layout | Elementos | Responsive |
|---|---|---|---|
| `(tabs)/index` | `ScreenLayout role=gestante width=full` | `PrenatalRibbon` (firma), `ProgressRing`, `AutoGrid` acciones rápidas, `EmergencyAlert` modal, `StatusChip` | Oculta `NotificationBell`/`Menu` en web; tarjetas a ancho completo. **No usa `DashboardScreen`.** |
| `(tabs)/citas` | `ScreenLayout` + lista | Lista/calendario de citas, solicitar reprogramación | `select()` para ancho máx. en web. |
| `(tabs)/tratamiento` | `ScreenLayout` + lista | Adherencia diaria, `ProgressRing`, lista idempotente | `webShell && maxWidth: webBodyMax`. |
| `(tabs)/chat` | Master-detail custom | `ConversationListItem`, `MessageThread`, `ChatInput` | Web 2 columnas; móvil push nav. |
| `(tabs)/educación` (sidebar) | lista + detalle `[id]` | Catálogo por trimestre/semana, artículo, infografías, video | `select()` ancho máx. |
| `alarmas.tsx` | `ScreenLayout` | Reporte de signos de alarma, header gradiente **danger**, botón de pánico GPS | — |
| `visitas.tsx` | `ScreenLayout` | Historial de visitas domiciliarias (acta MINSA) | — |
| `notificaciones.tsx` | delega a `NotificationsScreen` | Bandeja web-aware | — |
| `perfil.tsx` (sidebar) | `ScreenLayout` | Edición de FUM, datos | — |

### 4.3 `(obstetra)` — acento azul clínico, tabs
Tabs: **inicio · gestantes · cronograma · chat** (badge). `perfil` y `reportes` al sidebar.
| Pantalla | Layout | Elementos | Responsive |
|---|---|---|---|
| `(tabs)/index` | `ScreenLayout width=webShell?wide:full` | 3 KPIs sobrios, distribución de riesgo (puntos semáforo + barra proporcional), citas del día | **Split completo**: web `ScrollView`+`twoCol` (riesgo ‖ citas, tope 8); móvil `FlatList`+header. |
| `(tabs)/gestantes` | estilo `ListScreen` (custom) | Móvil: tarjetas ricas (avatar, semáforo, badge no-show, ribbon); web: `DataTable` 5 cols ordenables (Gestante, DNI/HC, Avance+ribbon, Riesgo, FPP) | `if (webShell) DataTable + toolbar; else FlashList + FAB`. |
| `(tabs)/cronograma` | custom | Agenda por segmentos, `NuevaCitaModal`, FAB | `if (webShell) toolbar + lista web`. ⚠️ `shadowColor: '#000'` (§10.2). |
| `(tabs)/chat` | master-detail custom | Inbox + `MessageThread` | Web 2 columnas; móvil push. |
| `(tabs)/reportes` (sidebar) | `ScreenLayout` + `WebMaxWidth` | `ChartBar`, `ChartDonut`, indicadores MINSA, `RiesgoSemaforo`, export PDF/XLSX | `webShell ? twoCol` (charts ‖ export). |
| `atender/[appointmentId]` | custom + `WebMaxWidth` | Wizard de 4 pasos (control/labs/tamizajes/tratamiento), pill+track de progreso | `webShell ? twoCol` (intro+finish ‖ tarjetas de paso). |
| `gestante/[id]` | **monolito custom (2 804 líneas)** | 4 `ToggleTabs` (Resumen/Seguimiento/Tratamiento/Clinico), `Accordion`, `LineChartSvg`, `AlturaUterinaChart`, `AppModal` de forms (lab/vacuna/tratamiento/antecedente), WhatsApp/llamada, `RichText` | `webShell` ajusta ancho de scroll. **No descompuesto** en `DetailScreen`+`SectionCard` (el plan existe). |
| `gestante/nueva` | estilo `FormScreen` | Alta de gestante (contraseña inicial = DNI) | `if (webShell)` layout web dedicado. |
| `gestante/tamizajes` | `ScreenLayout` | Módulos opcionales (ecografías, peso, violencia, salud mental, etc.) | — |
| `mensaje-masivo` | `ScreenLayout` | Broadcast por trimestre/riesgo + recomendación de contenido | — |

### 4.4 `(admin)` — acento slate, tabs
Tabs: **inicio · usuarios · contenido**. `sedes`, `config`, `auditoria`, `notificaciones` al
sidebar. Adicionalmente `supervision/{reportes,gestantes,citas}` (vistas globales).
| Pantalla | Layout | Elementos | Responsive |
|---|---|---|---|
| `(tabs)/index` | `ScreenLayout role=admin width=full` | Alerta de aprobaciones pendientes, `AutoGrid` 4 KPIs, estado del sistema, acciones rápidas | `webShell ? twoCol` (Estado ‖ Gestión). |
| `(tabs)/usuarios` | estilo `ListScreen` (custom) | Móvil tarjetas; web `DataTable` 4 cols; `AppModal` crear/editar/reset | `webShell ? webBody(DataTable) : header+FlashList+FAB`. ⚠️ **acento equivocado** + `TextInput` crudo (§10.1). |
| `(tabs)/contenido` | estilo `ListScreen` | CRUD, `RichTextEditor`, media picker, `AppInput` form | Dual tabla/tarjetas. ⚠️ **acento equivocado** (§10.1). |
| `(tabs)/sedes` (sidebar) | `ScreenLayout` | Establecimientos + altitud (msnm) | `BRAND=adminColors.primary` (correcto). |
| `(tabs)/config` (sidebar) | `ScreenLayout` | Parámetros + **feature flags** (7 módulos) | ⚠️ **acento equivocado** (§10.1). |
| `(tabs)/auditoria` (sidebar) | `ScreenLayout` | Bitácora + backup | ⚠️ **acento equivocado** (§10.1). |
| `(tabs)/notificaciones` (sidebar) | `ScreenLayout` | Activar Twilio/WhatsApp en caliente | `BRAND=adminColors.primary` (correcto). |
| `supervision/*` | `ScreenLayout` | Vistas globales de reportes/gestantes/citas | `BRAND=adminColors.primary` (correcto). |

---

## 5. Evaluación del diseño WEB (por grupo)

- **Portal SaaS coherente.** La trifurca sidebar+topbar+breadcrumb da una experiencia de
  "panel de gestión" madura. El breadcrumb que suprime UUIDs evita ruido. La sidebar colapsable
  + persistencia en `localStorage` es un detalle bien resuelto.
- **Densidad correcta.** Las tablas (`DataTable`) en `gestantes`/`usuarios`/`contenido` son la
  decisión acertada para web: 5/4 columnas ordenables vs. tarjetas en móvil. Anchos máx. por
  breakpoint (`contentMaxWidth`) evitan líneas ilegibles en monitores grandes.
- **Master-detail de chat** bien resuelto en web (lista ‖ hilo), pero **duplicado** entre
  `obstetra/chat` y `gestante/chat` (no extraído a un patrón `MasterDetail` compartido).
- **Dashboards a dos columnas** (`obstetra/index`, `admin/index`) aprovechan el ancho sin
  sobrecargar.
- **Punto débil web:** varias pantallas de lista (`gestantes`, `usuarios`, `contenido`)
  construyen su propio header (`LinearGradient`+`SafeAreaView`+`NotificationBell`+`Menu`) sobre
  `ScreenLayout scroll=false`, **duplicando** lo que `ScreenLayout role+actions` ya da y que los
  dashboards usan bien. Es la mayor fuente de deriva visual entre pantallas.
- **Auth en web:** `login` se centra a 440 px (bien); `cambiar-password` no usa `ScreenLayout`
  y depende del passthrough.

## 6. Evaluación del diseño MÓVIL (por grupo)

- **Mobile-first real.** Los breakpoints y `select()` parten del teléfono; la `PillTabBar` y
  el drawer `AppSidebar` son la navegación nativa. `PrenatalRibbon` y `ProgressRing` son
  elementos de marca efectivos en móvil.
- **Estados completos.** Cada pantalla cubre cargando (skeleton 1:1 vía `ScreenLayout loading`
  o skeletons de dominio) / vacío (con CTA) / error (con reintento) / contenido. `ActivityIndicator`
  solo para micro-cargas (botón enviando), según `AGENTS.md`.
- **Accesibilidad.** `accessibilityRole`/`Label` ubicuos, área táctil ≥48 px, contraste AA,
  `useReducedMotion()` respetado. El fix del issue #11 (subir el color de tab inactiva de
  `textTertiary` a `textSecondary`) muestra disciplina AA.
- **UX offline.** `OfflineBanner` + outbox idempotente + caché persistida (7 días,
  `networkMode: offlineFirst`) — crítico para la zona rural andina objetivo.
- **Punto débil móvil:** el monolito `gestante/[id].tsx` (2 804 líneas) es navegable pero difícil
  de mantener; el plan de descomponerlo en `DetailScreen`+`SectionCard` existe pero no se ejecutó.

---

## 7. Fortalezas del diseño (verificadas)

1. **Sistema de tokens maduro y única fuente de verdad** (14 archivos), con contraste AA
   verificado por tests y una filosofía "Clinical Calm" documentada. Los `onColor*` eliminaron la
   duplicación de blancos translúcidos por pantalla.
2. **Web/móvil unificados de verdad** con un solo `webShell`. Sin app web separada ni
   `Platform.select` disperso.
3. **Disciplina de a11y y motion** sólida (roles, ≥48 px, AA, reduce-motion).
4. **Estados y carga estandarizados** vía `ScreenLayout` + skeletons de dominio.
5. **Defensa en profundidad**: `RoleGuard` (bloquea deep-links + `mustChangePassword`),
   `MaintenanceGate` (admin exento), `OfflineBanner` + outbox.
6. **Navegación con fuente única** (`src/navigation/menu.ts`) consumida por el drawer móvil y
   la sidebar web — las rutas nunca desincronizan.
7. **Política de modales limpia** (`Overlay` + `confirmAction`) — el audit confirma **cero**
   `Alert.alert`, `<Modal>` crudo o `SafeAreaView` equivocado.

---

## 8. Debilidades / inconsistencias (VERIFICADAS, con archivo:línea)

### 8.1 ⚠️ 4 pantallas admin con el ACENTO DE ROL EQUIVOCADO (alta visibilidad)
En el portal admin, el header usa slate (`adminColors.primary`), pero los botones/FAB/iconos
usan **azul obstetra** (`obstetraColors.primary`) — un desajuste visible:
- `app/(admin)/(tabs)/usuarios.tsx:49` → `const BRAND = obstetraColors.primary`
- `app/(admin)/(tabs)/contenido.tsx:48` → `const BRAND = obstetraColors.primary`
- `app/(admin)/(tabs)/config.tsx:26` → `const BRAND = obstetraColors.primary`
- `app/(admin)/(tabs)/auditoria.tsx:26` → `const BRAND = obstetraColors.primary`

(Correcto en `index`, `sedes`, `notificaciones`, `perfil`, `supervision/*` → `adminColors.primary`.)
**Fix:** cambiar `BRAND` a `adminColors.primary` en esas 4 pantallas.

### 8.2 ⚠️ Literal de color `#000` + punto ciego del `audit:design`
`app/(obstetra)/(tabs)/cronograma.tsx:559` → `shadowColor: '#000'` (3 dígitos). Viola la regla
R1 en espíritu, pero el regex R1 `/#[0-9A-Fa-f]{6}\b/g` **solo captura hex de 6 dígitos**, así
que `#000`/`#fff`/etc. **pasan desapercibidos**. El audit reporta 0 aunque existe una violación
real.
**Fix:** usar `commonColors.black` (=`#16242B`) y/o mejorar el regex a
`/#[0-9A-Fa-f]{3}(?![0-9A-Fa-f])|#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{8}\b/g`.

### 8.3 ⚠️ Modo oscuro DISEÑADO pero DESHABILITADO
`commonColorsDark` está completo y `ThemeToggle`/`useThemedColors` existen, pero
`src/theme/ThemeContext.tsx:42-57` fuerza `mode='light'` y `setMode` solo acepta `'light'`.
Un toggle visible pero no funcional es un riesgo UX real.

### 8.4 ⚠️ Monolito `gestante/[id].tsx` (2 804 líneas)
No descompuesto en `DetailScreen`+`SectionCard` pese a que el patrón existe y su docstring lo
anticipa. Mantenimiento y prueba costosos.

### 8.5 `TextInput` crudo en `usuarios.tsx`
`usuarios.tsx:751-833` (modales crear/editar/reset) usa `<TextInput>` nativo con estilos
manuales (`borderRadius: 12/16`) en vez de la familia `Field`/`AppInput` que `contenido.tsx`
sí usa — inconsistencia por pantalla que rompe la jerarquía de `AGENTS.md`.

### 8.6 Adopción incompleta de patrones (deuda de migración)
`DashboardScreen`/`DetailScreen`/`ListScreen`/`FormScreen` existen pero las pantallas los
evitan: los 3 dashboards usan `ScreenLayout` directo; las listas hacen a mano la dualidad
tabla↔tarjetas en vez de `ListScreen` (que reemplazaría ~500 líneas por ~120); `gestante/[id]`
no usa `DetailScreen`. Coincide con `AGENTS.md` → `PLAN_REFACTOR_DISENO_FRONTEND.md`
("migración progresiva").

### 8.7 Duplicación de header móvil
Varias listas (`gestantes`, `usuarios`, `contenido`) construyen su propio
`LinearGradient`+`SafeAreaView`+`NotificationBell`+`Menu` sobre `ScreenLayout scroll=false`,
duplicando lo que `ScreenLayout role+actions` ya resuelve (y los dashboards usan bien).

### 8.8 Master-detail duplicado
El chat a 2 columnas web se reimplementa en `obstetra/chat` y `gestante/chat` en vez de extraer
un patrón `MasterDetail` compartido.

### 8.9 Código muerto / obsoleto
`usuarios.tsx` retiene ~15 estilos no usados (`modalOverlay`, `modalContent`, `closeBtn`…)
de la era pre-`AppModal`. `MobileFrame` sigue en `ui/` pese a que `WebShell` lo reemplazó.

---

## 9. Trabajo de diseño inconcluso (TODO/issues referenciados en el código)
- `src/utils/datetime.ts:6` — **TODO** sobre un bug de zona horaria en `combineDateTime`.
- `src/components/ui/Field.tsx:345` — comment "para que TODO buscador del sistema sea igual".
- Issues de diseño en progreso referenciados en comentarios: **#4** breadcrumb sin UUID,
  **#5** aprobación de cuentas, **#7** contadores pendientes multi-rol, **#8** estado de cuenta
  a 3 estados, **#11** contraste AA de tab, **#12** empty-state de FUM onboarding,
  **#14** cambio forzado de contraseña.
- Planes activos referenciados por `AGENTS.md`: `DESIGN_QA_LOG.md` (bitácora) y
  `PLAN_REFACTOR_DISENO_FRONTEND.md` (refactor del sistema + migración de patrones).

---

## 10. Captura visual (levantamiento real)

Se clonó el repo, se instaló el frontend (`npm install`, 962 paquetes, Node 22), se generó el
**build estático web** (`npx expo export -p web` → `dist/`) y se sirvió en Chromium headless.

**Capturado (verificado):**
- Login **web desktop (1440×900)** — renderiza el portal: marca "VitMaterna", tagline "Tu salud
  prenatal, siempre contigo", card "Bienvenida" con DNI/Contraseña, "Iniciar Sesión", "Regístrate",
  "¿Olvidaste tu contraseña?", botón mostrar-contraseña. `splash → login` correcto sin backend.
- Login **móvil (390×844)** — mismo contenido, layout mobile-first, sin portal.

> **Limitación:** el backend (Node/Express + Prisma + PostgreSQL 16 + Redis 7) requiere
> **Docker** (`docker compose up -d` para Postgres+Redis), **no disponible en este sandbox**.
> Por eso no fue posible iniciar sesión con las credenciales de prueba del seed
> (Admin `99999999`/`Admin@2026`, Obstetra `11111111`, Gestante `33333333`…) y capturar las
> pantallas autenticadas de cada rol. El análisis de esas pantallas se hizo por **lectura y
> verificación directa del código** (sección 4), que es más exhaustiva que una captura.

---

## 11. Recomendaciones priorizadas

| # | Acción | Impacto | Esfuerzo |
|---|---|---|---|
| 1 | Cambiar `BRAND` a `adminColors.primary` en `usuarios`, `contenido`, `config`, `auditoria` (§8.1) | Alto (visibilidad) | Trivial |
| 2 | Reemplazar `#000` por `commonColors.black` y endurecer el regex R1 del audit (§8.2) | Medio | Trivial |
| 3 | Descomponer `gestante/[id].tsx` en `DetailScreen`+`SectionCard` (§8.4) | Alto (mantenibilidad) | Alto |
| 4 | Migrar listas a `ListScreen` y dashboards a `DashboardScreen` (§8.6) | Medio | Medio |
| 5 | Reemplazar `TextInput` crudo por `Field`/`AppInput` en `usuarios.tsx` (§8.5) | Medio | Bajo |
| 6 | Habilitar el modo oscuro o retirar el `ThemeToggle` hasta que lo esté (§8.3) | Medio | Medio |
| 7 | Extraer un patrón `MasterDetail` para el chat (§8.8) | Bajo | Medio |
| 8 | Unificar el header móvil vía `ScreenLayout role+actions` (§8.7) | Medio | Bajo |
| 9 | Limpiar estilos muertos y `MobileFrame` (§8.9) | Bajo | Trivial |

---

## 12. Estado del levantamiento

| Componente | Estado |
|---|---|
| Clon del repo | ✅ `main`, commit `aff8eee` |
| `frontend` `npm install` | ✅ 962 paquetes (Node 22) |
| `frontend` build web estático | ✅ `expo export -p web` → `dist/` |
| `frontend` en navegador | ✅ Login renderiza (desktop + móvil) |
| `audit:design` | ✅ 0 violaciones (con punto ciego §8.2) |
| `backend` (Express + Prisma + Postgres + Redis) | ⚠️ Requiere Docker (no disponible en sandbox) |
| Captura de pantallas autenticadas | ⚠️ No posible sin backend; cubierto por análisis de código |

**Conclusión:** el frontend es un producto de diseño **muy sólido y profesional**, con un sistema
"Clinical Calm" bien tokens-izado, unificación web/móvil ejemplar y disciplina de a11y/estados. La
deuda es de migración (patrones sin adoptar, monolito sin descomponer) más 4 desajustes de acento
admin, un `#000` y un modo oscuro pendiente — todos reparables con bajo esfuerzo excepto la
descomposición de la ficha obstétrica.
