# Investigación del Frontend VITMATERNA — Mobile + Web

> Análisis verificado en ejecución. Expo SDK 56 · React Native 0.85.3 · React 19.2 · TypeScript · expo-router.
> Una sola base de código (~36.4k LOC) que produce **app móvil (Android/iOS)** y **portal web de escritorio** desde el mismo árbol.
> Fecha: 26 jun 2026. Verificado: `tsc` limpio · `audit:design` 0 violaciones · 136/136 tests · render web y móvil comprobados en vivo.

---

## 1. Veredicto

Es un frontend **único, universal y maduro**: la misma base de código sirve móvil nativo y un portal web de escritorio real (no un "móvil estirado"). La estrategia responsive está centralizada en un solo switch (`webShell`), la arquitectura es offline-first de verdad, hay chat en tiempo real, sistema de diseño propio con dark mode, y disciplina de calidad (tipos, tests, auditoría de diseño automatizada que corre en CI/hooks).

| Dimensión | Estado | Nota |
|---|---|---|
| Estrategia mobile/web (responsive) | Excelente, centralizada | 9/10 |
| Arquitectura general | Sólida, por capas | 9/10 |
| Offline-first / datos | Nivel producción | 9/10 |
| Sistema de diseño | Propio, consistente, auditado | 8.5/10 |
| Seguridad de rutas (rol) | **Resuelto** (antes era el punto débil) | 8.5/10 |
| Rendimiento | Bueno (React Compiler activo) | 7.5/10 |
| Calidad de código | Alta (tipado, testeado) | 8/10 |

> **Nota importante:** el documento previo `frontend/ANALISIS_FRONTEND.md` marcaba "falta protección de rutas por rol" como el problema 🔴 #1. **Ya está corregido** — ver §4. Ese doc está parcialmente desactualizado.

---

## 2. Cómo conviven móvil y web (lo esencial)

**Una sola base de código.** No hay carpetas `web/` vs `mobile/` separadas ni un segundo proyecto. La bifurcación ocurre en runtime con un único helper:

```
src/theme/responsive.ts  →  useResponsive() → { bp, width, select, webShell, ... }
```

El switch maestro es **`webShell`**:

```ts
webShell: IS_WEB && width >= 840   // (breakpoint lg)
```

- `webShell === false` → **móvil, nativo o web angosto**: render original intacto (bottom tabs + drawer).
- `webShell === true` → **navegador ≥840px**: monta el portal de escritorio (sidebar fijo + topbar + contenido a todo el ancho).

Breakpoints: `xs<360 · sm≥360 · md≥600 · lg≥840 · xl≥1240 · xxl≥1536` (mobile-first, con `select({base, sm, lg,...})`).

### La cáscara web: `src/components/web/WebShell.tsx`
Envuelve toda la app en `app/_layout.tsx`. Si `webShell` es false hace *passthrough* total (la app móvil se comporta exactamente igual que antes). Si es true y hay sesión con rol, monta `WebSidebar` + `WebTopBar` + área de contenido. Login/registro/splash siempre van a pantalla completa.

### Navegación: una sola fuente de verdad
`src/navigation/menu.ts` define, por rol, `primary` (tabs en móvil / cabecera del sidebar en web) y `sections` (drawer en móvil / resto del sidebar en web). **Nunca se duplican rutas** entre plataformas: el `PillTabBar` (móvil), el `SidebarProvider` (drawer móvil) y el `WebSidebar` (web) consumen el mismo mapa.

### Densidad de datos: tabla en web ↔ tarjetas en móvil
Patrón ejemplar en `app/(obstetra)/(tabs)/gestantes.tsx`:
```
if (webShell)  → <DataTable> (cabecera fija, orden por columna, filas clicables)
else           → <FlashList> con tarjetas
```
`src/components/web/DataTable.tsx` es genérica y usa solo tokens del tema.

### Verificación en vivo (hecho en esta investigación)
- **Desktop 1440px** (sesión obstetra): sidebar fijo con marca, rol "Obstetra", nav primaria + secciones (ANÁLISIS, CUENTA), botón colapsar, topbar con notificaciones, dashboard con KPIs reales (4 pacientes, 1 alerta, distribución de riesgo 2/1/1). ✅
- **Mobile 390px** (misma sesión): sin sidebar; header compacto con hamburguesa ("Abrir menú") + notificaciones, y **bottom tab bar** (Inicio/Gestantes/Agenda/Chat con badge "2"). ✅

La misma pantalla, el mismo dato, dos chrome distintos. Funciona.

---

## 3. Arquitectura por capas

```
app/                  → SOLO rutas/pantallas (composición + datos). 47 archivos.
src/services/         → api (axios+JWT+refresh), api-queries (React Query), sockets, network, outbox, queryClient
src/store/            → authStore (Zustand)
src/hooks/            → 13 hooks (chat, push, prefetch, realtime, debounce, ...)
src/components/ui/    → ~75 primitivas del sistema de diseño
src/components/web/   → cáscara y piezas exclusivas de web (Shell, Sidebar, TopBar, DataTable, Breadcrumb)
src/components/patterns/ → ListScreen, DetailScreen, FormScreen, DashboardScreen, Overlay, ...
src/components/layout/   → ScreenLayout (molde), RoleGuard, SidebarProvider
src/theme/            → tokens (color, tipografía Inter, espacio 8pt, sombra, motion, responsive)
src/utils/            → 18 utilidades puras (export PDF/Excel/CSV, clínicas, whatsapp, maps, ...)
src/database/         → SQLite (outbox offline)
```

**Arranque** (`app/_layout.tsx`): inicializa red + persistencia de caché + outbox *antes* de montar; providers `SafeAreaProvider → ThemeProvider → QueryClientProvider → ToastProvider`; carga Inter, restaura sesión, inicializa SQLite; `MaintenanceGate` (modo mantenimiento) y `WebShell` envuelven al navegador raíz.

### Configuración de entorno robusta (clave para el APK)
`src/config/env.ts` resuelve `API_URL` en este orden: `expoConfig.extra.apiUrl` (inyectado por `app.config.js`, fiable en APK compilado) → `process.env.EXPO_PUBLIC_API_URL` (Metro/.env) → `http://localhost:3000/v1`. Evita que un APK quede apuntando a localhost por error. `eas.json` define perfiles `apk-local` (HTTP a IP LAN), `preview`/`production-apk`/`production` (HTTPS a `api.vitmaterna.pe`).

---

## 4. Seguridad de rutas por rol — RESUELTO ✅

El punto 🔴 #1 del análisis anterior **ya no aplica**. Existe `src/components/layout/RoleGuard.tsx` y está cableado en los tres layouts de rol:

- `app/(gestante)/_layout.tsx` → `<RoleGuard allow="gestante">`
- `app/(obstetra)/_layout.tsx` → `<RoleGuard allow="obstetra">`
- `app/(admin)/_layout.tsx` → `<RoleGuard allow="admin">`

El guard: espera a `isInitialized`, redirige a login si no hay sesión, redirige al área propia si el rol no coincide (defensa contra deep-links), y fuerza cambio de contraseña inicial (`mustChangePassword`). Defensa en profundidad correcta sobre la validación del backend.

---

## 5. Offline-first y tiempo real (lo más destacable)

- **`network.ts`**: conecta NetInfo + AppState con `onlineManager`/`focusManager` de React Query.
- **`queryClient.ts`**: `networkMode: 'offlineFirst'`, caché persistida 7 días (AsyncStorage nativo / localStorage web). Al reabrir sin red, las pantallas muestran los últimos datos. Se limpia en logout (no filtra datos entre usuarios).
- **`outbox.ts`**: cola de escrituras offline persistente (SQLite nativo / localStorage web), **idempotente** (`dedupeKey`), con **reintentos + backoff**, descarte de 4xx y reenvío automático al reconectar / volver a foreground. Implementación de manual.
- **Tiempo real** (`useSocket.ts` + `useChat.ts`): socket.io con `auth.token`, fallback `websocket→polling` (robusto en RN), reconexión (10 intentos), reconciliación optimista por `clientId`, "escribiendo…", presencia y read receipts.

Todas las APIs sensibles a plataforma tienen rama web/nativo: tokens (`SecureStore`↔`localStorage`), export de archivos (Blob download ↔ `expo-file-system`+`Sharing`), push, geolocalización, SQLite.

---

## 6. Rendimiento

**Mejoras ya aplicadas (vs. análisis previo):**
- **React Compiler activo** (`app.json → experiments.reactCompiler: true`, plugin en babel). Verificado: el bundle web contiene `memo_cache_sentinel` → memoización automática de componentes/callbacks/cómputos. Por eso solo hay 1 `React.memo` manual: ya no hace falta.
- **FlashList** ya adoptada en 5 listas largas clave (gestantes, usuarios, educación, supervisión/gestantes, ListScreen).

**Pendientes (acotados, no estructurales):**
1. **9 archivos aún en `FlatList`** (chat, MessageThread, tratamiento, citas admin, contenido, sedes, auditoría, NuevaCitaModal, index obstetra). Para listas que pueden crecer (chat, historial) conviene migrar a FlashList; en catálogos cortos es indiferente.
2. **`fetchObstetraDashboard` pide `/patients?limit=1000`** solo para contar y calcular distribución de riesgo (`api-queries.ts:395`). Debería ser un endpoint de agregación en backend (`/patients/stats`). Es la optimización de red de mayor impacto.
3. **Pantallas monolíticas**: `gestante/[id].tsx` (2.804 líneas), `usuarios.tsx` (1.164). Funcionan y tipan, pero son difíciles de mantener; extraer modales/estado mejoraría mantenibilidad.
4. **185 usos de `: any`** (mayoría en `api-queries.ts`, mapeo de respuestas del backend). No afecta runtime; tipar las respuestas daría robustez justo donde más valor tiene.

---

## 7. Calidad de código (verificado en ejecución)

| Puerta | Resultado |
|---|---|
| `npm run tsc` (typecheck) | **0 errores** |
| `npm run audit:design` | **0 violaciones** (R1–R6) |
| `npm test` (Jest) | **136/136** en 16 suites |

- Auditoría de diseño automatizada (`scripts/audit-design.mjs`) prohíbe en `app/`: hex/rgba sueltos, `Alert.alert`, `<Modal>` RN crudo, `SafeAreaView` de react-native, zIndex numérico. Corre vía `npm run verify` y git hooks (`.githooks`).
- Encabezados explicativos (el *por qué*) en cada archivo de infraestructura. Excelente para mantenimiento.
- Manejo de errores centralizado (`apiError.ts`), degradación elegante (queries devuelven defaults).

---

## 8. Recomendaciones priorizadas

| Prioridad | Acción | Impacto |
|---|---|---|
| 🟠 Media | Endpoint de agregación para dashboard obstetra (eliminar `limit:1000`) | Red / rendimiento |
| 🟠 Media | Migrar `FlatList`→`FlashList` en chat/MessageThread (listas que crecen) | Rendimiento |
| 🟡 Baja | Trocear `gestante/[id].tsx` y `usuarios.tsx` (extraer modales/estado) | Mantenibilidad |
| 🟡 Baja | Tipar respuestas del backend (reducir 185 `: any`) | Robustez |
| 🟡 Baja | Actualizar `ANALISIS_FRONTEND.md` (el guard de rol ya existe) | Documentación |
| 🟡 Baja | Unificar "Citas de hoy" web a FlashList si el volumen diario crece | Rendimiento |
| 🔵 Opc. | Limpiar `useMemo`/`useCallback` manuales ya cubiertos por React Compiler | Limpieza |

---

## 9. Conclusión

El frontend de VITMATERNA está **bien construido y es genuinamente universal**: un único árbol de código que se adapta a móvil y a un portal web de escritorio real mediante un switch responsive centralizado (`webShell`), sin duplicar navegación ni lógica. Sobre eso hay una capa offline-first de nivel producción, chat en tiempo real robusto, un sistema de diseño propio con auditoría automatizada, y guards de rol que cierran el hueco de seguridad que tenía el análisis anterior.

Las mejoras pendientes son de **optimización incremental** (dashboard agregado, FlashList en 2-3 listas, trocear 2 pantallas grandes, tipado fino), no de arquitectura. Es una base sólida y lista para iterar hacia producción tanto en tienda Android como en web.
