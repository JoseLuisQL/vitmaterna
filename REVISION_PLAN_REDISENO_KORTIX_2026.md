# Revisión del Plan de Rediseño del Frontend — VITMATERNA

> **Documento:** revisión y propuestas de mejora al `PLAN_REDISENO_FRONTEND_2026.md`
> **Autor:** Kortix Agent · **Fecha:** 2026-06-29
> **Método:** lectura del plan + verificación directa del código (mismo clon `main @ aff8eee`).
> Cada afirmación marcada como *verificado* fue comprobada contra el código en esta sesión.

---

## 0. Veredicto general

El plan es **sólido y ejecutable**. Tiene una "Regla de Oro" bien acotada (cero cambios a la lógica
de negocio), una decisión de arquitectura correcta y justificada (NO migrar a shadcn/Tailwind; el
sistema "Clinical Calm" propio es bueno y el problema es de adopción, no de definición), un
fasado lógico y una Definition of Done grep-eable. **No hay que reescribirlo.**

Lo que necesita son **correcciones de hechos, huecos detectados y 3 refuerzos de seguridad**.
La mejora de mayor valor no es estética: es **blindar el refactor "quirúrgico" contra la regresión
visual silenciosa**, que es el riesgo #1 de un refactor que toca 40 pantallas prometiendo "solo
cambiar presentación".

---

## 1. Lo que está bien y NO se toca

- La **Regla de Oro** (§0 del plan): separación `app/` = UI vs `src/services+hooks+store+utils` =
  negocio intocable. Bien delimitada.
- La decisión de **descartar shadcn/ui + Tailwind** (§2.2) y la **investigación de React Bits**
  (§2.3): correctas y bien fundamentadas. No reabrir.
- El **fasado** 0→6 (fundaciones → headers → listas → monolito → pantallas grandes → refinamiento
  → a11y): secuencia lógica.
- La **Definition of Done** (§11) con checks grep-eables: buen patrón.
- El **mapeo ISO 9241 / WCAG 2.2** (§4): completo y correcto en lo conceptual.

---

## 2. Correcciones de hechos al diagnóstico del plan (verificado)

### 2.1 ⚠️ El alcance real es ~1.8× mayor del que el plan asume
El plan repite "26 pantallas" (§0, §1.1, §10, §11). El conteo real en el clon:

```
app/  →  48 archivos .tsx  =  40 pantallas hoja  +  8 _layout
```

Si "26" era un subconjunto (p. ej. "pantallas con header manual"), eso **debe declararse** — porque
las métricas de §1.1 (`10/26`, `18/26`, "69 %") se vuelven ambiguas y, peor, **la estimación de
10–15 días (§10) está calibrada a 26**, no a 40. Consecuencia: el plan probablemente subestima el
esfuerzo de Fase 1 (migración de headers) en ~50 %.

**Acción:** recontar y, si 26 era un subconjunto, reescribir §1.1 como "18 de 40 pantallas con
header manual (45 %)". Recalcular §10 con el alcance real o declarar explícitamente qué pantallas
quedan fuera del refactor.

### 2.2 ⚠️ "0 violaciones de `audit:design`" es una verdad a medias (verificado)
El plan §1.1 y §Apéndice A se apoyan en "`audit:design:strict` → 0 violaciones" para afirmar que los
tokens están bien. Es cierto que hay 0 violaciones **detectadas**, pero el regex R1 del script es

```js
{ id: 'R1', label: 'Color hex literal', re: /#[0-9A-Fa-f]{6}\b/g, blocking: true }
```

…que **solo captura hex de 6 dígitos**. Un `#000` (3 dígitos) real pasa inadvertido. Verificado:

```
app/(obstetra)/(tabs)/cronograma.tsx:559  →  shadowColor: '#000', ...
```

Existe una violación real de R1 que el audit reporta como limpia. El plan confía en un guardrail
que tiene un punto ciego justo en la regla que más protege la "Clinical Calm".

**Acción (añadir a Fase 0.5):** endurecer el regex R1 a
`/#[0-9A-Fa-f]{3}(?![0-9A-Fa-f])|#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{8}\b/g` (cubre 3, 6 y 8 dígitos).
Reemplazar el `#000` por `commonColors.black`. Solo entonces la afirmación "0 violaciones" es fiable.

---

## 3. Hallazgos verificados que el plan NO menciona (huecos)

### 3.1 ⚠️ 4 pantallas admin con el ACENTO DE ROL EQUIVOCADO (alta visibilidad)
El plan trata la consistencia como problema general ("18 variantes de header") pero no detecta el
caso más concreto y visible: en el portal admin el header es slate (`adminColors.primary`), pero
botones/FAB/iconos usan **azul obstetra**:

```
app/(admin)/(tabs)/usuarios.tsx:49    →  const BRAND = obstetraColors.primary
app/(admin)/(tabs)/contenido.tsx:48  →  const BRAND = obstetraColors.primary
app/(admin)/(tabs)/config.tsx:26     →  const BRAND = obstetraColors.primary
app/(admin)/(tabs)/auditoria.tsx:26  →  const BRAND = obstetraColors.primary
```

(Las demás pantallas admin — `index`, `sedes`, `notificaciones`, `perfil`, `supervision/*` — usan
`adminColors.primary` correctamente.) Es exactamente el tipo de inconsistencia que el plan quiere
erradicar, y es trivial de arreglar.

**Acción (nueva Fase 0.0, quick win):** cambiar `BRAND` a `adminColors.primary` en esas 4
pantallas. Es un commit de 4 líneas que ya entrega valor visible antes de tocar nada más.

### 3.2 ⚠️ El "modo oscuro" que el plan da por cumplido está DESHABILITADO
El plan §4.2 lista "Adecuado a individualización → Modo oscuro" como principio ISO satisfecho, y
§5.6/§6.3 dicen "auditar contraste en dark mode". Pero la realidad verificada:

```
src/theme/ThemeContext.tsx:42-57
  const [mode, setModeState] = useState<ThemeMode>('light');
  useEffect(() => { setModeState('light'); }, []);      // fuerza light
  const setMode = (m) => { if (m === 'light') setModeState('light'); };  // descarta dark/system
  const scheme = 'light'; const isDark = false;          // hardcodeado
```

`commonColorsDark` está **completo** y `ThemeToggle` **se renderiza** en la UI (pie de la sidebar
web), pero al pulsarlo `setMode` **silenciosamente ignora** `dark`/`system`. Es decir: hay un toggle
visible que no hace nada — un defecto UX real, no "pulish pendiente". Auditar contraste en un modo
que no se puede activar es trabajo muerto.

**Acción (decisión binaria, añadir a Fase 0):**
- **(a)** Cablear el modo oscuro de verdad (eliminar el forzado a `light`, persistir la preferencia
  en AsyncStorage que ya está escrita, hacer que `ThemeToggle` conmute), **o**
- **(b)** Ocultar/retirar `ThemeToggle` de la sidebar hasta que se cablee, y bajar §4.2/§5.6/§6.3
  a "pendiente" en el plan.

Cualquiera de las dos es correcta; lo que **no** es correcto es dejar el toggle visible-y-muerto y
auditar un modo inalcanzable.

### 3.3 ⚠️ El bundle web son 7.9 MB (contradice el "offline-first" del producto)
Verificado con `expo export -p web`:

```
dist/_expo/static/js/web/index-3ff39eb6...js   →  7.9 MB
```

El README del producto enfatiza **conectividad intermitente y zona rural andina** como requisito
central. Un initial JS bundle de 7.9 MB en el portal web significa first-paint lento justo para los
usuarios con peor conexión. El plan §3.3 habla de "compacidad y fluidez" pero **nada de performance
web / bundle**. `xlsx-js-style` y `xlsx` (ambos pesados) se importan en el raíz y contribuyen
visiblemente.

**Acción (nueva sección §3.7 + tarea de Fase 5):**
- Medir el bundle con `expo export` + `npx @expo/cli bundle-visualizer` (o source-map) y fijar un
  techo (p. ej. < 2 MB initial).
- Lazy-importar `xlsx`/`xlsx-js-style` solo en las pantallas que exportan reportes
  (`React.lazy`/dynamic `import()` en `reportes.tsx`), no en el raíz.
- Code-split por grupo de rol (el bundle de `admin` no debería cargarse para una gestante).
- Esto es coherente con el objetivo clínico del producto, no un capricho de performance.

---

## 4. Refuerzos de seguridad para un refactor "quirúrgico" (las mejoras más importantes)

La promesa del plan es "cambiar solo presentación, comportamiento intacto". Esa promesa es **frágil
sin dos cosas**: pruebas de caracterización antes de mover código, y detección de regresión visual
después de moverlo. Ambas faltan.

### 4.1 🔴 Sin pruebas de caracterización antes de extraer formularios (riesgo de la Regla de Oro)
El plan §3.1 extrae `useLabForm`, `useVaccineForm`, etc. del monolito de 2.804 líneas, y §0 dice "la
mutación se preserva llamada-por-llamada". Pero el monolito tiene **50 `useState`** y un **TODO de
bug de zona horaria** ya anotado en `src/utils/datetime.ts`. Al mover estado a hooks es facilísimo
"arreglar de paso" el bug o cambiar el orden de operaciones sin querer. La salvaguarda del plan
("si un test se rompe, revierte") es **reactiva**: detecta el daño después.

**Acción (nueva Fase 0.17 — caracterización, NO extracción):** antes de tocar `gestante/[id].tsx`,
escribir un test de caracterización por cada modal que **grabe la secuencia exacta** de llamadas a
mutación (endpoint + payload + `dedupeKey` + toast) para los paths happy/error/validación. Estos
tests **describen el comportamiento actual**, no el deseado — incluyendo el bug de timezone. La
extracción de Fase 3 entonces es *provably* behavior-preserving: si el test de caracterización
sigue verde, la Regla de Oro se cumple; si se pone rojo, se cruzó la línea **antes** de mergear.

### 4.2 🔴 Sin baseline ni diff visual automatizado (el riesgo #1 del refactor)
§8 menciona "capturas antes/después" manuales y ad hoc. Para un refactor que toca 40 pantallas, la
regresión visual silenciosa en pantallas **que no se pretendía tocar** es el fallo más probable — y
es exactamente el que una captura manual no detecta porque no miras las pantallas que "no tocaste".

**Acción (nueva Fase 0.18 — baseline visual):**
- Generar un **baseline de capturas** en CI a 2 viewports (390×844 móvil, 1440×900 web) por cada
  ruta, con el **código actual sin tocar**. Es el "estado cero" congelado.
- Tras cada fase, regenerar y hacer un **diff visual** (p. ej. Playwright/agent-browser + pixelmatch,
  umbral de píxeles cambiados). Cualquier diff en una pantalla **no listada en la fase** es un
  bloqueante del commit.
- Esto convierte "solo cambió presentación" de promesa en **medible**. Es el refuerzo de mayor ROI
  de toda esta revisión.

### 4.3 🟡 `audit:design` no comprueba WCAG, solo literales
§6.1/§6.2 dicen "auditar `accessibilityLabel` faltante" y "targets ≥44dp" — pero `audit:design` solo
revisa literales de color/modal/safearea/zindex. La "auditoría a11y" queda manual y por ende
inconsistente entre fases.

**Acción (nueva tarea Fase 0.19 — `audit:a11y.mjs`):** añadir un script de análisis estático
(STL parse de los `.tsx`) que liste:
- `Pressable`/`TouchableOpacity` sin `accessibilityLabel` (o sin `aria-label`).
- `Pressable` sin `hitSlop` **y** sin `width/height` explícitos ≥ `layout.minTouchTarget`.
- (Opcional) `Image`/`expo-image` sin `accessibilityLabel` cuando son informativos.
No hace falta resolverlos todos de golpe; basta con que el contador **baje monótonamente** por fase,
igual que ya hace R1–R6.

---

## 5. Mejoras de secuenciación del plan

### 5.1 🟡 Mover una "espiga" del monolito a Fase 0 (no la extracción, el mapeo)
El monolito `gestante/[id].tsx` (2.804 líneas) es el **mayor riesgo y mayor valor** del refactor,
pero está en Fase 3. Si Fases 0–2 se atrasan (y con el alcance real de 40 pantallas, es plausible),
el monolito **nunca llega a tocarse** — justo lo que más lo necesita. Además es la pantalla con más
entrelazado de lógica de negocio, la más cara de desmembrar.

**Acción:** en Fase 0, añadir una **espiga de caracterización** (no extracción): mapear los 50
`useState`, enumerar las 7 mutaciones y su orden, y escribir los tests de caracterización de §4.1.
La extracción sigue en Fase 3, pero **de-risked**: cuando llegue Fase 3, los tests ya existen y el
mapa mental ya está hecho. Costo: medio día; evita que la Fase más importante quede estrangulada.

### 5.2 🟡 Checklist de migración por pantalla (evita el estado "a medias")
§9 lista "inconsistencia por migración parcial" como riesgo medio, pero la mitigación es solo "una
fase completa todas las pantallas de un rol antes de commit". El fallo clásico en migraciones
`SafeAreaView` → `ScreenLayout` es el **doble safe-area**: si el header manual viejo y el interno
de `ScreenLayout` aplican a la vez, aparece padding doble y nadie lo revisa si la pantalla "ya
estaba migrada".

**Acción (plantilla de migración por pantalla, añadir como apéndice del plan):** para cada pantalla
de Fase 1, una mini-checklist de 5 puntos:
1. ¿Quité `import { SafeAreaView } from 'react-native'`?
2. ¿Quité `LinearGradient` del header?
3. ¿Pasé `role` y `actions` a `ScreenLayout`?
4. ¿Verifiqué que el `StatusBar` ya lo maneja `ThemedStatusBar` del root?
5. ¿Diff visual de esta ruta = 0 en móvil **y** web?

Con eso, "migrada" deja de ser ambigua.

---

## 6. Mejores menores / de higiene

- **6.1 Confirmar que `StartApp/` es solo referencia.** El repo trae `StartApp/` (bundle de diseño
  exportado de Figma, MUI+Radix+Vite, `@figma/my-make-file`). El plan no lo menciona. Una línea que
  diga "StartApp/ es referencia visual, NO se importa en el build" evita que alguien lo consuma por
  error y arrastre MUI/Radix al bundle de RN.
- **6.2 Ventana de i18n.** El plan enfatiza salud-literacy y la app es para zona andina
  (población quechua-hablante) con todo el copy en español hardcodeado. Como el refactor toca la
  composición de **cada** pantalla, es el **momento más barato** de la historia del producto para
  externalizar strings a un catálogo (`es-PE`), aunque no se traduzca todavía. Propongo dejarlo
  como **fase opcional 7** (no bloqueante) para que la decisión quede registrada.
- **6.3 `cambiar-password.tsx` fuera del `AuthLayout`.** §1.1 excluye auth del refactor de headers,
  pero `cambiar-password` (issue #14, flujo de cambio forzado) no usa `ScreenLayout` ni se centra
  en web ancho — depende del passthrough de `WebShell`. Merece el mismo `AuthLayout` compartido que
  `login`, o un `FormScreen`.
- **6.4 Docstrings obsoletos.** `gestanteTheme.ts`/`obstetraTheme.ts` (verificado en análisis
  previo: sus docstrings pre-Clinical-Calm mencionan paletas viejas). Trivial de corregir en Fase 0
  y evita confundir al siguiente que los lea.

---

## 7. Reordenamiento sugerido de Fase 0 (lo que añadir/adelantar)

Fase 0 actual: 0.1–0.16 (fundaciones de tokens + primitivas + reglas de audit). Propuesta de
**Fase 0 ampliada** (sigue siendo 1–2 días, pero blinda el resto):

| # | Tarea | Origen | Impacto |
|---|---|---|---|
| **0.0** | Quick win: `BRAND` → `adminColors.primary` en 4 pantallas admin | §3.1 (nuevo) | Valor visible inmediato |
| **0.5** | Endurecer regex R1 del audit (3/6/8 dígitos); arreglar `#000` | §2.2 (nuevo) | Guardrail real |
| **0.5b** | Decisión binaria modo oscuro: cablear **o** retirar `ThemeToggle` | §3.2 (nuevo) | Quita defecto UX |
| **0.17** | Tests de caracterización de los 7 formularios del monolito | §4.1 (nuevo) | Blinda Regla de Oro |
| **0.18** | Baseline visual + diff por fase (2 viewports × 40 rutas) | §4.2 (nuevo) | Detecta regresión silenciosa |
| **0.19** | `audit:a11y.mjs` (labels + targets) | §4.3 (nuevo) | a11y medible, no manual |
| **0.20** | Espiga de mapeo del monolito (no extracción) | §5.1 (nuevo) | De-riskea Fase 3 |
| 0.1–0.16 | (las del plan original) | plan | sin cambios |

---

## 8. Tabla resumen de mejoras

| # | Mejora | Tipo | Prioridad | Esfuerzo |
|---|---|---|---|---|
| 2.1 | Recontar pantallas (40, no 26) y recalibrar estimación | Corrección de hecho | Alta | 0.5 d |
| 2.2 | Endurecer regex R1 del audit + arreglar `#000` | Corrección de hecho | Alta | 1 h |
| 3.1 | Arreglar `BRAND` equivocado en 4 admin | Hueco detectado | Alta | 1 h |
| 3.2 | Decisión binaria sobre modo oscuro | Hueco detectado | Alta | 0.5–1 d |
| 3.3 | Medir y partir bundle web (techo, lazy xlsx, code-split rol) | Hueco detectado | Alta | 1–2 d |
| 4.1 | Tests de caracterización antes de extraer formularios | Refuerzo de seguridad | Crítica | 1 d |
| 4.2 | Baseline + diff visual automatizado por fase | Refuerzo de seguridad | Crítica | 1 d setup |
| 4.3 | `audit:a11y.mjs` estático (labels + targets) | Refuerzo de seguridad | Media | 0.5 d |
| 5.1 | Espiga de mapeo del monolito en Fase 0 | Secuenciación | Alta | 0.5 d |
| 5.2 | Checklist de migración por pantalla | Secuenciación | Media | 0.5 d |
| 6.x | StartApp/ confirmar, i18n opcional, cambiar-password, docstrings | Higiene | Baja | 0.5 d |

---

## 9. Conclusión

El plan acierta en lo estratégico (consolidar el sistema propio, no migrar de stack) y en lo táctico
(fasado + DoD). Sus debilidades son de **verificación, no de dirección**: (a) confía en un audit con
punto ciego y en un conteo de pantallas bajo; (b) no detecta 3 defectos reales ya presentes en el
código (acento admin equivocado, modo oscuro muerto, `#000` invisible); y (c) promete
"comportamiento intacto" sin los dos mecanismos que vuelven esa promesa medible — pruebas de
caracterización antes de mover formularios y diff visual después de mover pantallas.

Añadir las 7 tareas de la Fase 0 ampliada (§7) convierte el refactor de "quirúrgico por intención"
en **quirúrgico por verificación**. El resto del plan se mantiene.
