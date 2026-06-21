# Reporte de rendimiento — Frontend VITMATERNA (React Native / Expo)

Diagnóstico guiado por la skill **react-native-best-practices** (Callstack "Ultimate Guide
to React Native Optimization"). Metodología: **Measure → Optimize → Re-measure → Validate**.

## Contexto / stack

| Lib | Versión | Nota |
|---|---|---|
| expo | ~56.0.9 | SDK 56 → soporta React Compiler vía `experiments` |
| react | 19.2.3 | Ideal para React Compiler |
| react-native | 0.85.3 | Nueva arquitectura por defecto, Hermes |
| @shopify/flash-list | 2.0.2 | **v2**: `estimatedItemSize` deprecado (no aplica) |
| react-native-reanimated | 4.3.1 | + `react-native-worklets` 0.8.3 |

---

## Hallazgos (priorizados por impacto)

### 1. [CRÍTICO · re-renders] Memoización ausente → **RESUELTO con React Compiler** ✅

**Evidencia (medida):**
- `0` usos de `React.memo` en toda la base de código (`src/` + `app/`).
- Ítems de lista re-creados sin memoizar: `ConversationListItem`, `Bubble`
  (`MessageThread.tsx`), tarjetas de `gestantes`, etc.
- `renderItem` inline (arrow nueva en cada render) en 7 listas:
  `chat.tsx:169`, `index.tsx (obstetra):263`, `educacion.tsx:451`,
  `supervision/citas.tsx:146`, `supervision/gestantes.tsx:167`,
  `ListScreen.tsx:201`, `NuevaCitaModal.tsx:286`.
- 49 `useCallback` / 59 `useMemo` repartidos de forma desigual (optimización manual parcial).

**Fix aplicado — React Compiler (memoización automática):**
- `npx expo install babel-plugin-react-compiler`
- `app.json` → `expo.experiments.reactCompiler: true`
- Healthcheck previo: **`Successfully compiled 209 out of 209 components`**, sin
  StrictMode ni librerías incompatibles → adopción segura al 100%.

**Re-measure / validación:**
- `npm run tsc` → **0 errores**.
- Bundle web reconstruido: contiene `memo_cache_sentinel` y **450 sitios de
  memoización** (`_c` / `useMemoCache`) inyectados por el compiler.
- Esto memoiza automáticamente componentes, callbacks y cómputos, eliminando
  los re-renders en cascada **sin** tener que añadir `memo`/`useCallback` a mano
  (incluyendo los `renderItem` inline y los ítems de lista no memoizados).

> Nota de la guía: con el compiler activo, **no** se debe añadir memoización
> manual encima; es redundante. La memoización manual existente puede limpiarse
> de forma incremental más adelante.

### 2. [MEDIO · listas] `ScrollView` con listas dinámicas

La mayoría de listas largas ya usan `FlashList`/`FlatList` correctamente
(p.ej. `gestantes`, `educacion`, `chat`, `MessageThread`, `ListScreen`). Caso a vigilar:

- **`app/(obstetra)/(tabs)/index.tsx:220`** — en la rama **web** (`webShell`),
  "Citas de hoy" hace `appointments.map(...)` dentro de un `<ScrollView>`.
  En móvil la misma pantalla ya usa `FlatList` (línea 254). Como es la agenda
  *de un día* (decenas de ítems máx.), el riesgo es bajo, pero si el dataset
  crece conviene unificar a `FlashList` también en web.

**Falsos positivos descartados** (la guía: `<20` ítems estáticos en ScrollView está OK):
`alarmas.tsx`, `visitas.tsx`, `register.tsx`, selectores horizontales de fecha,
`DataTable` (tabla web con su propio scroll), sidebars. No requieren cambio.

### 3. [BAJO · bundle] Barrel exports e imports

- `src/components/ui/index.ts` exporta ~50 símbolos; se importa por barrel en
  32 sitios. Con Metro + tree-shaking de Expo el impacto es menor, pero importar
  directo del archivo reduce evaluación de módulos en TTI. Opcional.
- `lucide-react-native` (74 archivos) y `date-fns` ya se importan **por named
  import** (correcto, no por default/barrel completo).

### 4. Sin problemas detectados

- **Reanimated 4**: el plugin de worklets se inyecta automáticamente vía
  `babel-preset-expo` (verificado en `node_modules/babel-preset-expo/.../expo.js`).
  No falta configuración. ✅
- **Animaciones JS-thread**: no se halló `useNativeDriver: false`. ✅
- **FlashList v2**: no se usa `estimatedItemSize` (correcto para v2). ✅

---

## Cambios aplicados en este pase

| Archivo | Cambio |
|---|---|
| `package.json` | + `babel-plugin-react-compiler` |
| `app.json` | `experiments.reactCompiler: true` |

## Recomendaciones siguientes (no aplicadas)

1. **Medir en runtime** con React DevTools Profiler la pantalla de chat y la
   lista de gestantes (commits, re-render count) antes/después — el análisis
   aquí es estático; la validación definitiva es el profiler en dispositivo.
2. Unificar "Citas de hoy" web a `FlashList` si el volumen por día crece (#2).
3. (Opcional) Setear `eslint-plugin-react-compiler` para mantener las Reglas de
   React y no perder optimizaciones.
4. (Opcional) Limpiar `useMemo`/`useCallback` manuales ya cubiertos por el compiler.

## Cómo validar

```bash
cd frontend
npm run tsc                 # 0 errores (validado)
npm run web -- --clear     # Metro con caché limpia
# Confirmar compiler en el bundle:
curl -s "http://localhost:8081/index.bundle?platform=web&dev=true" \
  | grep -c memo_cache_sentinel    # > 0  => compiler activo
```
