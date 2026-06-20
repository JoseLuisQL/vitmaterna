# Reporte completo del Frontend — VITMATERNA

> Plataforma de salud prenatal **multiplataforma** (móvil iOS/Android + portal web).
> Expo SDK 56 · React Native 0.85.3 · React 19.2 · TypeScript 6 · expo-router 56.
> Análisis sobre código vivo: **~16.5k líneas en `app/`** (33 pantallas) + **~9.7k en `src/`**.
> Verificado en esta sesión: **`tsc --noEmit` limpio (0 errores)**, **66/66 tests verdes**, **bundle web compila (17 MB dev) y la app levanta y renderiza**.

---

## 0. Cómo se levantó (estado reproducible)

| Paso | Resultado |
|---|---|
| Clonado | OK (rama `main`, también existe `fix/expo-web-sqlite-blank-screen`) |
| Node | Requería ≥20; se instaló **Node 20.20** (el sistema traía 18, insuficiente para SDK 56) |
| `npm install` (frontend) | OK — 947 paquetes |
| `expo start --web` | OK — Metro Bundler en `localhost:8081` |
| Bundle web | **HTTP 200, 17.3 MB** (dev), compila sin errores fatales |
| Render | **Login renderiza correctamente** en navegador headless |
| `tsc --noEmit` | **0 errores** |
| `jest` | **7 suites / 66 tests, todos verdes** |

> Nota operativa: el `.env` apunta a `http://192.168.18.21:3000/v1` (IP de LAN del dev). Para datos reales hay que levantar el `backend/` (Node + Prisma + Postgres vía `docker-compose.yml`) y ajustar `EXPO_PUBLIC_API_URL`. El frontend levanta y navega sin backend; las pantallas con datos degradan a vacío/caché.

---

## 1. Veredicto general

Es un frontend **maduro, profesional y multiplataforma de verdad**. No es un MVP móvil al que “le pusieron web encima”: tiene una **cáscara web de escritorio (portal SaaS)** propia que convive con la experiencia móvil sin romperla, un **sistema de diseño tokenizado**, **offline-first real**, **tiempo real con sockets** y una **cobertura clínica amplia y rigurosa** (referencias CLAP/OPS-MINSA, semáforo de riesgo, tamizajes).

| Dimensión | Nota | Comentario |
|---|---|---|
| Arquitectura de capas | 9/10 | Separación `app` (rutas) / `src` (lógica, UI, datos, tema) impecable |
| Sistema de diseño | 8.5/10 | Tokens centralizados, jerarquía por sombras, acento por rol |
| Estrategia web vs móvil | 9/10 | Un solo código, dos experiencias, conmutadas por un único switch (`webShell`) |
| Carga de diseño / arranque | 8.5/10 | Providers ordenados, fuentes, splash, skeletons, persistencia |
| Funciones complejas FE | 9/10 | Offline outbox, chat reconciliado, gráficas SVG clínicas, emergencia GPS |
| Calidad de código | 8.5/10 | TS estricto limpio, 66 tests, comentarios “el porqué” en español |
| Seguridad de rutas | 8/10 | **`RoleGuard` ya implementado** (antes era el punto débil) |
| Rendimiento | 7.5/10 | FlashList parcialmente adoptado; pantallas gigantes y dashboard `limit:1000` |

---

## 2. Arquitectura y separación de capas

```
app/                       → SOLO rutas y pantallas (file-based routing de expo-router)
  (auth) (gestante) (obstetra) (admin)   → route groups por rol
src/
  components/ui/           → sistema de diseño (≈45 primitivas, barrel index.ts)
  components/web/          → cáscara del portal de escritorio (Shell, Sidebar, TopBar, DataTable…)
  components/layout/       → ScreenLayout, RoleGuard, SidebarProvider, AppSidebar
  components/shared/       → dominio compartido (chart AU, emergencia, notificaciones…)
  components/obstetra/     → dominio específico (modal de cita, visitas…)
  theme/                   → tokens (color, tipografía, espacio, sombra, gradiente, responsive…)
  services/                → datos: api(axios), api-queries(57 hooks), admin-queries(25), outbox, network, queryClient
  hooks/                   → lógica reutilizable (chat, socket, push, prefetch, debounce…)
  store/                   → estado global (auth, Zustand)
  database/                → SQLite (cola offline)
  utils/                   → puros (referencias clínicas, haptics, confirm, formato…)
  types/                   → tipos de dominio
```

**La regla se respeta**: las pantallas casi nunca llaman a `axios` directo; consumen hooks de React Query (`api-queries.ts`, 57 hooks; `admin-queries.ts`, 25). Esa es la frontera correcta entre presentación y datos.

### Flujo de arranque (`app/_layout.tsx`)
1. **Antes de montar el árbol** (idempotente): `initNetwork()`, `startQueryPersistence()`, `initOutbox(queryClient)`.
2. En web inyecta CSS global de scrollbars (incluido tema oscuro del scrollbar).
3. Carga las 4 familias **Inter** con `useFonts`; restaura sesión (`loadStoredAuth`) e inicializa SQLite.
4. Mientras `!isInitialized || !fontsLoaded` → `return null` (splash nativo). Evita parpadeos.
5. Árbol de providers anidados en orden correcto:
   `SafeAreaProvider → ThemeProvider → QueryClientProvider → ToastProvider → WebShell → AppNavigator`.
6. `AppNavigator` engancha `usePushNotifications()` y `useOfflinePrefetch()` (ya dentro del contexto de router y query).
7. `app/index.tsx` = splash con marca + **redirección por rol** tras 800 ms.

---

## 3. Estructura de vistas / módulos (las “vistas de tus módulos”)

Tres áreas por *route group*, cada una con su `_layout.tsx` que aplica **`RoleGuard` + `SidebarProvider`** y un tab bar propio.

### `(auth)` — pública
`login`, `register`, `forgot-password`. Se renderizan a pantalla completa incluso en web ancho (sin portal).

### `(gestante)` — paciente · acento **lavanda `#7468C4`**
- **Tabs (4):** Inicio · Citas · Tratamiento · Chat.
- **Ocultas (`href:null`) / modales:** Perfil, Educación, `educacion/[id]`, Alarmas (signos), Visitas domiciliarias, Notificaciones.
- **Inicio (352 líneas):** semanas de gestación memoizadas desde FUM, trimestre, barra 1–40, próxima cita con confirmación inline, anillo de adherencia del día, semáforo de riesgo, acciones rápidas (reportar alarma, **emergencia GPS**, educación).

### `(obstetra)` — profesional · acento **azul `#4A90D9`**
- **Tabs (4):** Inicio · Gestantes · Agenda (cronograma) · Chat.
- **Secundarias:** Reportes, Mensaje masivo, Perfil; flujos: `atender/[appointmentId]`, `control/nuevo`, `gestante/[id]`, `gestante/nueva`, `gestante/tamizajes`, Notificaciones.
- **Ficha clínica `gestante/[id].tsx` (2.287 líneas)** = el módulo más rico: controles prenatales, laboratorios (hemoglobina por tomas, VDRL, VIH, hepatitis B, orina, PAP), vacunas, tratamientos, antecedentes, ecografías, odontograma, tamizajes (violencia y salud mental), consejería nutricional, peso, patologías.

### `(admin)` — gestor · acento **slate `#3D5A80`**
- **Tabs (3 visibles):** Inicio · Usuarios · Contenido.
- **Ocultas + supervisión:** Sedes, Configuración, Notificaciones (SMS/WhatsApp), Auditoría/backup; supervisión de citas/gestantes/reportes.
- `usuarios.tsx` (1.104) y `contenido.tsx` (749) son CRUD completos.

**Fuente única de navegación:** `src/navigation/menu.ts` define por rol `primary` (tabs móvil / cabecera del sidebar web) y `sections` (drawer móvil / resto del sidebar web). Así **móvil y web nunca se desincronizan**. Es uno de los aciertos de diseño más importantes del proyecto.

---

## 4. Sistema de diseño, jerarquía y herencias

### 4.1 Tokens (`src/theme/`) — la “fuente de verdad” visual
Todo está tokenizado y exportado por barrel (`theme/index.ts`):

- **Color (`colors.ts`)** — Base **ice-blue / neutro cálido** (`background #F7F8FA`, `surface #FFFFFF`). Filosofía explícita: **la jerarquía la dan las sombras suaves, no los bordes** (bordes casi invisibles `#EAEDF2`). 
  - **Un acento por rol**: gestante lavanda, obstetra azul, admin slate — cada uno con `primary / primaryDark / primaryLight / primaryMid / onPrimary / gradient`.
  - **Semánticos** (success/warning/danger/info) y **semáforo de riesgo** (verde/ámbar/rojo), cada uno en 3 variantes (sólido / `Mid` chip / `Light` fondo). Apropiado clínicamente.
  - **Modo oscuro completo** (`commonColorsDark`) con las mismas claves → intercambiable.
- **Tipografía (`typography.ts`)** — una sola familia **Inter** en 4 pesos; escala con alias legacy. **Cuerpo mínimo 15px** justificado por baja alfabetización digital (población rural). Tokens numéricos para KPIs.
- **Espacio (`spacing.ts`)** — grid de 8pt + tokens finos (`xs2`, `sm2`, `md2`); `borderRadius` (xs→full); `layout` (touch target 48, tab bar 64, `tabBarSpace 96`); **`webLayout`** (sidebar 248/72, topbar 64, `contentMaxWidth` y `contentGutter` indexados por breakpoint).
- **Sombras (`shadows.ts`)** — 3 niveles (`card`/`float`/`modal`) + `coloredGlow(color)`; cross-platform (elevation en Android, shadow en iOS/web).
- **Gradientes, animaciones, responsive** — todo en módulos propios.

### 4.2 Jerarquía y herencia — cómo se “heredan” los estilos
No hay CSS en cascada (es React Native): la herencia es **por composición y tokens**, en 3 niveles:

1. **Tokens** (`theme/`) → valores crudos. Nadie hardcodea un hex en una pantalla bien hecha; lee de `commonColors`, `typography`, `spacing`.
2. **Primitivas** (`components/ui/`) → consumen tokens y exponen props semánticas (`variant`, `size`, `themeColor`). Ej.: `AppButton` (5 variantes × 3 tamaños, gradient opcional, spring + haptics), `AppCard` (sombra `card`/`float`, `highlighted` con glow), `AppBadge`, `AppInput`, `KpiCard`, `ProgressRing`, `LineChartSvg`…
3. **Plantilla de pantalla** (`ScreenLayout`) → el “molde” único que **heredan** casi todas las vistas (27 pantallas la usan). Centraliza: header con gradiente por rol (o plano en web), back, acciones, **estados estándar loading(skeleton)/error/empty**, scroll + pull-to-refresh, safe-area, ancho responsive (`readable`/`wide`/`full`) y padding por breakpoint. Esto es lo que da **coherencia visual “heredada”** sin repetir código.

> Tema “objeto” por rol: `gestanteTheme.ts` / `obstetraTheme.ts` componen `{...commonColors, ...semanticColors, ...riskColors, primary…}` + tipografía/espacio/sombra en un solo objeto. Es un patrón de herencia por *spread* (composición), no por subclase.

### 4.3 Tema claro/oscuro — deuda técnica honesta
`ThemeContext` define `useThemedColors()` / `useThemedStyles()` reactivos, **pero el modo está forzado a `light`** (el `setMode` solo acepta `'light'`, dark “en desarrollo”). El git log lo confirma (`feat(theme): disable system and dark theme modes... force light mode during development`). Coexisten dos formas de leer color: directa (`commonColors`, mayoría) y reactiva (`useThemedColors`, sobre todo en la cáscara web). Es **migración incremental conocida y acotada**, no un bug.

---

## 5. Carga de diseño y experiencia WEB vs MÓVIL (el núcleo de lo que pediste)

Este es el punto más fuerte y diferenciador del proyecto. **Un solo código fuente, dos experiencias**, gobernadas por un único interruptor.

### 5.1 El switch maestro: `webShell`
`theme/responsive.ts` define breakpoints (`xs…xxl`) y `useResponsive()`, que expone:
```ts
webShell = IS_WEB && width >= 840 (lg)
```
- **`webShell === false`** (móvil, nativo, o navegador angosto) → **experiencia móvil intacta**.
- **`webShell === true`** (navegador ancho) → se monta el **portal de escritorio**.

`webShell` se usa en **32 archivos** de `app/` + componentes. Es el patrón consistente para bifurcar.

### 5.2 La cáscara web (`components/web/`)
`WebShell` (montado en el root layout) hace de conmutador:
- Si **no** es web ancho → *passthrough total* (`<>{children}</>`), cero `View` extra → la app móvil no se altera.
- Si es web ancho **y hay sesión con rol** → monta el portal:
  - **`WebSidebar`** — navegación lateral **persistente** (reemplaza tab bar + drawer del móvil). Lee de `navigation/menu.ts` (misma fuente que el drawer), resalta activo por `usePathname`, **colapsable** (persistido en `localStorage`), acento por rol, toggle de tema, logout. Estilos `cursor:pointer`, `hovered`, `transition` solo en web.
  - **`WebTopBar`** — breadcrumb/título de sección derivado de la navegación, campana de notificaciones, identidad del usuario, `useDocumentTitle` (título de pestaña del navegador).
  - **Área de contenido** a todo el ancho con gutters/`maxWidth` por breakpoint.
- Si es web ancho **sin sesión** (login/registro/splash) → pantalla completa, sin portal.

### 5.3 Cómo cada pantalla se adapta
Tres mecanismos combinados:

1. **`ScreenLayout`** cambia solo: en web el header **deja de ser el gradiente grande redondeado** (esa estética es móvil; el color de rol ya vive en sidebar/topbar) y pasa a **header plano compacto**; quita el espacio del tab bar; aplica `maxWidth`/gutters de escritorio. Una pantalla que usa `ScreenLayout` se “webifica” **sin tocarla**.
2. **`PillTabBar`** se **auto-oculta** en `webShell` (`return <View hidden/>`) sin desmontar el navegador de tabs (no se pierde estado). En móvil pinta la barra inferior con **indicador pill animado (reanimated spring)**, badges tipo WhatsApp, safe-area y haptics.
3. **Render dual explícito** en pantallas densas. El mejor ejemplo es **`obstetra/gestantes.tsx`**:
   - **Móvil:** header con gradiente + buscador flotante + chips de filtro + **`FlashList`** de tarjetas con avatar, badges de riesgo, predicción de inasistencia, barra de progreso gestacional + **FAB**.
   - **Web (`if (webShell)`):** `ScreenLayout width="full"` + toolbar (search + chips + botón “Nueva gestante”) + **`DataTable`** genérica (cabecera fija sticky, **orden por columna**, filas clicables, hover, estados loading/empty).
   - **`DataTable`** se usa en 9 pantallas (admin/obstetra/gestante) → patrón establecido “tarjetas en móvil ↔ tabla en web”.
   - El **dashboard del obstetra** reacomoda KPIs y pasa de lista vertical (móvil) a **layout de 2 columnas** (riesgo + citas lado a lado) en web.

4. **`AutoGrid`** + `columnsForWidth` → rejillas de KPIs/acciones que calculan columnas por ancho real (`onLayout`), simétricas en teléfono pequeño, tablet y web.

### 5.4 Carga (loading) y percepción de velocidad
- **Skeletons con shimmer** (reanimated loop de opacidad): `DashboardSkeleton`, `ListSkeleton`, `ChatSkeleton`… en vez de spinners → sensación de velocidad. `ScreenLayout` los muestra solo con `loading`.
- **Caché persistente** (React Query + AsyncStorage/localStorage, 7 días): al reabrir, las pantallas pintan los últimos datos al instante y revalidan en segundo plano (`networkMode: offlineFirst`, `staleTime 60s`).
- **Prefetch por rol** tras login (`useOfflinePrefetch`) → la primera navegación ya tiene datos.
- **Fuentes** bloqueantes en root con splash → no hay “flash” de fuente del sistema.
- **Optimismo + rollback** en mutaciones (tratamiento, marcar leído) → la UI responde sin esperar al servidor.

### 5.5 Diferencias técnicas web/nativo bien resueltas (cross-platform)
| Capacidad | Nativo | Web |
|---|---|---|
| Tokens | `expo-secure-store` | `localStorage` |
| Caché RQ | AsyncStorage | `localStorage` (forzado, evita WebSQL) |
| Outbox | SQLite | `localStorage` |
| Geolocalización (emergencia) | `expo-location` alta precisión | `navigator.geolocation` + fallback |
| Foco/red | NetInfo + AppState | `navigator.onLine` (AppState omitido) |
| Sockets | `websocket`+`polling` | igual (fallback robusto) |
| `cursor/hover/transition/outline` | n/a | activados con `IS_WEB &&` |
| Metro | bundle normal | cabeceras COOP/COEP solo en web (wasm de sqlite) |

---

## 6. Funciones complejas de frontend (lo que “funciona por detrás”)

1. **Offline-first de manual** — `network.ts` enlaza NetInfo+AppState con `onlineManager`/`focusManager`; `queryClient.ts` persiste 7 días; **`outbox.ts`** es una cola de escrituras persistente, **idempotente** (`dedupeKey`), con **reintentos + backoff (máx 8)**, **descarte de 4xx** y reenvío automático al reconectar/foreground. Se usa para consumo de suplementos y signos de alarma (lo crítico en zona rural sin señal). Banner global “Sin conexión”.
2. **Chat en tiempo real (`useChat` + `useSocket`)** — nivel producción: reconexión, **fallback websocket→polling**, **reconciliación optimista por `clientId`** (resuelve el duplicado al enviar), paginación de historial hacia atrás sin duplicar, “escribiendo…” con debounce, presencia (en línea/última vez), **read receipts** (vistos), re-join de sala en cada reconexión. Imágenes optimistas.
3. **Gráficas clínicas en SVG propio** — `LineChartSvg` + `AlturaUterinaChart` dibujan altura uterina vs edad gestacional con **bandas P10/P90 interpoladas (CLAP/OPS-MINSA)** y clasifican el último control (baja/normal/alta). Rigor clínico real, sin librería pesada de charts.
4. **Botón de emergencia (`EmergencyAlert`)** — máquina de estados (confirm→locating→sending→success/error), obtiene GPS (con fallback a coordenadas de Talavera, Apurímac), envía a `/chat/emergencia`, ofrece llamada directa al centro de salud. Modal animado consistente en web y nativo.
5. **Auth robusto (`api.ts`)** — interceptor con **auto-refresh de JWT en 401** y **cola de peticiones** durante el refresh (evita refresh múltiples); excluye los propios endpoints de auth; almacenamiento de tokens por plataforma.
6. **Listas grandes** — `usePatientsInfinite` (scroll infinito paginado, 15/pág), `useDebouncedValue` en buscadores, filtro de riesgo aplicado en backend (no en cliente, evita conteos falsos).
7. **Notificaciones push** (`usePushNotifications`) + realtime de notificaciones (`useNotificationRealtime`) + badge de no leídos en tabs.

---

## 7. Rendimiento — bien y a mejorar

**Bien:** React Query (dedupe, staleTime, caché persistente), `FlashList` ya adoptado en 4 listas clave (gestantes, usuarios, supervisión, educación), debounce, optimismo, prefetch, skeletons, SVG ligero, `useMemo` en cálculos derivados.

**A mejorar (riesgos acotados):**
1. **FlashList parcial** — 4 pantallas con FlashList vs **9 con FlatList**. Migrar las listas largas restantes (chat, notificaciones).
2. **Pantallas monolíticas** — `gestante/[id].tsx` (2.287 líneas) y `usuarios.tsx` (1.104). Mucho estado/modales en un componente → re-renders amplios y mantenibilidad. Extraer modales y agrupar estado (`useReducer`/sub-componentes).
3. **`fetchObstetraDashboard` con `limit:1000`** — descarga toda la tabla de pacientes para contar y calcular distribución de riesgo. Debería ser un endpoint de agregación (`/patients/stats`).
4. **`: any`** — ~49 en `services/` (mapeo de respuestas del backend). Tipar respuestas mejoraría robustez justo donde más valor tiene.
5. **Bundle web dev de 17 MB** — normal en dev; conviene medir el build de producción (`expo export`) y considerar code-splitting por rol si pesa.

---

## 8. Calidad de código

**Fortalezas:** `tsc --noEmit` **limpio**; **66/66 tests** (jest-expo + Testing Library) cubriendo referencias clínicas, tema, componentes, firmas y utilidades; comentarios de encabezado que explican el **porqué** (en español, consistentes); manejo de errores centralizado (`apiError`); degradación elegante (queries devuelven defaults); solo **7 `console.log`**; cross-platform consciente en cada API sensible.

**Debilidades:** las de §7 (pantallas grandes, `any`, FlashList parcial) + dark mode congelado + coordenadas de fallback hardcodeadas (aceptable como respaldo, idealmente configurable por sede).

---

## 9. Recomendaciones priorizadas

| Prioridad | Acción | Impacto |
|---|---|---|
| 🟠 Media | Endpoint de agregación para dashboard obstetra (eliminar `limit:1000`) | Rendimiento / datos móviles |
| 🟠 Media | Completar migración `FlatList → FlashList` en chat/notificaciones | Rendimiento |
| 🟡 Media-baja | Trocear `gestante/[id].tsx` y `usuarios.tsx` (extraer modales/estado) | Mantenibilidad |
| 🟡 Baja | Tipar respuestas del backend (reducir `: any`) | Robustez |
| 🟡 Baja | Reactivar y completar dark mode (`useThemedColors` ya existe) | Consistencia visual |
| 🟢 Opcional | Medir build web de producción y evaluar code-splitting por rol | Carga inicial web |

---

## 10. Conclusión

VITMATERNA tiene un frontend **sólido, coherente y genuinamente multiplataforma**. Lo que más destaca:

- **Diseño y jerarquía**: tokens → primitivas → `ScreenLayout` como molde heredado; jerarquía por sombras (no bordes); acento por rol coherente en móvil y web.
- **Web vs móvil**: un único interruptor (`webShell`) y una **cáscara web (sidebar+topbar+DataTable)** que convierte la app móvil en un **portal de escritorio** sin duplicar lógica ni romper la experiencia móvil; misma fuente de navegación para ambos.
- **Carga**: arranque ordenado, fuentes+splash, skeletons, **caché persistente y prefetch** → percepción de velocidad y funcionamiento offline.
- **Funciones complejas**: outbox idempotente, chat reconciliado en tiempo real, gráficas clínicas SVG con referencias OPS-MINSA, emergencia GPS, auto-refresh de JWT con cola.

Las mejoras pendientes son **optimización incremental, no deuda estructural**. Comparado con el `ANALISIS_FRONTEND.md` previo del repo, ya se resolvieron sus dos hallazgos principales: **se añadió `RoleGuard`** (protección de rutas por rol) y **se empezó a adoptar `FlashList`**. Es una base lista para iterar hacia producción.
