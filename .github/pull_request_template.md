<!--
  VITMATERNA — Plantilla de Pull Request
  Marca lo que aplique. La sección "Sistema de diseño" es obligatoria para
  cualquier cambio que toque el frontend (carpeta `frontend/`).
-->

## Qué cambia y por qué

<!-- Resumen breve: el problema y la solución. El "porqué", no solo el "qué". -->

## Tipo de cambio

- [ ] Funcionalidad nueva
- [ ] Corrección de bug
- [ ] Refactor / diseño (sin cambio funcional)
- [ ] Documentación / infraestructura

## Checklist de calidad (frontend)

Ejecuta `npm run verify` en `frontend/` antes de pedir revisión.

- [ ] `npm run tsc` sin errores
- [ ] `npm run audit:design:strict` → **0 violaciones bloqueantes**
- [ ] `npm run test` en verde
- [ ] Probado en **web** y **móvil** (render dual: tabla↔tarjetas, sidebar↔tabs)

## Sistema de diseño (obligatorio si tocas `frontend/`)

- [ ] Color y medidas vienen de **tokens** (`theme/`); cero `#hex` / `rgba()` en `app/`
- [ ] La pantalla usa **ScreenLayout** o un patrón de `components/patterns/` (no header propio)
- [ ] Botones = `AppButton` / `IconButton` / `LinkButton` (con label de a11y y foco web)
- [ ] Campos = familia `Field` / `AppInput` (teclado manejado, error inline)
- [ ] Superficies modales = `Overlay` / `AppModal` / `BottomSheet` (no `<Modal>` de react-native)
- [ ] Avisos = `useToast` / `ConfirmSheet` (no `Alert.alert`); copys en **voz activa** y minúscula tipo oración
- [ ] Carga = **skeleton 1:1**; `ActivityIndicator` solo en micro-cargas
- [ ] Los 4 estados cubiertos: cargando / vacío (con CTA) / error (con reintento) / contenido
- [ ] a11y: `accessibilityRole`/`Label`, área táctil ≥48, contraste AA, reduce-motion respetado

## Capturas (si hay cambios visuales)

<!-- Adjunta web + móvil. Para el portal web puedes usar scripts/qa-visual.sh -->
