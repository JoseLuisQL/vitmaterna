# Plan — Sistema de Tour Guiado + Bienvenida (VITMATERNA Frontend)

> Onboarding profesional para usuarios nuevos: una **pantalla de bienvenida de marca** + un **tour guiado paso a paso** que explica cada función del frontend, por rol (gestante / obstetra / admin), funcionando en **web y móvil** desde una sola base de código.
> Stack: Expo SDK 56 · RN 0.85.3 · React 19.2 · expo-router · reanimated 4.3.1 · react-native-svg 15 · zustand · AsyncStorage.

---

## 1. Objetivo y alcance

Cuando un usuario inicia sesión **por primera vez**, verá:

1. **Bienvenida de marca** (`WelcomeScreen`): 3–4 láminas a pantalla completa con el gradiente del rol, logo, saludo personalizado ("¡Hola, {firstName}!") y el valor de la app. Termina con un CTA: **"Hacer el recorrido"** o **"Explorar por mi cuenta"**.
2. **Tour guiado** (`GuidedTour`): secuencia de *coachmarks* (spotlight + tooltip) que resaltan los elementos reales de la UI y explican, en lenguaje claro y preciso, qué hace cada función — adaptado a su rol y a la plataforma (sidebar en web, tabs/drawer en móvil).

Disponible siempre desde **Perfil → "Ver el recorrido de nuevo"** (re-lanzable).

### Principios de diseño (no negociables)
- **Una sola base de código** web + móvil; se ramifica con `useResponsive().webShell`, nunca con estilos sueltos.
- **Solo tokens del sistema** (`theme/`): color por rol, tipografía Inter, grid 8pt, sombras, motion. Cero hex sueltos (pasa `audit:design`).
- **Respeta `useReducedMotion()`** (como `SplashScreen`/`AppButton`).
- **Accesibilidad**: `accessibilityRole`/`Label`, área táctil ≥48, contraste AA, foco lógico.
- **No bloquea**: siempre se puede **omitir** y **reanudar**; nunca atrapa al usuario.
- **Persistencia local por usuario** (no toca backend): AsyncStorage, patrón idéntico a `ThemeContext`/`useEducationProgress`.

---

## 2. Decisión de dependencias (lo más delicado)

El stack es muy reciente (RN 0.85 / React 19 / nueva arquitectura / **web**). Eso descarta la mayoría de librerías de tour, que apuntan a RN viejo y tienen soporte web dudoso. Se adopta un **enfoque híbrido**:

### 2.1 Bienvenida → librería especializada de Software Mansion ✅
**`@blazejkustra/react-native-onboarding`** (`software-mansion-labs`, v1.0.1, abril 2026).
- **Por qué**: mismos autores de `reanimated`/`gesture-handler` que el proyecto **ya usa**; **cross-platform iOS/Android/Web** explícito; **cero dependencias de runtime propias** (solo peers ya instalados: `react`, `react-native`, `reanimated`, `safe-area-context`, `svg`) + `expo-image`. Es JS puro sobre la stack actual → seguro en web.
- **Única dependencia nueva a instalar**: `expo-image` (vía `npx expo install expo-image`, versión alineada a SDK 56).
- **Uso**: las láminas de bienvenida (intro panel + steps), totalmente personalizables con componentes propios para respetar la marca.

### 2.2 Tour spotlight (coachmarks) → motor propio ligero ✅
Las librerías de spotlight evaluadas se **descartan** por riesgo de compatibilidad:

| Librería | Última versión | Veredicto |
|---|---|---|
| `react-native-copilot` | dic-2024, `react-native >=0.60` | ❌ pre-nueva-arq, web no garantizada |
| `rn-tourguide` | oct-2024, deps pesadas (`flubber`) | ❌ desactualizada, web frágil |
| `@wrack/react-native-tour-guide` | abr-2026, `react-native: *` | ⚠️ muy nueva/poco probada (v0.1.4) |
| `react-native-coachmark` | jul-2024 | ❌ desactualizada |

**Decisión:** construir un **motor de spotlight a medida** reutilizando lo que el proyecto ya tiene (riesgo bajo, control total, 0 deps nuevas):
- **`react-native-svg`** (ya instalado) → máscara con recorte (overlay oscuro con "agujero" sobre el elemento resaltado).
- **`reanimated` 4.3.1** (ya instalado) → transición suave del spotlight entre pasos.
- **Patrón `ConfirmHost` + `confirm.ts`** (ya en el árbol) → host singleton con API imperativa `tour.start(steps)`.
- **Medición de targets** con `measureInWindow()` (nativo) y `getBoundingClientRect`/ref en web — encapsulado en un hook `useTourTarget(id)`.

> Si en el futuro se quiere migrar el spotlight a `@wrack/react-native-tour-guide` cuando madure, la API del motor propio queda detrás de una fachada para poder reemplazarlo sin tocar las pantallas.

---

## 3. Arquitectura de archivos

```
src/components/tour/
  TourProvider.tsx        # Contexto + host; registra targets; controla paso actual
  TourHost.tsx            # Overlay SVG (spotlight) + tooltip; vive en el árbol raíz
  TourTooltip.tsx         # Tarjeta del paso: título, descripción, progreso (dots), botones
  TourSpotlight.tsx       # Máscara SVG animada (recorte sobre el target)
  useTourTarget.ts        # Hook: registra una ref como target medible (web + nativo)
  tourController.ts       # Singleton imperativo (start/next/prev/stop), estilo confirm.ts
  steps/
    gestante.steps.ts     # Definición declarativa de pasos por rol
    obstetra.steps.ts
    admin.steps.ts
    types.ts              # TourStep, TourId, etc.

src/components/onboarding/
  WelcomeScreen.tsx       # Bienvenida de marca (usa @blazejkustra/react-native-onboarding)
  welcomeSlides.ts        # Contenido de las láminas por rol
  OnboardingGate.tsx      # Decide si mostrar bienvenida/tour tras login (1ª vez)

src/hooks/
  useOnboarding.ts        # Estado persistido (AsyncStorage) + acciones (markSeen, reset)

src/store/ (o dentro del provider)
  — estado del tour (paso actual, visible) vía zustand o context
```

### Integración en el árbol (`app/_layout.tsx`)
```
SafeAreaProvider → ThemeProvider → QueryClientProvider → ToastProvider
  → MaintenanceGate
    → WebShell
      → OnboardingGate          ← NUEVO (envuelve la navegación)
        → AppNavigator
  → OfflineBanner
  → ConfirmHost
  → TourHost                    ← NUEVO (overlay global, por encima de todo salvo toasts)
```
- `OnboardingGate` se monta **después** de `RoleGuard`/auth, igual que el guard de `mustChangePassword`. Si `isAuthenticated && !onboardingSeen(user.id)` → muestra `WelcomeScreen`.
- `TourHost` se monta a nivel raíz (como `ConfirmHost`) para dibujar el overlay sobre cualquier pantalla.

---

## 4. Persistencia (sin tocar backend)

`useOnboarding.ts` con **AsyncStorage**, claves namespaced por usuario (patrón `useEducationProgress`):

```
vitmaterna_onboarding_welcome_{userId}   # "true" cuando vio la bienvenida
vitmaterna_onboarding_tour_{userId}      # "true" cuando completó/omitió el tour
```

- Lectura al montar `OnboardingGate`; escritura al completar/omitir.
- `reset()` para el botón "Ver el recorrido de nuevo" (Perfil).
- Mientras carga (estado indeterminado) no se muestra nada → evita parpadeos.

> Nota: es per-dispositivo (local). Es lo correcto para un onboarding de UI y es coherente con cómo el proyecto guarda preferencias no sensibles. No requiere cambios de esquema ni de API.

---

## 5. Contenido del tour por rol (qué se explica)

Textos en **voz activa, minúscula tipo oración, claros y precisos** (regla de copys del proyecto). Cada paso resalta un elemento real. El tour **ramifica por plataforma**: en web ancla al `WebSidebar`; en móvil a `PillTabBar` + abre el drawer para revelar funciones secundarias.

### 5.1 Gestante (acento teal `#0C8174`)
| # | Target | Texto (resumen) |
|---|---|---|
| 1 | Header "Hola, {nombre}" | "Este es tu panel. Aquí ves un vistazo de tu embarazo cada día." |
| 2 | `PrenatalRibbon` | "Tu avance semana a semana y tu próximo control prenatal." |
| 3 | Tarjeta "Próxima cita" + botón Confirmar | "Confirma tu asistencia a la próxima cita con un toque." |
| 4 | `ProgressRing` tratamiento + "Marcar como tomado" | "Marca tus suplementos del día y sigue tu constancia." |
| 5 | Acción rápida Emergencia / Signos de alarma | "Si algo te preocupa, reporta un síntoma o pide ayuda urgente." |
| 6 | Tab Chat (badge) | "Conversa con tu obstetra cuando lo necesites." |
| 7 | Menú ☰ / sidebar | "Aquí están educación, tu perfil y más." |

### 5.2 Obstetra (acento azul `#2C6EA8`)
| # | Target | Texto |
|---|---|---|
| 1 | 3 KPIs (Citas hoy / Pacientes / Alertas) | "Tu día de un vistazo: citas, pacientes y alertas." |
| 2 | Tarjeta Distribución de riesgo | "El semáforo de riesgo de tus gestantes." |
| 3 | Tab Gestantes + filtros + FAB | "Busca, filtra y registra a tus pacientes aquí." |
| 4 | (navega) Ficha de gestante / pestañas | "La historia clínica completa, en cuatro pestañas." |
| 5 | Tab Agenda + Atender/No asistió | "Gestiona tu agenda: atiende, reprograma o marca inasistencia." |
| 6 | Chat + Mensaje masivo | "Conversa o envía un aviso a un grupo de gestantes." |
| 7 | Reportes (sidebar) | "KPIs clínicos y MINSA, con exportación." |

### 5.3 Admin (acento slate `#3C5168`)
| # | Target | Texto |
|---|---|---|
| 1 | Tarjeta "cuentas por aprobar" | "Aprueba las cuentas de obstetras pendientes." |
| 2 | 4 KPIs | "El pulso del sistema: usuarios, gestantes, riesgo y citas." |
| 3 | Tab Usuarios + FAB | "Crea, edita y administra todas las cuentas." |
| 4 | Tab Contenido | "Publica y gestiona el contenido educativo." |
| 5 | Tarjeta Estado del sistema (SMS/WhatsApp) | "Estado de los canales de notificación." |
| 6 | Sidebar: Supervisión / Config | "Reportes globales, sedes, configuración y auditoría." |

> Los `href` y `label`/`description` de `src/navigation/menu.ts` se reutilizan como textos base y destinos de navegación.

---

## 6. Diseño visual

### WelcomeScreen (bienvenida)
- `LinearGradient` con `roleColors.gradient` a pantalla completa (lenguaje de `SplashScreen`).
- `VitMaternaLogo` en placa blanca; wordmark; saludo personalizado con `user.firstName`.
- 3 láminas con ilustración/ícono + título (`typography.h1`) + descripción (`typography.body`) + dots de progreso.
- Footer: **"Hacer el recorrido"** (`AppButton primary gradient themeGradient`) + **"Explorar por mi cuenta"** (`AppButton ghost`).
- En **web** (`webShell`) se presenta centrado tipo panel (máx. ~520px) sobre el gradiente; en móvil a pantalla completa.

### Coachmark (tooltip de paso)
- Tarjeta `surface`, `borderRadius.xl`, `shadows.modal`, ancho máx. ~340 (móvil) / posicionada junto al target (web).
- Contenido: `overline` "Paso N de M" + título `h3` + descripción `body` (textSecondary) + **dots de progreso** (no `ProgressBar`, que cambia de color por umbral).
- Botones: **Atrás** (`ghost`, oculto en paso 1), **Siguiente/Finalizar** (`primary` con `themeGradient` del rol), **Omitir** (link sutil arriba a la derecha).
- Spotlight: overlay `commonColors.overlay` con recorte SVG redondeado (radio del target + padding), transición `reanimated` `motion.surface` (180ms) entre pasos.
- Háptica: `haptics.selection()` al avanzar, `haptics.success()` al finalizar (no-op en web).
- `zIndex`: overlay del tour en capa `overlay`/`modal` (1000–1100); por debajo de toasts (1300) y banner offline (1400).

---

## 7. Manejo de casos límite

1. **Target no visible / no medible** (p. ej. en otra pantalla): el paso puede declarar `navigateTo` (href de expo-router); el motor navega, espera el montaje (`InteractionManager` + reintento de medición) y luego resalta. Si tras N reintentos no aparece, **salta** el paso (no rompe el flujo).
2. **Móvil — funciones en el drawer**: pasos que apuntan a navegación secundaria abren el `SidebarProvider` antes de resaltar.
3. **Web vs móvil**: cada paso declara `platform?: 'web' | 'mobile' | 'both'`; el motor filtra los pasos según `webShell`. Ej.: "barra inferior" solo en móvil; "sidebar fijo" solo en web.
4. **Rotación / resize**: el spotlight re-mide en `onLayout`/cambio de dimensiones (`useWindowDimensions`).
5. **Reduce motion**: sin animación de spotlight; corte directo entre pasos.
6. **Reanudar**: si el usuario cierra la app a mitad, el tour no se marca como completo hasta finalizar/omitir explícitamente.
7. **Mantenimiento / cambio de contraseña**: el onboarding se evalúa **después** de esos guards (no se solapan).

---

## 8. Plan de implementación (incremental, con verificación)

Cada fase termina con `npm run tsc` + `npm run audit:design` + `npm test` en verde y verificación en navegador (web) + viewport móvil.

1. **Fase 0 — Dependencia**: `npx expo install expo-image` + `npm install @blazejkustra/react-native-onboarding`. Verificar que el bundle web compila.
2. **Fase 1 — Persistencia**: `useOnboarding.ts` (AsyncStorage) + tests unitarios del hook.
3. **Fase 2 — Bienvenida**: `WelcomeScreen` + `welcomeSlides.ts` + `OnboardingGate` cableado en `_layout`. Verificar primer login (web + móvil).
4. **Fase 3 — Motor de tour**: `TourProvider`, `TourHost`, `TourSpotlight` (SVG), `TourTooltip`, `useTourTarget`, `tourController`. Probar con 2 pasos dummy.
5. **Fase 4 — Pasos por rol**: registrar `useTourTarget` en los elementos reales de cada pantalla; escribir `*.steps.ts`. Ramificación web/móvil.
6. **Fase 5 — Re-lanzar**: entrada "Ver el recorrido de nuevo" en Perfil de cada rol (`reset()` + `tour.start()`).
7. **Fase 6 — QA**: recorrer los 3 roles en web (1440px) y móvil (390px); a11y, reduce-motion, skip/resume; `npm run verify`.

### Entregables
- ~14 archivos nuevos en `src/components/tour/`, `src/components/onboarding/`, `src/hooks/`.
- Ediciones mínimas en `app/_layout.tsx`, los 3 `perfil.tsx`, y registro de refs (`useTourTarget`) en ~8 pantallas clave.
- 1 dependencia nueva (`@blazejkustra/react-native-onboarding`) + `expo-image`.

### Riesgos y mitigaciones
| Riesgo | Mitigación |
|---|---|
| Lib de bienvenida falla en web | Es Software Mansion, cross-platform, 0 deps nativas; si fallara, `WelcomeScreen` se reescribe con `react-native-pager-view`/scroll propio (fallback) sin tocar el resto. |
| Medición de targets inconsistente web/nativo | `useTourTarget` encapsula ambas vías; pasos con fallback "saltar si no se mide". |
| Spotlight SVG en web | `react-native-svg` ya se usa en gráficas clínicas en web (probado). |
| `audit:design` bloquea por hex | Usar solo tokens desde el inicio. |

---

## 9. Resumen ejecutivo

- **Bienvenida**: librería especializada de Software Mansion (`@blazejkustra/react-native-onboarding`) — fresca, cross-platform, misma stack. +`expo-image`.
- **Tour spotlight**: motor propio ligero (SVG + reanimated + patrón `ConfirmHost`) — 0 deps nuevas, control total, web-safe, fachada reemplazable.
- **Persistencia**: AsyncStorage per-usuario (patrón existente), sin tocar backend.
- **Diseño**: 100% tokens del sistema, color por rol, reduce-motion, AA, web+móvil con `webShell`.
- **Contenido**: pasos claros y precisos por rol, anclados a elementos reales, derivados de `menu.ts` y del inventario de pantallas.

> Pendiente de tu visto bueno para empezar por la **Fase 0–2** (dependencia + persistencia + bienvenida) y mostrarte el primer resultado en vivo antes de seguir con el motor de spotlight.
