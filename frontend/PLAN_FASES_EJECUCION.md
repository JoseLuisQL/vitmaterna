# Plan de Ejecución por Fases — Frontend VITMATERNA

> Documento operativo. Cada fase es **autocontenida, verificable y termina con un commit + push a GitHub** solo si la validación pasa.
> Reglas globales: **cero emojis** (solo iconografía Lucide), **diseño único y continuo**, responsive real, carga rápida y fluida, inputs con validación profesional.

---

## Reglas de oro (aplican a TODAS las fases)

1. **No se avanza de fase** sin cumplir el *Gate de validación* (abajo).
2. **Una fase = un objetivo claro.** No se mezclan cambios de fases distintas.
3. **Commits pequeños** dentro de la fase; al cerrar, un commit de cierre + push.
4. **Branch por fase** (`feature/fase-N-...`) → merge a `main` al validar. (O commits directos a `main` si así lo prefieres.)
5. Cualquier archivo que se toca queda **funcional** (la app nunca queda rota entre commits).

### Gate de validación (obligatorio al cerrar cada fase)

```bash
# 1. Tipos sin errores
npx tsc --noEmit                  # debe salir limpio

# 2. Tests verdes
npx jest --silent                 # 44/44 (o más) passing

# 3. La app levanta y compila el bundle web
#    (backend + expo ya corriendo en tmux)
curl -s -o /dev/null -w "%{http_code}" "http://localhost:8081/index.bundle?platform=web&dev=true"  # 200

# 4. Walkthrough funcional de las vistas tocadas (manual o agent-browser)
#    -> sin errores de consola, sin crashes, navegación OK
```

Solo si **los 4 pasan** → commit + push.

### Flujo de commit a GitHub (al cerrar fase)

```bash
git add -A
git commit -m "<tipo>(fase-N): <resumen claro del porqué>"
git push origin main        # o la rama de la fase
```

> Nota de seguridad: el remoto NO guarda token. Para `push` se inyecta el PAT en el momento
> (`git push https://<TOKEN>@github.com/JoseLuisQL/vitmaterna.git`) y NO se persiste en el repo.
> **`frontend/.env` NO se commitea** (es config local); va en `.gitignore`.

---

## Mapa de fases

| Fase | Nombre | Riesgo | Depende de |
|---|---|---|---|
| F0 | Cimientos: diseño único, responsive, guards de rol | Medio | — |
| F1 | Exportación de reportes (PDF + Excel) funcionando | Bajo | F0 |
| F2 | Dashboards rediseñados (precisos, claros, no saturados) | Medio | F0 |
| F3 | Emergencia + modales de validación/confirmación | Medio | F0 |
| F4 | Formularios e inputs con validación profesional | Bajo | F0, F3 |
| F5 | Navegación jerárquica + sidebar por rol | Medio | F0 |
| F6 | Rendimiento y responsive vista por vista (FlashList) | Medio | F0–F5 |
| F7 | QA integral (simulación de uso por rol) + cierre | Bajo | todas |

Cada fase se detalla abajo con: objetivo, tareas, archivos, validación específica y mensaje de commit.

---

## FASE 0 — Cimientos: diseño único, responsive y guards de rol

**Objetivo:** una base de diseño consistente y responsive sobre la que se apoyan todas las fases, y cerrar el hueco de seguridad de rutas.

### Tareas
1. **Spike de compatibilidad** de la librería de estilos responsive (react-native-unistyles v3) con Expo 56 / RN 0.85 / React 19.
   - Si pasa el spike → adoptarla.
   - Si hay fricción → **plan B**: helper propio `useResponsive()` con `useWindowDimensions` + breakpoints (`xs/sm/md/lg/xl`). Mismo objetivo, sin riesgo.
2. **Tokens unificados:** consolidar `src/theme/*` en una sola fuente; eliminar el dualismo `commonColors` (fijo) vs `useThemedColors()` → todo reacciona al tema.
3. **Componente `ScreenLayout`** (`src/components/layout/ScreenLayout.tsx`): header con gradiente por rol + safe-area + cuerpo responsive + estados estándar `loading` / `empty` / `error`. Será la plantilla **única** de todas las pantallas.
4. **Breakpoints en `MobileFrame`** y `AutoGrid` (ya existe) → grid 1/2/3/4 columnas según ancho real.
5. **Guards de rol** en `app/(gestante)/_layout.tsx`, `app/(obstetra)/_layout.tsx`, `app/(admin)/_layout.tsx`: leer `useAuthStore`; `<Redirect href="/(auth)/login" />` si no hay sesión, y redirección a su área si el rol no coincide.

### Archivos
- Nuevos: `src/theme/responsive.ts` (o `unistyles.ts`), `src/components/layout/ScreenLayout.tsx`.
- Editados: `src/theme/colors.ts`, `ThemeContext.tsx`, `MobileFrame.tsx`, `AutoGrid.tsx`, los 3 `_layout.tsx` de rol.

### Validación específica
- Login con cada rol → entra a su área; deep-link a otro rol → redirige correctamente.
- Redimensionar ventana web (móvil/tablet/escritorio) → sin desbordes.
- Gate de validación completo.

### Commit
`feat(fase-0): base de diseño responsive unificada + guards de rol`

---

## FASE 1 — Exportación de reportes (PDF + Excel) funcionando

**Objetivo:** que "Exportar PDF" y "Exportar Excel" funcionen en **web y móvil** (hoy el PDF falla en web; no hay Excel real).

### Tareas
1. **`src/utils/exportPdf.ts`** con ramas:
   - Nativo: `expo-print.printToFileAsync` → `expo-sharing`.
   - Web: render del HTML del reporte en iframe oculto + `window.print()` (o Blob + descarga).
2. **`src/utils/exportExcel.ts`** (.xlsx con SheetJS): hojas Resumen / Indicadores MINSA / Pacientes prioritarias; fallback web (Blob) + nativo (FileSystem + Sharing).
3. Reemplazar llamadas directas a `Print`/`Sharing` en:
   - `app/(obstetra)/(tabs)/reportes.tsx`
   - `app/(admin)/supervision/reportes.tsx`
   - `app/(admin)/(tabs)/auditoria.tsx`
4. Botones de export: estados loading + toasts de éxito/error consistentes; añadir botón **Excel** donde aplique.

### Validación específica
- En **web**: exportar PDF abre diálogo de impresión/descarga; exportar Excel descarga `.xlsx` válido (abre en Excel con acentos correctos).
- En **móvil** (si hay device): abre hoja de compartir.
- Gate completo.

### Commit
`fix(fase-1): exportación PDF y Excel funcional en web y móvil`

---

## FASE 2 — Dashboards rediseñados (precisos, claros, no saturados)

**Objetivo:** los 3 dashboards deben mostrar **solo lo necesario**, bien jerarquizado y comprensible para cualquier usuario. Hoy:
- **Admin:** saturado (14 KPIs en 4 bloques + canales + accesos rápidos) → sobrecarga.
- **Obstetra:** mezcla KPIs + riesgo + lista de citas en un `FlatList` con header gigante.
- **Gestante:** repite "trimestre" varias veces; jerarquía mejorable.

### Principios de rediseño (UI/UX)
- **Regla 1 pantalla = 1 mensaje principal + 3–4 secundarios.** Nada más "above the fold".
- **Jerarquía visual:** lo más accionable arriba (lo urgente/lo de hoy), lo informativo después.
- **Lenguaje claro:** etiquetas entendibles, sin jerga; números grandes legibles con su contexto.
- **Sin saturar:** agrupar KPIs en 1 bloque resumido + enlace "ver detalle"; mover lo secundario a su pantalla.

### Tareas por rol

**Gestante** (`app/(gestante)/(tabs)/index.tsx`):
- Foco: estado del embarazo (semana/trimestre **una sola vez**, claro) → próxima cita (con acción confirmar) → tratamiento de hoy (anillo) → acciones rápidas (4, ya ok).
- Quitar repetición de trimestre; "card" de progreso como héroe.

**Obstetra** (`app/(obstetra)/(tabs)/index.tsx`):
- Bloque 1: **resumen del día** (Citas hoy, Pendientes, Alertas con badge) — 3 KPIs máximo, accionables.
- Bloque 2: **distribución de riesgo** compacta (barra + leyenda) con enlace a reportes.
- Bloque 3: **citas de hoy** (lista) → migrar a FlashList en F6.
- Quitar el cuarto KPI redundante; el avatar usa inicial real (hoy `charAt(4)` es frágil).

**Admin** (`app/(admin)/(tabs)/index.tsx`):
- Reducir de 14 KPIs a **un resumen ejecutivo**: 4 KPIs clave (Usuarios, Gestantes activas, Alto riesgo, Citas hoy).
- Mantener **tarjeta de acción "obstetras por aprobar"** (excelente, conservar).
- Agrupar el resto (contenido, canales) en secciones colapsables o moverlo a sus pantallas con enlace.
- Accesos rápidos: 3 máximo.

### Validación específica
- Cada dashboard: comprensible de un vistazo, sin scroll innecesario para lo crítico, responsive (móvil/tablet/web), iconografía coherente, sin saturación.
- Gate completo.

### Commit
`feat(fase-2): rediseño de dashboards (claros, jerárquicos, sin saturación)`

---

## FASE 3 — Emergencia + modales de validación/confirmación

**Objetivo:** flujo de emergencia con diseño especializado y un sistema propio de modales (no diálogos del navegador/OS).

### Tareas
1. **`src/components/shared/EmergencyAlert.tsx`** (bottom-sheet/modal):
   - Cabecera roja, icono `ShieldAlert`/`Siren` (Lucide), título y mensaje claros y entendibles.
   - Estado de **ubicación GPS** (obteniendo → obtenida).
   - Botones grandes, separados, sin cortes: **Enviar ahora** (rojo) / **Cancelar**.
   - Estado de envío → confirmación con check + "Tu obstetra fue notificada con tu ubicación" + botón **Llamar al centro de salud**.
   - Mensaje de la alerta redactado y legible (nombre, link de mapa, hora).
2. Integrar en `app/(gestante)/(tabs)/index.tsx` (botón Emergencia) y `app/(gestante)/alarmas.tsx`.
3. **`src/components/ui/ConfirmSheet.tsx`** y **`ValidationModal.tsx`**: reemplazan `window.confirm/alert` y `Alert.alert`. Iconografía temática, botones bien posicionados, idéntico en web y nativo.
4. Refactor de `src/utils/confirm.ts` para usar `ConfirmSheet` (manteniendo la API `confirmAction()` para no romper llamados).

### Validación específica
- Emergencia: confirmación clara, GPS visible, envío correcto (toast/registro), diseño profesional sin cortes.
- Confirmaciones (cerrar sesión, eliminar, suspender) funcionan igual en web y nativo con el nuevo modal.
- Gate completo.

### Commit
`feat(fase-3): alerta de emergencia especializada + modales de validación propios`

---

## FASE 4 — Formularios e inputs con validación profesional

**Objetivo:** todos los formularios validan con Zod en tiempo real, con reglas de dominio y teclado bien gestionado.

### Tareas
1. **Cablear `zodResolver` donde falta** (crítico: `app/(auth)/register.tsx`, que hoy no lo usa → errores inline no aparecen).
2. **Esquemas Zod por formulario** con reglas de dominio y mensajes claros en español:
   - DNI (8 dígitos), teléfono (9, empieza en 9), COP obstetra, contraseña (fortaleza + coincidencia).
   - Datos clínicos: FUM ≤ hoy, semanas 1–42, peso/talla/PA en rangos fisiológicos.
3. **Feedback en tiempo real** por campo (borde rojo + texto bajo el input; `AppInput` ya lo soporta).
4. **Teclado:** `react-native-keyboard-controller` → inputs nunca tapados, scroll al campo enfocado, botón "siguiente/listo".
5. **Botón submit:** deshabilitado si inválido/enviando, con loader, posición fija sin cortes.

### Archivos
- `register.tsx`, `login.tsx`, `forgot-password.tsx`, `control/nuevo.tsx`, `gestante/nueva.tsx`, modales de `gestante/[id].tsx`, `admin/contenido.tsx`, `admin/config.tsx`.

### Validación específica
- Enviar formularios con datos inválidos → errores por campo claros, no Alert genérico.
- Teclado no tapa inputs en ninguna pantalla.
- Gate completo.

### Commit
`feat(fase-4): validación profesional con Zod en todos los formularios`

---

## FASE 5 — Navegación jerárquica + sidebar por rol

**Objetivo:** tabs solo con módulos clave; el resto en un sidebar profesional, con jerarquía y secuencia lógica por rol.

### Tareas
1. **Sidebar/drawer** (expo-router Drawer anidando Tabs, o `SidebarSheet` propio con bottom-sheet/reanimated). Botón de menú accesible en headers (icono Lucide), animación fluida.
2. **Reparto por rol:**
   - **Gestante** — Tabs: Inicio · Citas · Tratamiento · Chat · Perfil. Sidebar: Educación · Visitas · Notificaciones · Signos de alarma · Apariencia · Cerrar sesión.
   - **Obstetra** — Tabs: Inicio · Gestantes · Agenda · Alertas · Chat. Sidebar: Reportes · Perfil · Mensaje masivo · Notificaciones · Apariencia · Cerrar sesión. (Resuelve Perfil/Reportes hoy "huérfanos" con `href:null`.)
   - **Admin** — Tabs: Inicio · Usuarios · Contenido · Más. "Más" → Sidebar: Supervisión · Sedes · Config · Notificaciones · Auditoría · Apariencia · Cerrar sesión.
3. Asegurar **secuencia de uso lógica** (orden de items según frecuencia/importancia por rol).

### Validación específica
- Todas las pantallas accesibles desde tabs o sidebar; nada queda inalcanzable.
- Navegación de retorno consistente; animaciones fluidas.
- Gate completo.

### Commit
`feat(fase-5): navegación jerárquica con sidebar profesional por rol`

---

## FASE 6 — Rendimiento y responsive vista por vista

**Objetivo:** carga rápida y fluida (60fps), responsive perfecto, botones sin cortes/solapamientos en TODAS las vistas.

### Tareas
1. **FlashList** en listas largas: pacientes (`gestantes.tsx`), chat, notificaciones, usuarios (admin), alertas, agenda, citas. `estimatedItemSize`, items memoizados.
2. **Reportes y vistas** a grilla responsive (1/2/3 col según ancho); gráficas reescalan al contenedor; tablas con scroll horizontal si no caben.
3. **Trocear monolitos:** `gestante/[id].tsx` (extraer modales a `components/obstetra/modals/*`, estado con `useReducer`), `usuarios.tsx`.
4. **Paginaciones** con `placeholderData`/`keepPreviousData` → transición sin parpadeo.
5. **Revisión vista por vista** (checklist): header unificado · safe-area · estados loading/empty/error · botones bien ubicados (hitSlop, gap) · textos sin truncado indebido · grid responsive · iconografía Lucide.

### Validación específica
- Scroll fluido en listas grandes; sin "jank".
- Ninguna vista con desbordes, recortes o botones cortados en móvil/tablet/web.
- Gate completo.

### Commit
`perf(fase-6): listas virtualizadas (FlashList) + responsive y orden por vista`

---

## FASE 7 — QA integral (simulación de uso) + cierre

**Objetivo:** validar el sistema completo simulando usuarios reales, corregir lo que aparezca y cerrar.

### Tareas
1. **Walkthrough por rol con agent-browser** sobre la app web:
   - **Gestante:** login → dashboard → confirmar/reprogramar cita → registrar suplemento (online/offline) → signo de alarma → emergencia → chat → educación → perfil.
   - **Obstetra:** login → dashboard → buscar gestante → ficha → crear control/lab/vacuna/tratamiento → tamizajes → visita domiciliaria → agenda → resolver reprogramación → alertas → reportes (PDF/Excel) → chat.
   - **Admin:** login → usuarios (aprobar/activar) → contenido (CRUD) → supervisión → sedes → config → auditoría (export) → notificaciones.
2. **Matriz QA por vista** (errores, validaciones, diseño, botones, responsive, rendimiento) → corrección de hallazgos.
3. **Tipado:** reducir `: any` en capa de datos (tipos de respuesta del backend).
4. **Dark mode total** y accesibilidad AA.
5. Regresión de tests + actualización de documentación.

### Validación específica
- Los 3 recorridos completos sin errores de consola ni crashes.
- Gate completo + checklist de aceptación (abajo) al 100%.

### Commit
`chore(fase-7): QA integral por rol, correcciones finales y cierre`

---

## Checklist de aceptación final ("100%")

- [ ] Cero emojis; iconografía Lucide coherente en toda la app.
- [ ] Diseño único y continuo (ScreenLayout) en todas las vistas; responsive real (móvil/tablet/web).
- [ ] Dashboards claros, precisos, jerárquicos y sin saturación; comprensibles por cualquier usuario.
- [ ] Exportar PDF y Excel funciona en web y móvil (obstetra, admin, auditoría).
- [ ] Emergencia con diseño especializado y mensaje legible con ubicación.
- [ ] Modales propios de validación/confirmación (no diálogos del navegador/OS).
- [ ] Todos los formularios validan con Zod en tiempo real; inputs con reglas de dominio; teclado gestionado.
- [ ] Tabs con módulos clave; resto en sidebar profesional por rol; navegación jerárquica con guards.
- [ ] Listas en FlashList; transiciones y carga fluidas (60fps, sin parpadeos).
- [ ] Botones bien ubicados, sin cortes ni solapamientos en ninguna vista/resolución.
- [ ] `tsc` limpio, `jest` verde, walkthrough por rol sin errores.
- [ ] Cada fase commiteada y pusheada a GitHub tras validar.

---

## Resumen del flujo operativo

```
Por cada fase:
  1. Implementar tareas de la fase (commits pequeños locales).
  2. Ejecutar Gate de validación (tsc + jest + bundle + walkthrough).
  3. Si TODO pasa  -> git add/commit/push a GitHub.
     Si algo falla -> corregir y repetir el Gate (NO se sube roto).
  4. Avanzar a la siguiente fase.
```
