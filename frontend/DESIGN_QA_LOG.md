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

### QA visual autenticado — verificado en navegador (web, escritorio)
Con backend levantado (Postgres + Redis + seed) y sesión por rol:

| Rol | Pantalla | Estado | Datos reales |
|---|---|---|---|
| Obstetra | Dashboard (Inicio) | OK | 4 pacientes · 1 alerta · distribución de riesgo · citas de hoy |
| Obstetra | Gestantes | OK | DataTable web con las 4 gestantes (Ana, Lucía, Sofía, María Elena) |
| Admin | Dashboard | OK | Resumen (usuarios, gestantes activas, alto riesgo), estado del sistema |
| Gestante | Dashboard | OK | "Tu Embarazo", próxima cita, tratamiento del día (0/1), acciones rápidas |

Portal web completo (sidebar fijo + topbar + contenido) en los 3 roles.
Consola sin errores (solo warnings dev de RNW). Render dual confirmado:
en web las listas usan tabla; en móvil, tarjetas.

Credenciales de prueba (seed): admin `99999999`/`Admin@2026`,
obstetra `11111111`/`Test@1234`, gestante `33333333`/`Test@1234`.

### QA visual MÓVIL — viewport 390×844 (iPhone), backend en vivo
`agent-browser set viewport 390 844` → `webShell=false` → experiencia móvil real.

| Pantalla | Estado | Verificado |
|---|---|---|
| Dashboard obstetra | OK | **tab bar inferior** (Inicio/Gestantes/Agenda/Chat) en vez del sidebar web |
| Formulario "Nueva gestante" | OK | stepper "Paso 1 de 4", campos `Field`, escritura OK |
| Cronograma | OK | lista de citas reales (incluye pacientes del recorrido e2e) |
| **Overlay "Nueva cita"** | OK | se abre como **BottomSheet** (móvil): buscar paciente, modalidad, motivo, fecha, horario |
| Dashboard gestante | OK | "Tu Embarazo", acciones rápidas (Reportar / Emergencia) |
| Reportar signo de alarma | OK | lista de síntomas + "Enviar alerta a mi obstetra" |

Render dual confirmado de extremo a extremo: el MISMO código muestra sidebar+tabla
en web y tab bar+tarjetas+BottomSheet en móvil, según `webShell`.

#### Hallazgo (menor, no bloqueante)
- Consola en cronograma: `Unexpected text node: ". "` dentro de un `<View>`.
  Es un warning de desarrollo de react-native-web, **pre-existente** (la pantalla
  solo se tocó para tokens en el refactor), no rompe el render ni afecta a
  producción. Pendiente de localizar el nodo de texto suelto.

### Pendiente (opcional)
QA visual de overlays, formularios completos y ficha clínica de detalle, y
captura en viewport móvil estrecho para regresión visual formal.

## Convenciones que vigilan las pruebas
- Color y medida siempre por token (lo fuerza `audit:design`).
- Avisos por `useToast` / `ConfirmSheet`; nunca `Alert.alert`.
- Superficies modales por `Overlay` (BottomSheet móvil / AppModal web).
- Carga de pantalla con skeleton; `ActivityIndicator` solo en micro-cargas.
- Copys en voz activa y en minúscula tipo oración.
