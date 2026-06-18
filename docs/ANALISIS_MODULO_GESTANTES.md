# Análisis completo y plan de mejora — Módulo de Gestantes (VITMATERNA)

**Rol simulado:** Obstetra usando el sistema en su jornada real.
**Alcance:** Backend (`patients`, `clinical`, `education`, `chat`) · Frontend (lista, registro, historia clínica, recomendar contenido, educación) · DB (Prisma).
**Fecha:** análisis sobre el estado actual del repo (rama de sesión).

---

## 0. Resumen ejecutivo (qué está mal y por qué importa)

El módulo **funciona**, pero como obstetra sufro 5 problemas reales:

1. **El registro de nueva gestante miente.** El formulario tiene 4 pasos, pero solo valida 3 campos del paso 1. Puedo "avanzar" sin llenar nada, y la **FUM —marcada como obligatoria con `*`— no se valida**. Resultado: registro pacientes sin la fecha que mueve TODO el cronograma prenatal.
2. **La historia clínica está sobrecargada y plana.** La pestaña *Resumen* apila 4 tarjetas de "filas etiqueta-valor" (hasta ~30 filas) sin jerarquía. Lo crítico (riesgo, anemia, próxima cita, EG) compite visualmente con la ocupación o el código SIS. Cuesta encontrar lo importante de un vistazo.
3. **La búsqueda/filtrado de gestantes es engañosa.** El filtro por riesgo se aplica **solo sobre las páginas ya cargadas** (paginación infinita), así que "Alto riesgo" puede mostrar 0 cuando sí hay pacientes de alto riesgo en páginas no cargadas. El contador "N encontradas" miente.
4. **Recomendar contenido es un callejón sin salida.** Envío un contenido y a la gestante le llega un **texto plano no clickeable** ("entra a la sección Educación…"). No hay previsualización antes de enviar, no es clickeable, no la lleva al contenido. Solo el push (que no existe en web/Expo Go) hace deep-link.
5. **Inconsistencia de diseño grave.** Conviven **dos sistemas de input**: el profesional `AppInput` (animado, con error inline, radio 16) y `TextInput` crudo con estilo `textInput` (sin validación, radio distinto). El registro usa uno; los modales de la historia clínica usan el otro. Botones, chips y headers no siguen un patrón único.

El resto del documento detalla cada hallazgo con archivo/línea y propone solución concreta, priorizada y validable.

---

## 1. Arquitectura y flujo de datos (cómo está hoy)

### 1.1 Backend
```
patients.routes  → patient.controller → patient.service → Prisma → PostgreSQL
  POST /v1/patients            crear (DNI + nombre + apellido)  [mínimo]
  GET  /v1/patients            listar + filtros + predicción inasistencia
  GET  /v1/patients/buscar     buscar por DNI exacto
  GET  /v1/patients/:id        ficha completa + resumenClinico autogenerado
  PATCH /v1/patients/:id       actualizar campos clínicos + recálculo riesgo/IMC/FPP
  PATCH /v1/patients/:id/ubicacion  GPS domicilio
```

Observaciones clave del servicio (`backend/src/modules/patients/patient.service.ts`):
- **El registro es en 2 fases**: `createPatient` (crea `User` + `Gestante` mínima) y luego el frontend hace un `PATCH` con todos los campos clínicos. Esto es frágil: si el `PATCH` falla, queda una gestante "a medias" creada igual (no es transaccional entre las 2 llamadas).
- `createPatient` pone **`fechaNacimiento: new Date('1990-01-01')`** como default si no se envía (línea 187). Eso falsea la edad y, por tanto, el cálculo de riesgo por edad.
- `updatePatient` hace bien lo automático: **IMC** (líneas 536-548), **FPP por regla de Naegele** (515-517), **recálculo de nivel de riesgo** (556-571), y **autogeneración del cronograma de 8 controles** al fijar la FUM (612-633). Buen diseño clínico, mal expuesto en la UI.
- `findAll` calcula **predicción de inasistencia** sin N+1 (incluye appointments/treatments en el include). Bien.

### 1.2 Frontend (capa de mapeo)
`frontend/src/services/api-queries.ts`:
- `mapPatient` (40-61) y `mapPatientProfile` (63-210) **traducen** el modelo backend (español) a un objeto en inglés mixto (`documentNumber`, `riskLevel`, `currentWeek`, `bloodType`…). Esto crea una **capa de traducción doble** difícil de mantener y propensa a desalineación (ej. `partos` vs `partosVaginales`).
- El cálculo de **semana gestacional y trimestre se hace en el cliente** (76-86) y **también en el backend** (`education.service.ts`, `clinicalSummary`) con fórmulas distintas → riesgo de inconsistencia entre pantallas.

### 1.3 DB (modelos relevantes)
- `Gestante` tiene **~70 columnas** (datos personales, antropometría, antecedentes obstétricos, embarazo, exámenes físicos). Modelo "ancho" típico de ficha MINSA.
- **Falta** un modelo de **recomendación de contenido** y de **vistas por gestante** (solo hay `viewsCount` global en `EducationalContent`).
- `Message` **no tiene** `contentId` ni relación con `EducationalContent`, y `TipoMensaje` no tiene variante `educacion` → por eso el contenido recomendado no puede ser una tarjeta clickeable sin migración.

---

## 2. Registro de nueva gestante (`app/(obstetra)/gestante/nueva.tsx`)

### 2.1 Errores funcionales (los más graves)

| # | Problema | Evidencia | Impacto |
|---|----------|-----------|---------|
| R1 | **Solo el paso 1 valida** (`firstName, lastName, dni`). Pasos 2-4 avanzan sin validar. | `nextStep`, líneas 97-108 | Datos basura o vacíos. |
| R2 | **La FUM dice `*` (obligatorio) pero es `z.string().optional()`** y nunca se valida al enviar. | schema l.74 + label l.275 | Registro **sin FUM** ⇒ sin FPP, sin cronograma, sin EG. Es el peor bug clínico del módulo. |
| R3 | **DNI no se verifica en vivo** (duplicado/inexistente). El error 409 sólo aparece tras enviar todo el formulario. | `onSubmit` 116-167 | Llenas 4 pasos y al final "Ya existe". Frustrante. |
| R4 | **Fecha de nacimiento opcional** → backend mete `1990-01-01`. La edad (factor de riesgo) queda falsa. | service l.187 | Riesgo mal calculado. |
| R5 | **No hay manejo de error por campo del backend.** Si el `PATCH` falla, se muestra un `alert` genérico y la gestante ya quedó creada. | `onSubmit` catch 164-166 | Estados inconsistentes. |
| R6 | **Talla pedida en CM con `number-pad`** (l.254) pero el backend/IMC espera metros o convierte por heurística (`talla > 3 ? /100`). Ambiguo: ¿1.58 o 158? | nueva.tsx 254 / api-queries 91 | IMC erróneo según lo que digite la obstetra. |

### 2.2 Errores de diseño / usabilidad

- **La barra de progreso (stepper) es frágil y poco legible.** Usa `position:absolute` con `left:45, width:100` hardcodeados (l.387-394) para las líneas conectoras → en pantallas angostas las líneas se desalinean o se salen. El texto del paso es `overline` 11px sobre gradiente (`rgba(255,255,255,0.7)`) → **bajo contraste**, difícil de leer. No indica "Paso 2 de 4" ni % de avance.
- **Labels EN MAYÚSCULAS sostenidas** (`NOMBRES *`, `TELÉFONO DEL ACOMPAÑANTE`) → grita y reduce legibilidad. El resto de la app usa Title Case.
- **El asterisco `*` es inconsistente**: aparece en algunos labels (NOMBRES *, FUM *) pero el campo no es realmente obligatorio (FUM).
- **Botones "Anterior/Siguiente" con `<` y `>` literales** como texto (l.302, 308) en vez de iconos `ChevronLeft/Right` que ya están importados en otras pantallas. Se ve amateur.
- **Paso 1 sobrecargado** (11 campos) vs pasos 2-4 casi vacíos (2-4 campos). Desbalance: el primer paso intimida y los demás se sienten triviales.
- **El grid dice `formGrid` pero es una columna** (`gap:16`, sin `flexDirection:row`/wrap) → en web/tablet se desperdicia el ancho; todo es una sola columna larga.

### 2.3 Qué datos importan y en qué orden (criterio clínico)

Como obstetra, el orden cronológico/prioritario correcto para registrar es:
1. **Identificación** (DNI ⇒ validar en vivo, Nombres, Apellidos, FechaNac, HC).
2. **Embarazo actual (CRÍTICO y primero, no al final): FUM obligatoria** ⇒ dispara FPP+EG+cronograma. Hoy está en el paso 4 y opcional: invertido.
3. **Antropometría** (peso habitual, talla) ⇒ IMC.
4. **Antecedentes obstétricos** (G-P-C-A) y **grupo/factor** ⇒ riesgo.
5. Contacto/sociales (teléfono, acompañante, dirección, SIS, ocupación) ⇒ secundario.

> **Conclusión:** la FUM debe subir a un lugar prominente y ser obligatoria; el DNI debe validarse al perder foco; y el peso/talla/FechaNac deberían estar antes que datos sociales.

---

## 3. Historia clínica (`app/(obstetra)/gestante/[id].tsx`, 2099 líneas)

### 3.1 Lo bueno (conservar)
- **4 pestañas jerárquicas** (Resumen, Seguimiento, Tratamiento, Clínico) bien pensadas y alineadas a objetivos de tesis.
- **Tarjeta "Resumen clínico" autogenerada** (texto + alertas) — excelente idea, debería ser MÁS protagonista.
- **KPIs glass** (Semana, Trimestre, FPP, IMC) superpuestos al header — buen patrón.
- Acciones de contacto rápido (llamar/WhatsApp) en el header.

### 3.2 Problemas de sobrecarga visual y jerarquía

1. **La pestaña "Resumen" es un muro de filas.** `Datos Personales` solo ya tiene **13 filas** (`Fila` 665-680), + 4 obstétricos + antecedentes + 6 de embarazo. Todo con el mismo peso tipográfico (`bodySmall` gris/`bodySmall` 600). No hay agrupación visual ni iconos por sección. **Es tedioso de escanear.**
2. **Dato más importante enterrado.** El nivel de riesgo es un "pill" pequeño en el header; la anemia solo se ve si entras a la pestaña Clínico. Como obstetra quiero **riesgo + alertas + próxima acción arriba del todo**, siempre visible.
3. **Mezcla de dos lenguajes de UI:**
   - Tarjetas de datos: componente `Fila`/`Seccion` (estilo lista iOS).
   - Modales (Lab, Vacuna, Tratamiento, Embarazo, Antecedente): `TextInput` crudo con `styles.textInput`, **sin validación inline**, distinto del `AppInput` del registro.
   - Resultado: el sistema "se siente" hecho por dos personas distintas.
4. **`Alert.alert` nativo en modales de Lab/Vacuna/Tratamiento** (l.373, 388, 405…) mientras el resto usa `toast`/`AppModal`. Inconsistente y rompe en web.
5. **Selector de "Tipo de examen" duplica el input** (chips + un `TextInput` libre que repite el valor, l.1050-1071) → confuso: ¿elijo chip o escribo?
6. **Botones de acción dispersos.** "Nuevo Control", "Recetar", "Registrar" (vacuna), "Registrar" (lab), "Añadir/Editar" (antecedentes/embarazo) tienen estilos y posiciones distintas (unos `primaryActionBtn`, otros `addChip`). No hay un patrón único de "acción primaria de sección".
7. **Header con 5 iconos glass** (atrás, llamar, WhatsApp, libro, clipboard) sin etiquetas → adivinanza. En 360px se aprietan.
8. **Laboratorio muestra "Pendiente"** para Hb II/III aunque la gestante esté en semana 10 (cuando aún no toca) → ruido.

### 3.3 Qué quiero ver como obstetra (rediseño de jerarquía)

Orden propuesto de la pestaña **Resumen**:
1. **Banner de estado** (siempre arriba): Riesgo (color+texto) · EG · Próxima cita · Alertas activas (anemia, signos de alarma pendientes, exámenes vencidos). Accionable.
2. **Resumen clínico autogenerado** (ya existe) — más grande.
3. **Acordeones colapsables** para el detalle: *Datos personales*, *Obstétricos (G-P-C-A)*, *Embarazo*, *Antecedentes*. Colapsados por defecto excepto Embarazo. Reduce el muro de filas ~70%.

---

## 4. Lista y búsqueda de gestantes (`app/(obstetra)/(tabs)/gestantes.tsx`)

### 4.1 Errores funcionales
- **B1 — Filtro de riesgo solo sobre lo cargado.** `processedPatients` filtra `allPatients` (páginas ya descargadas), no consulta al backend (`usePatientsInfinite` solo manda `search`). El backend **sí soporta** `nivelRiesgo` (`patient.schema.ts`), pero no se usa. ⇒ "Alto riesgo" puede dar 0 falsamente y el contador "N encontradas" es de la muestra cargada, no del total real.
- **B2 — Búsqueda no inclui­r filtros combinados** (estado activa/puerperio, obstetra). El backend lo soporta; la UI no.
- **B3 — `keyExtractor` usa `item.id || item._id`** (Mongo legacy `_id` no existe en este backend Prisma) → herencia muerta, confunde.

### 4.2 Diseño (esto está relativamente bien)
- Búsqueda con debounce 400ms ✅, FlashList ✅, skeletons ✅, badges de riesgo + EG + no-show ✅.
- Mejora: la **barra de progreso del embarazo** (l.192-196) usa `BRAND` plano; sería más útil colorearla por trimestre o por riesgo. Y el % asume 40 semanas fijas.
- Mejora: **chips de filtro** podrían mostrar **conteos** ("Alto 3").

---

## 5. Recomendar contenido educativo (obstetra → gestante)

> Trazado completo del flujo en `docs` (resumen aquí). Backend: `chat.service.recommendContent`.

### 5.1 Cómo funciona hoy
1. Obstetra abre modal (icono libro) en la ficha → busca en catálogo → toca un item → se **envía inmediatamente** (sin confirmación ni previsualización).
2. Backend crea un **`Message` tipo `texto`** con el string `"📘 Tu obstetra te recomienda leer: "X"… Entra a la sección Educación…"` + push con `contentId`.
3. Gestante: en el chat ve **texto plano no clickeable**. Solo el **push** (inexistente en web/Expo Go) hace deep-link a `/(gestante)/educacion/{id}`.

### 5.2 Problemas
- **E1 — No es clickeable en el chat.** El `Message` no lleva `contentId`; `chat.tsx renderMessage` lo pinta como `<Text>`. La gestante tiene que ir a buscarlo a mano.
- **E2 — Sin previsualización.** La obstetra no ve qué le llegará a la gestante antes de enviar. Pediste explícitamente esto.
- **E3 — Deep-link roto fuera de trimestre.** El detalle (`educacion/[id].tsx`) busca el item en la caché `useEducation()` (filtrada por trimestre). Si recomiendo algo de otro trimestre ⇒ "Este contenido ya no está disponible". **No existe `GET /education/:id`.**
- **E4 — `nota` desperdiciada.** El backend acepta una nota personal; la UI nunca la envía.
- **E5 — Sin persistencia ni analítica.** No se guarda "qué recomendé a quién", ni si lo leyó. Solo `viewsCount` global.
- **E6 — Modal sin estados claros** (cargando/vacío como texto suelto), sin agrupar por categoría/trimestre, sin "recomendados para su EG".

### 5.3 Lo que pediste (experiencia objetivo)
> "la gestante recibe en su chat el contenido educativo con un diseño profesional en tiempo real, hace clic y la app la lleva automáticamente a la vista de ese contenido."

Eso requiere: (a) **migración** `Message.contentId` + relación + `TipoMensaje.educacion`; (b) backend setea esos campos; (c) `useChat`/`ChatMessage` propaga `contentId`; (d) **`RecommendedContentCard`** clickeable en el chat que hace `router.push(/educacion/:id)`; (e) **`GET /education/:id`** para que el detalle funcione siempre; (f) emisión socket en tiempo real (ya existe) + fallback.

---

## 6. Módulo de contenido educativo (admin) — `app/(admin)/(tabs)/contenido.tsx`

- **Editor primitivo:** el cuerpo del artículo es un `AppInput multiline numberOfLines={4}` de **texto plano**. Sin Markdown, sin negritas/listas/encabezados/enlaces/imágenes embebidas. Artículos largos = un bloque plano, renderizado como `<Text>` plano en la gestante.
- **Subida de media engañosa:** "Subir imagen (infografía)" usa `POST /chat/upload` (solo imágenes). Para *video/audio* solo sirve URL externa manual.
- **Sin previsualización** de cómo se verá el artículo en la app de la gestante.
- **Numéricos como texto libre** sin min/max en el form (el error solo aparece tras enviar).
- **Sin paginación** (carga todo) ni campo `idioma` (el modelo lo soporta).
- **Tecnología sugerida (React Native / Expo SDK 56):** editor enriquecido ligero (p. ej. **bloques estructurados** — un array de secciones tipo `{tipo: 'parrafo'|'lista'|'imagen'|'video'|'cita', valor}`) renderizados con componentes nativos, en lugar de HTML/WebView. Es más mantenible, accesible y consistente con el design system que un WYSIWYG completo. Para multimedia: `expo-video`/`expo-av` + `expo-image`. Esto moderniza el módulo sin romper RN.

---

## 7. Inconsistencias de diseño transversales (design system)

| Área | Inconsistencia | Debe ser |
|------|----------------|----------|
| Inputs | `AppInput` (registro) vs `TextInput`+`styles.textInput` (modales ficha) | **Solo `AppInput`** en todo formulario. |
| Diálogos | `Alert.alert` nativo vs `toast` vs `AppModal` | **`toast` + `AppModal`/`ConfirmDialog`** siempre. |
| Botones de acción | `primaryActionBtn`, `addChip`, `btnPrimary`, `btnSuccess` | **1 `AppButton`** con variantes (primary/secondary/ghost/danger). |
| Radios | input registro `16`, `textInput` ficha distinto, chips `14` | Tokens `borderRadius` consistentes. |
| Labels | MAYÚSCULAS (registro) vs Title Case (ficha) | **Title Case** en toda la app. |
| Navegación atrás | `<` texto vs `ChevronLeft` icono | **Icono** siempre. |
| Cálculo EG | cliente (api-queries) y backend (varias) divergen | **Una sola fuente** (util compartido o backend). |

El **sistema de color y tipografía** (`theme/colors.ts`, `typography.ts`, `spacing.ts`) sí es sólido y profesional (paleta por rol, semánticos, semáforo de riesgo, grid 8pt). El problema **no es el theme**, sino que los componentes **no lo aplican de forma uniforme**.

---

## 8. Plan de mejora priorizado (con criterios de validación)

### FASE 1 — Correcciones críticas (funcionalidad rota) · ~1-2 días
1. **Registro: validar todos los pasos + FUM obligatoria.**
   - `nextStep` valida los campos del paso actual (no solo el 1).
   - FUM: `z.string().min(1,'La FUM es obligatoria')` + validación de fecha no futura.
   - Validar DNI en vivo (`onBlur`) contra `GET /patients/buscar?dni=` → feedback inmediato.
   - **Validar:** no se puede llegar al paso 4 sin nombres/DNI; no se puede registrar sin FUM; DNI duplicado avisa en el paso 1.
2. **Lista: filtro de riesgo real en backend.**
   - `usePatientsInfinite(search, nivelRiesgo, estado)` → manda el filtro al API. Contador = `total` real.
   - **Validar:** "Alto riesgo" trae TODAS las de alto riesgo (comparar con SQL directo).
3. **Registro transaccional / FechaNac.**
   - Quitar el default `1990-01-01`; exigir FechaNac o calcular edad solo si existe.
   - Si el `PATCH` post-create falla, revertir o reintentar (idealmente endpoint único `POST /patients` que reciba todo).
   - **Validar:** registrar con datos completos en 1 sola operación coherente.

### FASE 2 — Historia clínica: claridad y jerarquía · ~2-3 días
4. **Banner de estado clínico** fijo arriba de "Resumen" (riesgo + EG + próxima cita + alertas accionables).
5. **Acordeones colapsables** para Datos personales/Obstétricos/Antecedentes (Embarazo abierto). Reduce el muro de filas.
6. **Unificar modales a `AppInput` + `toast`** (eliminar `TextInput` crudo y `Alert.alert`). Quitar el doble input del tipo de examen.
7. **Un solo patrón de "acción de sección"** (`AppButton` variante).
   - **Validar:** recorrer las 4 pestañas; cada formulario valida inline; cero `Alert.alert`; jerarquía clara (lo crítico arriba).

### FASE 3 — Recomendar contenido en tiempo real y clickeable · ~2 días
8. **Migración Prisma:** `Message.contentId` (FK nullable a `EducationalContent`) + `TipoMensaje.educacion`.
9. **Backend:** `recommendContent` setea `tipo='educacion'` y `contentId`. Nuevo `GET /education/:id`.
10. **Previsualización antes de enviar** + campo `nota` opcional en el modal del obstetra.
11. **Frontend chat:** `ChatMessage.contentId` propagado; **`RecommendedContentCard`** clickeable → `router.push('/(gestante)/educacion/:id')`; detalle carga por id (no por caché de trimestre).
    - **Validar:** recomiendo → a la gestante le llega una **tarjeta** en el chat en tiempo real (socket) → clic → abre el contenido aunque sea de otro trimestre.

### FASE 4 — Módulo educativo (admin) moderno · ~2-3 días
12. **Editor por bloques** (párrafo/lista/imagen/video/cita) + **previsualización** tipo gestante.
13. Multimedia real (video/audio con `expo-video`/`expo-av`), min/max en numéricos, paginación, campo idioma.
    - **Validar:** crear un artículo con secciones e imagen, previsualizar, publicar, verlo idéntico en la app.

### FASE 5 — Pulido del design system · ~1-2 días
14. Title Case en labels, iconos de navegación, una sola fuente de EG, tokens de radio/espaciado revisados, contraste del stepper.
15. **Stepper rediseñado:** "Paso 2 de 4" + barra de progreso lineal legible (sin `position:absolute` hardcodeado), texto con buen contraste.
    - **Validar:** auditoría visual en 360px / tablet / web; consistencia de inputs/botones/labels.

---

## 9. Validación como diseño final (checklist)
- [ ] Registro: imposible guardar sin FUM; DNI validado en vivo; todos los pasos validan.
- [ ] Lista: filtros de riesgo/estado consultan backend; contador real.
- [ ] Búsqueda en tiempo real (debounce) por nombre/DNI confirmada.
- [ ] Historia clínica: banner de estado arriba; detalle en acordeones; un solo sistema de inputs/diálogos.
- [ ] Recomendar contenido: previsualización + tarjeta clickeable + tiempo real + deep-link robusto.
- [ ] Admin educativo: editor por bloques + previsualización + multimedia.
- [ ] Consistencia: labels, botones, iconos, radios, tipografía y color uniformes en todo el módulo.

---

*Documento de análisis. La implementación se hará por fases, validando cada una antes de pasar a la siguiente.*
