# Plan de optimización y alineación de VITMATERNA

> **Propósito de este documento:** reenfocar el sistema actual (que hoy intenta ser
> una historia clínica electrónica completa al estilo MINSA) hacia lo que tu
> investigación realmente necesita medir, **sin desviarse**: el impacto del
> aplicativo en (1) la **eficacia del seguimiento prenatal** y (2) la
> **adherencia a los tratamientos prenatales** en el C.S. Talavera, 2025.

---

## 0. Reencuadre: qué ES y qué NO ES tu sistema

**El error de alcance actual.** El sistema replica el carnet/Historia Clínica
Perinatal del MINSA: registra ~35 campos por control, laboratorios, ecografías,
peso, vacunas, tamizajes (violencia, SRQ-18), patologías CIE-10, odontograma y
consejería nutricional. **Eso ya se llena físicamente en las fichas MINSA.**
Duplicarlo en la app:
- Genera **doble digitación** (la obstetra ya lo escribe en papel) → fricción,
  rechazo del personal y datos incompletos.
- **Diluye** tus dos objetivos: el sistema parece un EHR, no una herramienta de
  seguimiento y adherencia.
- Complica la **medición del impacto**: mientras más variables capturas, más
  ruido y menos foco en los indicadores que tu tesis debe demostrar.

**La definición correcta.** VITMATERNA NO es una historia clínica electrónica.
Es una **herramienta de gestión y seguimiento** con tres funciones principales
(exactamente las que tú mismo describes) más una capa de medición:

| # | Función principal | Sirve al objetivo |
|---|---|---|
| 1 | **Programación y seguimiento de citas** prenatales | Eficacia del seguimiento (Obj. 1) |
| 2 | **Recordatorio y registro de medicamentos/suplementos** | Adherencia (Obj. 2) |
| 3 | **Comunicación directa** gestante ↔ personal de salud | Soporte transversal a ambos |
| 4 | **Tablero de indicadores** (medición del impacto) | Demostrar Obj. 1 y Obj. 2 |

Todo lo que no sirva directamente a estas cuatro cosas es **fuera de alcance**
para tu tesis y debe **ocultarse** (no borrarse).

---

## 1. Análisis: mapeo de cada función actual a tus objetivos

Clasifiqué los 12 módulos y 27 tablas en tres categorías: **CORE** (es tu tesis),
**SOPORTE** (ayuda, se mantiene mínimo) y **FUERA** (se oculta tras una bandera).

### CORE — el corazón de tus dos objetivos (se mantiene y se refuerza)
| Módulo / tabla | Por qué es CORE |
|---|---|
| `auth` / `users`, `user_sessions` | Identidad por DNI, login, roles. Sin esto no hay app. |
| `gestantes` (versión **mínima**) | Datos imprescindibles: DNI, nombre, teléfono, FUM/FPP, riesgo. |
| `obstetras` | Profesional que da seguimiento. |
| `appointments` | **Pilar Obj. 1**: citas, cronograma de 8 controles, estados, asistencia. |
| `treatments` + `supplement_logs` | **Pilar Obj. 2**: tratamiento + registro diario de toma. |
| `notifications` + cron | Recordatorios de cita y de medicamento (motor de ambos objetivos). |
| `conversations` + `messages` | Comunicación directa (3ª función que tú declaras) + botón de alarma. |
| `prenatal_controls` (**simplificado**) | Necesario solo para **contar** controles y medir asistencia (Obj. 1). |
| `reports` | Tablero de impacto: aquí se demuestra la tesis. |
| `system_config`, `audit_logs`, `health_facilities` | Infraestructura. |

> **CORRECCIÓN IMPORTANTE (según los indicadores Likert que definiste).**
> Tu operacionalización cambió dos clasificaciones de mi análisis previo:
> - **"Aplicación de vacunas prenatales"** es un indicador de **adherencia** →
>   `vaccination_records` vuelve a CORE (simplificado).
> - **"Claridad de la información"** y **"Comprensión del tratamiento"** dependen
>   de la **educación** y del **chat** → `educational_content` pasa a SOPORTE real
>   (es la herramienta con la que la app mejora esos indicadores), no a "fuera".

### SOPORTE — se mantiene, en versión ligera (ayuda a un indicador)
| Módulo / tabla | Indicador que soporta | Decisión |
|---|---|---|
| `vaccination_records` (vacunas) | Adh. "Aplicación de vacunas prenatales" | **Vuelve a CORE**: checklist simple (aplicada sí/no + fecha). |
| `educational_content` (educación) | Efic. "Claridad de la información" + Adh. "Comprensión del tratamiento" | **SOPORTE**: la app explica citas/tratamiento → mejora esos ítems. |
| `home_visits` | Efic. "Continuidad del cuidado" / "Acompañamiento" | Útil ante inasistencia. Mantener simple. |
| `lab_results` | Proxy de resultado (Hb ↔ hierro) | Solo **hemoglobina**, opcional. |
| `antecedentes` | Solo si conservas el riesgo | Opcional, no obligatorio. |

### FUERA DE ALCANCE — ocultar (NO borrar) tras feature flag
| Módulo / tabla | Razón (ningún indicador Likert lo mide) |
|---|---|
| `ultrasounds` (ecografías) | Detalle clínico → ya está en la ficha física. |
| `weight_records` (curva de peso) | Detalle clínico. No aparece en tus indicadores. |
| `violence_screenings` (tamizaje violencia) | Proceso clínico aparte. |
| `mental_health_screenings` (SRQ-18) | Proceso clínico aparte. |
| `pathologies` (CIE-10) | Detalle diagnóstico. |
| `dental_records` (odontograma) | Detalle clínico. |
| `nutritional_counseling` | Detalle clínico (la consejería se cubre vía educación/chat). |

> **Regla de oro:** ocultar ≠ borrar. Las tablas permanecen (por si en la defensa
> quieres mostrar capacidad ampliable), pero **salen de la interfaz y se
> desactivan sus endpoints** para no inducir doble digitación.

---

## 2. Reflexión crítica: las 4 decisiones de diseño que debes tomar

Aquí está el razonamiento profundo que te pediste. Son las decisiones que evitan
que el sistema se desvíe.

### Decisión A — NO eliminar `prenatal_controls`, sino SIMPLIFICARLO
El control prenatal no se borra porque es la **prueba de que el control ocurrió**,
y "número de controles completados" es tu indicador #1 de eficacia. Pero **no
necesitas sus 35 campos**. Reemplaza la ficha clínica completa por un **registro
ligero de control**:
- N° de control, fecha, edad gestacional (semanas), **¿asistió? (sí/no)**.
- Opcionales rápidos: peso, presión arterial, una **observación libre**.
- Casilla "el detalle clínico quedó en la ficha física MINSA".

Así la obstetra confirma en 10 segundos que el control se hizo (lo que tu tesis
mide) sin re-digitar la HCP.

### Decisión B — Desacoplar el "nivel de riesgo" del registro clínico pesado
Hoy el semáforo de riesgo (verde/amarillo/rojo) se calcula a partir de edad, IMC,
hemoglobina, presión, antecedentes... = mucho dato clínico. Para tus objetivos el
riesgo solo sirve para **priorizar el seguimiento** (a quién recordar más). 
**Recomendación:** que el riesgo sea un **selector manual** que la obstetra marca
(o un autocálculo ligero con 2-3 datos que ya capturas: edad + antecedente
relevante). Que **nunca bloquee** el flujo ni exija llenar laboratorios.

### Decisión C — Definir UNA sola fórmula de adherencia (¡crítico para la tesis!)
Tu código hoy calcula la adherencia de **dos formas distintas** (una divide entre
`duracionDias`, otra entre el total de registros). En una investigación esto es
peligroso: dos números diferentes para la misma gestante invalidan el análisis.
**Debes fijar una definición operacional única**, por ejemplo:

```
Adherencia (%) = (días con toma registrada ÷ días esperados de toma) × 100
  días esperados = días transcurridos desde fechaInicio hasta hoy (o fechaFin),
                   acotado a la duración del tratamiento.
Buena adherencia = ≥ 80%  (umbral estándar en literatura de suplementación).
```

### Decisión D — Definir el indicador operacional de "eficacia del seguimiento"
"Eficacia del seguimiento prenatal" debe traducirse a números medibles. Propuesta:
- N° promedio de controles completados (meta MINSA ≥6, OMS ≥8).
- % de gestantes con ≥6 y con ≥8 controles.
- **Tasa de asistencia** = citas asistidas ÷ citas programadas.
- % de **captación temprana** (1er control en el 1er trimestre).
- Cumplimiento del cronograma (control en la semana esperada ± ventana).

---

## 3. Dataset mínimo necesario (lo único que se registra)

**De la gestante (al darla de alta):**
- DNI, nombres y apellidos, teléfono (y teléfono del acompañante).
- **FUM o FPP** (imprescindible: de aquí salen la edad gestacional, el trimestre,
  el cronograma de 8 controles y los recordatorios de FPP).
- Nivel de riesgo (selector manual, opcional).

**Del seguimiento (Obj. 1):**
- Citas (las 8 del cronograma + las que se agreguen) con su estado.
- Registro ligero de control (n°, fecha, EG, asistió, observación).

**Del tratamiento (Obj. 2):**
- Tratamiento: nombre, dosis, frecuencia, hora de toma, fecha inicio, duración.
- Registro diario de toma (el botón "ya tomé mi pastilla").

**Nada más es obligatorio.** Todo lo demás es opcional u oculto.

---

## 4. Marco de medición del impacto (lo que tu tesis debe demostrar)

> Esta es la pieza que más estudiantes olvidan y la que hace que tu tesis pueda
> "determinar el impacto". Sin esto, el sistema funciona pero no prueba nada.

**Diseño sugerido:** estudio **pre-post** (antes-después) del mismo grupo, o
cuasi-experimental. Captura una **línea base** (controles y adherencia en el
periodo previo al uso de la app, tomada de las fichas físicas) y compárala con el
periodo **con** la app.

### Indicadores Objetivo 1 — Eficacia del seguimiento prenatal
| ID | Indicador | Fuente en el sistema |
|---|---|---|
| 1.1 | N° promedio de controles completados | `prenatal_controls` |
| 1.2 | % gestantes con ≥6 / ≥8 controles | `prenatal_controls` |
| 1.3 | Tasa de asistencia (asistidas/programadas) | `appointments.estado` |
| 1.4 | Tasa de inasistencia | `appointments.estado` |
| 1.5 | % captación en 1er trimestre | `gestantes.fum` + 1er control |
| 1.6 | Cumplimiento del cronograma | citas autogeneradas vs realizadas |
| 1.7 | (proxy complicaciones) signos de alarma y tiempo de respuesta | `danger_signs` |

### Indicadores Objetivo 2 — Adherencia a los tratamientos
| ID | Indicador | Fuente en el sistema |
|---|---|---|
| 2.1 | % de adherencia a la suplementación (fórmula única) | `supplement_logs` |
| 2.2 | % de gestantes con adherencia ≥80% | `supplement_logs` |
| 2.3 | Continuidad (días consecutivos de toma) | `supplement_logs` |
| 2.4 | % tratamientos completados vs abandonados | `treatments.estado` |
| 2.5 | (proxy de resultado) evolución de Hb corregida | `lab_results` (opcional) |

**Entregable clave:** todos estos indicadores deben poder **exportarse a Excel**
(el sistema ya tiene exportación) para tu análisis estadístico (SPSS/Jamovi),
filtrables por gestante y por periodo (línea base vs intervención).

---

## 5. Plan por fases

> Orden pensado para no romper nada: primero defines QUÉ medir, luego recortas el
> alcance, luego refuerzas los pilares, y al final mides y pilotas.

### Fase 0 — Definir el marco de medición (la brújula) · ~1 semana
- Operacionalizar los 2 objetivos en los indicadores de la sección 4.
- Fijar la **fórmula única de adherencia** y la definición de "control completado".
- Decidir el **diseño del estudio** (pre-post), periodo, tamaño de muestra y cómo
  tomarás la **línea base**.
- **Entregable:** documento de indicadores + diccionario de variables. *(Sin código.)*

### Fase 1 — Congelar el alcance y el dataset mínimo · ~3-4 días
- Aprobar la matriz CORE / SOPORTE / FUERA de la sección 1.
- Aprobar el dataset mínimo de la sección 3.
- **Entregable:** matriz de alcance firmada (decisión, base de las siguientes fases).

### Fase 2 — Simplificar el registro clínico · ~1 semana
- Sustituir la ficha de control de 35 campos por el **registro ligero** (Decisión A).
- **Desacoplar el nivel de riesgo** (Decisión B): selector manual, no bloqueante.
- Volver opcionales laboratorios y dejar la hemoglobina como único lab relevante.
- **Resultado:** la obstetra cierra un control en segundos, sin re-digitar la HCP.

### Fase 3 — Consolidar Pilar 1: seguimiento de citas (Obj. 1) · ~1 semana
- Verificar el **cronograma automático de 8 controles** (semanas 12,18,23,27,31,34,37,39).
- Pulir confirmación, reprogramación con aprobación, detección de inasistencia y
  conversión a **visita domiciliaria**.
- Vista clara por gestante: cuántos controles lleva, cuál sigue, % de asistencia.

### Fase 4 — Consolidar Pilar 2: adherencia al tratamiento (Obj. 2) · ~1 semana
- Registro de tratamiento + **botón de toma diaria** + calendario de adherencia.
- **Unificar el cálculo de adherencia** con la fórmula de la Fase 0 (eliminar la
  fórmula duplicada).
- Recordatorio de medicamento + alerta de baja adherencia al obstetra.

### Fase 5 — Recordatorios y comunicación (soporte transversal) · ~4-5 días
- Afinar recordatorios de cita (3 días / 1 día / 2 horas) y de medicamento,
  incluyendo al **acompañante** (clave en zona rural).
- Chat directo gestante ↔ obstetra (ya existe) + botón de alarma con GPS.
- **Activar SMS/WhatsApp reales** (Twilio / WhatsApp Cloud) si el piloto lo exige;
  hoy están en modo simulado.

### Fase 6 — Tablero de impacto e indicadores de la tesis · ~1 semana
- Construir el dashboard alineado **exactamente** a los indicadores de la sección 4.
- **Exportación a Excel/PDF** con filtro de periodo (línea base vs post).
- Comparativo antes/después por gestante y agregado.

### Fase 7 — Ocultar módulos fuera de alcance (feature flags) · ~3-4 días
- Ocultar de la UI: ecografías, peso, vacunas, tamizajes, patologías, odontograma,
  consejería (educación = opcional).
- Desactivar sus endpoints; **mantener las tablas** (reversible).
- Limpiar los menús de gestante/obstetra/admin para que solo muestren lo CORE.

### Fase 8 — Piloto, validación y recolección de datos · ~2-3 semanas
- Capacitar al personal y a una muestra de gestantes.
- Verificar que **cada indicador se calcula correctamente** (control de calidad).
- Recolectar datos del periodo de intervención + respaldos.
- Exportar para el análisis estadístico de la tesis.

---

## 6. Recomendaciones inteligentes (lo que te dará una tesis sólida)

1. **Una sola definición por variable.** Adherencia, "control completado",
   "asistencia": una fórmula, escrita y congelada antes de recolectar. Cambiarla a
   mitad invalida los datos.
2. **Captura la línea base.** El impacto se demuestra contra un antes. Registra (de
   las fichas físicas) los controles y la adherencia previos al uso de la app.
3. **Menos es más.** Cada campo que quitas reduce la fricción del personal y sube
   la calidad del dato. La adopción es tu mayor riesgo, no la funcionalidad.
4. **El acompañante importa.** En contexto rural, recordar también al familiar
   eleva la asistencia. Ya está en el código; priorízalo.
5. **FUM poco confiable.** Muchas gestantes no recuerdan bien la FUM; permite EG
   por ecografía (`fppEco`, ya existe) para no sesgar el cronograma.
6. **Exportabilidad desde el día uno.** Si no puedes sacar los indicadores a Excel
   filtrados por periodo, no podrás escribir resultados. Trátalo como requisito,
   no como adorno.
7. **No borres, oculta.** Mantén las tablas clínicas tras feature flags: protege
   el trabajo hecho y te permite mostrar "el sistema es ampliable" en la defensa.
8. **Consentimiento y ética.** Ya hay `consentAccepted`; asegúrate de que tu
   protocolo de tesis (comité de ética) cubra el tratamiento de datos.

---

## 7. Riesgos y mitigación
| Riesgo | Impacto | Mitigación |
|---|---|---|
| Doble digitación (papel + app) | Rechazo del personal, datos incompletos | Registro ligero (Fase 2); no replicar la HCP |
| Definiciones inconsistentes | Resultados no válidos | Congelar fórmulas en Fase 0 |
| Conectividad intermitente | Pérdida de registros | Ya hay offline-first; verificar en piloto |
| Sin línea base | No se puede "determinar impacto" | Capturarla antes de la intervención (Fase 0/8) |
| Baja adopción de gestantes | Pocos datos de adherencia | Recordatorios + acompañante + capacitación (Fases 5/8) |
| Alcance que vuelve a crecer | Desviación de objetivos | Matriz de alcance firmada (Fase 1) como contrato |

---

### Síntesis en una frase
Convierte VITMATERNA de "una historia clínica electrónica que nadie querrá
llenar dos veces" en **"un gestor de citas + adherencia + comunicación con un
tablero que prueba tu impacto"** — registrando solo el dato mínimo y midiendo
con definiciones únicas y una línea base. Eso es exactamente lo que tus dos
objetivos exigen, ni más ni menos.
