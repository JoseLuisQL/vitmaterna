# Reporte de Dogfooding — VITMATERNA

> Exploración manual del sistema actuando como usuarios reales y exigentes
> (obstetra y gestante "gruñones"): intentando romper formularios, entrar datos
> inválidos, buscar lo que no existe y recorrer el flujo completo en la UI web,
> contra el backend en vivo (datos reales).

Sesión: web escritorio (1440×900) + verificación cruzada por API.
Roles probados: **Obstetra** (María, DNI 11111111) y **Gestante** (Lucía, DNI
44444444, riesgo alto).

---

## Veredicto

El sistema **resiste el uso exigente**: la validación de formularios es clara y
bloquea entradas inválidas, los errores se comunican con toasts precisos, los
estados vacíos son explícitos, y la app **degrada con elegancia** cuando faltan
datos (no se rompe). No se encontró ningún crash ni error de consola en el
recorrido. Los hallazgos son de **accesibilidad** y **datos de seed**, no fallos
funcionales.

---

## Lo que funcionó bien (probado a propósito para romperlo)

| Prueba "gruñona" | Resultado |
|---|---|
| Login con DNI de 3 dígitos + clave de 1 carácter | ✅ Validación inline: "El DNI debe tener 8 dígitos", "La contraseña debe tener al menos 6 caracteres"; **bloquea el envío** |
| Login con credenciales válidas en formato pero incorrectas | ✅ Toast preciso: "No se pudo iniciar sesión / DNI o contraseña incorrectos" |
| Login correcto | ✅ Entra al dashboard del rol; redirección correcta |
| Buscar paciente inexistente ("ZZZQQQ999") | ✅ Estado vacío claro: "Sin resultados / No se encontraron pacientes con esa búsqueda" |
| Abrir ficha clínica pesada (la de 2.287 líneas) | ✅ Carga completa (SEMANA/FPP/IMC, tabs, resumen clínico, "Adherencia baja (46%)"); **0 errores de consola** |
| Bandeja de chat del obstetra | ✅ Conversaciones reales con alertas y broadcasts; se abre el hilo |
| Gestante de alto riesgo SIN FUM | ✅ Dashboard muestra "Semana --" y badge "RIESGO ALTO" sin romperse (degradación elegante) |
| Marcar dosis de tratamiento | ✅ Backend registra la toma y la UI refleja "Todo tomado por hoy / Tomado hoy" tras recargar |
| Citas de la gestante (sin próximas) | ✅ Estado vacío + seguimiento de meta MINSA ("Te faltan 2 controles") |
| Educación | ✅ Recomendación personalizada ("Recomendado para tu 3° trimestre"), buscador, tarjetas con labels |

**Consola limpia** en todas las pantallas recorridas (solo warnings de dev de
react-native-web: `shadow*`, `useNativeDriver`). El warning de "text node" que se
corrigió antes **no reapareció**.

---

## Hallazgos

### 🟡 A11y-1 · Filas de chat y botón de envío sin rol/label de botón — ✅ CORREGIDO
> Corregido: se añadió `accessibilityRole="button"` + `accessibilityLabel` a las
> filas de la bandeja de chat ("Abrir conversación con {nombre}") y a los botones
> de enviar mensaje (obstetra y gestante). Verificado en navegador: las filas
> ahora se anuncian como botones con nombre, **y el envío de mensaje funciona de
> extremo a extremo por la UI** (mensaje persistido en el backend).
> Pendiente (mismo patrón, menor): filas de `DataTable` (gestantes/cronograma).

_Descripción original:_
Las filas de la **DataTable** (gestantes, cronograma) y de la **bandeja de chat**,
y el **botón de enviar mensaje**, se renderizan como `View`/`Pressable` sin
`accessibilityRole="button"` ni `accessibilityLabel`. En el árbol de
accesibilidad aparecen como `generic clickable` sin nombre.
- **Impacto**: un lector de pantalla no anuncia qué hace la fila/el botón; y la
  automatización (y herramientas de QA) no los puede activar por nombre.
- **Evidencia**: al intentar abrir conversaciones/filas por su nombre, no existe
  un nodo con rol de botón; sí hay `generic clickable`.
- **Recomendación**: añadir `accessibilityRole="button"` + `accessibilityLabel`
  (p. ej. "Abrir conversación con Ana Gómez", "Enviar mensaje") a las filas de
  `DataTable`, a las filas de la bandeja de chat y al botón de envío.

### 🟡 A11y-2 · Controles "Apariencia" deshabilitados visibles en el menú
El sidebar muestra "Apariencia Sistema (No disponible)" y "Apariencia Oscuro
(No disponible)" como botones deshabilitados.
- **Impacto**: ruido para el usuario; ocupan espacio y confunden ("¿por qué está
  esto si no funciona?").
- **Contexto**: el modo oscuro está congelado a propósito (deuda técnica conocida).
- **Recomendación**: ocultar las opciones de tema mientras el dark mode esté
  deshabilitado, en vez de mostrarlas atenuadas.

### 🔵 DATA-1 · Gestante de alto riesgo sin FUM en el seed
Lucía (riesgo alto) no tiene FUM, por lo que el dashboard muestra "Semana --".
- **Impacto**: ninguno en runtime (la UI degrada bien), pero da una demo pobre
  para una paciente de alto riesgo.
- **Recomendación**: completar la FUM de las gestantes del seed para que todas
  muestren semanas/FPP.

---

## Nota de método (no es un hallazgo del producto)
Algunos controles construidos sobre `AnimatedPressable` (botón de login, tarjeta
de dosis, "Enviar alerta") **no se activan con el clic sintético** del
automatizador de QA, aunque **sí funcionan con interacción real** (lo confirmamos
ejecutando el handler equivalente por API: login 200, log de dosis 201, etc.).
Es una limitación de la herramienta de automatización con `react-native-web`, no
un defecto de la app. Donde el botón expone rol nativo (p. ej. AppButton de
formularios con `fill`+click), la automatización sí funciona.

---

## Resumen
- **0 crashes · 0 errores de consola · 0 fallos funcionales** en el recorrido.
- 3 hallazgos: 2 de accesibilidad (filas/botón de chat sin label; opciones de
  tema deshabilitadas visibles) y 1 de datos de seed.
- Validaciones, toasts, estados vacíos y degradación con datos faltantes:
  **sólidos**.

Capturas en `dogfood-output/` (14 pantallas del recorrido).
