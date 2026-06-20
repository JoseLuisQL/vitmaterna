# Registro de QA de Diseño — VITMATERNA

Bitácora de la red de pruebas del rediseño (Fase 5). Sirve de memoria de lo
verificado para no repetir y para detectar regresiones.

## Puerta de calidad (correr antes de cada merge)

```bash
npm run verify   # tsc (0) + audit:design:strict (0 bloqueantes) + jest (todo verde)
```

Equivale a:
- `npm run tsc` — TypeScript sin errores.
- `npm run audit:design:strict` — 0 violaciones bloqueantes (hex, rgba, Alert.alert, Modal RN, SafeAreaView de react-native).
- `npm run test` — toda la suite Jest.

QA visual reproducible (requiere `npm run web` activo):
```bash
bash scripts/qa-visual.sh            # captura rutas públicas en /tmp/vitmaterna-qa
```

## Capas de prueba

| Capa | Qué cubre | Archivos |
|---|---|---|
| 1 · Estados de pantalla | loading / vacío / error / contenido del molde común | `__tests__/screen-states.test.tsx` |
| 2 · Contrato de primitivas | render y comportamiento de cada primitiva | `__tests__/primitives-fase1.test.tsx`, `components.test.tsx`, `signature-components.test.tsx` |
| 3 · Accesibilidad | roles, labels y estados (disabled/selected) | `__tests__/accessibility.test.tsx` |
| 4 · Visual / navegador | render real en web, consola sin errores | `scripts/qa-visual.sh` + `agent-browser` |
| — · Patrones | ListScreen/DetailScreen/FormScreen/Dashboard/SectionCard | `__tests__/patterns-fase2.test.tsx` |
| — · Tokens | z-index, stack, motion, onColor*, chat, whatsapp | `__tests__/design-tokens.test.ts`, `theme.test.ts` |

## Estado actual (última corrida)

- **tsc:** 0 errores.
- **jest:** 12 suites verdes (≈105 pruebas).
- **audit:design:** 0 violaciones (R1–R6 en 0).
- **bundle web:** HTTP 200, renderiza.

### QA visual — verificado en navegador (web, escritorio)
| Ruta | Estado | Notas |
|---|---|---|
| `/login` | OK | Marca intacta; enlaces como botones accesibles |
| `/register` | OK | Selector de rol y formulario correctos |
| `/forgot-password` | OK | Flujo de 3 pasos |

Consola: solo warnings esperados de react-native-web en dev
(`shadow*` deprecado, `useNativeDriver` JS-fallback). Sin errores.

### Pendiente de QA visual (requiere sesión / backend de prueba)
Recorrido autenticado por rol (gestante / obstetra / admin): dashboards,
listas (tabla web ↔ tarjetas móvil), overlays, formularios y detalle. Ejecutar
`scripts/qa-visual.sh` con credenciales de prueba o manualmente.

## Convenciones que vigilan las pruebas
- Color y medida siempre por token (lo fuerza `audit:design`).
- Avisos por `useToast` / `ConfirmSheet`; nunca `Alert.alert`.
- Superficies modales por `Overlay` (BottomSheet móvil / AppModal web).
- Carga de pantalla con skeleton; `ActivityIndicator` solo en micro-cargas.
- Copys en voz activa y en minúscula tipo oración.
