# VitMaterna — Plan Maestro de Rediseño del Frontend (Web y Móvil)

> Plan quirúrgico de refactorización del frontend de VitMaterna con enfoque
> comercial y cumplimiento estricto de estándares ISO (9241-210, 9241-110,
> 9241-125, 9241-143) y de accesibilidad (WCAG 2.2 AA + WCAG2Mobile).

> ## ⚠️ REGLA DE ORO — No negociable
> **Este plan refactoriza ÚNICAMENTE diseño y presentación. CERO cambios a la
> lógica de negocio.** La integridad funcional del sistema clínico es
> intocable. Concretamente:
>
> **Lo que NO se toca (capas de negocio):**
> - `src/services/` — cliente Axios, endpoints, queryClient, outbox, network
> - `src/hooks/` — lógica de negocio: `useChat`, `usePatientProfile`,
>   `useAppointmentRealtime`, `usePushNotifications`, `useOfflinePrefetch`, etc.
> - `src/store/authStore` — estado de autenticación y sesión
> - `src/utils/` — `datetime`, `confirm`, `whatsapp`, `haptics`, `lastSeen`,
>   `educationMeta` (incl. cálculos clínicos)
> - `src/database/` — init + SQLite outbox
> - Backend (no se toca para nada)
> - Todos los tests de negocio existentes (no se modifican, deben seguir pasando)
>
> **Lo que SÍ se refactoriza (capas de presentación):**
> - `app/` — composición de pantallas (delegar header/estados a `ScreenLayout`)
> - `src/components/ui/` — primitivas visuales (`KpiCard`, `AppButton`, etc.)
> - `src/components/patterns/` — patrones (`ListScreen`, `FormSheet`, `PageTabs`)
> - `src/components/layout/` — `ScreenLayout`, `AppSidebar`, `RoleGuard`
> - `src/components/web/` — `WebShell`, `WebSidebar`, `DataTable`
> - `src/theme/` — tokens (solo añadir/refinar, nunca romper los existentes)
>
> **Garantía de preservación funcional:**
> - Al extraer formularios (Fase 3), la mutación y validación clínica se
>   **preservan llamada-por-llamada**: mismo endpoint, mismo orden, mismo toast,
>   mismo `dedupeKey`. Solo se mueve el estado de UI del formulario (open/close,
>   valores de campo) a un hook; la lógica de negocio no cambia.
> - `npm run verify` (tsc + audit:design:strict + jest) debe seguir verde en
>   cada commit. Los tests actuales no se modifican; si alguno se "rompe" por
>   el movimiento de código de presentación, es señal de que se cruzó la línea
>   y se debe revertir ese cambio.
> - La separación es estructural: `app/` = UI; `src/services`+`src/hooks`+
>   `src/store`+`src/utils` = negocio (intocable).

**Fecha:** 2026-06-29
**Autor:** KEVO (análisis + plan)
**Repositorio:** https://github.com/JoseLuisQL/vitmaterna.git (rama `main`)
**Stack actual:** Expo SDK 56 · React Native 0.85 · React 19 · React Compiler ·
Expo Router · TanStack Query · Zustand · react-native-web

---

## 0. Resumen ejecutivo (TL;DR)

El frontend tiene una **base excelente** (sistema de diseño "Clinical Calm" con
tokens, `audit:design` que pasa con 0 violaciones, type-check limpio, modo
oscuro, WCAG AA en tokens de color) **pero sufre una crisis de consistencia por
ejecución**: el 69 % de las pantallas (18 de 26) **no usan** la plantilla
`ScreenLayout` y pintan su propio header con `LinearGradient` + `SafeAreaView` a
mano. Esto genera 18 variantes ligeramente distintas de "header con gradiente",
KPIs duplicados, estados de carga inconsistentes y monolitos de hasta 2.804 líneas.

**Recomendación de arquitectura (decisión clave):**
**NO** migrar a shadcn/ui + Tailwind. La app es React Native + react-native-web,
no una web app. Migrar implicaría reescribir el stack nativo (perder el APK
Android, expo-notifications, expo-location, expo-sqlite, el botón de pánico con
GPS, el offline-first nativo). El skill shadcn/Tailwind aplica a web apps
(Next.js/Vite), no a apps universales Expo.

**En su lugar:** consolidar el sistema de diseño propio (tokens → primitivas →
patrones → `ScreenLayout`) que ya existe y es bueno, eliminando las 18 variantes
manuales. Es una refactorización **quirúrgica de consolidación**, no una
reescritura. Esto entrega consistencia visual, minimalismo y fluidez reales con
~70 % menos esfuerzo y riesgo que una migración de stack.

**Resultado objetivo:** interfaz minimalista, limpia, fluida y comercialmente
profesional; una sola fuente de verdad para el "chrome" de cada pantalla;
cumplimiento ISO 9241 (diálogo, presentación de información, íconos) y WCAG 2.2 AA.

---

## 1. Diagnóstico: por qué el diseño actual se siente inconsistente

### 1.1 Hallazgos cuantitativos (medidos en el código real)

| Métrica | Valor | Problema |
|---|---|---|
| Pantallas que NO usan `ScreenLayout` | **10/26** (38 %) | Cada una reinventa header, estados y safe-area |
| Pantallas con header manual (`LinearGradient` + `SafeAreaView`) | **18/26** (69 %) | 18 variantes de "header con gradiente" ligeramente distintas |
| Pantallas con `SafeAreaView` directo (no delegado) | **26/26** | Inconsistencia de safe-area y status bar |
| Variaciones de `Kpi` manuales | 2 (admin + obstetra) | KPIs se ven distintos entre dashboards |
| Monolito más grande | **2.804 líneas** `(obstetra)/gestante/[id].tsx` | 50 `useState`, lógica + UI + estilos mezclados |
| Pantallas >400 líneas | **13** | Candidatas a dividir |
| Pantallas con >5 `useState` | 12 | Estado de formularios sin extraer a hooks |
| `audit:design:strict` | 0 violaciones | La disciplina de tokens SÍ funciona |
| `tsc --noEmit` | EXIT 0 | Sin errores de tipos |

**Conclusión:** el problema **no** son los tokens ni las primitivas (están bien).
El problema es que **las pantallas no consumen el sistema de diseño** — lo
reimplementan a mano. Esa es la fuente de toda la inconsistencia visual.

### 1.2 Patrones de inconsistencia identificados (con evidencia)

#### P-1 · Header con gradiente reimplementado 18 veces
Cada pantalla pinta su propio header con `LinearGradient` del color del rol +
`SafeAreaView edges={['top']}` + título + acciones. Las variantes difieren en:
alturas de padding, tamaño del título, posición del botón back, radio de las
esquinas, estilo del botón de acciones, manejo del status bar.
- **Evidencia:** 18 archivos en `app/` importan `LinearGradient` para el header.
- **`ScreenLayout` ya resuelve esto** (header con gradiente por rol, header flat
  en web, back, acciones, estados) — pero estas pantallas no lo usan.

#### P-2 · KPIs definidos a mano en cada dashboard
`(admin)/(tabs)/index.tsx` y `(obstetra)/(tabs)/index.tsx` cada uno define su
propia función `Kpi` con estilos distintos. El resultado: KPIs que se ven
diferentes entre roles y entre pantallas.
- **Solución:** existe `KpiCard` en `src/components/ui/` — nadie lo usa.

#### P-3 · Estados de carga/empty/error inconsistentes
`ScreenLayout` ofrece `loading` (skeleton 1:1), `error` (con reintento) y
`isEmpty` (con CTA). Pero muchas pantallas manejan el loading con `View` +
`DashboardSkeleton` directo, o muestran `<View style={{justifyContent:'center'}}>
<EmptyState .../>` a mano, sin el reintento.
- **Evidencia:** `[id].tsx` línea 704-728 pinta su propio header de carga con
  `LinearGradient` + `DashboardSkeleton`.

#### P-4 · Tabs manuales vs. `PillTabBar` / `ToggleTabs`
La ficha de gestante (`[id].tsx` líneas 894-917) implementa sus propios tabs con
`TouchableOpacity` + `tabPill`/`tabPillActive`, cuando existe `ToggleTabs` y
`PillTabBar` en el sistema de diseño.

#### P-5 · Lógica de formulario in-line (no extraída a hooks)
La ficha de gestante tiene **50 `useState`** para 5 formularios distintos (lab,
vacuna, tratamiento, antecedente, embarazo, obstétrico). Cada modal repite el
patrón abrir→validar→mutar→toast→cerrar. Esto es imposible de mantener y genera
inconsistencias en la UX de los formularios.
- **Solución:** existe `FormSheet`/`FormScreen` en `src/components/patterns/` —
  no se usan.

#### P-6 · Bifurcación web/móvil duplicada dentro de una misma pantalla
`(gestante)/(tabs)/citas.tsx` (910 líneas) tiene dos ramas completas —web con
`DataTable` y móvil con `SectionList`— y duplica los modales de detalle y
reprogramación en cada rama. `ListScreen` ya abstrae este patrón.

---

## 2. Dirección de arquitectura — decisión fundamentada

### 2.1 Opción A (recomendada): Consolidar el sistema de diseño existente

**Mantener** Expo + React Native + react-native-web. **Eliminar** las 18
variantes manuales forzando el uso de `ScreenLayout` + patrones + primitivas.

| Criterio | Evaluación |
|---|---|
| Esfuerzo | Medio (quirúrgico, pantalla por pantalla) |
| Riesgo | Bajo (no toca el stack nativo) |
| Coherencia visual | Total (una sola fuente de verdad) |
| APK Android | ✅ Se conserva |
| Offline-first nativo | ✅ Se conserva (SQLite, outbox) |
| Botón de pánico con GPS | ✅ Se conserva |
| Notificaciones push | ✅ Se conservan |
| Cumplimiento ISO/WCAG | ✅ Alcanzable en el sistema de tokens |

### 2.2 Opción B (descartada): Migrar a shadcn/ui + Tailwind (web app separada)

Reescribir el frontend como web app Next.js + shadcn/Tailwind, y mantener la app
móvil aparte o como PWA. **Descartada** porque:

- shadcn/ui es para **web** (Radix UI → DOM). No funciona en React Native.
- Tailwind en RN requiere **NativeWind** (otra capa de build), no shadcn.
- Reescribir pierde: el APK Android (regla de oro del producto), expo-sqlite
  (offline-first), expo-location (botón de pánico GPS), expo-notifications
  (recordatorios multicanal), expo-secure-store (JWT), el outbox idempotente.
- El sistema de diseño actual **ya cumple WCAG AA** en tokens y ya tiene
  primitivas accesibles. El problema no es el sistema, es que no se usa.

### 2.3 Opción B.2 (descartada): Integrar React Bits (reactbits.dev)

**Investigado y descartado por incompatibilidad técnica verificada.**

React Bits (42.1K ⭐, por David Haz) es una colección de componentes animados
**para React web**, no para React Native. Análisis de la documentación oficial:

- **4 variantes:** JS+CSS, TS+CSS, JS+Tailwind, TS+Tailwind — todas usan
  HTML/CSS (`<div>`, `<span>`, `filter: blur()`, `box-shadow`).
- **Dependencias:** `motion` (Framer Motion) que anima el **DOM del navegador**.
  Tu app usa `react-native-reanimated` que anima el **hilo nativo** — motores
  distintos, incompatibles.
- **Distribución:** copy-paste o CLI del código fuente (no es npm). Copiar un
  componente a RN da error de compilación (`<div>` no existe, `filter: blur()`
  no es válido en `StyleSheet`).
- **Advertencia del autor:** "Using more than 2-3 components on a page is not
  advised" y "Mobile Optimization: Consider disabling certain effects on mobile".
  Tu app es móvil-first para gestantes rurales — contradictorio.

**Conclusión:** React Bits no se puede integrar en un proyecto Expo/React Native
sin reescribirlo por completo. Su estética (glow, split text, partículas) es
alcanzable con el stack nativo de la app (`reanimated` + `react-native-svg` +
`expo-linear-gradient`), que ya tiene 24 componentes animados. El plan de
rediseño logra la fluidez/"wow" con estas herramientas nativas (§3.1, §3.3),
sin romper el APK ni el offline-first.

### 2.3 Opción C (futura, opcional): Añadir NativeWind como capa de ergonomía

Si se quiere la ergonomía de Tailwind (`className="flex-1 p-4"`) en RN, se puede
añadir **NativeWind** encima del sistema actual (no en vez de). Es compatible
con react-native-web y con los tokens existentes. **No es parte de este plan**,
pero se deja documentado como evolución opcional post-refactor.

---

## 3. Principios de diseño del rediseño (minimalista, limpio, fluido)

Inspirados en tendencias 2025-2026 de UX de salud ( interfaces ambientales,
carga cognitiva baja, salud-literacy-first) y en ISO 9241-110 (diálogo):

1. **Una sola fuente de verdad para el "chrome".** Toda pantalla usa
   `ScreenLayout`. Cero `LinearGradient` para headers fuera de la plantilla.
2. **Jerarquía por espacio y peso, no por color.** Más aire (respiración),
   menos bordes, menos fondos de color. El color semántico solo donde aporta
   información (riesgo, urgencia, estado).
3. **Progressive disclosure.** Lo crítico arriba y a la vista; lo secundario en
   acordeones o sub-pestañas. La gestante y el obstetra ven lo que importa sin
   scrollear.
4. **Estados de carga compactos y minimalistas (NO basura visual).** Ver §3.1.
5. **Fluides y micro-interacciones.** `PressableScale` (spring) en todo lo
   táctil, `useReducedMotion` respetado, transiciones de pantalla suaves.
6. **Salud-literacy.** Cuerpo ≥15px, voz activa y minúscula, copy sin
   jerga clínica para la gestante, verbos que se conservan en el resultado.
7. **Accesibilidad no negociable.** WCAG 2.2 AA + WCAG2Mobile: contraste 4.5:1
   (3:1 texto grande), targets ≥24×24 CSS px (ideal 44×44 / 48dp), foco visible,
   `accessibilityRole`/`Label`, gestos simples.

### 3.1 Estados de carga — compactos, minimalistas, 1:1 (prioridad)

> **Cero spinners sueltos para cargar pantallas.** El spinner (círculo girando)
> es "basura visual": no dice qué viene ni cuánto, y se siente lento. La carga
> moderna es el **skeleton 1:1**: un placeholder con la misma forma del contenido
> real, que se reemplaza sin salto cuando llegan los datos.

**Diagnóstico actual:**
- `SkeletonLoader.tsx` ya existe y es bueno (CardSkeleton, ListSkeleton,
  DashboardSkeleton, TableSkeleton, ChatSkeleton, FormSkeleton,
  DetailHeaderSkeleton, KpiRowSkeleton).
- **Problema 1:** el shimmer es **solo opacidad** (`withRepeat` de `withTiming`
  de 0.5→1). Es estático. El shimmer moderno es un **barrido de luz de
  izquierda a derecha** (linear-gradient animado), más fluido y "vivo".
- **Problema 2:** 17 archivos usan `ActivityIndicator` (spinner). Algunos son
  correctos (micro-carga de botón enviando, "cargar más" al final de una lista),
  pero otros cargan pantallas/listas con spinner en vez de skeleton 1:1.
- **Problema 3:** no todas las pantallas tienen su skeleton 1:1 dedicado —
  algunas caen al `DashboardSkeleton` genérico, que no coincide con su layout
  real y produce un salto visual al cargar.

**Acciones (Fase 0 + Fase 5):**
- **0.7** Reescribir el `Skeleton` base con **shimmer de barrido**
  (linear-gradient animado de 1.2s, izquierda→derecha, respetando
  `useReducedMotion` → sin animación, solo el placeholder estático). Color del
  barrido: blanco translúcido sobre `surfaceHover` (no un color nuevo).
- **0.8** Auditar y eliminar `ActivityIndicator` en cargas de pantalla/lista;
  reservarlo **solo** para: botón enviando, "cargar más" en infinite scroll,
  refresco de pull-to-refresh (donde ya es nativo). Regla: si carga una pantalla
  o reemplaza contenido, es skeleton; si es un estado transitorio dentro de una
  acción, es spinner.
- **5.7** Garantizar skeleton **1:1** por pantalla: cada pantalla del sistema
  tiene un skeleton que coincide con su layout real (mismo número de KPIs,
  mismas tarjetas, misma jerarquía). `ScreenLayout` ya acepta `loading` y
  muestra `DashboardSkeleton` — ampliar para que acepte un `skeleton` prop
  personalizado por pantalla.

### 3.2 Cero contaminación visual — paleta sobria y consistente

> **No más colores ruidosos ni fondos de color arbitrarios.** El sistema ya
> tiene la paleta "Clinical Calm" (neutro frío, tarjetas blancas, sombra suave,
> acento por rol). El rediseño la aplica sin excepciones.

**Diagnóstico actual:**
- 7 archivos usan `rgba()` hardcoded para "vidrio" sobre gradientes
  (`rgba(255,255,255,0.18)` etc.) en vez de los tokens `onColorSurface*` que
  ya existen en `theme/colors.ts`.
- No hay paleta nueva que añadir — la existente es correcta. El problema es que
  no se usa en todas partes.

**Acciones (Fase 5):**
- **5.8** Reemplazar todos los `rgba()` hardcoded de "vidrio/overlay" por los
  tokens `onColorSurface` / `onColorSurfaceStrong` / `onColorSurfaceFaint`
  (ya definidos en `commonColors`). Un solo lugar, un solo valor.
- **5.9** Auditar y eliminar fondos de color decorativos en tarjetas: una
  tarjeta debe ser blanca (`commonColors.surface`) con sombra, o con un fondo
  `*Light` del semáforo **solo si** comunica estado clínico (riesgo/urgencia).
  Sin fondos de color "para adornar".
- **5.10** Regla "sombra **O** borde, nunca ambos" (auditar y aplicar):
  si una tarjeta tiene `...shadows.card`, quitarle `borderWidth`.
- **5.11** Reducir saturación donde aboute: los `*Mid` (chips/badges) ya son
  suaves; verificar que ningún chip use un color sólido brillante.

### 3.3 Compacidad y fluidez moderna

> **Compacto no significa apretado.** Significa denso pero con aire, sin
> "basura" entre elementos, con transiciones que se sienten fluidas.

**Acciones (Fase 5):**
- **5.12** Densidad consistente: usar `stack.element` (12) entre elementos
  relacionados, `stack.group` (16) entre grupos, `stack.section` (24) entre
  secciones. Eliminar los `marginBottom: 14/18/22` arbitrarios que aún quedan.
- **5.13** Micro-interacciones coherentes: `PressableScale` (spring 0.98)
  en toda tarjeta/fila clickeable; `motion.press` (springFast) en botones;
  `motion.surface` (scale 0.96→1 + fade, 180ms) en apertura de
  modales/bottom-sheets. Todo respeta `useReducedMotion`.
- **5.14** Transiciones de pantalla: ya configuradas (`slide_from_right` en el
  `Stack` raíz). Verificar que no haya pantallas con animación propia
  inconsistente.
- **5.15** "Sense of flow": al reemplazar skeleton por contenido, usar un
  `fade-in` corto (150ms) en vez de aparición brusca. Al cambiar de tab, el
  contenido entra con un cross-fade suave (no recarga visible).

### 3.4 Tarjetas compactas y claras

> **La tarjeta es el átomo del diseño.** Debe ser compacta, clara y consistente:
> blanca, sombra suave, radio coherente, padding semántico, sin dobles
> jerarquías. Una tarjeta = una unidad de información.

**Diagnóstico actual:**
- `AppCard` es bueno (sombra, `PressableScale`, `overflow:hidden`) pero el
  padding es un único `spacing.md2` (20) sin variantes de densidad.
- `KpiCard` es bueno pero usa `${accent}1A` (hex concatenado para alpha 10%),
  que es frágil — un color sin `#` o con opacidad distinta lo rompe.
- No hay un modo `compact` estándar para tarjetas de lista densa vs tarjetas
  hero de dashboard.

**Acciones (Fase 0 + Fase 5):**
- **0.9** `AppCard` — añadir prop `density?: 'comfortable' | 'compact'`
  (comfortable = `spacing.md2`/20 actual; compact = `spacing.md`/16 para listas
  densas y filas). Asegurar que el padding interno respeta `stack` semántico.
- **0.10** `KpiCard` — reemplazar `${accent}1A` por un helper `withAlpha(accent, 0.1)`
  robusto (o usar el token `*Light` del acento cuando exista). Añadir modo
  `compact` (sin barra de progreso, icono más pequeño) para filas de KPIs.
- **5.16** Claridad jerárquica: una tarjeta tiene **un** título (h3/h4), un
  subtítulo opcional (caption) y el contenido. Sin títulos dobles ni metadatos
  compitiendo. Auditar y simplificar donde haya ruido dentro de tarjetas.
- **5.17** Separadores: dentro de una tarjeta, separar secciones con `stack.group`
  (aire) en vez de `borderBottom` visible. Si se usa separador, que sea
  `borderLight` (casi invisible), no `border`.
- **5.18** Estados de tarjeta consistentes: `default` → sombra `card`;
  `elevated` → sombra `float`; `highlighted` → borde de acento + glow.
  Auditar que no haya tarjetas con sombra Y borde a la vez (regla de §3.2).

### 3.5 Gráficos claros y minimalistas

> **Un gráfico clínico debe ser legible de un vistazo.** Pocos elementos, mucho
> aire, una sola serie principal con color de acento, grilla casi invisible,
  sin decoración. Lo que no aporta información, quita.

**Diagnóstico actual:**
- Los 3 gráficos SVG (`LineChartSvg`, `ChartBar`, `ChartDonut`) son limpios
  (sin react-native-chart-kit) y correctos. **Buen punto de partida.**
- **Problema:** `fontSize={9/10}` y `strokeWidth={1}` hardcoded para ejes y
  grilla → no usan tokens de tipografía ni un "hairline" token. Si se cambia
  la paleta o el cuerpo mínimo, los gráficos no se adaptan.
- `ChartBar` tiene animación de llenado (600ms cubic) — buena, pero respeta
  `useReducedMotion`? No (debería saltar al valor final si reduce-motion).
- `ChartDonut` usa `strokeLinecap="butt"` (segmentos rectos) — más limpio que
  "round", correcto para datos clínicos.

**Acciones (Fase 0 + Fase 5):**
- **0.11** Añadir tokens de gráfico en `src/theme/`: `chartGridStroke`
  (`commonColors.borderLight`), `chartAxisFontSize` (10), `chartAxisColor`
  (`commonColors.textTertiary`), `chartBarRadius` (relleno de barras).
  Un solo lugar para afinar todos los gráficos.
- **0.12** `LineChartSvg` / `ChartBar` / `ChartDonut` — reemplazar literales
  (`fontSize={9}`, `strokeWidth={1}`, `fill={commonColors.textTertiary}`)
  por los nuevos tokens de gráfico. Sin cambiar la lógica de cálculo.
- **0.13** `ChartBar` — respetar `useReducedMotion`: si true, animación de
  llenado → instantánea (salto al valor final). Sin tocar el cálculo.
- **5.19** Claridad de serie: una serie principal con color de acento del rol;
  bandas de referencia en `*Light` con opacidad baja; series secundarias en
  `textSecondary`. Máximo 2 series + 1 banda por gráfico (más es ruido).
- **5.20** Aire en gráficos: padding interno generoso (`spacing.md` mínimo),
  leyenda separada del lienzo con `stack.sm` de aire. Sin etiquetas amontonadas.
- **5.21** Dona/barras: verificar que los colores de segmentos vienen de
  `riskColors`/`semanticColors` (no colores sueltos) para coherencia clínica.

### 3.6 Iconos minimalistas, limpios y suaves

> **El icono es lenguaje, no decoración.** Mismo set (Lucide), mismo peso de
> trazo, misma escala de tamaño. Suave = trazo fino consistente, no pesos
  mezclados.

**Diagnóstico actual:**
- Set correcto: **Lucide React Native** (outline, consistente). Buena base.
- **Problema 1 — prolifxeración de tamaños:** se usan **20 tamaños distintos**
  (11, 12, 13, 14, 15, 16, 17, 18, 20, 22, 24, 26, 28, 32, 36, 40, 42, 44,
  48, 56). Eso es ruido visual: el mismo tipo de icono se ve distinto en cada
  pantalla.
- **Problema 2 — peso inconsistente:** hay 24 overrides manuales de
  `strokeWidth` (cuando Lucide por defecto es 2). Mezclar pesos rompe la
  sensación de limpieza.

**Acciones (Fase 0 + Fase 5):**
- **0.14** Añadir una **escala de iconos** en `src/theme/iconography.ts`:
  `iconSizes = { xs: 14, sm: 16, md: 20, lg: 24, xl: 32, xxl: 48 }`
  (alineada con la escala tipográfica). Un solo lugar para todos los tamaños.
- **0.15** Añadir un **peso de trazo estándar** en el mismo token:
  `iconStroke = { regular: 1.75, emphasis: 2.25 }` (regular para iconos en
  reposo, emphasis para el icono activo/seleccionado). Lucide default 2 queda
  algo pesado para estética minimalista; 1.75 es más suave y limpio.
- **0.16** Crear un wrapper `AppIcon` (`src/components/ui/AppIcon.tsx`) que
  aplica `iconSizes` + `iconStroke` por defecto y expone `size="sm"|"md"|...`
  semántico. Reemplaza `<Icon size={18} />` sueltos por `<AppIcon name=...
  size="md" />`.
- **5.22** Auditar y reducir los 20 tamaños a los 6 de la escala. Migrar los
  overrides de `strokeWidth` a `iconStroke.regular` (o `emphasis` solo en
  estado activo).
- **5.23** Suavidad: los iconos **siempre** van con `strokeLinecap="round"` y
  `strokeLinejoin="round"` (Lucide lo trae por defecto; verificar que ningún
  override lo rompa). Sin sombras ni fondos de color ruidosos en iconos.
- **5.24** Icono + etiqueta: nunca un icono solo para información crítica
  (ISO 9241-143). Siempre con texto, excepto acciones obvias (back, cerrar,
  menú) que ya tienen `accessibilityLabel`.

---

## 4. Cumplimiento de estándares ISO y WCAG

### 4.1 ISO 9241-210 — Diseño centrado en el humano (proceso)
El rediseño sigue el ciclo ISO 9241-210: **comprender el contexto → especificar
requisitos → producir soluciones → evaluar contra requisitos**. Este documento es
la fase de especificación. Cada cambio se valida con `npm run verify`
(tsc + audit:design:strict + jest) y con QA visual.

### 4.2 ISO 9241-110 — Principios de diálogo
| Principio | Cómo se cumple |
|---|---|
| Adecuado a la tarea | Cada pantalla expone solo lo necesario para la tarea clínica (progressive disclosure) |
| Autodescriptivo | Estados estándar (skeleton/empty/error con CTA), copys claros |
| Conforme a expectativas | Patrones consistentes (mismo header, mismos tabs, mismos modales) en toda la app |
| Apto para aprender | Tour guiado + manual PDF por rol ya existen; el rediseño los conserva |
| Controlable | Acciones reversibles (confirmación destructiva con `confirmAction`), botón back siempre presente |
| Tolerante a errores | Validación Zod en formularios, errores sin disculpas (qué pasó + cómo seguir) |
| Adecuado a individualización | Modo oscuro, acento por rol, feature flags por módulo |

### 4.3 ISO 9241-125 — Presentación de información
- Jerarquía visual clara (tipografía Inter, escala tipográfica definida).
- Agrupación lógica (cards, secciones, acordeones).
- Distinción figura/fondo por sombra suave (no bordes).
- Coherencia espacial (grid 8pt + `stack` semántico).

### 4.4 ISO 9241-143 — Íconos
- Iconografía consistente: un solo set (**Lucide**), peso/trazo uniforme.
- Íconos acompañados de etiqueta de texto (nunca solos para información crítica).
- Semántica clínica de color reservada (rojo = urgencia, ámbar = alerta).

### 4.5 WCAG 2.2 AA + WCAG2Mobile (cumplimiento estricto)
| Criterio | Estado | Acción del rediseño |
|---|---|---|
| 1.4.3 Contraste (mínimo) 4.5:1 | ✅ tokens verificados | Mantener; re-verificar tras cambios |
| 1.4.11 Contraste no-texto 3:1 | ✅ | Verificar íconos y bordes de controles |
| 2.5.8 Target size (mínimo) 24×24 | ⚠️ `minTouchTarget:48` existe pero se debe auditar uso | Auditar todos los `TouchableOpacity` sin `hitSlop` |
| 2.4.7 Foco visible | ⚠️ web tiene `outlineStyle:none` | Añadir `:focus-visible` ring en web |
| 2.4.11 Foco no oscurecido | ⚠️ | Auditar sticky headers y FABs |
| 2.3.3 Animación por interacción | ✅ `useReducedMotion` existe | Verificar uso en todos los `Reanimated` |
| 3.3.1 Identificación de errores | ✅ Zod + `FormMessage` | Estandarizar en `FormSheet` |
| 3.3.2 Etiquetas o instrucciones | ✅ | Todas las `Field` con `label` |
| 4.1.2 Nombre, rol, valor | ⚠️ | Auditar `accessibilityRole`/`Label` faltantes |

> **Nota legal:** apps de salud en EE. UU. deben cumplir WCAG 2.1 AA para
> Mayo 2026 (HHS/Sección 504); la UE exige el European Accessibility Act (EAA)
> desde Junio 2025. Apuntar a WCAG 2.2 AA (superset de 2.1) cumple ambos.

---

## 5. Fases del rediseño (ejecución quirúrgica, por prioridad)

> **Regla de cada fase:** al terminar, `npm run verify` pasa, la app arranca y
> las pantallas tocadas se ven idénticas entre sí. Cada commit deja el repo
> funcional. **No se cambia la API ni el backend.**

### Fase 0 — Fundaciones del sistema de diseño (1-2 días)

**Objetivo:** cerrar las brechas del sistema de diseño para que la consolidación
de pantallas tenga a dónde migrar.

- [ ] **0.1** `ScreenLayout` — completar soporte de `actions` en web (ya plano),
  estados de carga coherentes, y un modo `subtle` para sub-pantallas (ficha).
- [ ] **0.2** `KpiCard` (`src/components/ui/KpiCard.tsx` existe pero no se usa) —
  unificar las 2 variantes manuales de KPI (admin + obstetra) en una primitiva
  con variantes (`compact` / `withIcon` / `alert`).
- [ ] **0.3** `PageTabs` — promover `ToggleTabs` a un patrón `PageTabs` que
  soporte badges, íconos y scroll horizontal (reemplaza los `tabPill` manuales
  de la ficha de gestante).
- [ ] **0.4** `FormSheet` — estandarizar el patrón abrir→validar(Zod)→mutar→
  toast→cerrar en `src/components/patterns/FormSheet.tsx` (existe, ampliarlo).
- [ ] **0.5** `audit:design` — añadir reglas que prohíban `LinearGradient` y
  `SafeAreaView` directamente en `app/` (solo permitidos en `ScreenLayout`).
- [ ] **0.6** Foco visible en web: añadir `:focus-visible` ring (2px, color del
  rol, contraste 3:1) a todos los `Pressable`/`TouchableOpacity` vía un hook
  `useWebFocusRing()` aplicado en primitivas.
- [ ] **0.7** Reescribir `Skeleton` base con **shimmer de barrido**
  (linear-gradient animado izquierda→derecha, 1.2s, respetando
  `useReducedMotion` → placeholder estático). Color del barrido: blanco
  translúcido sobre `surfaceHover` (sin color nuevo).
- [ ] **0.8** Auditar `ActivityIndicator`: eliminar en cargas de
  pantalla/lista; reservar solo para botón enviando, "cargar más" y
  pull-to-refresh nativo.
- [ ] **0.9** `AppCard` — añadir `density?: 'comfortable' | 'compact'`
  (comfortable = 20; compact = 16 para listas densas).
- [ ] **0.10** `KpiCard` — reemplazar `${accent}1A` por `withAlpha(accent, 0.1)`;
  añadir modo `compact`.
- [ ] **0.11** Tokens de gráfico en `src/theme/`: `chartGridStroke`,
  `chartAxisFontSize`, `chartAxisColor`, `chartBarRadius`.
- [ ] **0.12** `LineChartSvg`/`ChartBar`/`ChartDonut` — reemplazar literales
  (`fontSize={9}`, `strokeWidth={1}`) por tokens de gráfico. Sin tocar cálculo.
- [ ] **0.13** `ChartBar` — respetar `useReducedMotion` (animación → instantánea).
- [ ] **0.14** Escala de iconos en `src/theme/iconography.ts`:
  `iconSizes = { xs:14, sm:16, md:20, lg:24, xl:32, xxl:48 }`.
- [ ] **0.15** Peso de trazo estándar: `iconStroke = { regular:1.75, emphasis:2.25 }`.
- [ ] **0.16** `AppIcon` wrapper (`src/components/ui/AppIcon.tsx`) con `size`
  semántico + `iconStroke` por defecto.

### Fase 1 — Migración de los 10 dashboards/listas a `ScreenLayout` (2-3 días)

**Objetivo:** eliminar las 18 variantes de header manual. Cada pantalla pasa a
delegar header + estados + safe-area a `ScreenLayout`.

- [ ] **1.1** `(auth)/*` (login, register, forgot-password, cambiar-password) —
  Estas SÍ pueden mantener su header propio (son pre-sesión, sin rol), pero
  estandarizarlas con un `AuthLayout` compartido (mismo blob, misma tarjeta,
  misma tipografía). Hoy `login.tsx` ya tiene `webAuthCard` — extenderlo.
- [ ] **1.2** `(admin)/*` — migrar `usuarios`, `contenido`, `sedes`, `config`,
  `notificaciones`, `auditoria`, `avisos` y `supervision/*` a `ScreenLayout`
  (quitar `LinearGradient` + `SafeAreaView` manuales).
- [ ] **1.3** `(obstetra)/*` — migrar `gestantes`, `chat`, `atender/[id]`,
  `gestante/[id]`, `gestante/nueva`, `gestante/tamizajes`, `notificaciones` a
  `ScreenLayout`.
- [ ] **1.4** `(gestante)/*` — migrar `chat`, `educacion`, `perfil`, `citas`,
  `alarmas`, `visitas`, `notificaciones` a `ScreenLayout`.

> **Métrica de éxito:** `grep -rl "LinearGradient" app/ | grep -v _layout` ==
> 0 archivos. `grep -rl "SafeAreaView" app/ | grep -v _layout` == 0 (excepto auth).

### Fase 2 — Consolidación de listas con `ListScreen` (1-2 días)

- [ ] **2.1** `(admin)/(tabs)/usuarios.tsx` (1.171 líneas) → `ListScreen` con
  `columns` (web) + `renderCard` (móvil). Extraer el modal de detalle a
  `FormSheet` o `DetailScreen`.
- [ ] **2.2** `(obstetra)/(tabs)/gestantes.tsx` (523 líneas) → `ListScreen`.
- [ ] **2.3** `(admin)/supervision/gestantes.tsx` y `supervision/citas.tsx` →
  `ListScreen`.
- [ ] **2.4** `(gestante)/(tabs)/citas.tsx` (910 líneas) — no es una lista
  simple (tiene `SectionList` + progreso MINSA + modales), pero los modales de
  detalle/reprogramación se extraen a `FormSheet` y la rama web/móvil se unifica.

### Fase 3 — Desmembrar el monolito `(obstetra)/gestante/[id].tsx` (2-3 días)

**Objetivo:** llevar 2.804 líneas a un máximo de ~400 por archivo, extrayendo:
- [ ] **3.1** Lógica de formulario → hooks: `useLabForm`, `useVaccineForm`,
  `useTreatmentForm`, `useAntecedenteForm`, `useEmbarazoForm`, `useObstetricosForm`.
  Cada hook encapsula los `useState` + la mutación + el toast + el reset.
- [ ] **3.2** Sub-pantallas (tabs) → componentes: `ResumenTab`,
  `SeguimientoTab`, `TratamientoTab`, `ClinicoTab`, cada uno en
  `src/components/obstetra/patient-detail/`.
- [ ] **3.3** Modales → `FormSheet`: `LabFormSheet`, `VaccineFormSheet`,
  `TreatmentFormSheet`, `AntecedenteFormSheet`, `EmbarazoFormSheet`,
  `ObstetricosFormSheet`, `RecommendContentSheet`.
- [ ] **3.4** El header de la ficha → `ScreenLayout` con `actions` (llamada,
  WhatsApp, recomendar contenido, tamizajes). El avatar + nombre + DNI pasan a
  un `PatientHeaderCard` reutilizable.

### Fase 4 — Desmembrar las otras pantallas grandes (1-2 días)

- [ ] **4.1** `(admin)/(tabs)/notificaciones.tsx` (817 líneas, 19 `useState`)
  → extraer lógica a `useNotificationChannels` y la UI a `ChannelConfigCard`.
- [ ] **4.2** `(obstetra)/gestante/nueva.tsx` (822 líneas) → `FormSheet` multi-paso.
- [ ] **4.3** `(admin)/(tabs)/contenido.tsx` (731 líneas, 9 `useState`) →
  `ListScreen` + `ContentEditorSheet`.
- [ ] **4.4** `(gestante)/(tabs)/educacion.tsx` (608 líneas) → separar la
  calculadora EG en su propio componente `GestationalAgeCalculator`.
- [ ] **4.5** `(gestante)/(tabs)/perfil.tsx` (567 líneas, 13 `useState`) →
  extraer formularios a hooks.

### Fase 5 — Refinamiento visual minimalista y fluidez (2-3 días)

**Objetivo:** llevar el "se siente minimalista, limpio, compacto y fluido" de
intención a realidad. Sobre la base ya consistente, afinar:

- [ ] **5.1** Aire y respiración — revisar `stack` (tight/element/group/section/
  block) en cada pantalla; aumentar respiración entre secciones (`stack.section`
  → `stack.block` donde aporte).
- [ ] **5.2** Reducir ruido visual — auditar `borderWidth` innecesarios; donde
  haya sombra `card`, quitar el borde (regla "sombra O borde, nunca ambos").
- [ ] **5.3** KPIs sobrios — unificar a `KpiCard` (icono neutro + cifra + label,
  acento solo en la cifra cuando sea alerta). Sin fondos de color por defecto.
- [ ] **5.4** Micro-interacciones — `PressableScale` en todas las tarjetas y
  filas; haptics en acciones primarias; transiciones `slide_from_right`
  consistentes (ya configurado en el `Stack` raíz).
- [ ] **5.5** Web: scrollbar ya estilizada; auditar `cursor: pointer` y
  `:focus-visible` en todo interactivo.
- [ ] **5.6** Modo oscuro — auditar contraste en todas las pantallas migradas
  (no solo tokens). Corregir pares texto/fondo que se vean mal en dark.
- [ ] **5.7** Skeleton 1:1 por pantalla — `ScreenLayout` acepta `skeleton` prop
  personalizado; cada pantalla usa el skeleton que coincide con su layout real.
- [ ] **5.8** Reemplazar `rgba()` hardcoded de vidrio/overlay por tokens
  `onColorSurface*` (7 archivos identificados).
- [ ] **5.9** Eliminar fondos de color decorativos en tarjetas (blanco o
  `*Light` solo si comunica estado clínico).
- [ ] **5.10** Aplicar regla "sombra O borde, nunca ambos" en todas las tarjetas.
- [ ] **5.11** Verificar que ningún chip/badge use color sólido brillante.
- [ ] **5.12** Densidad consistente con `stack` (eliminar `marginBottom`
  arbitrarios).
- [ ] **5.13** Micro-interacciones coherentes: `motion.press` en botones,
  `motion.surface` en modales, `PressableScale` en tarjetas.
- [ ] **5.14** Transiciones de pantalla consistentes (`slide_from_right`).
- [ ] **5.15** "Sense of flow": fade-in (150ms) al reemplazar skeleton por
  contenido; cross-fade suave al cambiar de tab.
- [ ] **5.16** Claridad jerárquica en tarjetas (un título, un subtítulo).
- [ ] **5.17** Separadores con aire (`stack.group`) en vez de `borderBottom`.
- [ ] **5.18** Estados de tarjeta consistentes (default/elevated/highlighted).
- [ ] **5.19** Series de gráfico: 1 principal + 1 banda máx.; colores de tokens.
- [ ] **5.20** Aire en gráficos (padding `spacing.md`+, leyenda separada).
- [ ] **5.21** Segmentos de dona/barras desde `riskColors`/`semanticColors`.
- [ ] **5.22** Auditar y reducir 20 tamaños de icono → 6 de `iconSizes`.
- [ ] **5.23** Verificar `strokeLinecap/join="round"` en todos los iconos.
- [ ] **5.24** Icono + etiqueta siempre (ISO 9241-143) salvo acciones obvias.

### Fase 6 — Accesibilidad y compliance final (1 día)

- [ ] **6.1** Auditoría `accessibilityRole`/`Label` en todas las pantallas
  migradas (con script que liste los `Pressable`/`TouchableOpacity` sin label).
- [ ] **6.2** Auditoría de targets táctiles — todo interactivo ≥44dp o con
  `hitSlop` que lo lleve a 48dp (WCAG 2.5.8 AA exige 24px, AAA 44px; la app
  ya define `minTouchTarget:48`).
- [ ] **6.3** Auditoría de contraste — ejecutar `__tests__/theme.test.ts` (ya
  calcula contraste) + revisión visual de pares en dark mode.
- [ ] **6.4** Navegación por teclado (web) — tab order lógico, foco atrapado en
  modales (`Overlay`/`AppModal`), `Escape` cierra modales.
- [ ] **6.5** `npm run verify` verde + `bash scripts/qa-visual.sh` (QA visual
  del portal web) sin hallazgos bloqueantes.

---

## 6. Análisis de arquitectura de información por vista (¿tiene sentido el orden?)

> Análisis de "¿está cada parte donde el usuario espera encontrarla?".

### 6.1 Gestante — Inicio
**Actual:** onboarding (si no FUM) → cinta prenatal → próxima cita → tratamiento
del día → acciones rápidas.
**Veredicto:** ✅ correcto. Lo primero que una gestante quiere ver es "cómo va
mi embarazo" (cinta) y "qué me toca hoy" (cita + pastilla). Las acciones
rápidas (reportar/emergencia/educación) bien abajo como acceso rápido.
**Acción:** solo consolidar a `ScreenLayout` (ya lo usa). Refinamiento de
respiración en Fase 5.

### 6.2 Gestante — Citas
**Actual:** ToggleTabs Próximas/Historial → progreso MINSA → SectionList por día.
**Veredicto:** ⚠️ el progreso MINSA arriba "compite" con las citas. Pero es
información motivacional útil. Mantener, pero asegurar jerarquía (progreso como
card destacada, citas como lista debajo).
**Acción:** extraer modales a `FormSheet` (Fase 2.4), consolidar header (Fase 1).

### 6.3 Gestante — Tratamiento
**Actual:** Constancia (racha) → adherencia (anillo) → medicamentos.
**Veredicto:** ✅ jerarquía excelente (motivación → estado → acción). Es el
ejemplo a seguir para otras pantallas.
**Acción:** usar como referencia de "cómo se debe ver una pantalla minimalista".

### 6.4 Obstetra — Inicio (panel de trabajo)
**Actual:** saludo → 3 KPIs → distribución de riesgo → citas de hoy.
**Veredicto:** ✅ correcto y bien jerarquizado. En web side-by-side (riesgo |
  citas) funciona bien.
**Acción:** unificar KPIs a `KpiCard` (Fase 0.2).

### 6.5 Obstetra — Ficha de gestante `[id]`
**Actual:** header con avatar + acciones → tabs manuales (Resumen/Seguimiento/
Tratamiento/Clinico) → contenido inmenso con 50 useState.
**Veredicto:** ❌ el monolito. La IA es correcta (4 tabs lógicos alineados a los
objetivos de la tesis), pero la implementación es injugable.
**Acción:** desmembrar completo (Fase 3). El header pasa a `ScreenLayout` con
`actions`; los tabs a `PageTabs`; cada tab a un componente; cada modal a
`FormSheet`.

### 6.6 Admin — Inicio
**Actual:** pendientes → resumen (4 KPIs) → estado del sistema → gestión.
**Veredicto:** ✅ correcto (acción directa → resumen → estado → accesos).
**Acción:** unificar KPIs a `KpiCard`.

### 6.7 Navegación (todos los roles)
**Actual:** fuente única en `src/navigation/menu.ts` consumida por drawer (móvil)
y sidebar (web).
**Veredicto:** ✅ excelente. No se toca.
**Acción:** ninguna.

---

## 7. Matriz de componentes a tocar/crear

| Componente | Acción | Fase |
|---|---|---|
| `ScreenLayout` | Ampliar (actions web, modo subtle) | 0 |
| `KpiCard` | Unificar variantes manuales | 0 |
| `PageTabs` (de `ToggleTabs`) | Promover a patrón | 0 |
| `FormSheet` | Ampliar para formularios de ficha | 0 |
| `audit-design.mjs` | Añadir reglas LinearGradient/SafeAreaView en app/ | 0 |
| `useWebFocusRing` | Crear (foco visible web) | 0 |
| `(auth)/*` (4) | Estandarizar con `AuthLayout` | 1 |
| `(admin)/*` (8) | Migrar a `ScreenLayout` | 1 |
| `(obstetra)/*` (7) | Migrar a `ScreenLayout` | 1 |
| `(gestante)/*` (7) | Migrar a `ScreenLayout` | 1 |
| `ListScreen` (4 pantallas) | Migrar listas | 2 |
| `gestante/[id].tsx` | Desmembrar en tabs + formularios | 3 |
| Pantallas >500 líneas (5) | Desmembrar | 4 |
| Todas | Refinamiento minimalista | 5 |
| Todas | Auditoría a11y/WCAG | 6 |

---

## 8. Plan de verificación por fase

Cada fase termina con:

```bash
cd frontend
npm run verify          # tsc + audit:design:strict + jest  (debe pasar)
npm run web             # arrancar y navegar las pantallas tocadas
bash scripts/qa-visual.sh   # QA visual del portal web
```

Además:
- **Comparación visual antes/después:** capturas de las pantallas migradas en
  móvil (390×844) y escritorio (1440×900) para confirmar consistencia.
- **Commit por fase:** cada fase es un commit atómico que deja el repo funcional.
- **Rollback seguro:** si una fase rompe, se revierte el commit; las fases
  anteriores quedan intactas y funcionales.

---

## 9. Riesgos y mitigaciones

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Romper el APK Android al tocar el header nativo | Baja | No se toca plugins nativos ni `app.config.js` |
| Pérdida de funcionalidad al extraer formularios | Media | Un test por modal extraído; `npm test` verde |
| Regresión visual en pantallas no tocadas | Baja | Las fases son aditivas; `ScreenLayout` ya se usa en algunas |
| Inconsistencia entre migración parcial | Media | Una fase completa todas las pantallas de un rol antes de commit |
| Web vs móvil divergentes | Baja | `ListScreen`/`ScreenLayout` abstraen la bifurcación |

---

## 10. Estimación de esfuerzo

| Fase | Esfuerzo | Salida |
|---|---|---|
| 0 — Fundaciones | 1-2 días | Sistema de diseño completo + reglas de auditoría |
| 1 — Migración headers (26 pantallas) | 2-3 días | 0 LinearGradient en app/, headers consistentes |
| 2 — Listas con ListScreen (4) | 1-2 días | ~2.000 líneas eliminadas |
| 3 — Desmembrar ficha gestante | 2-3 días | 2.804 → ~400 líneas/archivo |
| 4 — Otras pantallas grandes (5) | 1-2 días | Sin archivos >500 líneas |
| 5 — Refinamiento minimalista | 2 días | Aire, ruido, KPIs, micro-interacciones |
| 6 — Accesibilidad y compliance | 1 día | WCAG 2.2 AA verificado |
| **Total** | **10-15 días** | **Frontend profesional, consistente, compliance ISO/WCAG** |

---

## 11. Definición de "Hecho" (Definition of Done)

El rediseño está completo cuando:

1. ✅ `grep -rl "LinearGradient" app/ | grep -v _layout` == 0 (header delegado)
2. ✅ `grep -rl "SafeAreaView" app/ | grep -v _layout` == 0 (salvo auth)
3. ✅ Ningún archivo en `app/` supera 500 líneas
4. ✅ Ningún archivo en `app/` tiene más de 5 `useState` (lógica extraída)
5. ✅ Todos los KPIs usan `KpiCard` (0 funciones `Kpi` manuales)
6. ✅ Todas las listas usan `ListScreen` (0 `FlashList`/`SectionList` sueltos con toolbar)
7. ✅ `npm run verify` pasa (tsc + audit:design:strict + jest)
8. ✅ `bash scripts/qa-visual.sh` sin hallazgos bloqueantes
9. ✅ Auditoría a11y: 0 interactivos sin `accessibilityLabel`, 0 targets <24px
10. ✅ Capturas antes/después documentan consistencia en móvil y escritorio
11. ✅ **Cargas:** 0 `ActivityIndicator` en cargas de pantalla/lista; el shimmer
    es de barrido (no solo opacidad); cada pantalla tiene skeleton 1:1
12. ✅ **Contaminación:** 0 `rgba()` hardcoded de vidrio/overlay (usan tokens
    `onColorSurface*`); 0 tarjetas con sombra Y borde a la vez; 0 fondos de
    color decorativos (solo `*Light` para estado clínico)
13. ✅ **Fluidez:** `PressableScale` en toda tarjeta/fila clickeable;
    `motion.surface` en modales; fade-in al reemplazar skeleton por contenido
14. ✅ **Tarjetas:** `AppCard` con `density` (comfortable/compact); 0 tarjetas
    con sombra Y borde; `KpiCard` sin hex-alpha frágil (`withAlpha`)
15. ✅ **Gráficos:** 0 literales (`fontSize={9}`, `strokeWidth={1}`) en
    `LineChartSvg`/`ChartBar`/`ChartDonut` (usan tokens de gráfico);
    `ChartBar` respeta `useReducedMotion`
16. ✅ **Iconos:** 0 tamaños fuera de la escala `iconSizes`
    (xs/sm/md/lg/xl/xxl); 0 overrides manuales de `strokeWidth` (usan
    `iconStroke.regular`/`emphasis`); todos vía `AppIcon`

---

## 12. Recomendación de diseño ideal (el "north star")

El diseño objetivo para VitMaterna:

- **Estética:** "spa clínico minimalista" — neutro frío casi blanco, tarjetas
  blancas flotantes con sombra suave (sin bordes), un acento por rol, color
  semántico solo para riesgo/urgencia/estado. **Ya es la intención actual**;
  este plan la hace realidad eliminando las inconsistencias.
- **Tipografía:** Inter, cuerpo 15px+, jerarquía por peso y tamaño, no por color.
- **Espacio:** grid 8pt, `stack` semántico, respiración generosa entre secciones.
- **Navegación:** sidebar fijo (web) / tabs + drawer (móvil) — ya correcto.
- **Flujo:** progressive disclosure (lo crítico arriba, lo secundario en
  acordeones/sub-tabs), acciones siempre visibles y a un toque.
- **Fluides:** `PressableScale` en todo lo táctil, transiciones `slide_from_right`,
  skeletons 1:1 en cargas, `useReducedMotion` respetado.
- **Accesibilidad:** WCAG 2.2 AA + WCAG2Mobile, foco visible en web, targets
  ≥48dp, contraste AA, lectores de pantalla.

**Referencias de inspiración (no de copiar):** Linear (minimalismo y aire),
Notion (jerarquía tipográfica), Cal.com (flujo de citas limpio), Apple Health
(jerarquía clínica glanceable), Epic (densidad clínica en web).

---

## 13. Conclusión y próximo paso

VitMaterna **no** necesita una reescritura ni una migración de stack. Necesita
**disciplina de ejecución**: hacer que las 26 pantallas consuman el sistema de
diseño que ya tienen (`ScreenLayout` + primitivas + patrones) en vez de
reimplementarlo 18 veces a mano. Este plan lo hace de forma quirúrgica, por
fases, sin romper el APK, el offline-first ni las features nativas, y con
cumplimiento estricto de ISO 9241 y WCAG 2.2 AA.

**Próximo paso:** aprobar este plan y comenzar por la **Fase 0** (fundaciones
del sistema de diseño + reglas de auditoría), que habilita todas las demás.

---

### Apéndice A — Evidencia del diagnóstico (referencias a archivos)

- **18 headers manuales:** `grep -rl LinearGradient app/ | grep -v _layout` →
  18 archivos (lista completa en §1.1).
- **Monolito:** `app/(obstetra)/gestante/[id].tsx` — 2.804 líneas, 50 useState,
  tabs manuales (líneas 894-917), header manual (líneas 816-887), estado de
  carga manual (líneas 704-728).
- **KPIs duplicados:** `app/(admin)/(tabs)/index.tsx` y `app/(obstetra)/(tabs)/index.tsx`
  cada uno con su propia función `Kpi`.
- **Auditoría de diseño:** `npm run audit:design:strict` → 0 violaciones (los
  tokens están bien; el problema es el consumo, no la definición).
- **Type-check:** `npx tsc --noEmit` → EXIT 0.

### Apéndice B — Estándares referenciados

- **ISO 9241-210:2019** — Human-centred design for interactive systems (proceso).
- **ISO 9241-110:2020** — Principles for dialogue.
- **ISO 9241-125:2024** — Guidance on visual presentation of information.
- **ISO 9241-143:2023** — Guidance on icons.
- **WCAG 2.2** (W3C, 2023) — Level AA + WCAG2Mobile (W3C draft, May 2025).
- **European Accessibility Act (EAA)** — vigente desde Junio 2025.
- **HHS / Sección 504 (EE. UU.)** — WCAG 2.1 AA para apps de salud, Mayo 2026.
