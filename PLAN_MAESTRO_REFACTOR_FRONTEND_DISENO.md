# Plan maestro de refactor de diseño frontend — VITMATERNA

> Objetivo: convertir el frontend en un sistema visual profesional, minimalista, limpio, preciso y ordenado para web y móvil, sin perder la identidad clínica-prenatal de VITMATERNA.

---

## 1. Decisión de diseño: sujeto, audiencia y trabajo principal

**Sujeto concreto:** VITMATERNA, plataforma de cuidado prenatal digital para gestantes rurales andinas y obstetras del Centro de Salud Talavera.

**Audiencias:**

- **Gestante:** necesita claridad, confianza, calma y acciones simples: cita, tratamiento, alarma, chat.
- **Obstetra:** necesita velocidad clínica, priorización de riesgo y registro sin fricción.
- **Administrador:** necesita control, orden operativo y supervisión del sistema.

**Trabajo principal del frontend:** que cada persona sepa, en menos de 5 segundos, qué requiere atención ahora y cuál es el siguiente paso seguro.

El diseño no debe verse como un dashboard genérico de salud. Debe sentirse como una libreta clínica prenatal modernizada: limpia, sensible, rigurosa y humana.

---

## 2. Diagnóstico base observado

El proyecto ya tiene una buena base: tokens en `frontend/src/theme`, primitivas en `frontend/src/components/ui`, patrones en `frontend/src/components/patterns`, `ScreenLayout`, `WebShell`, `DataTable`, `RoleGuard`, `PillTabBar` y auditoría estricta de diseño.

Pero todavía hay deuda de orden visual y estructural:

| Problema | Evidencia | Impacto |
|---|---|---|
| Pantallas muy grandes | `app/(obstetra)/gestante/[id].tsx` tiene más de 2700 líneas; `app/(admin)/(tabs)/usuarios.tsx` supera 1100 | difícil mantener consistencia |
| Patrones existentes no usados de forma uniforme | `ListScreen`, `FormScreen`, `DetailScreen` existen, pero varias pantallas reimplementan listas/toolbars | sensación de pantallas de distintas épocas |
| Modo oscuro incompleto | `ThemeContext.tsx` fuerza modo claro | riesgo de prometer una experiencia parcial |
| Web y móvil a veces duplican estructura | ramas manuales por `webShell` en varias pantallas | divergencia funcional y visual |
| Algunos errores se silencian | chat gestante captura error y retorna `null` | UX sin guía clara |
| Diseño funcional pero aún poco distintivo | paleta y layout son limpios, pero falta una firma visual propia | puede sentirse correcto pero no memorable |

---

## 3. Dirección visual propuesta

### Concepto: “libreta prenatal viva”

VITMATERNA debe parecer una herramienta clínica nacida del control prenatal, no una plantilla SaaS. La metáfora visual central será una **línea de cuidado gestacional**: una cinta/pulso que conecta semanas, citas, tratamientos, alertas y decisiones clínicas.

Esta línea reemplaza adornos genéricos. Sirve para estructurar información real: avance del embarazo, prioridad clínica, continuidad del tratamiento y secuencia de atención.

### Firma visual única

**La cinta prenatal.**

Un trazo fino, suave y clínico que aparece de forma distinta según contexto:

- En gestante: avance de semana + próxima cita + toma diaria.
- En obstetra: línea de prioridad entre cita → control → laboratorio → tratamiento.
- En admin: línea de estado operativo entre usuarios → contenido → canales → auditoría.

No es decoración: codifica continuidad y seguimiento.

### Riesgo estético justificado

**Reducir los gradientes grandes de cabecera y trasladar la identidad al sistema de línea/cinta.**

Hoy el gradiente por rol funciona, pero puede sentirse común en apps móviles. El riesgo es hacer la interfaz más sobria y dejar que la personalidad viva en una marca estructural propia. Justificación: VITMATERNA es salud prenatal; la confianza viene de precisión, no de brillo visual.

---

## 4. Token system propuesto

> Restricción actual del repo: `frontend/AGENTS.md` indica que no se cambia paleta, Inter ni grid 8pt. Por eso este plan no rompe la marca; la ordena y añade tokens semánticos derivados.

### 4.1 Color

| Token propuesto | Hex | Uso |
|---|---:|---|
| `materna.paper` | `#F7F8FA` | fondo base actual, sensación limpia |
| `materna.surface` | `#FFFFFF` | tarjetas y paneles |
| `materna.ink` | `#232A33` | texto principal |
| `materna.gestante` | `#7468C4` | acento gestante |
| `materna.obstetra` | `#4A90D9` | acento obstetra |
| `materna.admin` | `#3D5A80` | acento administrador |

Semánticos de riesgo se conservan:

- verde: bajo / normal.
- ámbar: atención / seguimiento.
- rojo: urgencia / riesgo alto.

Regla: el color de rol se usa para foco, acción primaria, navegación activa y la cinta prenatal. No se usa para pintar superficies completas salvo casos puntuales.

### 4.2 Tipografía

Base obligatoria actual: **Inter**.

Propuesta compatible:

| Rol tipográfico | Fuente | Tratamiento |
|---|---|---|
| Display clínico | Inter Display simulado con Inter 700/800, tracking -1%, line-height cerrado | títulos de pantalla y datos clave |
| Body | Inter 400/500 | lectura, formularios, mensajes |
| Utility/data | Inter 600, tabular numbers | fechas, DNI, semanas, presión, Hb, métricas |

Opción futura, solo si se acepta actualizar la regla de marca: añadir una fuente display muy restringida para logotipo/hero institucional, no para UI operativa. Por ahora, el plan mantiene Inter para no romper la puerta de calidad.

### 4.3 Espaciado y forma

- Grid base: 8pt.
- Radio:
  - tarjetas: 20–24.
  - inputs: 14–16.
  - chips: full pill.
  - overlays: 28 móvil / 24 web.
- Densidad:
  - móvil: respiración amplia, una tarea por bloque.
  - web: más densidad, pero no “tabla administrativa vieja”.

### 4.4 Movimiento

Una sola familia de movimiento:

- aparición de pantalla: mínima.
- overlays: slide/scale corto.
- cinta prenatal: transición suave cuando cambia estado.
- reduce motion: sin animación, solo cambio de estado.

---

## 5. Wireframes conceptuales

### 5.1 Gestante móvil — “hoy importa esto”

```text
┌─────────────────────────┐
│ Hola, Ana        🔔  ☰   │
│ Semana 24              │
│ ── cinta prenatal ───●──│
│                         │
│ Próxima cita            │
│ Mar 24 · 10:00          │
│ [Confirmar asistencia]  │
│                         │
│ Tratamiento de hoy      │
│ 1 pendiente             │
│ [Marcar como tomado]    │
│                         │
│ ¿Algo no está bien?     │
│ [Reportar alarma]       │
└─────────────────────────┘
```

### 5.2 Obstetra web — agenda como centro operativo

```text
┌────────────┬──────────────────────────────────────────────┐
│ Sidebar    │ Agenda de hoy                     Perfil 🔔  │
│ Inicio     │ ── cinta clínica: cita → control → cierre ── │
│ Gestantes  │                                              │
│ Agenda ●   │ Filtros        Buscar gestante       + Cita  │
│ Alertas    │                                              │
│ Chat       │ ┌────────────┬──────────┬──────────┬──────┐ │
│ Más        │ │ Hora       │ Gestante │ Riesgo   │Acción│ │
│            │ │ 10:00      │ Lucía    │ Alto     │Atender││
│            │ └────────────┴──────────┴──────────┴──────┘ │
└────────────┴──────────────────────────────────────────────┘
```

### 5.3 Admin web — consola sobria

```text
┌────────────┬──────────────────────────────────────────────┐
│ Sidebar    │ Sistema VITMATERNA                           │
│ Usuarios ● │ Usuarios pendientes                          │
│ Contenido  │ [3 cuentas por aprobar]                      │
│ Supervisión│                                              │
│ Sistema    │ Usuarios ─ Contenido ─ Canales ─ Auditoría   │
│ Seguridad  │    ok        ok        prueba      activo     │
└────────────┴──────────────────────────────────────────────┘
```

---

## 6. Crítica contra defaults genéricos

| Riesgo de plantilla | Decisión corregida |
|---|---|
| Fondo crema + serif + terracota | descartado; no pertenece a salud prenatal andina digital y rompería tokens |
| Dark SaaS con acento neón | descartado; no transmite confianza clínica para gestantes |
| Broadsheet con líneas duras | descartado; demasiado editorial, poco táctil para móvil |
| Dashboard de KPIs con tarjetas genéricas | se reemplaza por tareas por rol y cinta de continuidad |
| Gradientes como identidad principal | se reducen; la identidad vive en estructura y estado |

Resultado: el diseño sigue siendo minimalista, pero no neutro. Tiene una tesis propia: continuidad prenatal como interfaz.

---

## 7. Arquitectura de refactor propuesta

```text
theme/
  colors.ts          tokens existentes + aliases semánticos
  spacing.ts         grid 8pt + stack tokens
  typography.ts      escala formal de UI clínica
  motion.ts          duraciones y reduce motion
  zIndex.ts          capas oficiales

components/ui/
  AppText
  AppButton / IconButton / LinkButton
  Field family
  AppCard
  AppBadge / StatusChip / RiskIndicator
  SkeletonLoader
  Overlay / BottomSheet / AppModal

components/patterns/
  DashboardScreen
  ListScreen
  DetailScreen
  FormScreen
  FormSheet
  SectionCard
  PrenatalRibbon

components/layout/
  ScreenLayout
  RoleGuard
  SidebarProvider
  WebShell

app/
  pantallas = composición + datos
```

Nueva pieza clave: `PrenatalRibbon`, la cinta visual de continuidad. Debe ser primitiva/patrón, no CSS repetido.

---

## 8. Plan por fases

### Fase 0 — Baseline y congelamiento visual

**Objetivo:** saber exactamente qué existe antes de mover piezas.

Tareas:

- Ejecutar baseline: `npm run tsc`, `npm run audit:design:strict`, `npm test`.
- Crear capturas web y móvil de: login, dashboard por rol, lista principal por rol, ficha gestante, agenda, chat, formulario.
- Congelar una lista de rutas reales por rol.
- Definir checklist de pantalla terminada.

Entregables:

- `DESIGN_QA_LOG.md` actualizado.
- matriz de rutas y estado visual.
- baseline de screenshots.

Criterio de cierre:

- no se modifica UI todavía.
- baseline reproducible.

---

### Fase 1 — Tokens y contrato visual

**Objetivo:** cerrar el vocabulario visual antes de migrar pantallas.

Tareas:

- Consolidar tokens semánticos derivados: `surface`, `paper`, `ink`, `roleAccent`, `clinicalLine`, `focusRing`.
- Formalizar `spacing.stack` para ritmo vertical.
- Revisar `typography.ts` con escala estricta:
  - `screenTitle`
  - `sectionTitle`
  - `body`
  - `caption`
  - `metric`
  - `clinicalValue`
- Confirmar `motion.ts` y `zIndex.ts` como única fuente.
- Documentar reglas de uso de color:
  - no pintar toda una pantalla con el color del rol.
  - no usar rojo salvo alerta real.
  - una acción primaria por pantalla.

Entregables:

- tokens completos.
- guía corta de uso visual en `frontend/AGENTS.md` o documento de diseño.

Criterio de cierre:

- `audit:design:strict` verde.
- no hay literales nuevos.

---

### Fase 2 — Primitivas impecables

**Objetivo:** que cada átomo sea profesional antes de reconstruir vistas.

Tareas:

- `AppText`: uso obligatorio para texto nuevo.
- `AppButton`: variantes completas, foco web visible, loading, disabled, iconos.
- `Field`: reemplazar inputs crudos por familia consistente:
  - `TextField`
  - `NumberField`
  - `SelectField`
  - `DateField`
  - `TextAreaField`
  - `SearchField`
- `AppCard`: variantes `default`, `interactive`, `clinical`, `warning`.
- `StatusChip` y `RiskIndicator`: mapa único de estados.
- `SkeletonLoader`: skeletons 1:1 por dominio.
- `Overlay`: decide `BottomSheet` en móvil y `AppModal` en web.

Entregables:

- catálogo de primitivas.
- tests por variante.

Criterio de cierre:

- ningún botón/campo/modal nuevo se crea fuera de primitivas.

---

### Fase 3 — Patrones de pantalla

**Objetivo:** convertir pantallas en composición, no en estilos sueltos.

Patrones a consolidar:

| Patrón | Uso |
|---|---|
| `DashboardScreen` | inicio gestante, obstetra, admin |
| `ListScreen` | gestantes, citas, usuarios, contenido, sedes, auditoría |
| `DetailScreen` | ficha gestante, detalle educación, atender cita |
| `FormScreen` | nueva gestante, control, registro, configuración |
| `FormSheet` | crear/editar dentro de lista |
| `SectionCard` | bloques clínicos y administrativos |
| `PrenatalRibbon` | firma visual de continuidad |

Entregables:

- patrones testeados.
- ejemplos reales aplicados a 1 pantalla piloto por rol.

Criterio de cierre:

- una pantalla piloto de cada rol migrada sin romper funcionalidad.

---

### Fase 4 — Navegación e información por rol

**Objetivo:** que cada rol tenga una arquitectura clara y diaria.

#### Gestante

Tabs recomendados:

1. Inicio
2. Citas
3. Tratamiento
4. Chat
5. Más

Más contiene: educación, perfil, visitas, notificaciones, ayuda.

Reglas:

- Reportar alarma es flujo único, accesible desde Inicio y Chat.
- Educación no debe quedar escondida como ruta secundaria invisible.
- Tratamiento concentra adherencia y progreso.

#### Obstetra

Tabs recomendados:

1. Agenda
2. Gestantes
3. Alertas
4. Chat
5. Más

Más contiene: reportes, mensaje masivo, perfil.

Reglas:

- La agenda es el centro operativo.
- Tocar una cita debe abrir ficha o flujo de atención.
- Alertas debe estar visible por seguridad clínica.

#### Admin

Tabs recomendados:

1. Inicio
2. Usuarios
3. Contenido
4. Supervisión
5. Sistema

Sistema contiene: sedes, configuración, canales, auditoría, backup.

Reglas:

- Aprobaciones pendientes arriba.
- Configuración técnica se nombra por lo que la persona controla: “Canales de notificación”, no “webhook config”.

Entregables:

- menú por rol actualizado.
- rutas visibles y secundarias documentadas.

Criterio de cierre:

- toda tarea crítica está a máximo 2 taps/clicks desde el home del rol.

---

### Fase 5 — Migración visual por oleadas

**Objetivo:** migrar sin desordenar ni romper.

| Oleada | Pantallas | Prioridad |
|---|---|---|
| A | Login, registro, recuperar contraseña, cambiar contraseña | primera impresión |
| B | Dashboards de gestante, obstetra, admin | home por rol |
| C | Listas: gestantes, citas, usuarios, contenido | mayor superficie UI |
| D | Formularios: nueva gestante, control, sedes, config | precisión y validación |
| E | Ficha clínica gestante | mayor deuda técnica |
| F | Agenda y atender cita | flujo clínico crítico |
| G | Chat, notificaciones, alarmas, visitas, perfil, reportes | cierre transversal |

Checklist por pantalla:

- Usa `ScreenLayout` o patrón equivalente.
- Cero colores literales.
- Cero `TextInput` crudo si existe `Field` aplicable.
- Cero botón improvisado si existe `AppButton/IconButton/LinkButton`.
- Estados: loading, empty, error, content.
- Web y móvil verificados.
- Foco visible en web.
- Área táctil mínima 48px.
- Copy activo y claro.
- Test o captura QA.

---

### Fase 6 — Ficha clínica y flujo “Atender cita”

**Objetivo:** convertir el corazón del obstetra en una experiencia guiada.

Trabajo sobre `app/(obstetra)/gestante/[id].tsx`:

- Extraer secciones:
  - `PatientSummarySection`
  - `PregnancyDataSection`
  - `ControlsSection`
  - `LabsSection`
  - `TreatmentsSection`
  - `VaccinesSection`
  - `DangerSignsSection`
  - `HomeVisitsSection`
  - `OptionalScreeningsSection`
- Cada sección usa `SectionCard`.
- Cada creación/edición usa `FormSheet`.
- Cinta clínica muestra continuidad: datos → controles → labs → tratamiento.

Flujo Atender cita:

```text
Agenda → Atender → Control prenatal → Laboratorios → Tratamiento → Cerrar cita
```

Reglas:

- El flujo lleva `appointmentId` y `gestanteId` siempre.
- El obstetra ve progreso y pendientes.
- Finalizar cita requiere confirmación si faltan pasos.

---

### Fase 7 — Responsive fino web/móvil

**Objetivo:** que no parezca una app móvil estirada en escritorio.

Web:

- sidebar fijo sobrio.
- topbar compacta.
- tablas con densidad clínica.
- formularios en columnas cuando el contenido lo permite.
- dashboards en 2 columnas reales, no tarjetas gigantes.

Móvil:

- una tarea por pantalla.
- bottom tabs claros.
- bottom sheets para acciones rápidas.
- CTA principal siempre visible cuando sea seguro.
- evitar tablas: usar tarjetas priorizadas.

Breakpoints:

- `<600`: teléfono.
- `600–839`: móvil grande/tablet pequeña.
- `>=840`: webShell.
- `>=1240`: desktop amplio con 2 columnas.

---

### Fase 8 — Estados, copy y accesibilidad

**Objetivo:** que el sistema se sienta cuidado incluso cuando no hay datos o hay error.

Copy rules:

- Botón: “Guardar cambios”. Toast: “Cambios guardados”.
- Error: “No se pudo cargar la agenda. Revisa tu conexión y vuelve a intentar.”
- Empty: “Aún no hay citas. Programa la primera cita para iniciar el seguimiento.”
- No usar “submit”, “éxito”, “error genérico”, “oops”.

Accesibilidad:

- `accessibilityRole` en botones.
- `accessibilityLabel` específico.
- foco visible web.
- contraste AA.
- reduce motion respetado.

---

### Fase 9 — QA visual y gobernanza

**Objetivo:** que el diseño no vuelva a desordenarse.

Puerta de calidad:

```bash
cd frontend
npm run tsc
npm run audit:design:strict
npm test
bash scripts/qa-visual.sh
```

QA por rol:

- Login.
- Home.
- Lista principal.
- Crear/editar.
- Detalle.
- Estado vacío.
- Error simulado.
- Web desktop.
- Móvil 390×844.

Gobernanza:

- PR template con checklist visual.
- `AGENTS.md` actualizado con “no crear chrome nuevo”.
- Cada pantalla nueva debe elegir un patrón existente.
- Si necesita patrón nuevo, se diseña primero como componente reusable.

---

## 9. Criterios de éxito

| Criterio | Meta |
|---|---:|
| Pantallas usando patrón/layout común | 100% |
| Violaciones `audit:design:strict` | 0 |
| Pantallas con 4 estados definidos | 100% |
| Flujos críticos a ≤2 taps | 100% |
| Inputs crudos en pantallas finales | 0 o justificados |
| Botones improvisados | 0 o justificados |
| Componentes >700 líneas | 0 o plan de división |
| QA web + móvil por rol | completo |

---

## 10. Orden recomendado de ejecución

1. Fase 0: baseline.
2. Fase 1: tokens.
3. Fase 2: primitivas.
4. Fase 3: patrones.
5. Fase 4: navegación por rol.
6. Fase 5A–5D: auth, dashboards, listas, formularios.
7. Fase 6: ficha clínica y atender cita.
8. Fase 5G + 7: cierre responsive.
9. Fase 8: copy/accesibilidad.
10. Fase 9: QA y gobernanza.

---

## 11. Principio final

El frontend de VITMATERNA no debe competir por atención. Debe ordenar el cuidado.

Minimalista no significa vacío; significa que cada color, texto, espacio y movimiento ayuda a una gestante, obstetra o administrador a tomar la siguiente decisión correcta.
