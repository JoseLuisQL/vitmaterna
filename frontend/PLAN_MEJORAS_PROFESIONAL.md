# Plan de Mejora y Optimización Profesional — Frontend VITMATERNA

> Objetivo: llevar el frontend al 100% en arquitectura, UI/UX, rendimiento y robustez.
> Reglas globales: **cero emojis** (solo iconografía profesional Lucide), **un único sistema de diseño** continuo y vinculado entre vistas, responsive real por resolución, carga rápida y fluida.
> Este documento es el plan. La ejecución se hará por fases verificables (typecheck + tests verdes en cada una).

---

## 0. Diagnóstico ejecutivo (hallazgos confirmados en el código)

| # | Hallazgo | Archivo(s) | Severidad |
|---|---|---|---|
| H1 | **Exportar PDF no funciona en web** (`Print.printToFileAsync` + `Sharing.shareAsync` directos; en web `Sharing` no está disponible) | `app/(obstetra)/(tabs)/reportes.tsx:100`, `app/(admin)/supervision/reportes.tsx:62` | Alta |
| H2 | **Validaciones con diálogos nativos** (`window.confirm/alert`, `Alert.alert`) en vez de modal diseñado | `src/utils/confirm.ts`, `register.tsx` | Alta |
| H3 | **`register.tsx` sin `zodResolver`**: `errors` inline nunca se llenan; valida en submit y muestra 1 error en `Alert` | `app/(auth)/register.tsx:84` | Alta |
| H4 | **Emergencia sin diseño**: el botón del dashboard solo lanza un `toast` | `app/(gestante)/(tabs)/index.tsx:54` | Alta |
| H5 | **Sin guards de rol** en los `_layout.tsx` (acceso por deep-link a otro rol) | `app/(gestante|obstetra|admin)/_layout.tsx` | Alta |
| H6 | **Tabs con pantallas huérfanas**: Perfil/Reportes (obstetra) con `href:null` sin sidebar que las exponga | `app/(obstetra)/(tabs)/_layout.tsx:58` | Media |
| H7 | **FlashList instalada pero sin usar** (16 `FlatList`, 28 `ScrollView+.map`) | varios | Media |
| H8 | **Reportes/vistas no 100% responsive** por anchos fijos y `ScrollView+map` que no virtualiza ni reflowa | `reportes.tsx`, fichas | Media |
| H9 | **Monolitos**: `gestante/[id].tsx` (1934 líneas, 40 `useState`, ~9 modales), `usuarios.tsx` (1005) | 2 archivos | Media |
| H10 | **121 `: any`** en capa de datos; mapeos sin tipos de respuesta | `api-queries.ts` | Baja |
| H11 | **Dark mode incompleto**: coexisten `commonColors` (fijo) y `useThemedColors()` | global | Baja |
| H12 | **Teclado**: `KeyboardAvoidingView` manual (comportamiento dispar iOS/Android/web) | formularios | Baja |

---

## 1. Dependencias especializadas a incorporar (React Native, lo más nuevo y profesional)

> Todas compatibles con Expo SDK 56 / RN 0.85 / React 19. Se instalan con `npx expo install` para fijar versiones correctas.

| Dependencia | Para qué | Reemplaza / mejora |
|---|---|---|
| **react-native-unistyles v3** | Sistema de estilos **C++** ultrarrápido con **temas, breakpoints y variants** nativos. Es la pieza para "formato único, responsive por resolución, continuo y fluido". | Centraliza theming + responsive; elimina anchos fijos y el dualismo `commonColors`/`useThemedColors` (H8, H11) |
| **@shopify/flash-list** (ya instalada) | Listas virtualizadas de alto rendimiento. | Migrar los 16 `FlatList` y `ScrollView+map` largos (H7) |
| **@gorhom/bottom-sheet v5** | Bottom sheets y modales profesionales con gestos, snap points y backdrop. | Modales de validación/confirmación y formularios (H2) |
| **react-native-keyboard-controller** | Manejo de teclado de nivel producción (sticky inputs, animaciones suaves, consistente iOS/Android). | `KeyboardAvoidingView` manual (H12) |
| **react-native-gifted-charts** (o mantener SVG propio) | Gráficas profesionales (barras/líneas/donut) responsive para reportes. | `ChartBar`/`LineChartSvg` si se requiere más fidelidad (H8) |
| **expo-print** (ya) + **expo-sharing** (ya) + nuevo helper web | Exportar PDF con **fallback web** (imprimir/descargar). | Arregla H1 |
| **xlsx (SheetJS)** o **exceljs** | Export **Excel real (.xlsx)** además de CSV. | "exportar Excel no funciona" |
| **@hookform/resolvers + zod** (ya) | Validación declarativa consistente en **todos** los formularios. | Cablear donde falta (H3) |
| **react-native-reanimated** (ya) + **react-native-worklets** (ya) | Animaciones de transición/lista/feedback a 60fps. | Transiciones "vinculadas" entre vistas |
| **expo-router Drawer** / **react-native-drawer-layout** | Sidebar profesional para módulos secundarios por rol. | Arregla H6 |

---

## 2. Sistema de diseño único, continuo y responsive (base de todo)

**Decisión arquitectónica:** adoptar **react-native-unistyles v3** como capa de estilo única.

- **Tokens existentes** (`src/theme/*`) se migran a la config de Unistyles (colores por rol, tipografía, espacio, sombras, radios). Se conserva la marca ice-blue + acento por rol.
- **Breakpoints** (`xs/sm/md/lg/xl`) → cada vista responde automáticamente al ancho real del dispositivo (teléfono pequeño, grande, tablet, web). Elimina anchos fijos que descuadran (H8).
- **Variants** por rol (gestante/obstetra/admin) → un mismo componente cambia de acento sin duplicar estilos.
- **Tema claro/oscuro** unificado → se elimina el dualismo `commonColors`/`useThemedColors` (H11); todas las vistas reaccionan al tema.
- **Plantilla de pantalla única** `ScreenLayout` (header con gradiente por rol + cuerpo responsive + safe-area + estados loading/empty/error estandarizados) que **todas** las vistas usan → consistencia y "continuidad" visual, y carga percibida más rápida (skeletons unificados).

Entregable: `src/theme/unistyles.ts`, `src/components/layout/ScreenLayout.tsx`, refactor de `MobileFrame` para apoyarse en breakpoints.

---

## 3. Navegación jerárquica por rol + Sidebar profesional (H6)

Principio: **la barra inferior solo lleva los módulos más usados; el resto va a un sidebar (drawer) profesional**, con jerarquía y secuencia lógica según el rol logueado.

### Gestante (flujo: ver estado → actuar → comunicarse)
- **Tabs (5, los críticos):** Inicio · Citas · Tratamiento · Chat · Perfil.
- **Sidebar:** Educación · Visitas domiciliarias · Notificaciones · Signos de alarma · Apariencia (tema) · Cerrar sesión.

### Obstetra (flujo: priorizar → atender → registrar → analizar)
- **Tabs (5):** Inicio · Gestantes · Agenda · Alertas (con badge) · Chat.
- **Sidebar:** Reportes · Perfil · Mensaje masivo · Notificaciones · Apariencia · Cerrar sesión.
  - (Hoy Perfil y Reportes están con `href:null` y **sin** punto de acceso claro → el sidebar lo resuelve.)

### Admin (flujo: gestionar → supervisar → configurar)
- **Tabs (4):** Inicio · Usuarios · Contenido · (mantener) Más → se convierte en **Sidebar**.
- **Sidebar:** Supervisión (Reportes/Gestantes/Citas) · Sedes · Configuración · Notificaciones · Auditoría · Apariencia · Cerrar sesión.

Implementación: `expo-router` con `Drawer` anidando el `Tabs`, o un `SidebarSheet` propio con `@gorhom/bottom-sheet`/reanimated. Header con botón de menú accesible (icono profesional), animación fluida.

**Guards de rol (H5):** en cada `_layout.tsx` de rol leer `useAuthStore` y `<Redirect>` si el rol no coincide o no hay sesión (defensa en profundidad).

---

## 4. Alerta de Emergencia con diseño especializado (H4)

Rediseño del flujo de emergencia (el más sensible de la app):

1. **Botón de emergencia** (dashboard gestante): pasa de un simple toast a abrir un **modal/bottom-sheet de confirmación de emergencia** con jerarquía visual de urgencia:
   - Cabecera roja con icono `ShieldAlert`/`Siren` (Lucide), título claro ("Enviar alerta de emergencia"), mensaje entendible.
   - Estado de **obtención de ubicación GPS** (spinner → "Ubicación obtenida").
   - Botones grandes, separados, sin cortes: **Enviar ahora** (rojo, primario) y **Cancelar**.
2. **Estado de envío** profesional: progreso → confirmación con animación (check) → tarjeta "Tu obstetra fue notificada con tu ubicación" + acceso directo a **llamar** al centro de salud.
3. **Componente reutilizable** `EmergencyAlert` (sheet) usado tanto en dashboard como en `alarmas.tsx`, con copy claro, contraste AA, e iconografía coherente (sin emojis).
4. **Mensaje de la alerta** (lo que recibe el obstetra y el push): plantilla redactada y legible ("Emergencia: [Nombre] solicita auxilio. Ubicación: [link mapa]. Hora: [hh:mm]."), no texto crudo.

Entregable: `src/components/shared/EmergencyAlert.tsx` + estilos Unistyles + integración en dashboard y alarmas.

---

## 5. Modales de validación / confirmación especializados (H2, H3)

1. **Sustituir** `window.confirm/alert` y `Alert.alert` por un sistema propio:
   - `ConfirmSheet` (confirmaciones destructivas/no destructivas) con `@gorhom/bottom-sheet`: icono temático, título, mensaje, botones bien posicionados, soporte web + nativo idéntico.
   - `ValidationModal` para errores de formulario: lista de campos con error, iconografía de advertencia, acción "Entendido".
   - Mantener `ToastProvider` para éxito/confirmaciones leves.
2. **Cablear `zodResolver` en TODOS los formularios** (arreglar `register.tsx`, H3): errores inline por campo en tiempo real, no en un Alert al final.
3. **Validaciones profesionales de inputs** (ver §8).

---

## 6. Exportación de Reportes — PDF y Excel funcionando (H1)

1. **PDF**:
   - Crear `src/utils/exportPdf.ts` con ramas:
     - **Nativo (iOS/Android):** `expo-print` → `printToFileAsync` → `expo-sharing`.
     - **Web:** abrir el HTML del reporte en un iframe oculto y `window.print()` (o generar Blob y abrir/descargar) → así el "Exportar PDF" funciona en navegador.
   - Reemplazar las llamadas directas en `reportes.tsx` (obstetra) y `supervision/reportes.tsx` (admin) por este helper.
2. **Excel real (.xlsx)**:
   - Añadir export `.xlsx` con SheetJS además del CSV actual, con hojas (Resumen, Indicadores MINSA, Pacientes prioritarias) y estilos básicos.
   - `src/utils/exportExcel.ts` con fallback web (Blob download) + nativo (FileSystem + Sharing).
3. **Auditoría** (`auditoria.tsx`): usar el mismo helper (hoy usa `Sharing` directo, falla en web).
4. **Feedback**: estados de carga por botón ya existen; añadir toasts de éxito/fallo consistentes.

---

## 7. Rendimiento, responsive y orden visual vista por vista (H7, H8, H9)

### 7.1 Listas y carga fluida
- Migrar a **FlashList** las listas largas: pacientes (`gestantes.tsx`), chat (`chat.tsx`), notificaciones, usuarios (admin), alertas, agenda.
- `estimatedItemSize`, `keyExtractor` estable, items memoizados → scroll a 60fps.
- Mantener React Query (prefetch por rol, optimismo) + añadir **placeholderData**/`keepPreviousData` en paginaciones para transición sin parpadeo.

### 7.2 Responsive real (auto-ajuste a resolución)
- Sustituir anchos en píxeles fijos por **breakpoints de Unistyles** y `AutoGrid` (ya existe) en KPIs, tarjetas y reportes.
- **Reportes** (la queja principal): reordenar con grilla responsive (1 col en teléfono, 2–3 en tablet/web), gráficas que se reescalan al contenedor, tablas con scroll horizontal cuando no caben. Sin recortes ni desbordes.

### 7.3 Revisión vista por vista (checklist aplicado a las 40+ pantallas)
Para **cada** vista: header unificado · safe-area correcta · estados loading/empty/error · botones sin cortes ni solapamientos (hitSlop, posición, `gap`) · textos sin truncado indebido · grilla responsive · navegación de retorno consistente · iconografía Lucide (sin emojis). Se documenta el resultado en una matriz QA (§9).

### 7.4 Trocear monolitos (H9)
- `gestante/[id].tsx`: extraer cada modal a `src/components/obstetra/modals/*` y agrupar estado con `useReducer`/subcomponentes → menos re-renders, mantenible.
- `usuarios.tsx`: separar lista, filtros y detalle.

---

## 8. Formularios e inputs con validación profesional (H3)

- **Esquemas Zod por formulario** con mensajes claros en español y reglas de dominio:
  - DNI peruano (8 dígitos), teléfono (9 dígitos, empieza en 9), COP obstetra, contraseñas (fortaleza + coincidencia), fechas clínicas (FUM ≤ hoy, rangos plausibles), pesos/tallas/PA con rangos fisiológicos, semanas 1–42.
- **`zodResolver` en todos** los `useForm` (incluye `register.tsx`).
- **Feedback en tiempo real**: error por campo bajo el input (ya soportado por `AppInput`), borde rojo, `aria`/accesibilidad.
- **Teclado**: `react-native-keyboard-controller` → inputs nunca tapados, scroll automático al campo enfocado, "siguiente/listo".
- **Máscaras/formatos**: DNI, teléfono, fechas con `DateTimeField` ya existente.
- **Botón submit**: deshabilitado mientras inválido/enviando, con loader; posición fija y sin cortes.

---

## 9. Simulación interna de uso (recorrido completo por rol) para detectar errores

Antes y después de cada fase se ejecuta un **walkthrough funcional** simulando a un usuario real, módulo por módulo, hasta completar procesos de uso. Se hará con **agent-browser** (automatización de navegador) sobre la app web ya levantada, y revisión de código:

### Recorridos a simular
- **Gestante:** login → dashboard → confirmar cita → solicitar reprogramación → registrar toma de suplemento (online y offline) → reportar signo de alarma → emergencia → chat (enviar/recibir) → educación → perfil/editar.
- **Obstetra:** login → dashboard → buscar gestante → abrir ficha → crear control/laboratorio/vacuna/tratamiento → tamizajes → visita domiciliaria → agenda → resolver reprogramación → alertas → reportes (PDF/Excel) → chat.
- **Admin:** login → usuarios (aprobar/activar) → contenido (CRUD) → supervisión (reportes/gestantes/citas) → sedes → config → auditoría (export) → notificaciones.

### Qué se registra (matriz QA por vista)
Errores funcionales · validaciones que fallan · inconsistencias de diseño · botones mal ubicados/cortados · problemas responsive · cuellos de rendimiento · navegación rota. Resultado → backlog priorizado y correcciones.

---

## 10. Fases de ejecución (incrementales, cada una verificable)

> Cada fase termina con `tsc --noEmit` limpio + `jest` verde + walkthrough de las vistas tocadas. Commits pequeños.

| Fase | Contenido | Resultado |
|---|---|---|
| **F0 — Base** | Instalar deps (Unistyles, FlashList adopt, bottom-sheet, keyboard-controller, SheetJS). Configurar Unistyles con tokens actuales. Crear `ScreenLayout`, `ConfirmSheet`, `ValidationModal`. Guards de rol. | Cimientos del diseño único + seguridad de rutas |
| **F1 — Exportación** | `exportPdf.ts` (web+nativo), `exportExcel.ts` (.xlsx), cablear en reportes obstetra/admin y auditoría. | PDF y Excel funcionando en web y móvil |
| **F2 — Emergencia y validaciones** | `EmergencyAlert` sheet, integrar en dashboard/alarmas. Reemplazar `confirm/alert` por `ConfirmSheet`. `zodResolver` + esquemas en todos los formularios. Keyboard-controller. | Emergencia y validaciones profesionales |
| **F3 — Navegación** | Sidebar/drawer por rol, tabs solo con módulos clave, jerarquía y secuencia lógica. | Navegación jerárquica perfecta |
| **F4 — Rendimiento + responsive** | FlashList en listas, breakpoints Unistyles, reordenar reportes y vistas, trocear monolitos. | Carga rápida, fluida y 100% responsive |
| **F5 — QA vista por vista** | Walkthrough completo por rol, matriz QA, corrección de botones/cortes/inconsistencias, tipado (`any`→tipos). | App pulida al 100% |
| **F6 — Cierre** | Dark mode total, accesibilidad AA, regресión de tests, documentación. | Listo para producción |

---

## 11. Criterios de aceptación (definición de "100%")

- [ ] **Cero emojis**; toda iconografía es Lucide profesional y coherente.
- [ ] Exportar **PDF** y **Excel** funciona en web y móvil (los 3 puntos de export).
- [ ] **Emergencia** con diseño especializado, claro y profesional; mensaje legible con ubicación.
- [ ] **Modales de validación/confirmación** propios (no diálogos del navegador/OS).
- [ ] **Todos** los formularios validan con Zod en tiempo real; inputs con reglas de dominio.
- [ ] **Tabs** solo con módulos clave; resto en **sidebar** profesional por rol.
- [ ] **Todas** las vistas usan la plantilla única y son responsive (sin desbordes/recortes/botones cortados) en teléfono, tablet y web.
- [ ] Navegación **jerárquica y secuencial** por rol con **guards**.
- [ ] Listas en **FlashList**; transiciones y carga fluidas (60fps, sin parpadeos).
- [ ] `tsc` limpio, `jest` verde, walkthrough por rol sin errores.

---

## 12. Riesgos y mitigaciones

- **Unistyles v3 + Expo 56/React 19:** validar compatibilidad en F0 con un spike; si hay fricción, alternativa: mantener tokens actuales + `useWindowDimensions`/breakpoints propios (mismo objetivo, menos magia).
- **Migración masiva de estilos:** se hace por fases y pantalla por pantalla, con tests, para no romper lo que ya funciona.
- **expo-print en web:** confirmar el fallback (`window.print`/Blob) en F1 antes de extender.
- **Tamaño de cambios:** commits pequeños y verificables; nada se mergea sin typecheck+tests+walkthrough.
```
```
