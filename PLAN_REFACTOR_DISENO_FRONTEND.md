# Plan de Refactorización del Diseño — Frontend VITMATERNA

> Objetivo: convertir un frontend funcional pero **visualmente inconsistente** en un **sistema de diseño único, predecible y profesional**, idéntico en intención en web y móvil, sin cambiar la identidad de marca.
>
> **Restricciones inquebrantables (lo que NO se toca):**
> - **Paleta:** se conserva ice-blue + acento por rol (gestante `#7468C4`, obstetra `#4A90D9`, admin `#3D5A80`) y los semánticos/riesgo ya definidos en `theme/colors.ts`.
> - **Tipografía:** se conserva **Inter** (4 pesos) y la escala de `theme/typography.ts`.
> - **Alineaciones y tokens de espacio:** se conserva el grid de 8pt (`theme/spacing.ts`) y `webLayout`.
> - **Funcionalidad:** cada pantalla queda 100% funcional tras su refactor. Cero regresiones (lo prueba `tsc` + jest + visual).
>
> Este plan **no rediseña la marca**: la disciplina. La meta es que dos pantallas cualesquiera se vean hechas por la misma mano.

---

## 0. Diagnóstico cuantificado (auditoría del código actual)

Medido sobre el repo (33 pantallas, ~16.5k líneas en `app/`). Esto es lo que sustenta cada fase:

| # | Falencia | Evidencia (medida) | Severidad |
|---|---|---|---|
| 1 | **Modales inconsistentes** | `AppModal` existe pero conviven 3 patrones: `AppModal` (10 archivos), `<Modal>` RN crudo (5 componentes), `ProfileInfoModal`/`EmergencyAlert` con su propio chrome. **`BottomSheet` existe pero se usa en 0 pantallas.** | Alta |
| 2 | **Formularios inconsistentes** | `AppInput`+RHF+zod solo en **7** pantallas; **17** usan `TextInput` crudo con estilos locales. Solo **6** manejan teclado (`KeyboardAvoidingView`), ninguna con scroll-aware. | Alta |
| 3 | **Toasts poco precisos** | `useToast` en 20 archivos **pero** persisten **4 `Alert.alert`** nativos (rompen el lenguaje visual). Copys de toast sin convención (título/acción). | Media |
| 4 | **Esqueletos parciales** | Skeleton en **17** pantallas, pero **12** todavía usan `ActivityIndicator` suelto como carga principal. No hay 1:1 skeleton↔contenido. | Alta |
| 5 | **Headers duplicados** | **14 pantallas** reimplementan su propio header con `LinearGradient`+`SafeAreaView`+estilos `headerWrapper/headerTopRow` en vez de `ScreenLayout`. | Alta |
| 6 | **Plantilla no universal** | **10 pantallas** no usan `ScreenLayout` (incluye `gestante/[id]`, `atender`, `control/nuevo`, `tamizajes`, las 3 de auth, notificaciones). | Alta |
| 7 | **Hardcodeo** | **67 `rgba(...)` crudos** y hexes sueltos fuera de tokens; estilos repetidos en **35 `StyleSheet.create`** locales. | Media |
| 8 | **Componentes monolíticos** | `gestante/[id].tsx` = **45 `useState`** / 2.287 líneas; `tamizajes` 26; `usuarios` 21. Re-renders amplios, difícil mantener consistencia. | Media |
| 9 | **Botones mixtos** | `AppButton` en 18 archivos vs `TouchableOpacity` "como botón" en 31 → tamaños/alturas/estados de foco distintos. | Media |
| 10 | **Sin QA visual** | 66 tests unit/lógica, **0 pruebas de render de pantallas, 0 visuales, 0 a11y.** Nada impide que una pantalla se rompa visualmente. | Alta |

> Conclusión: **las primitivas existen y son buenas; el problema es adopción desigual.** El refactor es 20% crear/mejorar componentes y 80% **migrar pantallas a usarlos** con una checklist estricta y tests que lo blinden.

---

## 1. Principios rectores del refactor (la "constitución" visual)

Toda decisión se mide contra estos 7 principios. Si una pantalla los cumple, está lista.

1. **Una sola plantilla.** Toda pantalla nace de `ScreenLayout` (móvil + web). Nadie dibuja su propio header.
2. **Tokens, nunca literales.** Cero `#hex` y cero `rgba()` en `app/`. Todo color sale de `theme/`. Toda medida sale de `spacing`.
3. **Una primitiva por intención.** Un botón = `AppButton`. Un campo = `Field`. Un modal = `AppModal`/`BottomSheet`. Una carga = `Skeleton`. Un aviso = `useToast`.
4. **Estado = diseño.** Cada pantalla define explícitamente sus 4 estados: **cargando (skeleton 1:1), vacío, error, contenido.** Ninguno improvisado.
5. **Misma jerarquía en web y móvil.** El contenido y su orden no cambian; cambia el *contenedor* (tabla vs tarjetas, sidebar vs tabs). La decisión la toma `webShell`, nunca estilos sueltos.
6. **Ritmo vertical fijo.** Separaciones entre secciones siempre desde una escala (`stack` tokens). Se acaban los `marginBottom: 14/18/22` arbitrarios.
7. **Accesible por defecto.** Touch target ≥48, foco visible en web, `accessibilityRole/Label`, contraste AA, `reduce motion` respetado.

---

## 2. Arquitectura del sistema (capas y herencia)

```
NIVEL 0 — Tokens            theme/  (color, type, spacing, shadow, radius, motion, z-index*)
        ↓ se consumen en
NIVEL 1 — Primitivas        components/ui/  (AppButton, Field, AppCard, AppModal, BottomSheet,
                                              Skeleton, AppBadge, StatusChip, EmptyState…)
        ↓ se componen en
NIVEL 2 — Patrones          components/patterns/*  (FormSheet, ConfirmSheet, ListScreen,
                                                     DetailScreen, FormScreen, SectionCard)
        ↓ se usan en
NIVEL 3 — Plantillas        components/layout/ScreenLayout  (única envoltura de pantalla)
        ↓ instancian
NIVEL 4 — Pantallas         app/**  (solo composición + datos; cero estilos de chrome)
```

*Nuevos tokens a crear (mínimos, no rompen nada):*
- `theme/zIndex.ts` — escala única (`base/dropdown/sticky/overlay/modal/toast`) para acabar con los `zIndex: 9999/10/1` sueltos.
- `theme/motion.ts` — formaliza duraciones/curvas ya usadas (180/220ms, spring) + helper `prefersReducedMotion`.
- `spacing.stack` — tokens semánticos de ritmo vertical (`stack.xs…stack.xl`) que envuelven los valores actuales (no cambian píxeles, dan nombres).

---

## FASE 0 — Cimientos (tokens y reglas) · *base de todo*

> Sin esto, migrar pantallas solo mueve el desorden. Primero se cierra el vocabulario.

### 0.1 Auditoría automatizada y barandillas (lint)
- Añadir reglas ESLint que **prohíban en `app/`**: literales `#hex`/`rgba()`, `import { Modal } from 'react-native'`, `Alert.alert`, `ActivityIndicator` como carga de pantalla, `SafeAreaView` desde `react-native`.
- Script `npm run audit:design` que liste cualquier violación (la tabla de §0 como test de no-regresión).

### 0.2 Completar/normalizar tokens (sin cambiar valores existentes)
- `theme/zIndex.ts`, `theme/motion.ts`, `spacing.stack` (nuevos, aditivos).
- `theme/index.ts`: exportarlos por el barrel.
- Documentar en cabecera de `colors.ts` la **regla de uso** (acento solo en CTA/estado activo/datos; superficies = `surface`; jerarquía = sombra).

### 0.3 Contrato de la primitiva (definición de "terminado")
Cada primitiva debe: (a) consumir solo tokens, (b) tener props `accessibilityLabel`/`testID`, (c) estados `default/pressed/hover(web)/disabled/loading`, (d) foco visible en web, (e) test de render + snapshot.

**Entregable Fase 0:** tokens cerrados, lint activo, `audit:design` en verde-base. *Riesgo: nulo (aditivo).*

---

## FASE 1 — Primitivas: arreglar y completar · *del más pequeño al más grande*

Orden deliberado: primero los átomos que más se repiten.

### 1.1 Tipografía y texto — `AppText` (átomo base)
- Hacer `AppText` la **única** vía de texto (`variant` = claves de `typography`; `color` = claves de token; `weight`/`align` opcionales).
- Beneficio: elimina `fontFamily/fontSize` sueltos y unifica `lineHeight` (hoy hay parches `lineHeight:'normal'` en web dentro de `ScreenLayout`).
- Migración mecánica posterior por pantalla.

### 1.2 Campo de formulario — `Field` (resuelve falencia #2)
Problema: `AppInput` está atado a React Hook Form (`control` obligatorio) → por eso 17 pantallas usan `TextInput` crudo.
- Crear **`Field`** desacoplado (modo controlado simple **y** modo RHF) con anatomía fija: `label → control → helper/error`.
- Variantes hermanas con la **misma anatomía y altura (52)**: `TextField`, `SelectField`, `DateField` (envuelve `DateTimeField`), `TextAreaField`, `SearchField` (el de las toolbars web/móvil), `StepperField`/`NumberField`.
- Estados unificados: `default/focus(borde acento 2px)/error(rojo + mensaje)/disabled`.
- `AppInput` queda como adaptador RHF sobre `Field` (no se rompe lo existente).

### 1.3 Botón — `AppButton` (resuelve falencia #9)
- Confirmar matriz: `variant` (primary/secondary/outline/ghost/danger) × `size` (sm/md/lg) × `tone` (acento por rol vía `themeColor`).
- Añadir `IconButton` (los `TouchableOpacity` redondos de headers/acciones) y `LinkButton` (los "Ver todos"/"Ver reportes").
- **Regla:** ningún `TouchableOpacity` que se comporte como botón puede quedar sin envolver en una de estas 3. Foco visible web obligatorio.

### 1.4 Overlays — `AppModal` + activar `BottomSheet` (resuelve falencia #1)
- **Política clara:**
  - **Móvil:** entradas de datos/menús contextuales → **`BottomSheet`** (hoy 0 usos). Confirmaciones cortas → `ConfirmSheet`.
  - **Web:** lo mismo se presenta como **`AppModal`** centrado (≤440px).
  - Crear **`Overlay`** (patrón) que elige `BottomSheet` (móvil) vs `AppModal` (web) automáticamente según `webShell`, con la **misma API** → una sola forma de abrir "una superficie modal".
- Migrar los 5 `<Modal>` crudos (`AppSidebar`, `EmergencyAlert`, `ProfileInfoModal` mantienen su chrome especializado pero **heredan tokens, header y animación** de `AppModal`).
- Anatomía única de modal: `header(title+subtitle+close) → body(scroll) → footer(acciones)`. Footer siempre con `AppButton`s, orden `[secundaria][primaria]`.

### 1.5 Avisos — Toast + Confirm (resuelve falencia #3)
- Eliminar los **4 `Alert.alert`** → `useToast` o `ConfirmSheet`.
- Mejorar `ToastProvider`: **cola** (hoy reemplaza el toast anterior), tipos con copy estandarizado, posición ya correcta (móvil arriba / web arriba-derecha 380px). Mantener `onPress` (deep-link).
- **Convención de copy** (de la skill de diseño): título = resultado en pasado y voz activa ("Cita confirmada"), no "Éxito"; el verbo del botón se conserva en el toast (botón "Publicar" → "Publicado"); errores sin disculpas, dicen qué pasó y cómo seguir.

### 1.6 Carga — `Skeleton` 1:1 (resuelve falencia #4)
- Crear **skeletons de dominio** que calquen el contenido real: `PatientCardSkeleton`, `AppointmentRowSkeleton`, `KpiRowSkeleton`, `ChatBubbleSkeleton`, `DetailHeaderSkeleton`, `TableSkeleton`, `FormSkeleton`.
- **Regla:** `ActivityIndicator` solo para *micro-cargas en línea* (botón enviando, "cargando más" de scroll infinito). La carga de **pantalla** siempre es skeleton vía `ScreenLayout loading` o el patrón correspondiente.

### 1.7 Datos y estado — chips, badges, vacíos
- Unificar `AppBadge`/`StatusChip`/`RiskIndicator`/`DiagnosisPill`: misma altura, radio, tipografía; mapa **único** estado→variante (p.ej. riesgo Alto→`danger`) en un helper, para que no se repita el `if riskLevel === 'Alto'` en cada pantalla.
- `EmptyState` con CTA: todo vacío "invita a actuar" (de la skill: la pantalla vacía es una invitación).

**Entregable Fase 1:** librería `components/ui` + `components/patterns` cerrada, documentada y testeada. *Riesgo: bajo (aditivo + adaptadores).*

---

## FASE 2 — Patrones de pantalla (Nivel 2) · *los "moldes" reutilizables*

Para que migrar 33 pantallas no sea reinventar 33 veces, se crean 4 patrones que cubren el 90% de los casos. Cada pantalla se reescribe como instancia de uno.

### 2.1 `ListScreen` (listas: gestantes, citas, usuarios, contenido, notificaciones…)
- Encapsula: header (`ScreenLayout`), toolbar (search + filtros + acción primaria), y **render dual automático**: `FlashList` de tarjetas (móvil) ↔ `DataTable` (web). Estados loading(skeleton de lista)/empty/error incluidos.
- Entrada: `data`, `columns` (web), `renderCard` (móvil), `filters`, `onCreate`. Una pantalla de lista pasa de ~500 líneas a ~120.

### 2.2 `DetailScreen` (ficha gestante, detalle educación, atender cita)
- Header de detalle (avatar/título/estado + acciones), cuerpo en `SectionCard`s, soporte de tabs internos (`ToggleTabs`/`PillTabBar`), y **slots de modales** desacoplados.
- Resuelve el monolito `gestante/[id]`: cada sección clínica (laboratorios, vacunas, controles…) → su propio `SectionCard` + su `Overlay` de edición. Estado por sección, no 45 `useState` globales.

### 2.3 `FormScreen` / `FormSheet` (alta/edición: gestante nueva, control nuevo, sedes, config, tamizajes)
- `FormScreen` (pantalla completa) y `FormSheet` (en overlay) comparten motor: RHF + zod, `Field`s, **manejo de teclado** (scroll-aware en todas), barra de acciones fija (`[Cancelar][Guardar cambios]`), validación inline y resumen de errores.
- Unifica los 17 formularios crudos a una sola anatomía.

### 2.4 `DashboardScreen` (inicio gestante/obstetra/admin)
- KPIs en `AutoGrid`, secciones en `SectionCard`, layout 2-columnas en web / apilado en móvil (ya existe el patrón en obstetra; se extrae y se aplica a los 3).

**Entregable Fase 2:** 4 patrones + skeletons asociados, con tests de render. *Riesgo: bajo.*

---

## FASE 3 — Migración de pantallas (Nivel 4) · *el grueso, por oleadas*

Cada pantalla pasa por la **misma checklist de migración** (la "Definición de Terminado" por pantalla):

```
[ ] Usa ScreenLayout (header, ancho, estados) — sin header propio
[ ] 0 hex / 0 rgba / 0 StyleSheet de chrome (solo estilos de contenido)
[ ] Botones = AppButton/IconButton/LinkButton (foco visible web)
[ ] Campos = Field/* (teclado manejado, error inline)
[ ] Overlays = AppModal/BottomSheet vía Overlay
[ ] Avisos = useToast / ConfirmSheet (0 Alert.alert)
[ ] 4 estados: skeleton 1:1 / vacío con CTA / error con reintento / contenido
[ ] Web y móvil verificados (webShell): tabla↔tarjetas, sidebar↔tabs
[ ] a11y: roles, labels, target ≥48, contraste AA
[ ] Copys revisados (voz activa, sentence case, consistentes)
[ ] tsc limpio + test de render verde + screenshot web y móvil aprobados
```

**Orden por oleadas** (de mayor impacto/uso a menor; cada oleada se mergea y verifica antes de seguir):

| Oleada | Pantallas | Patrón | Por qué primero |
|---|---|---|---|
| **A. Auth** | login, register, forgot-password | FormScreen | Primer contacto; hoy sin `ScreenLayout`; rápido y muy visible |
| **B. Dashboards** | gestante/index, obstetra/index, admin/index | DashboardScreen | Pantalla de aterrizaje de cada rol |
| **C. Listas núcleo** | obstetra/gestantes, cronograma, gestante/citas, admin/usuarios, contenido | ListScreen | Mayor superficie de inconsistencia (headers propios + tabla/tarjeta) |
| **D. Formularios** | gestante/nueva, control/nuevo, sedes, config, tamizajes | FormScreen/Sheet | 17 inputs crudos viven aquí |
| **E. Detalle** | obstetra/gestante/[id], atender/[appointmentId], educacion/[id] | DetailScreen | El monolito; se trocea aquí |
| **F. Chat** | gestante/chat, obstetra/chat | (especial) | Header propio + listas; skeletons de burbuja |
| **G. Notificaciones/avisos/visitas/perfil/reportes/alarmas** | resto | mixto | Cierre de cola |

> Cada pantalla migrada queda **funcional y completa** (datos reales, navegación, mutaciones) — no se entrega a medias.

**Entregable Fase 3:** 33/33 pantallas conformes a la checklist.

---

## FASE 4 — Pulido transversal y micro-interacción · *quitar el "último accesorio"*

> Principio de restraint: un solo gesto memorable, todo lo demás callado. No saturar de animación (delata diseño autogenerado).

- **Motion unificada:** entrada de pantalla (fade/slide ya en Stack), aparición de modal (scale 0.96→1, 180ms — ya en `AppModal`), press de botón (spring — ya en `AppButton`). **Nada nuevo gratuito.**
- **Un gesto de marca** (la "firma"): el indicador *pill* animado del tab bar (móvil) y el indicador activo del sidebar (web) son el mismo lenguaje → reforzarlos como sello, con `reduce motion` que los hace instantáneos.
- **Superposiciones (#7):** aplicar `theme/zIndex.ts` a tab bar, toast, modales, banner offline, FAB → fin de los `zIndex` mágicos y FABs que tapan contenido (revisar `tabBarSpace` en todas las listas).
- **Densidad web vs móvil:** revisar paddings por breakpoint con `webLayout` (gutters) para que web no se vea "móvil estirado".
- **Pasada de copy global:** títulos, botones, toasts, vacíos y errores con la guía de escritura (voz activa, sentence case, mismo verbo en acción→resultado).

---

## FASE 5 — Testing de frontend (QA que blinda el rediseño)

> Hoy: 66 tests de lógica/utilidades, **0 de pantallas/visual/a11y**. Sin esto, la consistencia se vuelve a degradar en el primer PR. Se construye una **red de seguridad en 4 capas**.

### 5.1 Capa 1 — Render & estados (jest + @testing-library/react-native) *(ya instalado)*
- Por cada pantalla migrada: test que renderiza los **4 estados** (loading/empty/error/contenido) con datos mockeados (React Query con `QueryClient` de test).
- Asserts de presencia: header correcto, skeleton en carga, `EmptyState` con su CTA, mensaje de error con "Reintentar".
- Meta: **1 test de pantalla por cada una de las 33.**

### 5.2 Capa 2 — Contrato de primitivas (snapshots dirigidos)
- Cada primitiva (`AppButton`, `Field`, `AppModal`, `Skeleton`, `AppBadge`…) con snapshot por variante/estado. Un cambio de estilo no intencional rompe el snapshot.

### 5.3 Capa 3 — Accesibilidad
- Tests que verifican `accessibilityRole`/`Label` en botones/campos/modales y `accessibilityState` (disabled/selected).
- Auditoría manual con checklist a11y por oleada (target, foco, contraste con tabla de colores ya existente en `theme.test.ts`).

### 5.4 Capa 4 — Visual / QA navegador (skill `agent-browser`)
- **Smoke visual reproducible:** levantar `expo start --web`, recorrer cada ruta por rol y **capturar screenshot web + móvil (viewport estrecho)**; comparar contra una baseline aprobada (regresión visual ligera).
- **Guion por oleada:** login → dashboard → lista → abrir overlay → formulario → toast → detalle. Verifica que el render dual (tabla/tarjeta, sidebar/tabs) y los overlays se ven limpios.
- Registrar hallazgos en un `DESIGN_QA_LOG.md` (memoria de lo probado, para no repetir).

### 5.5 Puerta de calidad (CI local antes de cada merge de oleada)
```
npm run tsc          # 0 errores
npm run test         # unit + render + a11y verdes
npm run audit:design # 0 violaciones de tokens/primitivas
agent-browser smoke  # screenshots aprobados (web + móvil) de la oleada
```
Ninguna oleada se da por cerrada sin las 4 en verde.

---

## 6. Gobernanza para que NO se vuelva a desordenar

- **AGENTS.md / CONTRIBUTING:** "toda pantalla usa un patrón de Nivel 2/3; cero estilos de chrome; cero literales de color". 
- **PR template** con la checklist de migración (§Fase 3).
- **`audit:design` en pre-commit** (bloquea literales nuevos).
- **Storybook-lite opcional** (galería de primitivas vía una ruta `_dev` web) para revisar el sistema de un vistazo.

---

## 7. Cronograma y secuenciación (dependencias)

```
Fase 0 (tokens+lint)  ──►  Fase 1 (primitivas)  ──►  Fase 2 (patrones)
                                                          │
                                                          ▼
                                   Fase 3 oleadas A→G (migración)  ◄─►  Fase 5 (tests por oleada)
                                                          │
                                                          ▼
                                                  Fase 4 (pulido) ──► 6 (gobernanza)
```

| Fase | Esfuerzo relativo | Resultado verificable |
|---|---|---|
| 0 Cimientos | S | `audit:design` corre; tokens nuevos exportados |
| 1 Primitivas | M | `Field`, `Overlay`, `IconButton`, skeletons de dominio + snapshots |
| 2 Patrones | M | 4 `*Screen`/`*Sheet` con tests |
| 3 Migración | L (el grueso) | 33 pantallas conformes, por oleadas mergeables |
| 4 Pulido | S | z-index/motion/copy unificados |
| 5 Testing | M (continuo) | red de 4 capas + puerta de calidad |
| 6 Gobernanza | S | lint pre-commit + PR template |

> Cada oleada de Fase 3 es **entregable independiente**: se puede mergear, ver en producción y revertir aislada. No hay "big bang".

---

## 8. Criterios de aceptación globales (cómo sabremos que está logrado)

1. **0** literales `#hex`/`rgba()` en `app/`; **0** `Alert.alert`; **0** `<Modal>` RN crudo en pantallas; **0** `SafeAreaView` desde `react-native`.
2. **33/33** pantallas pasan la checklist de migración.
3. **`BottomSheet`/Overlay** usado donde corresponde (móvil) — ya no en 0 pantallas.
4. **Carga = skeleton 1:1** en todas las pantallas; `ActivityIndicator` solo en micro-cargas.
5. **`tsc` limpio**, **tests verdes** (unit + render + a11y), **`audit:design` en 0**, **screenshots web+móvil aprobados** por rol.
6. Dos pantallas cualesquiera del mismo rol son **indistinguibles en chrome** (header, espaciado, botones, modales, toasts).
7. **Marca intacta:** misma paleta, misma tipografía Inter, mismas alineaciones de 8pt. La app se siente **más ordenada, no diferente.**

---

### Anexo — Nuevos componentes/archivos que crea el plan (resumen)
- Tokens: `theme/zIndex.ts`, `theme/motion.ts`, `spacing.stack`.
- Primitivas: `Field` (+ `TextField/SelectField/DateField/TextAreaField/SearchField/NumberField`), `IconButton`, `LinkButton`, `Overlay`, `ConfirmSheet`, skeletons de dominio.
- Patrones: `ListScreen`, `DetailScreen`, `FormScreen`, `FormSheet`, `DashboardScreen`, `SectionCard`.
- QA: `scripts/audit-design`, tests de pantalla (×33), snapshots de primitivas, guion `agent-browser`, `DESIGN_QA_LOG.md`.
- Gobernanza: regla ESLint de tokens, PR template, hook pre-commit.

*Todo lo anterior es aditivo o sustituye 1:1 con adaptadores: en ningún punto del plan la app queda no funcional.*
