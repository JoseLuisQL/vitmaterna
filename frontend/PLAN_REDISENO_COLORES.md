# Plan de Rediseño de Color — VITMATERNA

> Objetivo: un sistema de color **más limpio, minimalista y sereno** que transmita
> **paz y seguridad** a la gestante y **claridad y confianza profesional** al
> obstetra. Fundamentado en psicología del color aplicada a salud materna y en
> principios de diseño minimalista de salud digital.

---

## 1. Investigación: psicología del color en salud materna (resumen)

Fuentes: UXmatters (Psychology of Color in Health & Wellness Apps, 2024),
Progress (Healthcare Color Palette), Fuselab (Healthcare UI/UX 2026), y patrones
de apps de referencia (Flo, The Bump, pregnancy trackers premium).

Hallazgos clave aplicables:

| Color | Efecto psicológico | Uso recomendado en VITMATERNA |
|---|---|---|
| **Azul** | Confianza, calma, seguridad, profesionalismo clínico | Acento del **obstetra** (autoridad clínica serena) |
| **Verde** | Salud, equilibrio, crecimiento, tranquilidad | Estados positivos, "vida", éxito, semáforo de riesgo bajo |
| **Lila/lavanda suave** | Cuidado, serenidad, calidez femenina, espiritualidad | Acento de la **gestante**, pero **desaturado** (no vibrante) |
| **Rosa empolvado (dusty pink)** | Ternura, maternidad, cercanía | Toques cálidos puntuales del mundo gestante |
| **Neutros cálidos / marfil** | Limpieza, paz, "respiro visual" | Fondos y superficies (clave del minimalismo) |
| **Rojo** | Urgencia, alarma | **Solo** emergencias y signos de alarma (nunca decorativo) |

Principios de diseño que adoptamos:
1. **Menos saturación = más calma.** Bajar la intensidad de los acentos actuales
   (el púrpura `#7C3AED` es vibrante/energético, no sereno).
2. **Mucho espacio en blanco + neutros cálidos.** El fondo "ice-blue" actual
   (`#EEF2F8`) es frío y un poco clínico; un neutro más cálido y claro transmite
   más paz.
3. **Un solo acento por rol, usado con moderación.** El color guía, no satura.
4. **Color = significado, no decoración.** Rojo solo urgencia; verde solo
   positivo; el acento solo para acciones primarias y elementos activos.
5. **Contraste AA garantizado** para legibilidad (población con baja
   alfabetización digital → texto mínimo 15px ya está, falta asegurar contraste).

---

## 2. Diagnóstico de la paleta actual

Archivo: `src/theme/colors.ts`.

| Token actual | Valor | Problema |
|---|---|---|
| `gestante.primary` | `#7C3AED` (púrpura intenso) | Demasiado vibrante/saturado → energético, no sereno |
| `obstetra.primary` | `#3A86FF` (azul brillante) | Bueno, pero algo "eléctrico"; bajar un punto da más calma |
| `background` | `#EEF2F8` (ice-blue) | Frío; un neutro cálido transmite más paz |
| Gradientes | fuertes (`#9B59F5→#7C3AED`) | Headers muy saturados compiten con el contenido |
| `danger` | `#EF4444` | Correcto, se mantiene |

Lo que **sí funciona** y conservamos: la arquitectura de tokens (1 acento por
rol + semánticos + semáforo de riesgo con 3 variantes), el modo oscuro, y el
mínimo 15px de tipografía.

---

## 3. Paleta propuesta (más limpia, minimalista, serena)

### Neutros (la base — más cálidos y suaves)
```
background      #F7F8FA   (casi blanco, leve calidez — "respiro")
backgroundWarm  #FAF8FC   (gestante: blanco con un velo lila imperceptible)
backgroundCool  #F6F9FC   (obstetra: blanco con velo azul imperceptible)
surface         #FFFFFF   (tarjetas)
surfaceAlt      #F1F3F7   (inputs/toggles, gris muy suave)
border          #EAEDF2   (bordes casi invisibles → minimalismo)
text            #232A33   (gris azulado profundo, suave, no negro puro)
textSecondary   #5E6B7A
textTertiary    #9AA6B4
```
Cambio clave: del ice-blue frío a un **neutro cálido casi blanco**. Más limpio,
más "spa", menos clínico.

### Acento Gestante — lila sereno (desaturado)
```
primary       #8B7FD4   (lavanda suave, sereno — antes #7C3AED vibrante)
primaryDark   #756AC0
primaryLight  #F3F1FB   (fondos ultra suaves)
primaryMid    #E7E3F6
gradient      ['#A99FE0', '#8B7FD4']   (suave, no estridente)
```
Transmite cuidado y serenidad femenina sin la "energía" del púrpura saturado.

### Acento Obstetra — azul confianza (un punto más sereno)
```
primary       #4A90D9   (azul sereno y profesional — antes #3A86FF eléctrico)
primaryDark   #3A78BD
primaryLight  #EDF4FB
primaryMid    #D8E8F6
gradient      ['#5FA3E0', '#4A90D9']
```
Confianza y calma clínica; menos "eléctrico".

### Semánticos (suavizados, mantienen significado)
```
success  #2EA66E  (verde salud, un poco más suave)
warning  #E0A23B  (ámbar cálido)
danger   #E05656  (rojo claro pero inequívoco — solo urgencias)
info     #4A90D9  (= azul obstetra, coherencia)
```

### Semáforo de riesgo (se mantiene la lógica, tonos algo más suaves)
```
riskGreen   #2EA66E   riskYellow  #E0A23B   riskRed  #E05656
+ variantes Light para fondos de chip
```

---

## 4. Principios de aplicación (el "cómo" minimalista)

1. **Headers más sobrios.** Gradientes suaves; en varias pantallas, considerar
   header plano con el neutro cálido + título oscuro (más limpio que el bloque
   de color saturado). Mantener gradiente solo en dashboards (jerarquía).
2. **Tarjetas blancas sobre fondo cálido**, separadas por **sombra muy sutil**,
   no por bordes marcados (el borde casi invisible `#EAEDF2` solo cuando hace
   falta).
3. **Acento con moderación**: botón primario, tab activo, enlaces e iconos
   activos. Todo lo demás en neutros. Nada de fondos de color grandes salvo el
   header.
4. **Estados emocionales correctos**: pantallas de la gestante (embarazo, citas,
   educación) → calidez serena (lila/rosa muy suave). Pantallas clínicas del
   obstetra → azul confianza, más sobrio.
5. **Emergencia/alarma**: el rojo se reserva 100% para eso; gana impacto al no
   competir con decoración roja.
6. **Accesibilidad AA**: verificar contraste de texto sobre cada fondo nuevo
   (herramienta automatizada en el QA).

---

## 5. Implementación (segura, incremental, sin romper)

La app ya centraliza el color en `src/theme/colors.ts` y el tema en
`ThemeContext`. Eso permite cambiar la paleta **en un punto** y propagar a toda
la app. Fases:

| Fase | Acción | Riesgo |
|---|---|---|
| C0 | Ajustar **neutros** (background, surface, text, border) a la versión cálida | Bajo |
| C1 | Suavizar **acento gestante** (lila sereno) y sus gradientes | Bajo |
| C2 | Suavizar **acento obstetra** (azul sereno) y gradientes | Bajo |
| C3 | Suavizar **semánticos + semáforo** de riesgo | Bajo |
| C4 | Revisar **modo oscuro** (`commonColorsDark`) para que armonice con los nuevos neutros | Medio |
| C5 | **QA de contraste** (AA) por pantalla + walkthrough visual de los 3 roles | — |

Cada fase: cambia solo tokens (no estructura) → `tsc` + tests + bundle + revisión
visual en los 3 roles. Como todo lee del token, el riesgo de romper es mínimo.

> Nota: muchas pantallas aún leen `commonColors` directo (no `useThemedColors`).
> Cambiar el objeto `commonColors`/acentos basta para el modo claro; el modo
> oscuro completo depende de la migración a `useThemedColors` (deuda ya conocida).

---

## 6. Resultado esperado

- **Gestante**: sensación de **paz y cuidado** — blanco cálido, lila sereno,
  toques suaves; menos "app saturada", más "espacio tranquilo".
- **Obstetra**: sensación de **confianza y orden clínico** — azul sereno,
  superficies limpias, foco en los datos.
- **Ambos**: interfaz **minimalista**, con jerarquía clara por color usado con
  intención, accesible y agradable de usar a diario.

---

## 7. Antes / Después (referencia rápida)

| | Antes | Después |
|---|---|---|
| Fondo | `#EEF2F8` (ice-blue frío) | `#F7F8FA` (neutro cálido) |
| Gestante | `#7C3AED` (púrpura vibrante) | `#8B7FD4` (lavanda sereno) |
| Obstetra | `#3A86FF` (azul eléctrico) | `#4A90D9` (azul confianza) |
| Bordes | `#E4EAF5` visibles | `#EAEDF2` casi invisibles |
| Sensación | App clínica enérgica | Spa de salud: paz + confianza |
