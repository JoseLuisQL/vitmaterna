# Análisis del Frontend — VITMATERNA

> Plataforma móvil de salud prenatal. Expo SDK 56 · React Native 0.85 · React 19 · TypeScript · expo-router.
> Análisis realizado sobre el código completo: 24,000+ líneas (≈14.3k en `app/`, ≈9.7k en `src/`).

---

## 1. Veredicto general

**Es un frontend maduro, bien arquitecturado y de calidad notablemente alta para un proyecto de este tipo.** No es un MVP improvisado: tiene una infraestructura offline-first real, tiempo real con sockets, sistema de diseño propio, theming claro/oscuro, separación limpia entre capa de datos y UI, y disciplina de tipos (typecheck pasa **limpio**, 44/44 tests **verdes**).

| Dimensión | Estado | Nota |
|---|---|---|
| Arquitectura | Sólida | 8.5/10 |
| Estructura / organización | Muy clara | 9/10 |
| Sistema de diseño | Propio y consistente | 8.5/10 |
| Lógica de negocio | Completa y por dominios | 8/10 |
| Rendimiento | Bueno, con puntos de mejora | 7/10 |
| Calidad de código | Alta, tipado, testeado | 8/10 |
| Seguridad de rutas | **Resuelto** (RoleGuard en los 3 layouts) | 8.5/10 |

> **Actualización (jun 2026):** varias observaciones de este documento ya fueron
> resueltas. Ver la sección **§10 — Estado de las recomendaciones** al final.

---

## 2. Arquitectura

### Stack
- **Expo SDK 56** + **React Native 0.85.3** + **React 19.2** (versiones muy recientes).
- **expo-router ~56** → routing basado en sistema de archivos (file-based).
- **TanStack React Query 5** → toda la capa de datos servidor (caché, sync, mutaciones).
- **Zustand 5** → estado global de autenticación (ligero, sin boilerplate).
- **socket.io-client 4** → chat, presencia, "escribiendo…", emergencias en tiempo real.
- **expo-secure-store** (nativo) / `localStorage` (web) → tokens JWT.
- **expo-sqlite** → cola offline (outbox); **AsyncStorage** → persistencia de caché.
- **react-native-svg** → gráficas clínicas propias (sin librería pesada de charts).

### Capas (separación de responsabilidades)
```
app/                → SOLO rutas y pantallas (presentación)
src/services/       → capa de datos: api, queries, sockets, red, outbox
src/store/          → estado global (auth)
src/hooks/          → lógica reutilizable (chat, push, prefetch, debounce)
src/components/ui/  → sistema de diseño (38 primitivas)
src/components/shared/ → componentes de dominio compartidos
src/theme/          → tokens de diseño (color, tipografía, espacio, sombra)
src/utils/          → utilidades puras (referencias clínicas, formato, etc.)
src/database/       → SQLite (outbox offline)
```
Esta separación está **bien respetada**: las pantallas casi no hablan con `axios` directo, sino con hooks de `api-queries.ts`. Es el patrón correcto.

### Flujo de arranque (`app/_layout.tsx`)
1. Se inicializan (una vez, idempotente) red, persistencia de caché y outbox **antes** de montar el árbol.
2. Providers anidados: `SafeAreaProvider → ThemeProvider → QueryClientProvider → ToastProvider`.
3. Carga fuentes Inter, restaura sesión (`loadStoredAuth`), inicializa SQLite.
4. `app/index.tsx` actúa de splash + redirección por rol (gestante / obstetra / admin).

### Lo más destacable: arquitectura **offline-first** de verdad
Esto es lo que eleva el proyecto por encima del promedio:
- **`network.ts`** conecta NetInfo + AppState con el `onlineManager`/`focusManager` de React Query.
- **`queryClient.ts`** persiste la caché (7 días) en AsyncStorage/localStorage → al reabrir sin red, las pantallas muestran los últimos datos.
- **`outbox.ts`** es una cola de escrituras offline persistente (SQLite/localStorage), **idempotente** (`dedupeKey`), con **reintentos + backoff**, descarte de 4xx y reenvío automático al reconectar. Se usa para consumo de suplementos y signos de alarma.
- **`useOfflinePrefetch.ts`** precarga los datos clave por rol tras login.
- Mutaciones con **actualización optimista** y rollback (ej. `useLogTreatment`, `useMarkNotificationRead`).

Es una implementación de manual. Muy bien hecha.

---

## 3. Estructura de navegación (rutas por rol)

Tres áreas separadas por *route groups* de expo-router, cada una con su tab bar:

- **`(auth)`** — login, register, forgot-password.
- **`(gestante)`** — 5 tabs (Inicio, Citas, Tratamiento, Chat, Perfil) + pantallas modales (alarmas, educación/[id], visitas, notificaciones).
- **`(obstetra)`** — 7 tabs (Inicio, Gestantes, Cronograma, Alertas, Chat, Reportes, Perfil) + flujos (atender cita, nuevo control, ficha gestante, tamizajes, mensaje masivo).
- **`(admin)`** — 4 tabs visibles (Inicio, Usuarios, Contenido, Más) + secciones ocultas (sedes, config, auditoría) y supervisión (citas, gestantes, reportes).

La organización por *route groups* es **idiomática y correcta**. El uso de `href: null` para ocultar pantallas accesibles desde "Más" es un buen patrón de jerarquía.

---

## 4. Sistema de diseño y diseño visual

### Tokens (`src/theme/`)
Sistema de diseño completo y centralizado:
- **Color**: base "ice-blue" (#EEF2F8), superficies blancas flotantes con sombra (no bordes). **Un acento por rol**: gestante=púrpura `#7C3AED`, obstetra=azul `#3A86FF`, admin=slate `#3D5A80`. Semánticos (success/warning/danger/info) + **semáforo de riesgo** (verde/ámbar/rojo) — apropiado clínicamente. Cada semántico tiene 3 variantes (sólido/Mid/Light).
- **Modo oscuro** completo (`commonColorsDark`) con las mismas claves → intercambiable vía `ThemeProvider`. Persiste preferencia (`system`/`light`/`dark`).
- Tipografía (Inter, escala definida), espaciado, radios, sombras, gradientes, animaciones — todo tokenizado.

### Librería de UI (38 componentes en `src/components/ui/`)
Primitivas bien pensadas, exportadas por *barrel* (`index.ts`): `AppButton`, `AppCard`, `AppInput`, `AppModal`, `BottomSheet`, `KpiCard`, `ProgressRing`, `CircularProgress`, `ChartBar`, `LineChartSvg`, `StatusChip`, `RiskIndicator`, `SkeletonLoader` (esqueletos de carga reales), `ToastProvider`, `EmptyState`, `PillTabBar` (tab bar animada), etc.

**Calidad visual alta**: gradientes en headers, skeletons durante carga, estados vacíos cálidos, feedback táctil (`PressableScale`, haptics), iconografía unificada en Lucide. El historial de git muestra trabajo deliberado de pulido de UI (sistema de elevación, skeletons, dark mode).

### Observación de consistencia
Coexisten dos formas de consumir color: lectura directa de `commonColors` (modo claro fijo) y `useThemedColors()` (reactivo al tema). El propio código lo reconoce como **migración incremental en curso**: las pantallas viejas aún no reaccionan al modo oscuro. No es un bug, es deuda técnica conocida y acotada.

---

## 5. Lógica de negocio por módulo

La capa de datos (`api-queries.ts`, 1053 líneas) es el cerebro. Está organizada por dominio y mapea las respuestas del backend (español, Prisma) a modelos de UI. Módulos:

### Gestante (paciente)
- **Dashboard**: semanas de gestación calculadas desde FUM, trimestre, progreso 1–40, próxima cita, adherencia del día (anillo de progreso), nivel de riesgo.
- **Citas**: confirmar asistencia, **solicitar reprogramación** (flujo con aprobación del obstetra), disponibilidad de horarios.
- **Tratamiento**: registro de toma de suplementos con **optimismo + offline** (outbox idempotente por día), cálculo de adherencia.
- **Signos de alarma**: reporte offline-first idempotente.
- **Emergencia**: botón de pánico que envía **ubicación GPS** al obstetra (con fallback de coordenadas a Talavera, Apurímac — contexto rural peruano).
- **Educación**: contenido por trimestre, registro de vistas, detalle.
- **Chat** en tiempo real con su obstetra.

### Obstetra
- **Dashboard**: total pacientes, citas hoy, alertas pendientes, **distribución de riesgo** (verde/ámbar/rojo).
- **Gestantes**: búsqueda con **debounce + scroll infinito paginado**; ficha clínica completísima (`gestante/[id].tsx`, 1934 líneas).
- **Ficha clínica** (el módulo más rico): controles prenatales, laboratorios (hemoglobina por tomas, VDRL, VIH, hepatitis B, orina, PAP), vacunas, tratamientos, antecedentes, ecografías, odontograma, tamizajes (violencia y salud mental), consejería nutricional, registro de peso, patologías.
- **Gráficas clínicas**: altura uterina con bandas de referencia **P10/P90 (CLAP/OPS-MINSA)** interpoladas — esto es rigor clínico real, no decorativo.
- **Visitas domiciliarias**: con GPS, firmas, conversión de cita a domiciliaria.
- **Cronograma**, **alertas**, **reportes** (con exportación), **mensaje masivo**, **recomendación de contenido educativo** a una gestante.

### Admin (`admin-queries.ts`)
- Gestión de usuarios (aprobar obstetras, activar/desactivar).
- CRUD de contenido educativo (tipos/categorías alineados con enum del backend).
- Configuración del sistema, sedes, auditoría, supervisión (citas/gestantes/reportes).

### Tiempo real (`useSocket.ts` + `useChat.ts`)
Chat profesional: reconexión automática, fallback websocket→polling (robusto en RN), **reconciliación optimista por `clientId`** (resuelve duplicados al enviar), paginación de historial, indicador "escribiendo…" con debounce, presencia en línea, **read receipts** (vistos). Es una implementación de chat de nivel producción.

**Cobertura funcional**: muy alta. Los módulos referencian códigos de requerimiento (RF-2.03, RF-5.03, etc.), lo que indica trazabilidad con un PRD formal.

---

## 6. Rendimiento

### Lo que está bien
- **React Query** evita refetch innecesarios (staleTime 15s, caché persistente, dedupe de queries).
- **Scroll infinito + paginación** en la lista de gestantes (`usePatientsInfinite`, páginas de 15).
- **Debounce** en buscadores (`useDebouncedValue`).
- **Actualización optimista** → la UI responde instantánea sin esperar al servidor.
- **Prefetch** por rol tras login → navegación inicial fluida.
- **Skeletons** en vez de spinners → percepción de velocidad.
- Gráficas en **SVG propio** (ligero) en vez de librería de charts pesada.
- `useMemo` para cálculos derivados (semanas de gestación, filtros).

### Puntos de mejora (riesgos de rendimiento)
1. **`FlatList` en vez de `FlashList`** (16 archivos usan FlatList, 0 usan FlashList). `@shopify/flash-list` **ya está instalado** pero no se usa. En listas largas (pacientes, chat, notificaciones) FlashList rinde bastante mejor. Migración recomendada.
2. **`ScrollView` + `.map()`** en 28 archivos. Para listas cortas está bien, pero si alguna crece (ej. historial clínico extenso) no virtualiza y puede degradar.
3. **Pantallas gigantes**: `gestante/[id].tsx` (1934 líneas, **40 `useState`**, ~9 modales) y `usuarios.tsx` (1005 líneas). Funcionan y el typecheck pasa, pero son difíciles de mantener y todo el estado vive en un componente → re-renders amplios. **Recomendación**: extraer cada modal a su componente y agrupar estado (useReducer o sub-componentes).
4. **`fetchObstetraDashboard` pide `limit: 1000` pacientes** solo para contar y calcular distribución de riesgo. Debería ser un endpoint de agregación en el backend (`/patients/stats`). Hoy descarga toda la tabla en cada carga de dashboard.
5. **121 usos de `: any`** en la capa de datos. No afecta runtime pero reduce la seguridad de tipos justo donde más valor tendría (mapeo de respuestas del backend). Definir interfaces de respuesta mejoraría robustez.

---

## 7. Calidad de código

### Fortalezas
- **TypeScript estricto**: `tsc --noEmit` pasa **sin un solo error**.
- **Tests verdes**: 44/44 (Jest + jest-expo + Testing Library). Cubren referencias clínicas, theme, componentes, firmas, utilidades.
- **Comentarios de calidad**: cada archivo de infraestructura tiene un encabezado que explica el *por qué* (en español, coherente). Excelente para mantenimiento.
- **Manejo de errores** centralizado (`apiError.ts`, `getApiErrorMessage`), degradación elegante (las queries devuelven defaults en vez de romper).
- **Solo 7 `console.log`** en producción → código limpio de ruido.
- **Cross-platform** consciente: cada API sensible (SecureStore, SQLite, geolocation, push) tiene rama web/nativo.

### Debilidades
1. **~~🔴 Falta protección de rutas por rol~~ → RESUELTO.** Ya existe `src/components/layout/RoleGuard.tsx` y está cableado en los tres layouts de rol (`(gestante)/_layout.tsx`, `(obstetra)/_layout.tsx`, `(admin)/_layout.tsx`). El guard espera a `isInitialized`, redirige a login sin sesión, redirige al área propia si el rol no coincide (defensa contra deep-links) y fuerza el cambio de contraseña inicial. Defensa en profundidad correcta sobre la validación del backend.
2. **`: any` extendido** (ver §6.5).
3. **Componentes monolíticos** (ver §6.3).
4. **Coordenadas hardcodeadas** de fallback (Talavera) en el botón de emergencia — aceptable como fallback pero debería ser configurable.

---

## 8. Resumen de recomendaciones priorizadas

| Prioridad | Acción | Impacto | Estado |
|---|---|---|---|
| 🔴 Alta | Añadir guards de rol (`<Redirect>`) en los `_layout.tsx` de cada rol | Seguridad / UX | ✅ Hecho |
| 🟠 Media | Endpoint de agregación para el dashboard del obstetra (evitar `limit:1000`) | Rendimiento / red | ✅ Hecho |
| 🟠 Media | Migrar listas largas de `FlatList` → `FlashList` (ya instalada) | Rendimiento | ◑ Parcial |
| 🟡 Baja | Trocear `gestante/[id].tsx` y `usuarios.tsx` (extraer modales/estado) | Mantenibilidad | Pendiente |
| 🟡 Baja | Tipar respuestas del backend (reducir `: any`) | Robustez | Pendiente |
| 🟡 Baja | Completar migración a `useThemedColors()` para dark mode total | Consistencia visual | Pendiente |

---

## 9. Conclusión

El frontend de VITMATERNA está **bien construido y bastante completo**. Destaca por una arquitectura offline-first de nivel profesional, un sistema de diseño propio y coherente, chat en tiempo real robusto, y una cobertura funcional clínica amplia y rigurosa (referencias CLAP/OPS, semáforo de riesgo, tamizajes). El código está tipado, testeado y comentado con criterio.

Las mejoras pendientes son **acotadas y conocidas**. La prioridad que marcaba este informe (protección de rutas por rol) **ya está resuelta**; el resto (trocear pantallas grandes, tipado fino, dark mode total) es optimización incremental, no deuda estructural. En conjunto, es una base sólida y lista para iterar hacia producción.

---

## 10. Estado de las recomendaciones (jun 2026)

Pase de corrección aplicado sobre los hallazgos de este documento:

### ✅ Protección de rutas por rol — RESUELTO
`src/components/layout/RoleGuard.tsx` envuelve el `Stack` en los tres `_layout.tsx`
de rol. Cubre: espera de `isInitialized`, redirección a login sin sesión,
redirección al área propia si el rol no coincide (deep-links), y cambio de
contraseña obligatorio. Cierra el punto 🔴 #1.

### ✅ Dashboard del obstetra sin `limit:1000` — RESUELTO
Nuevo endpoint de agregación **`GET /v1/patients/stats`** (backend
`patient.service.ts → getStats()`), que cuenta en la base de datos con
`prisma.groupBy` y devuelve `{ totalPatients, riskDistribution }`. El frontend
(`fetchObstetraDashboard`) ya no descarga toda la tabla de pacientes solo para
contar; pide las estadísticas agregadas. Verificado: el resultado coincide
exactamente con el conteo anterior (4 pacientes · 2/1/1).

### ◑ `FlatList` → `FlashList` — PARCIAL (decisión deliberada)
- **Migrado:** la **bandeja de conversaciones** del chat del obstetra
  (`app/(obstetra)/(tabs)/chat.tsx`), una lista vertical que crece.
- **NO migrado a propósito:**
  - **`MessageThread`** usa `inverted`, prop que **FlashList v2 eliminó**. Su
    sustituto para chat (`maintainVisibleContentPosition` + `startRenderingFromBottom`)
    está marcado *"New arch only"*, lo que es arriesgado en `react-native-web`
    (uno de los dos targets). Migrarlo requiere validación de scroll en
    dispositivo; se deja en `FlatList` (estable) hasta poder probarlo.
  - **"Citas de hoy" (web)** del dashboard del obstetra vive **dentro** del
    `ScrollView` de dos columnas. Anidar una lista virtualizada en un
    `ScrollView` de la misma orientación rompe la virtualización. En su lugar se
    **acotó** el widget (`DASHBOARD_TODAY_LIMIT = 8`) con enlace "Ver N citas más"
    al cronograma completo — evita render sin límite sin el anti-patrón.

### Pendientes (optimización incremental, sin cambios en este pase)
- Trocear `gestante/[id].tsx` (2.8k líneas) y `usuarios.tsx`.
- Tipar respuestas del backend (reducir `: any`).
- Completar `useThemedColors()` para dark mode total.
