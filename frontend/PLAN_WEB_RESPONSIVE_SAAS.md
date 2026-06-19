# PLAN — Refactorización del Entorno Web (Portal SaaS Responsive)

> **Objetivo**: convertir el frontend web de VITMATERNA de una app móvil "centrada en
> una columna estrecha" a un **portal web profesional tipo SaaS** (sidebar fijo,
> layouts multicolumna, tablas densas, contenido a todo el ancho), **sin tocar ni
> romper la experiencia móvil nativa** y **manteniendo idénticos los colores, la
> tipografía y el sistema de diseño** ya existentes.

---

## 0. TL;DR (resumen ejecutivo)

- El código **ya tiene** una base responsive sólida (`responsive.ts`, `ScreenLayout`,
  `AutoGrid`, `AppSidebar`) pero **está infrautilizada**: solo **6 de 46 pantallas**
  usan `ScreenLayout` y solo **1** usa `useResponsive`. El problema de "se ve
  recortado en web" viene de **`MobileFrame`**, que en escritorio encajona TODA la
  app en una columna de **920 px** centrada, y de que la navegación es una **barra
  inferior de tabs (PillTabBar)** + **drawer modal**, patrón 100% móvil.
- La estrategia es **aditiva y por capas**: introducir una "cáscara" web (web shell)
  con **sidebar fijo + topbar** que solo aparece en pantallas anchas (`≥ lg`), y que
  en móvil/nativo **no cambia absolutamente nada**. Todo se decide con un único
  switch (`useResponsive().isWide` + `Platform.OS === 'web'`).
- Se reutiliza el 100% de la lógica (queries, stores, sockets, offline). **Solo se
  reorganiza la presentación.** No se reescribe ninguna pantalla desde cero; se
  migran al molde `ScreenLayout` y se les añaden variantes responsive.
- **Riesgo móvil = cero** porque cada cambio se activa tras una guarda
  `isWeb && isWide`. Si esa condición es falsa (que es siempre en el teléfono), el
  render es exactamente el actual.

---

## 1. Diagnóstico — por qué "se ve recortado" en web

### 1.1 La causa raíz: `MobileFrame`
`app/_layout.tsx` envuelve toda la app en `<MobileFrame>`. En web, cuando la
ventana supera 920 px, ese componente:

```
src/components/ui/MobileFrame.tsx:19   CONTENT_MAX_WIDTH = 920
src/components/ui/MobileFrame.tsx:26   centered = Platform.OS === 'web' && width > 920
```

→ Centra el contenido en una columna de **920 px máximo** sobre un fondo gris. En un
monitor de 1440–1920 px se ve una "tira" móvil centrada con enormes franjas
laterales vacías. Es la sensación de "recortado / app de teléfono estirada".

### 1.2 Navegación 100% móvil
- **`PillTabBar`** (barra inferior flotante) es el navegador principal en los 3 roles.
  En web de escritorio una barra inferior es un antipatrón: el estándar SaaS es un
  **sidebar lateral fijo**.
- **`AppSidebar`** existe pero es un **drawer modal deslizante** (`Modal` + `Animated`)
  que se abre con un botón de menú — patrón móvil. En web debería ser **persistente**.
- Solo 3 ítems por barra; el resto de secciones viven escondidas en el drawer. En web
  hay espacio de sobra para mostrar **toda** la navegación siempre visible.

### 1.3 Pantallas no migradas al molde común
- `ScreenLayout` (la plantilla con header por rol + estados loading/empty/error +
  ancho máximo responsive) **existe y es buena**, pero solo la usan 6 pantallas.
  Las otras 40 montan su propio `SafeAreaView + LinearGradient + ScrollView` a mano,
  con anchos y paddings pensados para móvil.
- `ScreenLayout` ya limita el contenido a `lg: 760 / xl: 900` y lo centra
  (`ScreenLayout.tsx:124`), lo cual **es correcto para lectura pero insuficiente para
  un portal**: en web queremos layouts de **2–3 columnas** (master-detail, dashboard
  grid, tablas anchas), no una sola columna de 900 px.

### 1.4 Componentes que asumen móvil
- **Modales**: `AppModal`, `BottomSheet`, `NuevaCitaModal` usan presentación tipo hoja
  inferior. En web deberían ser **diálogos centrados**.
- **Listas**: `gestantes.tsx`, `usuarios.tsx` usan `FlashList` con tarjetas apiladas
  (1 por fila). En web profesional → **tabla / grid de varias columnas**.
- **Inputs de fecha/hora**, **pickers**, **toasts**, **chat**: pensados para ancho de
  teléfono.

### 1.5 Lo que SÍ está bien y se reutiliza (no se reinventa)
| Activo existente | Estado | Uso en el plan |
|---|---|---|
| `theme/responsive.ts` (`useResponsive`, breakpoints xs→xl, `select`, `isWide`) | Excelente | **Motor del rediseño** |
| `theme/colors.ts` (ice-blue + acento por rol + semánticos + riesgo, claro/oscuro) | Excelente | **Sin cambios** — consistencia garantizada |
| `theme/{spacing,typography,shadows,gradients}.ts` | Bien | Sin cambios |
| `ScreenLayout` (header + estados + maxWidth) | Bien | Se extiende con variantes web |
| `AutoGrid` (grid que auto-calcula columnas) | Bien | Se usa masivamente en web |
| `AppSidebar` (secciones + ítems por rol) | Bien | Se reusa su **data**, se añade modo fijo |
| `SidebarProvider` (define secciones por rol) | Excelente | Fuente única de navegación web |
| Capa de datos (React Query, Zustand, sockets, outbox) | Excelente | **Intacta** |

**Conclusión del diagnóstico**: no hace falta reescribir; hace falta **(a)** sustituir
`MobileFrame` por un *web shell* responsive, **(b)** convertir la navegación en sidebar
fijo en web, y **(c)** migrar las pantallas al molde `ScreenLayout` con variantes de
layout para ancho. Todo activado por `isWide`, todo invisible en móvil.

---

## 2. Principios de diseño del rediseño

1. **Mobile-first intacto, web aditivo.** Ningún cambio altera el árbol que ve un
   teléfono. La condición maestra es:
   ```ts
   const { isWide } = useResponsive();          // width >= 840 (lg)
   const webShell = Platform.OS === 'web' && isWide;
   ```
   Si `webShell === false` → render actual, byte por byte.

2. **Mismo lenguaje visual.** Se prohíben colores, sombras, radios o tipografías
   nuevas fuera de `src/theme/*`. El portal web usa **exactamente** los mismos tokens.
   Solo cambian *densidad* y *disposición*, no la *identidad*.

3. **Una sola fuente de verdad de navegación.** Las secciones del sidebar fijo (web)
   y del drawer (móvil) y de los tabs salen de **un mismo módulo** (`navigation.ts`),
   derivado del actual `SidebarProvider`. Nunca se duplican rutas.

4. **El portal respira.** Anchos de contenido por breakpoint, no fijos:
   `lg: 1024`, `xl: 1280`, `2xl: 1440` (se añade breakpoint `2xl`). Padding lateral
   generoso. Grids de 2–4 columnas. Tablas a todo el ancho del área de contenido.

5. **Densidad adaptable.** En web, tarjetas más compactas, tablas en vez de listas de
   tarjetas, master-detail en vez de navegación apilada cuando aporta.

6. **Accesibilidad y teclado.** En web: foco visible, navegación por teclado en
   sidebar y tablas, `title` de pestaña por ruta, hover states.

---

## 3. Arquitectura objetivo (web)

```
┌───────────────────────────────────────────────────────────────┐
│ TopBar (web)  ── logo · breadcrumb · buscador · notif · perfil │
├───────────┬───────────────────────────────────────────────────┤
│           │                                                     │
│  Sidebar  │   Área de contenido (ScreenLayout en modo "portal") │
│  fijo     │   ┌───────────────────────────────────────────┐   │
│  (web)    │   │ Header de página (título/acciones)         │   │
│  240px    │   ├───────────────────────────────────────────┤   │
│           │   │ Grid responsive / tabla / master-detail     │   │
│  · Inicio │   │ (1 col móvil → 2–4 col web)                  │   │
│  · ...    │   │                                             │   │
│           │   └───────────────────────────────────────────┘   │
└───────────┴───────────────────────────────────────────────────┘
```

- En **móvil/nativo**: NO existe TopBar ni Sidebar fijo. Se mantienen `PillTabBar`
  (abajo) + `AppSidebar` (drawer). Igual que hoy.
- El **switch** vive en un nuevo componente `WebShell` que reemplaza a `MobileFrame`
  en `app/_layout.tsx`:
  - `webShell === false` → `return <>{children}</>` (transparente, = comportamiento
    actual sin el encajonado de 920 px).
  - `webShell === true` → renderiza `Sidebar fijo + TopBar + slot de contenido`.

> Nota técnica: como la navegación es de expo-router (file-based), el `WebShell`
> envuelve el `<Slot/>`/`<Stack/>` y la barra de tabs se **oculta vía CSS/estilo** en
> web ancho (no se desmonta el navegador, para no perder estado). El sidebar fijo
> navega con `router.push` a las mismas rutas.

---

## 4. Sistema responsive — ampliaciones

**Archivo:** `src/theme/responsive.ts` (extensión retrocompatible)

- Añadir breakpoint `xxl: 1536` para monitores grandes (hoy el tope es `xl: 1240`).
- Añadir helpers:
  - `isWeb` (atajo de `Platform.OS === 'web'`).
  - `contentMaxWidth` por bp para el área de contenido del portal.
  - `gutter` (padding lateral del área de contenido) por bp.
- **Tokens de layout web** nuevos en `src/theme/spacing.ts`:
  ```ts
  export const webLayout = {
    sidebarWidth: 248,
    sidebarCollapsedWidth: 72,
    topbarHeight: 64,
    contentMaxWidth: { lg: 1024, xl: 1280, xxl: 1440 },
    contentGutter: { lg: 32, xl: 40, xxl: 48 },
  } as const;
  ```
- Todo esto es **aditivo**: no se modifican firmas existentes.

---

## 5. Plan por fases (incremental, verificable, sin romper móvil)

> Cada fase deja la app **funcionando en móvil y web**, compila (`npm run tsc`) y pasa
> tests (`npm test`). Se commitea por fase.

### FASE 0 — Cimientos responsive (sin cambios visibles)
**Meta:** preparar tokens e infraestructura. Cero cambio visual.
- [ ] 0.1 Extender `responsive.ts` (bp `xxl`, `isWeb`, helpers de ancho/gutter).
- [ ] 0.2 Añadir `webLayout` a `spacing.ts`.
- [ ] 0.3 Crear `src/navigation/menu.ts`: **fuente única** de navegación por rol
      (extrae `SECTIONS` de `SidebarProvider` + define los ítems "primarios" que hoy
      son tabs). Estructura: `{ role, primary: Item[], sections: Section[] }`.
- [ ] 0.4 Refactor `SidebarProvider` para consumir `menu.ts` (sin cambio de UI).
- **Verificación:** `tsc` limpio, app idéntica en móvil y web.

### FASE 1 — Web Shell (el cambio estructural clave)
**Meta:** sustituir el encajonado de 920 px por un portal con sidebar fijo en web ancho.
- [ ] 1.1 Crear `src/components/web/WebSidebar.tsx` — sidebar **persistente** (no modal):
      cabecera con logo + identidad, grupos de `menu.ts`, ítem activo resaltado
      (detecta ruta con `usePathname`), acento por rol, toggle de tema, logout,
      colapsable (full/iconos). **Reutiliza estilos/tokens de `AppSidebar`.**
- [ ] 1.2 Crear `src/components/web/WebTopBar.tsx` — barra superior: botón colapsar,
      breadcrumb/título de sección, buscador global (opcional fase 6), `NotificationBell`,
      menú de usuario (perfil/logout).
- [ ] 1.3 Crear `src/components/web/WebShell.tsx`:
      ```tsx
      if (!isWeb || !isWide) return <>{children}</>;   // móvil/nativo: passthrough
      return <Row><WebSidebar/><Col><WebTopBar/><Content>{children}</Content></Col></Row>;
      ```
- [ ] 1.4 En `app/_layout.tsx`: reemplazar `<MobileFrame>` por `<WebShell>`.
      `MobileFrame` se conserva pero su lógica de 920 px se neutraliza (passthrough);
      o se elimina su uso. (Mantener archivo por compat, marcar deprecado.)
- [ ] 1.5 Ocultar `PillTabBar` cuando `isWeb && isWide` (en `PillTabBar` retornar
      `null` o `height:0` bajo esa guarda — el navegador de tabs sigue montado).
- **Verificación crítica:**
  - Móvil (≤839 px): tabs abajo + drawer, **idéntico**.
  - Web ancho: sidebar fijo a la izq, contenido a todo el ancho, sin franjas vacías.
  - Redimensionar la ventana cruza el breakpoint sin romper estado.

### FASE 2 — `ScreenLayout` modo portal
**Meta:** que el molde común aproveche el ancho en web.
- [ ] 2.1 Añadir a `ScreenLayout` un prop `width?: 'readable' | 'wide' | 'full'`
      (default `readable` = comportamiento actual):
      - `readable` → como hoy (760/900, centrado) para lectura/formularios.
      - `wide` → usa `webLayout.contentMaxWidth` (1024/1280/1440).
      - `full` → 100% del área (tablas, dashboards).
- [ ] 2.2 En web ancho, el header de `ScreenLayout` **no** dibuja el gradiente
      gigante redondeado (eso es estética móvil); en su lugar, header plano y compacto
      con título + acciones (el color de rol pasa al sidebar/topbar). En móvil, se
      mantiene el header con gradiente actual. (Switch por `webShell`.)
- [ ] 2.3 Quitar el espacio inferior del tab bar (`tabBarSpace`) cuando `webShell`.
- **Verificación:** las 6 pantallas que ya usan `ScreenLayout` se ven bien en ambos.

### FASE 3 — Migración de pantallas al molde + grids responsive
**Meta:** las 40 pantallas restantes adoptan `ScreenLayout` y layouts multicolumna.
Se hace **por rol y por prioridad de uso**. Para cada pantalla: envolver en
`ScreenLayout`, sustituir contenedores ad-hoc, y añadir grid responsive con `AutoGrid`
o `useResponsive().select`.

Orden sugerido (de mayor a menor impacto visual):

**3A — Admin (portal administrativo, máxima prioridad)**
- [ ] `(admin)/(tabs)/index.tsx` — Dashboard: KPIs en grid 4-col (xl), panel de
      "obstetras por aprobar" + "estado del sistema" en 2 columnas.
- [ ] `(admin)/(tabs)/usuarios.tsx` (990 líneas) — **lista→tabla**: tabla de usuarios
      con columnas (nombre, DNI, rol, estado, acciones), filtros en barra superior,
      paginación. Modal de detalle → diálogo centrado.
- [ ] `(admin)/supervision/gestantes.tsx` — tabla de gestantes + filtros + riesgo.
- [ ] `(admin)/supervision/citas.tsx` — agenda global en tabla/calendario ancho.
- [ ] `(admin)/supervision/reportes.tsx` — dashboard de gráficos en grid 2–3 col.
- [ ] `(admin)/(tabs)/contenido.tsx` — grid de tarjetas de contenido (3–4 col).
- [ ] `(admin)/(tabs)/{sedes,config,notificaciones,auditoria}.tsx` — forms/listas a
      doble columna donde aplique.
- [ ] `(admin)/avisos.tsx`.

**3B — Obstetra**
- [ ] `(obstetra)/(tabs)/index.tsx` — dashboard clínico en grid.
- [ ] `(obstetra)/(tabs)/gestantes.tsx` — **master-detail**: lista/tabla a la izq +
      ficha a la der en web (en móvil, navegación apilada como hoy).
- [ ] `(obstetra)/gestante/[id].tsx` (2284 líneas, la más grande) — ficha clínica con
      **layout de pestañas laterales o columnas**: datos + controles + labs + riesgo
      visibles sin tanto scroll. **Migración cuidadosa por su tamaño** (ver §7).
- [ ] `(obstetra)/(tabs)/cronograma.tsx` — agenda semanal ancha.
- [ ] `(obstetra)/(tabs)/reportes.tsx`, `(tabs)/chat.tsx` (ver 3D), `gestante/nueva.tsx`,
      `gestante/tamizajes.tsx`, `control/nuevo.tsx`, `atender/[appointmentId].tsx`,
      `mensaje-masivo.tsx`, `(tabs)/perfil.tsx`.

**3C — Gestante** (menos prioridad: su uso real es móvil, pero debe verse bien en web)
- [ ] `(gestante)/(tabs)/{index,citas,tratamiento,educacion,perfil}.tsx`,
      `alarmas.tsx`, `visitas.tsx`, `educacion/[id].tsx`, `notificaciones.tsx`.
      Estrategia: centrar en ancho `readable`/`wide`, grids 2-col para tarjetas.

**3D — Chat (caso especial)**
- [ ] `(obstetra)/(tabs)/chat.tsx` y `(gestante)/(tabs)/chat.tsx` — en web:
      **lista de conversaciones (izq) + hilo (der)** estilo WhatsApp Web/Slack.
      En móvil: como hoy.

**3E — Auth**
- [ ] `(auth)/{login,register,forgot-password}.tsx` — en web: **tarjeta centrada**
      sobre fondo de marca / split-screen (imagen + formulario). En móvil: como hoy.

**Verificación por pantalla:** captura en 390 px (móvil), 1280 px y 1440 px (web).
Sin scroll horizontal. Sin elementos cortados. Toques/click funcionan. `tsc` limpio.

### FASE 4 — Componentes web (densidad profesional)
**Meta:** primitivas que faltan para "sentirse SaaS".
- [ ] 4.1 `src/components/web/DataTable.tsx` — tabla responsive (cabecera fija,
      orden por columna, fila clicable, densidad, estados vacíos/carga). En móvil
      **degrada a lista de tarjetas** (las pantallas pasan los mismos datos).
- [ ] 4.2 Adaptar `AppModal`/`BottomSheet`: en `webShell`, render como **diálogo
      centrado** (overlay + card con max-width); en móvil, hoja inferior como hoy.
- [ ] 4.3 `Breadcrumb` web, `PageHeader` con acciones, `Toolbar` de filtros.
- [ ] 4.4 Toasts: anclar arriba-derecha en web (hoy probablemente centrados/abajo).
- [ ] 4.5 Hover/focus states y cursores (`cursor: pointer`) en web para
      `PressableScale`, `ListItem`, filas de tabla.

### FASE 5 — Pulido visual y consistencia
- [ ] 5.1 Revisar **densidad** global en web (paddings de tarjetas, tamaños de fuente
      — `typography` ya define escala; no inventar tamaños).
- [ ] 5.2 Estados de **scroll**: scrollbars sutiles en web, sticky headers en tablas.
- [ ] 5.3 **Título de pestaña** del navegador por ruta (`<title>`), favicon ya existe.
- [ ] 5.4 Modo oscuro: validar el portal completo en dark (los tokens ya existen).
- [ ] 5.5 **Sidebar colapsable** persistido (recordar estado en `localStorage`).
- [ ] 5.6 Skeletons en layouts web (que el grid no "salte" al cargar).

### FASE 6 — Extras de portal (opcional, valor SaaS)
- [ ] 6.1 Buscador global en TopBar (gestantes/usuarios) con atajo `/`.
- [ ] 6.2 Atajos de teclado básicos.
- [ ] 6.3 Densidad seleccionable (cómoda/compacta) en tablas.

---

## 6. Mapa de archivos (qué se crea / toca)

**Nuevos**
```
src/navigation/menu.ts                  Fuente única de navegación por rol
src/components/web/WebShell.tsx         Switch + layout portal
src/components/web/WebSidebar.tsx       Sidebar fijo
src/components/web/WebTopBar.tsx        Barra superior
src/components/web/DataTable.tsx        Tabla responsive (degrada a tarjetas)
src/components/web/PageHeader.tsx       Header de página + acciones + breadcrumb
src/components/web/index.ts             Barrel
```

**Modificados (aditivo / guardado por `webShell`)**
```
app/_layout.tsx                         MobileFrame → WebShell
src/theme/responsive.ts                 bp xxl, isWeb, helpers
src/theme/spacing.ts                    webLayout
src/components/ui/PillTabBar.tsx        ocultar en web ancho
src/components/layout/ScreenLayout.tsx  prop width + header plano web
src/components/layout/SidebarProvider.tsx  consumir menu.ts
src/components/ui/AppModal.tsx          diálogo centrado en web
src/components/ui/BottomSheet.tsx       diálogo centrado en web
app/**/**.tsx                           migración progresiva (Fase 3)
```

**Sin tocar (garantía de no-regresión)**
```
src/theme/colors.ts  ·  typography.ts  ·  shadows.ts  ·  gradients.ts
src/services/*  ·  src/store/*  ·  src/hooks/*  ·  src/database/*  ·  src/utils/*
Toda la lógica de negocio, queries, sockets y offline.
```

---

## 7. Gestión de riesgos

| Riesgo | Mitigación |
|---|---|
| Romper la app móvil | **Toda** rama web va tras `Platform.OS === 'web' && isWide`. En móvil la condición es falsa → render actual. Verificación obligatoria a 390 px por fase. |
| `gestante/[id].tsx` (2284 líneas) | Migrar al final de 3B, en su propia rama de trabajo, paso a paso (primero envolver en `ScreenLayout`, luego columnas). Tests + captura antes/después. |
| Pérdida de estado al cruzar breakpoint | No desmontar navegadores; ocultar tab bar con estilo, no condicional de montaje. |
| Modales que asumen móvil | Adaptar `AppModal`/`BottomSheet` una sola vez (Fase 4) → beneficia a todas las pantallas. |
| Inconsistencia de color/tipografía | Prohibido introducir tokens fuera de `theme/*`. Revisión en cada PR. |
| Web-only APIs | Ya hay ramas web/nativo (SecureStore, SQLite, geo, push). No se tocan. |
| Regresión silenciosa | `npm run tsc` (hoy **limpio**) + `npm test` (hoy **44/44 verdes**) en cada fase como gate. |

---

## 8. Definición de "Hecho" (Done)

Una pantalla está terminada cuando, **sin cambiar su comportamiento móvil**:
1. Usa `ScreenLayout` (o el molde acordado) y los tokens de `theme/*`.
2. En web (1280 y 1440 px): aprovecha el ancho, sin franjas vacías, sin scroll
   horizontal, sin elementos recortados, con la disposición multicolumna definida.
3. En móvil (390 px): **idéntica a la versión actual** (captura comparada).
4. Compila (`tsc`) y pasa tests; sin warnings nuevos de consola.
5. Modo claro y oscuro correctos.

El **proyecto** está terminado cuando: las 46 pantallas cumplen Done, el WebShell es
estable, `DataTable` y modales web están integrados, y la navegación por sidebar fijo
funciona en los 3 roles con la identidad de color intacta.

---

## 9. Estimación y secuencia de entrega (commits)

| Fase | Alcance | Entregable |
|---|---|---|
| 0 | Cimientos | tokens + `menu.ts` (sin cambio visual) |
| 1 | WebShell + Sidebar/TopBar | **portal navegable** en web; móvil intacto |
| 2 | `ScreenLayout` portal | molde ancho listo |
| 3A | Admin (8 vistas) | portal admin completo |
| 3B | Obstetra (11 vistas) | portal clínico completo |
| 3C | Gestante (10 vistas) | gestante en web pulido |
| 3D-E | Chat + Auth | casos especiales |
| 4 | DataTable + modales web | densidad SaaS |
| 5 | Pulido + dark + colapsable | calidad final |
| 6 | Extras (opcional) | buscador/atajos |

Cada fila = uno o varios commits pequeños, cada uno dejando la app funcionando.

---

## 10. Primer paso propuesto

Arrancar por **Fase 0 + Fase 1** (cimientos + WebShell), porque es el cambio que
**elimina de inmediato** la sensación de "app recortada" y deja el portal navegable
con sidebar fijo, **sin tocar todavía** el interior de las pantallas. Es el mayor
salto visual con el menor riesgo. Tras validar 0+1 en móvil y web, se entra a la
Fase 2 y a la migración por roles (Fase 3), empezando por **Admin**.
