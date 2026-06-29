# Refactorización integral UX/UI — VITMATERNA (web + móvil)

> Diseñador UX senior + product designer + arquitecto frontend.
> Criterio rector: **claridad, minimalismo, consistencia web↔móvil, reducción de fricción**
> para personal de salud y gestantes rurales. No rediseño decorativo: usabilidad real.

Trabajo sobre el **sistema de diseño existente** (`src/theme` + `src/components/ui|patterns|layout`).
Toda UI nueva usa tokens y primitivas; `npm run verify` debe pasar antes de cerrar cada fase.

---

## FASE 1 — Auditoría funcional y UX

### 1. Historia clínica — `app/(obstetra)/gestante/[id].tsx` (2589 ln)
**Estado:** ya tabbed (Resumen / Seguimiento / Tratamiento / Clínico) + Accordions. **No está
"desordenada" como antes**, pero sí pesa:
- El monolito tiene 2589 líneas con modales de Lab/Vacuna/Tratamiento embebidos (estado local disperso).
- En "Resumen" hay **doble nivel de agrupación** ("Información clínica" + "Datos administrativos")
  con 5 Accordions; el de "Datos personales" tiene 13 filas — ruido para una lectura rápida.
- TextInput crudos (`PlainInput`) en algunos modales (violación de la familia Field).

**Criterio:** conservar la arquitectura de 4 tabs (es correcta). Reducir ruido en Resumen
(jerarquía: estado crítico → alertas → 1 bloque clínico → administrativo colapsado por defecto).
Migrar inputs crudos a `Field`. No reescribir lo que ya funciona.

### 2. Atender cita — `app/(obstetra)/atender/[appointmentId].tsx` (273 ln)
**Estado:** ya es vista guiada por pasos (Control → Lab → Tamizajes → Tratamiento) con progreso y
confirmación al finalizar con pendientes. **Buen flujo.** Mejoras:
- En web usa `twoCol` con el botón "Finalizar" arriba-izquierda y los pasos a la derecha → el orden
  de lectura natural (pasos primero, finalizar al final) se rompe.
- Cada paso navega a OTRA pantalla (control/nuevo, ficha) y vuelve. Es funcional pero saca al obstetra
  del contexto de "atención activa". Marca de "hecho" es sólo visual (no verifica que se guardó).
- Falta lo más importante arriba: **contexto clínico mínimo de la paciente** (semanas, riesgo, alertas)
  sin tener que ir a la ficha.

**Criterio:** mantener el patrón de pasos. Reordenar para que en web los pasos vayan primero y el
finalizar al cierre; añadir una cabecera de contexto clínico compacta (semana/riesgo/alertas).

### 3. Registro de gestante — `nueva.tsx` (822 ln) + `control/nuevo.tsx`
**Diagnóstico del "bug" reportado:** al crear una gestante **NO se crea un control prenatal**.
Lo que el backend autogenera a partir de la FUM es un **cronograma de CITAS** (1 "Registro Inicial"
asistida + 8 "Control Prenatal Programado (N)"). El control clínico real sólo se crea manualmente en
`control/nuevo.tsx` (POST /clinical/controls). → **No es un bug funcional; es un bug de COPY/UX**: el
texto del paso 2 dice "se genera el cronograma de controles" y los motivos de cita dicen "Control",
lo que hace *parecer* que ya hay un control hecho.

**Criterio:** corregir la nomenclatura (citas ≠ controles) en el copy del formulario y donde se listen.
Mantener el wizard de 4 pasos (es correcto). Decidir sobre campos huérfanos (`nivelEstudios`,
`estadoCivil`: en schema, sin UI → o se exponen o se quitan).

### 4. Dashboard gestante — confirmar asistencia — `(gestante)/(tabs)/index.tsx`
**Estado:** botón "Confirmar asistencia" ejecuta la mutación **a un solo toque, sin confirmación
previa**. Riesgo: confirmaciones accidentales.

**Criterio:** anteponer un `ConfirmSheet`/`confirmAction` con título claro, contexto de la cita
(fecha, hora, tipo, lugar) y descripción de qué implica confirmar. Misma lógica en la pantalla Citas.

### 5. Notificaciones push — `usePushNotifications.ts` + `NotificationsScreen.tsx`
**Estado:** ya hay routing por `data.tipo` → ruta. Problemas:
- **Routing DUPLICADO** y divergente entre push (`routeForNotification`) e in-app (`handlePress`).
- **Cold start roto:** sin `getLastNotificationResponseAsync` → app cerrada que se abre por una push
  NO navega al destino. (Este es el punto que pides: "abrir exactamente la vista relacionada").
- Admin sin push; varios tipos sin ruta.

**Criterio:** extraer UN helper único `routeForNotification(role, tipo, datos)` a `src/navigation/`,
consumido por push e in-app. Añadir manejo de cold start. Cubrir admin y tipos faltantes.

### 6. Sidebar web — `src/navigation/menu.ts` + `WebSidebar.tsx`
**Estado:** ya agrupado por secciones con títulos (Mi salud / Cuenta / Análisis / Supervisión /
Sistema / Seguridad). Está razonablemente bien. Ajustes finos:
- "Perfil" vive en distinto sitio entre roles (gestante/obstetra en tabs, admin en stack) → unificar criterio.
- Revisar orden por frecuencia de uso real y agrupación lógica (p.ej. obstetra: Reportes podría subir).

**Criterio:** reordenar/renombrar dentro de `menu.ts` (fuente única → web y móvil heredan). Cambios
quirúrgicos, no rehacer.

### 7. Reportar alarma — `(gestante)/alarmas.tsx` (335 ln)
**Estado:** lista larga de 18 checkboxes en 3 grupos (embarazo/parto/postparto) **todos visibles a la
vez** → alta carga cognitiva para personal/gestante rural. `TextInput` CRUDO (viola AGENTS.md). Todo
se envía `severidad:'grave'`. **No existe opción "Otros".**

**Criterio:** divulgación progresiva (mostrar primero el grupo según etapa del embarazo; los otros
colapsados). Reducir a lo esencial por pantalla. Migrar el textarea a `TextAreaField`. **Añadir "Otros"**
que habilite un campo de texto para reporte personalizado. Mantener el acceso de emergencia (llamar)
siempre visible.

---

## FASE 2 — Arquitectura de información / nuevo flujo por pantalla

| Módulo | Antes | Después (propuesta) |
|---|---|---|
| Historia clínica | 4 tabs + 5 accordions en Resumen, inputs crudos | 4 tabs (igual); Resumen: estado→alertas→clínico→**administrativo colapsado**; inputs→`Field` |
| Atender cita | finalizar arriba (web), sin contexto | **contexto clínico compacto arriba** → pasos → finalizar al cierre |
| Nueva gestante | wizard 4 pasos, copy "controles" | wizard 4 pasos; **copy correcto (citas)**; resolver campos huérfanos |
| Confirmar cita | 1 toque directo | **ConfirmSheet** con contexto + descripción |
| Notificaciones | routing duplicado, cold-start roto | **1 helper `routeForNotification`** + cold start + admin |
| Sidebar | agrupado, "perfil" disperso | orden por uso; "perfil" unificado |
| Reportar alarma | 18 checkboxes a la vez, sin "Otros", input crudo | **progresivo por etapa** + **"Otros" con texto** + `TextAreaField` |

---

## FASE 3 — Implementación por prioridad
1. **Reportar alarma** (alto impacto rural, riesgo bajo) — incluye "Otros".
2. **Confirmar asistencia** con ConfirmSheet (seguridad, riesgo bajo).
3. **Notificaciones**: helper único de routing + cold start (corrige bug de navegación).
4. **Copy nueva gestante** (citas≠controles) + campos huérfanos.
5. **Atender cita**: contexto clínico + orden web.
6. **Historia clínica**: aligerar Resumen + inputs Field.
7. **Sidebar**: reordenar/unificar perfil.

## FASE 4 — Limpieza, consistencia y QA
- Eliminar routing duplicado de notificaciones; quitar campos/copys obsoletos.
- Validar web↔móvil con `useResponsive().webShell`.
- `npm run verify` (tsc + audit:design:strict + jest) en verde.
- QA visual web con `agent-browser`.
