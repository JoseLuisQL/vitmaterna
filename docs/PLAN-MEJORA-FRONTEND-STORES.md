# Plan de Refactor del Frontend — VITMATERNA

> **Objetivo:** frontend **más entendible, intuitivo y jerárquico**. Quitar lo que sobra
> o no aporta valor, jerarquizar los módulos y **encadenar los flujos** para que el
> usuario (gestante, obstetra, admin) nunca se pierda ni salte entre vistas para
> completar una tarea.
>
> **Eje del sistema:** **Citas + Tratamiento + Notificaciones**. En el obstetra, la
> **cita es el centro**: de ella nacen los registros clínicos.
>
> **Metodología de este plan:** no es teórico. Se **simularon los flujos reales contra
> la API corriendo** (`localhost:3000`) y se **leyó el código de cada pantalla clave**
> para medir exactamente dónde el usuario se traba. Cada hallazgo abajo está respaldado
> por evidencia (endpoint probado o línea de código citada).
>
> **Stack (sin cambios):** Expo SDK 56 · RN 0.85 · expo-router 56 · TanStack Query 5 ·
> Zustand 5 · Socket.io · react-hook-form + zod · offline-first.
>
> **Regla por fase (obligatoria):** implementar → validar (`npx tsc --noEmit` 0 errores +
> `npm test` + prueba funcional sin bugs) → **commit + push a GitHub** con mensaje claro
> (`feat()/fix()/refactor()/chore()`) → siguiente fase.

---

## 1. SIMULACIÓN DE FLUJOS (evidencia real)

### 1.1 Flujo OBSTETRA — atender una cita (el caso más importante)

**Simulación contra la API** (`/tmp/sim_obstetra.mjs`, ejecutada):
```
1. Login obstetra            -> 200
2. GET /appointments         -> 200, 7 citas (agenda)
3. PATCH /appointments/:id/status {asistida} -> 200   ← marca "Asistió"
4. GET /patients/:id         -> 200   ← debe ir MANUALMENTE al perfil
5. POST /clinical/controls   -> 201   ← registra control (form aparte)
6. POST /clinical/labs       -> ...   ← otro form aparte
```

**Lo que descubrí leyendo el código:**

1. **La cita es un callejón sin salida.** En `cronograma.tsx`, la tarjeta de cita solo
   tiene botones **"Asistió" / "No asistió" / "Convertir a domiciliaria"**
   (líneas 227–250). `handleStatusUpdate` (línea 127) **solo cambia el estado**; no abre
   nada más.
2. **Tocar la cita NO abre a la paciente.** No existe ningún `router.push` a
   `gestante/[id]` desde el cronograma (confirmado por búsqueda). El obstetra ve la cita
   pero **no puede entrar a la historia desde ahí**.
3. **Para registrar datos hay que salir y rebuscar:** Tab Gestantes → buscar nombre →
   `gestante/[id]` → tab Controles → botón "Nuevo Control". Son **5+ taps por un camino
   totalmente distinto** al de la cita que se acaba de atender.
4. **El registro no se liga a la cita.** `control/nuevo.tsx` recibe solo `patientId`
   (línea 32) y envía 5 campos (línea 43). **PERO el backend YA soporta ligarlo**: el
   modelo `PrenatalControl` tiene `appointmentId` (schema.prisma línea 424). → La
   capacidad existe; el frontend la desperdicia.
5. **Formulario de control pobre.** Captura solo 5 campos (`week, weight, bloodPressure,
   fetalHeartRate, fundalHeight`) cuando el modelo tiene ~30 (situación, presentación,
   proteinuria, edema, FCF, indicaciones de hierro/calcio/ácido fólico, etc.).
6. **"Tamizajes" ni siquiera es tab del perfil.** Los tabs del perfil son
   `Datos · Controles · Medicinas · Lab. · Vacunas · Visitas` (líneas 32–38);
   tamizajes vive en **otra ruta suelta** (`gestante/tamizajes`) a la que se llega por
   un botón. Ecografía, nutrición, peso, odontograma y patologías están **dentro de
   tamizajes**, lejos del flujo.
7. **Inconsistencia de feedback:** `control/nuevo` usa `Alert.alert` (líneas 42–46),
   mientras el resto de la app usa `toast`. Sensación de pantallas "de otra app".

> **Conclusión:** atender una cita no es **un acto guiado**; es saltar entre 3–4 zonas
> sin hilo conductor. **Aquí se pierde el obstetra.**

### 1.2 Flujo GESTANTE — funciones duplicadas y escondidas

**Simulación** (`/tmp/sim_gestante.mjs`, ejecutada): login → tratamientos (200) →
citas (200) → reportar signo (200) → chat (200) → educación (200) → adherencia (200).
Todo el **backend responde**; el problema es de **organización en el frontend**:

1. **"Reportar signo de alarma" en 4 lugares** (confirmado): `index.tsx` (acción rápida),
   `alarmas.tsx`, `chatbot.tsx` y `educacion.tsx`. La gestante no sabe cuál es "el bueno".
2. **Adherencia/progreso en 3 pantallas:** `index.tsx` (anillo), `tratamiento.tsx`
   (barras + calendario 30 días) y `mi-progreso.tsx` (tab oculto con gráfico 7 días que
   consume `/reports/adherence`, **misma info**).
3. **Funciones reales escondidas como tabs ocultos** (`_layout.tsx` líneas 52–53):
   `mi-progreso` y `educacion` con `href: null`. Solo se llega por accesos sueltos.
4. **`chatbot` y `alarmas` se solapan:** ambos hacen triaje + reportar síntoma.
5. **Perfil con relleno:** modales informativos estáticos (Configuración, Privacidad,
   Ayuda) con texto fijo y poco valor (perfil.tsx líneas 94–114).

### 1.3 Flujo ADMIN — jerarquía plana

5 tabs al mismo nivel (`Usuarios · Contenido · Sedes · Config · Auditoría`,
`_layout.tsx`) sin separar lo **diario** (aprobar obstetras, contenido) de lo
**esporádico** (sedes, config, auditoría/backup). La acción más frecuente —**aprobar
obstetras pendientes**— no está resaltada.

### 1.4 Lo que está BIEN (se conserva)

Design tokens centralizados (`src/theme/`), estados loading/vacío/error
(`EmptyState`, `Skeleton`), validación zod, offline-first (React Query + outbox),
`PillTabBar`, componentes UI reutilizables, `toast` consistente (en casi todo).

---

## 2. Principios del refactor

1. **Un objetivo por pantalla.** Función en 3 sitios → queda **uno canónico**; los demás
   son accesos directos a ese.
2. **Jerarquía por frecuencia de uso.** Diario → barra inferior; esporádico → "Más".
3. **Flujos encadenados.** Una tarea = un camino continuo, no buscar entre menús.
4. **Máx. 2 taps** a cualquier función clave.
5. **Eliminar > esconder.** Lo sin valor se quita (no como tab oculto).
6. **Aprovechar lo que el backend ya soporta** (ej. `appointmentId` en controles).
7. **Solo frontend.** No se toca la lógica del backend.

---

## 3. Arquitectura de información propuesta

### GESTANTE — barra inferior
| Pos | Tab | Contiene | Cambio |
|---|---|---|---|
| 1 | **Inicio** | Próxima cita + tratamiento de hoy + notificaciones + reportar síntoma | Hub limpio, sin duplicar |
| 2 | **Citas** | Citas + confirmar/reprogramar | Igual |
| 3 | **Tratamiento** | Suplementos + **adherencia/progreso unificados** | Absorbe "Mi Progreso" |
| 4 | **Chat** | Chat con obstetra + **asistente/triaje integrado** | Absorbe chatbot |
| 5 | **Más** | Datos, **Educación (ya no oculta)**, Visitas, Notificaciones, Salir | Educación visible; sin relleno |

- **Reportar síntoma:** un único flujo canónico (botón rojo en Inicio + acceso desde Chat).

### OBSTETRA — barra inferior + flujo de cita encadenado
| Pos | Tab | Contiene | Cambio |
|---|---|---|---|
| 1 | **Agenda (Hoy)** | Cronograma del día | Pantalla operativa central |
| 2 | **Gestantes** | Lista + perfil clínico | Igual |
| 3 | **Alertas** | Signos de alarma pendientes | **Visible (sube de oculto)** + badge |
| 4 | **Chat** | Consultas | Igual |
| 5 | **Más** | Reportes, Mensaje masivo, Perfil | Reportes/masivo aquí (esporádico) |

- **⭐ FLUJO "ATENDER CITA":** marcar "Asistió" → abre stepper guiado
  **Control → Laboratorios → Tamizajes → Tratamiento → Resumen**, con `appointmentId` +
  `gestanteId` viajando por todo. Además, **tocar la cita abre la paciente**.

### ADMIN — por frecuencia
| Pos | Tab | Cambio |
|---|---|---|
| 1 | **Usuarios** | Resaltar aprobaciones pendientes |
| 2 | **Contenido** | Igual |
| 3 | **Más** | Agrupa **Sedes + Config + Auditoría/Backup** |

---

## 4. Plan por fases

### FASE 0 — Baseline
- [ ] `npx tsc --noEmit` (verde, ya verificado) + `npm test`.
- [ ] Plan y mapa actual vs. propuesto documentados (este archivo).

**Commit:** `chore(frontend): baseline y plan de refactor de usabilidad basado en simulación`

---

### FASE 1 — Limpieza: quitar lo que sobra (gestante)
1. **Un solo "reportar síntoma":** componente/flujo canónico reutilizable; quitar copia
   de `educacion.tsx` y unificar `alarmas.tsx` con el del dashboard.
2. **Fusionar `chatbot` + `alarmas`** en **"Reportar síntoma / Asistente"** (triaje +
   reporte), accesible desde Inicio y Chat.
3. **Unificar adherencia en `tratamiento.tsx`** y **eliminar el tab oculto
   `mi-progreso.tsx`** (mover su gráfico 7 días a Tratamiento). El anillo del dashboard
   queda como resumen con enlace.
4. **Perfil:** quitar modales de relleno o reducir a una "Ayuda y privacidad" con
   contenido real.
5. Eliminar imports/estilos/rutas muertas.

**Validación:** ninguna función real se pierde; rutas eliminadas no rompen navegación;
`tsc` + tests verdes; recorrido manual gestante.
**Commit:** `refactor(gestante): eliminar duplicados y relleno (mi-progreso, chatbot/alarmas, modales)`

---

### FASE 2 — Jerarquía de navegación GESTANTE
1. Tabs: **Inicio · Citas · Tratamiento · Chat · Más**.
2. 5º tab "Más" agrupa Datos, **Educación**, Visitas, Notificaciones, Salir (sin
   `href:null` sueltos).
3. Inicio: acciones rápidas apuntan al flujo canónico (sin duplicar).
4. Garantizar **≤ 2 taps** a Citas, Tratamiento, Reportar síntoma y Chat.

**Validación:** todo alcanzable y sin duplicar; `tsc` + tests verdes; recorrido manual.
**Commit:** `refactor(gestante): jerarquía de navegación clara (Educación visible, menú "Más")`

---

### FASE 3 — Jerarquía de navegación OBSTETRA
1. Tabs: **Agenda · Gestantes · Alertas · Chat · Más**.
2. **Alertas** sube a tab visible con badge de pendientes (seguridad del paciente).
3. **Reportes** y **Mensaje masivo** → "Más" (esporádicos).
4. **Tocar una cita abre `gestante/[id]`** (resuelve el callejón sin salida).

**Validación:** navegación coherente; badge alertas ok; tap-cita abre paciente;
`tsc` + tests verdes; recorrido manual obstetra.
**Commit:** `refactor(obstetra): jerarquía (Alertas visible, Reportes a "Más", cita abre paciente)`

---

### FASE 4 — ⭐ Flujo encadenado "Atender cita" (cambio clave)
1. **Desde la Agenda**, "Asistió" → abre **"Atender cita"** (stepper) con
   `appointmentId` + `gestanteId`.
2. **Pasos guiados** (según aplique): **Control → Laboratorios → Tamizajes →
   Tratamiento → Resumen/Cerrar**, reutilizando los formularios existentes.
3. **Ligar `appointmentId`** a los registros que el backend ya soporta (empezando por
   `control/nuevo`, que pasará `appointmentId` además de `patientId`).
4. **Indicador de progreso del acto** (qué se registró / qué falta) para no perderse.
5. Acceso secundario desde el perfil se mantiene, pero el camino principal nace de la cita.

**Validación:** atender una cita de inicio a fin sin salir del flujo; control ligado a la
cita (verificable en BD: `appointment_id` no nulo); `tsc` + tests verdes; E2E manual con
obstetra del seed (DNI 11111111 / Test@1234).
**Commit:** `feat(obstetra): flujo "Atender cita" que encadena control, labs, tamizajes y tratamiento`

---

### FASE 5 — Perfil clínico de la gestante ordenado
1. Reordenar tabs internos por **flujo clínico real** e **integrar Tamizajes como tab**
   (hoy es ruta suelta): **Datos → Controles → Laboratorios → Tamizajes → Tratamiento →
   Vacunas → Visitas**.
2. Patrones "Registrar/Nuevo" consistentes en todos los tabs (mismo botón, misma
   ubicación).
3. Resúmenes (semana, trimestre, FPP, IMC, riesgo) siempre visibles.
4. **Enriquecer `control/nuevo`** con los campos clínicos relevantes que el backend ya
   acepta y migrar su `Alert` → `toast` (consistencia).

**Validación:** navegación interna consistente; sin funciones perdidas; control con más
campos guarda ok; `tsc` + tests verdes.
**Commit:** `refactor(obstetra): perfil clínico ordenado + tamizajes como tab + control enriquecido`

---

### FASE 6 — Jerarquía ADMIN por frecuencia
1. Tabs: **Usuarios · Contenido · Más**.
2. "Más" agrupa **Sedes · Config · Auditoría/Backup**.
3. Resaltar **aprobaciones de obstetras pendientes** en Usuarios.

**Validación:** todo accesible; aprobaciones visibles; `tsc` + tests verdes; recorrido admin.
**Commit:** `refactor(admin): jerarquía por frecuencia (Sedes/Config/Auditoría en "Más")`

---

### FASE 7 — Consistencia final y pulido
1. Sin colores/sombras/espaciados hardcodeados fuera de `src/theme/` en pantallas tocadas.
2. Estados loading/vacío/error en cada pantalla refactorizada.
3. Feedback inmediato (pressed/spinner/toast) en cada acción; eliminar `Alert` restantes.
4. Textos claros, en español, sin jerga; nombres de tabs/botones autoexplicativos.
5. Verificación de los 3 roles con usuarios del seed: ninguna función perdida, ningún
   callejón sin salida, ≤ 2 taps a lo clave.

**Validación:** checklist por rol; `tsc` + tests verdes; recorrido completo.
**Commit:** `refactor(ux): consistencia visual, estados y feedback en toda la app`

---

## 5. Resumen de fases

| Fase | Tema | Riesgo | Valor UX | Commit |
|---|---|---|---|---|
| 0 | Baseline | — | — | `chore(frontend): baseline...` |
| 1 | Limpieza gestante | Bajo | Alto | `refactor(gestante): eliminar duplicados...` |
| 2 | Jerarquía gestante | Bajo | Alto | `refactor(gestante): jerarquía...` |
| 3 | Jerarquía obstetra | Bajo | Alto | `refactor(obstetra): jerarquía...` |
| 4 | **Flujo "Atender cita"** | Medio | **Crítico** | `feat(obstetra): flujo Atender cita` |
| 5 | Perfil clínico ordenado | Medio | Alto | `refactor(obstetra): perfil ordenado...` |
| 6 | Jerarquía admin | Bajo | Medio | `refactor(admin): jerarquía...` |
| 7 | Consistencia y pulido | Bajo | Medio | `refactor(ux): consistencia...` |

---

## 6. Comandos de validación (al final de cada fase)
```bash
# En frontend/
npx tsc --noEmit     # tipos (0 errores)
npm test             # pruebas
npm run web          # verificación funcional manual
```
Fase verde y sin bugs → **commit + push a GitHub** → siguiente fase.

---

## 7. Hallazgos clave de la simulación (resumen ejecutivo)

1. 🔴 **La cita del obstetra es un callejón sin salida**: "Asistió" no lleva a registrar
   nada y **tocar la cita no abre a la paciente**. (Fases 3 y 4)
2. 🔴 **Registros dispersos en 3–4 zonas** sin hilo; el control **no se liga a la cita**
   aunque el backend ya lo soporta (`appointmentId`). (Fase 4)
3. 🟠 **Gestante:** reportar síntoma en 4 sitios, adherencia en 3, funciones reales como
   tabs ocultos. (Fases 1 y 2)
4. 🟠 **Formulario de control pobre** (5 de ~30 campos) e inconsistente (`Alert` vs
   `toast`). (Fase 5)
5. 🟡 **Admin plano**: lo frecuente y lo esporádico al mismo nivel. (Fase 6)

> El backend está sano y completo. **Todo el trabajo es de organización y conexión del
> frontend**, sin tocar la lógica de negocio.
