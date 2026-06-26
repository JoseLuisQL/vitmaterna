# Plan — Tours guiados completos para Obstetra y Admin (VITMATERNA)

> Llevar los recorridos de **obstetra** y **admin** al mismo nivel "100% + diseño
> limpio" que ya tiene la gestante: cobertura completa por módulo, navegación
> entre pantallas, y spotlight que funciona **igual en web y en móvil**.
> Stack: Expo SDK 56 · expo-router · reanimated · react-native-svg · zustand.

---

## 1. Diagnóstico (estado actual)

El **motor del tour ya es role-agnostic** y funciona para los tres roles
(`TourHost`, `TourTooltip`, `TourSpotlight`, `useTourTarget`, `tourController`,
`useRestartTour`, persistencia `useOnboarding`). Lo que falta es **contenido y
anclajes** para obstetra/admin, más **corregir un bug en web**.

| Problema | Detalle | Severidad |
|---|---|---|
| **A. Stubs de 4 pasos** | `obstetra.steps.ts` y `admin.steps.ts` solo resaltan 2 tarjetas del dashboard y cierran. No enseñan la app. | Alta |
| **B. Spotlight roto en web (obstetra)** | En `(obstetra)/(tabs)/index.tsx` los refs `obstetraKpis`/`obstetraRisk` solo se anclan en `renderHeader()` (rama móvil/FlatList, L83/L96). La rama `webShell` (L166-280) re-renderiza KPIs y riesgo **sin** refs → en escritorio no resalta nada. | Alta |
| **C. Sin anclajes en módulos** | Gestantes, agenda, reportes, usuarios, contenido, etc. no tienen `useTourTarget`. | Alta |
| **D. `adminPending` condicional** | El target apunta a la tarjeta "cuentas por aprobar" que solo existe si `pendientes > 0`. Sin pendientes, el paso cae a "centrado". | Media |
| **E. Target huérfano** | `TOUR_TARGETS.navChat` está definido pero no se usa en ninguna pantalla. | Baja |

---

## 2. El reto técnico central: ramificación `webShell`

La mayoría de pantallas de obstetra/admin renderizan **dos árboles JSX
distintos** (`if (webShell) return <tablaDensa/> ; return <listaMóvil/>`). Un
mismo `useRef` **no puede montarse en las dos ramas a la vez**, así que un ref
puesto en la rama móvil **no existe en web** (causa exacta del bug B).

### Solución adoptada: **un id de target por intención, anclado condicionalmente**

Para cada elemento a resaltar se usa **un solo `targetId`** (un solo paso en el
tour), pero el `ref` se coloca en **la rama activa** según `webShell`:

```tsx
const kpisTarget = useTourTarget(TOUR_TARGETS.obstetraKpis);
// …
{webShell ? (
  <View ref={kpisTarget} collapsable={false}>{/* KPIs web */}</View>
) : (
  // en móvil el mismo ref va en renderHeader()
)}
```

Como solo una rama se monta a la vez, el `useRef` único es válido en ambas: el
registro global `id → ref` siempre apunta al nodo visible. Esto **no** duplica
pasos ni ids; es el patrón que ya usa bien `admin/index.tsx` (rama única) y el
que hay que extender a las pantallas que ramifican.

> Pantallas de **rama única** (no ramifican): `obstetra/reportes`,
> `admin/index`, `admin/config`, `admin/notificaciones` → un ref sirve para
> ambos shells, sin condicional. Las demás requieren anclar en ambas ramas.

---

## 3. Contenido de los recorridos (anclado a elementos reales)

Textos en voz activa, claros y por rol (mismas reglas que gestante). Cada paso
usa `navigateTo` para ir al módulo y resalta su elemento clave **una sola vez**.

### 3.1 Obstetra (acento azul `#2C6EA8`) — 8 pasos

| # | Ruta (`navigateTo`) | Target (nuevo id) | Elemento real | Texto (resumen) |
|---|---|---|---|---|
| 1 | `(obstetra)/(tabs)` | — (centrado) | Bienvenida | "Tu panel para acompañar a tus gestantes. Te mostramos lo esencial." |
| 2 | `(obstetra)/(tabs)` | `obstetraKpis` *(fix web)* | Fila de 3 KPIs | "Tu día de un vistazo: citas de hoy, pacientes y alertas." |
| 3 | `(obstetra)/(tabs)` | `obstetraRisk` *(fix web)* | Tarjeta de riesgo | "El semáforo de riesgo de tus gestantes (bajo/medio/alto)." |
| 4 | `…/gestantes` | `obstetraGestantes` | Buscador + filtros (web: tabla; móvil: header) | "Busca por nombre o DNI y filtra por nivel de riesgo." |
| 5 | `…/gestantes` | `obstetraNuevaGestante` | `webCreateBtn` (web) / `fab` (móvil) | "Registra una nueva gestante desde aquí." |
| 6 | `…/cronograma` | `obstetraAgenda` | Tabla "Acciones" (web) / lista (móvil) | "Tu agenda: atiende, reprograma o marca inasistencia." |
| 7 | `…/reportes` | `obstetraReportes` | AutoGrid KPIs + exportar | "KPIs clínicos y MINSA, con exportación a Excel y PDF." |
| 8 | `…/chat` | `obstetraChat` | Lista + mensaje masivo | "Conversa con tus gestantes o envía un aviso masivo." |
| 9 | `(obstetra)/(tabs)` | — (centrado) | Cierre | "¡Listo! Explora con calma; vuelve a este recorrido desde tu perfil." |

### 3.2 Admin (acento slate `#3C5168`) — 8 pasos

| # | Ruta (`navigateTo`) | Target (nuevo id) | Elemento real | Texto (resumen) |
|---|---|---|---|---|
| 1 | `(admin)/(tabs)` | — (centrado) | Bienvenida | "El panel de control del sistema. Te mostramos lo esencial." |
| 2 | `(admin)/(tabs)` | `adminPending` *(robustecer)* | Tarjeta "cuentas por aprobar" **o** fallback KPIs | "Aprueba aquí las cuentas pendientes (obstetras y gestantes)." |
| 3 | `(admin)/(tabs)` | `adminKpis` | AutoGrid 4 KPIs | "El pulso del sistema: usuarios, gestantes, riesgo y citas del día." |
| 4 | `…/usuarios` | `adminUsuarios` | Buscador + crear (web/móvil) | "Crea, edita y aprueba todas las cuentas del sistema." |
| 5 | `…/contenido` | `adminContenido` | Buscador + crear | "Publica y gestiona el contenido educativo de las gestantes." |
| 6 | `…/notificaciones` | `adminNotif` | Tarjetas SMS / WhatsApp (rama única) | "Estado y configuración de los canales SMS y WhatsApp." |
| 7 | `…/config` | `adminConfig` | Secciones de parámetros (rama única) | "Ajusta límites, parámetros clínicos y el modo mantenimiento." |
| 8 | `(admin)/(tabs)` | — (centrado) | Cierre | "¡Listo! Reportes, sedes y auditoría están en el menú. Explora con calma." |

> Las rutas de supervisión (reportes/sedes/auditoría) se mencionan en el cierre
> en vez de añadir más pasos, para mantener el recorrido corto (regla: ≤8 pasos
> útiles, igual que gestante).

---

## 4. Cambios por archivo

### 4.1 `src/components/tour/steps/targets.ts` (editar)
Añadir los nuevos ids y eliminar el huérfano `navChat`:
```ts
// Obstetra
obstetraKpis, obstetraRisk,                 // ya existen
obstetraGestantes, obstetraNuevaGestante,   // nuevos
obstetraAgenda, obstetraReportes, obstetraChat,
// Admin
adminKpis, adminPending,                    // ya existen
adminUsuarios, adminContenido, adminNotif, adminConfig,  // nuevos
```

### 4.2 `src/components/tour/steps/obstetra.steps.ts` (reescribir)
Recorrido de 9 pasos del cuadro 3.1, con `navigateTo`, `label`, `platform`
implícito `both`. Mismo estilo depurado que `gestante.steps.ts`.

### 4.3 `src/components/tour/steps/admin.steps.ts` (reescribir)
Recorrido de 8 pasos del cuadro 3.2.

### 4.4 Anclaje de refs en pantallas

**Obstetra**
- `(obstetra)/(tabs)/index.tsx` — **fix B**: anclar `kpisTarget`/`riskTarget`
  también en la rama `webShell` (envolver KPIs web L172-177 y riesgo web
  L188 en `<View ref={…} collapsable={false}>`).
- `(obstetra)/(tabs)/gestantes.tsx` — `obstetraGestantes` en buscador
  (header móvil L90 / contenedor web), `obstetraNuevaGestante` en `webCreateBtn`
  (L303) y en `fab` (L344), condicional por rama.
- `(obstetra)/(tabs)/cronograma.tsx` — `obstetraAgenda` en la `DataTable`/columna
  acciones (web L318) y en la `SectionList`/segmentos (móvil L428).
- `(obstetra)/(tabs)/reportes.tsx` — `obstetraReportes` en el `AutoGrid` (L213).
  **Rama única**, un solo ref.
- `(obstetra)/(tabs)/chat.tsx` — `obstetraChat` en el contenedor de lista
  (master-detail web L320 / lista móvil), condicional.

**Admin**
- `(admin)/(tabs)/index.tsx` — **fix D**: si `pendientes === 0`, mover el target
  `adminPending` a un elemento siempre visible (p. ej. el bloque "Estado del
  sistema") o reutilizar `adminKpis`. Estrategia: el paso declara `targetId`
  dinámico — más simple: anclar `pendingTarget` a la tarjeta cuando existe y, si
  no, el motor ya hace fallback a "centrado" (aceptable); pero mejor anclar un
  ref alterno en el bloque "Resumen".
- `(admin)/(tabs)/usuarios.tsx` — `adminUsuarios` en buscador + crear
  (`webCreateBtn` L641 / `fab` L701), condicional.
- `(admin)/(tabs)/contenido.tsx` — `adminContenido` en buscador + crear
  (`webCreateBtn` L440 / `addBtn` L488), condicional.
- `(admin)/(tabs)/notificaciones.tsx` — `adminNotif` en `summaryRow` (L162).
  **Rama única**, un solo ref.
- `(admin)/(tabs)/config.tsx` — `adminConfig` en la primera sección (L124).
  **Rama única**, un solo ref.

### 4.5 `useRestartTour.ts` (sin cambios)
Ya navega al home del rol antes de lanzar; los `navigateTo` de cada paso hacen el
resto. Las entradas "Conoce tu app" en Perfil y Sidebar ya existen para los 3 roles.

---

## 5. Diseño (idéntico a gestante, ya rediseñado)

No se crea UI nueva: se reutilizan `TourTooltip` (cabecera ligera, contador N/M,
barra segmentada) y `TourSpotlight` (doble anillo con halo que respira) tal como
quedaron en el commit `c980d5f`. Solo cambia el **acento por rol** (lo resuelve
`TourHost` automáticamente desde `colors[role].primary`): azul obstetra, slate
admin. Se respetan tokens del sistema, `reduce-motion`, AA y áreas táctiles ≥48.

---

## 6. Casos límite

1. **Target en otra rama (web/móvil)** → anclaje condicional (sección 2). Si aun
   así no se mide tras 12 reintentos, el motor muestra el paso centrado (no rompe).
2. **`pendientes === 0` (admin)** → ref alterno en "Resumen"/KPIs (fix D).
3. **Listas vacías** (sin gestantes/citas) → el buscador/header y los botones de
   crear siguen montados, así que el target existe igualmente.
4. **Navegación lenta** → `TourHost` ya espera `NAV_SETTLE_MS` + reintentos de
   medición tras `navigateTo`.
5. **Reduce-motion / cierre a mitad** → ya cubiertos por el motor.

---

## 7. Plan de implementación (incremental, con verificación)

Cada fase termina con `npm run tsc` + `node scripts/audit-design.mjs --strict` +
`npx jest` en verde, y prueba E2E en navegador (login del rol + recorrido completo).

1. **Fase 1 — Fix web obstetra (bug B)** + targets nuevos en `targets.ts`.
2. **Fase 2 — Obstetra**: anclar refs en gestantes/cronograma/reportes/chat +
   reescribir `obstetra.steps.ts` (9 pasos). E2E obstetra.
3. **Fase 3 — Admin**: fix D + anclar refs en usuarios/contenido/notificaciones/
   config + reescribir `admin.steps.ts` (8 pasos). E2E admin.
4. **Fase 4 — QA**: recorrer los 2 roles en web (1440px) y móvil (390px);
   a11y, reduce-motion, skip/resume; `npm run verify`. Commit + push.

### Entregables
- 2 archivos de pasos reescritos + `targets.ts` ampliado.
- Ediciones de anclaje en ~9 pantallas (refs + `collapsable={false}`).
- 0 dependencias nuevas. 0 cambios de backend. Diseño ya existente.

### Riesgos y mitigaciones
| Riesgo | Mitigación |
|---|---|
| Ref no se mide en una rama | Anclaje condicional por `webShell` (patrón sección 2). |
| `audit:design` bloquea por hex | Usar solo tokens desde el inicio (ya validado en gestante). |
| Doble montaje del mismo `useRef` | Solo una rama monta a la vez; nunca anclar el mismo ref en ambas ramas simultáneamente. |
| Recorrido demasiado largo | Tope de 8 pasos útiles; supervisión se menciona en el cierre. |

---

## 8. Resumen ejecutivo

- **Motor**: ya listo y compartido; no se toca.
- **Obstetra**: corregir spotlight web (bug B) + recorrido de 9 pasos por todos
  los módulos (gestantes, agenda, reportes, chat).
- **Admin**: robustecer `adminPending` (fix D) + recorrido de 8 pasos (usuarios,
  contenido, notificaciones, config).
- **Técnica clave**: anclaje condicional de refs por `webShell` para pantallas
  que renderizan dos árboles JSX.
- **Diseño**: reutiliza el tooltip/spotlight ya rediseñados; solo cambia el
  acento del rol. Sin deps nuevas, sin backend.

> Pendiente de tu visto bueno para ejecutar la **Fase 1–2 (obstetra)** y
> mostrarte el resultado en vivo antes de seguir con admin.
