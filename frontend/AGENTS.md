# VITMATERNA — Reglas del frontend

> Lee esto antes de crear o modificar pantallas y componentes.

## Expo HAS CHANGED

Lee la documentación versionada exacta en
https://docs.expo.dev/versions/v56.0.0/ antes de escribir cualquier código.

---

## Sistema de diseño (no negociable)

El frontend tiene un sistema de diseño propio. Toda UI nueva se construye con él;
no se reinventan estilos. Antes de mergear, `npm run verify` debe pasar.

### Jerarquía (de abajo hacia arriba)
1. **Tokens** (`src/theme/`): color, tipografía (Inter), espacio (grid 8pt),
   sombra, radio, `zIndex`, `motion`, `stack`. **Única fuente de valores.**
2. **Primitivas** (`src/components/ui/`): `AppButton`, `IconButton`, `LinkButton`,
   familia `Field` (`TextField`/`SelectField`/`SearchField`/`TextAreaField`/`NumberField`),
   `AppCard`, `AppBadge`, `StatusChip`, `Skeleton`/skeletons de dominio, etc.
3. **Patrones** (`src/components/patterns/`): `ListScreen`, `DetailScreen`,
   `FormScreen`/`FormSheet`, `DashboardScreen`, `SectionCard`, `Overlay`, `ConfirmSheet`.
4. **Plantilla** (`src/components/layout/ScreenLayout`): el molde de toda pantalla.
5. **Pantallas** (`app/`): solo composición + datos. Sin estilos de "chrome".

### Reglas que vigila `npm run audit:design`
En `app/` está **prohibido**:
- Literales de color `#hex` o `rgba()` → usa tokens de `theme/colors`
  (incluye `onColor*` para superficies sobre gradiente, `chatColors`, `accentColors.whatsapp`).
- `Alert.alert` → usa `useToast` (avisos) o `ConfirmSheet`/`confirmAction` (confirmaciones).
- `<Modal>` de `react-native` → usa `Overlay` (móvil: BottomSheet / web: AppModal).
- `SafeAreaView` de `react-native` → usa `react-native-safe-area-context`.
- `zIndex` numérico suelto → usa `theme/zIndex`.

### Convenciones
- **Web vs móvil**: una sola base de código. Bifurca con `useResponsive().webShell`,
  nunca con estilos sueltos. Listas densas: tabla en web ↔ tarjetas en móvil.
- **Carga**: skeleton 1:1 (vía `ScreenLayout loading` o skeletons de dominio).
  `ActivityIndicator` solo para micro-cargas (botón enviando, "cargando más").
- **Estados**: cada pantalla cubre cargando / vacío (con CTA) / error (con reintento) / contenido.
- **Copys**: voz activa, minúscula tipo oración, el verbo de la acción se conserva
  en el resultado ("Guardar" → "Guardado"). Errores sin disculpas: qué pasó + cómo seguir.
- **Accesibilidad**: `accessibilityRole`/`Label`, área táctil ≥48, contraste AA,
  reduce-motion respetado (`useReducedMotion`).
- **Marca**: no se cambian paleta, tipografía (Inter) ni el grid de 8pt.

## Puerta de calidad

```bash
cd frontend
npm run verify   # tsc + audit:design:strict + jest  (todo debe pasar)
```

QA visual del portal web (con `npm run web` activo):
```bash
bash scripts/qa-visual.sh
```

Más contexto: `DESIGN_QA_LOG.md` (bitácora de pruebas) y
`../PLAN_REFACTOR_DISENO_FRONTEND.md` (plan completo del sistema).
