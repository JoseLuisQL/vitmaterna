# Plan de Corrección UI — VITMATERNA Frontend

> Diagnóstico tras análisis vista por vista en navegador (login → cada rol →
> cada tab). Documenta los bugs reales encontrados, su causa raíz, y el plan
> de corrección profesional ordenado por prioridad. Cada bloque se verifica en
> navegador y se commitea por separado a `main`.

---

## A. Diagnóstico — bugs confirmados

### 🔴 BUG-1 — Los tabs NO cargan el contenido (crítico)
**Síntoma:** al tocar un tab del menú inferior, la URL cambia (`/cronograma`)
pero la pantalla sigue mostrando la anterior (el dashboard). Cargar la URL
directa sí funciona.
**Causa raíz:** en `PillTabBar.tsx` uso `navigation.navigate(route.name)`. Con
los grupos anidados de expo-router (`(tabs)`), eso no resuelve la ruta. El
`BottomTabBar` oficial usa `navigation.dispatch(CommonActions.navigate(route))`
pasando el **objeto route completo** + `target: state.key`.
**Bug secundario:** filtro `routes` por `href !== null` y luego comparo contra
`state.index`, que indexa el array COMPLETO → el indicador pill y el "focused"
se desincronizan cuando hay rutas ocultas (todas las tabs tienen 2 ocultas).

### 🔴 BUG-2 — Botón "cerrar sesión" (admin) no funciona
**Síntoma:** en admin, tocar logout no hace nada.
**Causa raíz:** usa `Alert.alert('Cerrar sesión', ..., [botones])`. En **React
Native Web los `onPress` de los botones de `Alert.alert` no se ejecutan**
(Alert con botones no está soportado en web). Afecta a **20 archivos** que usan
`Alert.alert` para confirmar/guardar/eliminar → en web esas acciones no corren.

### 🔴 BUG-3 — Diseño "estirado" / roto en pantallas anchas
**Síntoma:** todo se ve desproporcionado, headers y tarjetas a ancho completo.
**Causa raíz:** la app es **mobile-first (máx 428px)** pero NO hay contenedor
de ancho máximo. En web/tablet el `#root` mide el ancho completo (1280px medido)
y cada tab queda en 183px, las tarjetas se estiran, el header gradient ocupa
toda la franja. Falta un *frame* centrado con ancho máximo.

### 🟠 BUG-4 — Scroll inconsistente / contenido tapado por el tab bar
**Síntoma:** en varias vistas el último contenido queda debajo del tab bar
flotante; algunas no hacen scroll hasta el fondo.
**Causa raíz:** el tab bar ahora mide ~80px (con safe-area) pero cada pantalla
define su propio `paddingBottom` inconsistente (unas `spacing.xl`=32, otras
`100`, el dashboard gestante usa `bounces={false}` y 40px). No hay un token
único de "espacio para el tab bar".

### 🟠 BUG-5 — Inconsistencia de headers entre vistas (desorden visual)
**Síntoma:** unas pantallas tienen header gradient del rol y otras header plano
blanco; rompe la sensación de orden.
**Inventario medido:**
- **Gestante:** con gradient → index, educacion, mi-progreso, tratamiento.
  SIN gradient → **citas, chat, perfil, alarmas, chatbot, notificaciones, visitas**.
- **Obstetra:** con gradient → index, alertas, cronograma, gestantes, reportes.
  SIN gradient → **chat, perfil**.
- **Admin:** con gradient → usuarios, sedes.
  SIN gradient → **contenido, config, auditoria**.

### 🟡 BUG-6 — Warnings de HTML en web (no rompen, pero ensucian)
`<button> cannot be a descendant of <button>` por Pressables anidados
(AppCard con onPress que contiene botones internos; NotificationBell dentro de
header pressable). Y `onResponderMove` de react-native-chart-kit en web.

---

## B. Plan de corrección (por bloques, cada uno con verificación + commit)

### Bloque 1 — Navegación de tabs (BUG-1)  🔴
- Reescribir `PillTabBar` para:
  - Navegar con `navigation.dispatch(CommonActions.navigate(route))` +
    `target: state.key` (patrón oficial).
  - Calcular "focused" e indicador con el **mapeo correcto** entre rutas
    visibles y `state.index` (resolver índice por `route.key`, no por posición
    en el array filtrado).
- Verificar en navegador: tocar cada tab de los 3 roles cambia el contenido.

### Bloque 2 — Confirmaciones y logout en web (BUG-2)  🔴
- Crear util `confirm()` cross-platform: en web usa `window.confirm`/`prompt`,
  en nativo usa `Alert.alert`. (Helper `src/utils/confirm.ts`.)
- Reemplazar los `Alert.alert(..., [Cancelar, Acción])` de confirmación por el
  helper en: logout (admin), toggle usuario, eliminar (antecedente, sede,
  contenido, visita), suspender tratamiento, emergencia, etc.
- Los `Alert.alert` de un solo botón (avisos "Éxito/Error") se migran a
  `useToast` donde sea barato; el resto se deja (funcionan en nativo y el toast
  es mejor UX en web).
- Verificar: logout admin funciona en web.

### Bloque 3 — Frame mobile-first + scroll (BUG-3, BUG-4)  🔴
- Añadir contenedor central de ancho máximo (`ScreenFrame` o estilo en
  `_layout` raíz) que limite el contenido a ~440px y lo centre con fondo
  ice-blue a los lados en pantallas anchas (web/tablet). Mobile nativo no se
  ve afectado.
- Token único `layout.tabBarSpace` (~96px) y aplicarlo como `paddingBottom`
  del `contentContainerStyle` de TODAS las listas/scrolls de pantallas con
  tab bar. Quitar `bounces={false}` del dashboard gestante.
- Verificar: contenido no queda tapado; scroll llega al fondo en cada vista.

### Bloque 4 — Consistencia de headers (BUG-5)  🟠
- Unificar TODAS las vistas restantes al patrón header gradient del rol
  (gestante lila, obstetra azul, admin slate) usando el mismo
  `AppHeader variant="gradient"` o el bloque LinearGradient estándar:
  citas, chat, perfil, alarmas(*), chatbot, notificaciones, visitas (gestante);
  chat, perfil (obstetra); contenido, config, auditoria (admin).
  (*) alarmas mantiene su gradiente rojo por ser de emergencia.
- Unificar radios, sombras y paddings a los tokens (sin valores hardcodeados
  nuevos).
- Verificar: las 3 áreas se ven coherentes tab a tab.

### Bloque 5 — Limpieza de warnings + QA final (BUG-6)  🟡
- Quitar anidaciones de Pressable donde sea simple (NotificationBell en header,
  AppCard con onPress + botón interno → separar).
- QA: recorrer en navegador login + cada rol + cada tab + scroll + 1 acción de
  confirmación por rol. `tsc` + tests + bundle en cada commit.

---

## D. Resultado de la ejecución (QA en navegador)

- **BUG-1 (tabs):** resultó un **falso positivo** del método de diagnóstico
  (`innerText` lee la pantalla oculta detrás con z-index −1). La conmutación de
  tabs **sí funciona** (verificado: al centro de la pantalla siempre se ve la
  pantalla activa). Se mejoró igual `PillTabBar` (navegación oficial + índice).
- **BUG-2 (logout/confirm):** **corregido**. `confirmAction()` cross-platform.
  Verificado: cancelar mantiene en `/usuarios`, aceptar va a `/login`.
- **BUG-3 (mobile-first):** **corregido**. `MobileFrame` centra la app en 440px
  en web. Verificado en dashboard, ficha clínica, admin.
- **BUG-4 (scroll):** **corregido**. Token `layout.tabBarSpace` en todas las
  listas/scrolls. Verificado: el contenido llega al fondo sin taparse.
- **BUG-5 (headers):** **corregido**. Headers gradient por rol en todas las
  vistas (gestante, obstetra, admin).

**QA final (navegador):** recorridas las 5 tabs gestante, 7 obstetra, 5 admin
+ ficha clínica → todas renderizan su contenido correcto, con header gradient,
frame mobile y scroll. Sin errores críticos de consola. `tsc` + 44 tests OK.

> Nota: el apilamiento de pantallas en web (ambas en el DOM) es comportamiento
> de expo-router + react-native-screens en web y **existía desde el commit
> inicial** (no es regresión). No afecta lo que el usuario ve (z-index correcto)
> ni el comportamiento en dispositivo nativo.

## C. Reglas que se respetarán (consistencia)
- Cero valores de color/spacing hardcodeados nuevos: solo tokens del theme.
- Un único patrón de header por rol (gradient + safe-area + radios inferiores).
- Un único token de espacio inferior para el tab bar.
- Todas las listas: `RefreshControl`, `EmptyState`/skeleton, `paddingBottom`
  del tab bar.
- Verificación en navegador real antes de cada commit a `main`.
