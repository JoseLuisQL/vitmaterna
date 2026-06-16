# ¿Qué se elimina / oculta de tu sistema? — Decisión basada en tus indicadores

> Respuesta directa a tu pregunta, **recalibrada** con la operacionalización que
> definiste (indicadores con escala de Likert). Regla base: **nada se borra de la
> base de datos**; lo que sale de alcance se **oculta de la interfaz y se
> desactivan sus endpoints** (feature flag). Es reversible y protege tu trabajo.

---

## 1. Por qué tus indicadores cambian la decisión

Tus dos variables se miden con **encuestas Likert a las gestantes** (Nunca →
Siempre) **+ registros clínicos** (antes y después). Eso es clave: la mayoría de
los indicadores **no necesitan que la app capture el dato clínico** — se miden por
encuesta. La app solo debe **soportar la conducta** que el indicador evalúa.

### Objetivo 1 — Eficacia del seguimiento prenatal
| Indicador (Likert) | ¿Qué función de la app lo soporta? |
|---|---|
| Puntualidad en la asistencia a citas | **Citas + recordatorios** |
| Conocimiento anticipado de citas | **Citas + recordatorios** (3d/1d/2h) |
| Claridad de la información recibida | **Educación + chat** |
| Continuidad del cuidado | **Citas + visitas domiciliarias + chat** |
| Acompañamiento profesional percibido | **Chat directo** + notif. al acompañante |
| Reprogramación por olvido o desinformación | **Recordatorios + reprogramación in-app** |

### Objetivo 2 — Adherencia a los tratamientos prenatales
| Indicador (Likert) | ¿Qué función de la app lo soporta? |
|---|---|
| Consumo de suplementos | **Tratamiento + registro de toma** |
| Recuerdo de horarios/dosis | **Recordatorio de medicamento** |
| Cumplimiento de indicaciones médicas | **Tratamiento + chat** |
| Comprensión del tratamiento | **Educación + chat** |
| Aplicación de vacunas prenatales | **Registro de vacunas (simple)** |

**Conclusión:** las funciones que SÍ tocan tus indicadores son: citas,
recordatorios, tratamiento/registro de toma, **vacunas (simple)**, **educación**,
**chat** y visitas domiciliarias. Todo lo demás no aparece en ningún indicador.

---

## 2. ✅ SE MANTIENE (toca un indicador o es infraestructura)

| Módulo / tabla | Indicador que soporta |
|---|---|
| `auth` (users, sessions) | Infraestructura (login por DNI) |
| `gestantes` *(mínima)* | Base de toda la app |
| `obstetras` | Profesional que da seguimiento |
| `appointments` (citas) | Puntualidad, conocimiento anticipado, reprogramación, continuidad |
| `treatments` + `supplement_logs` | Consumo de suplementos, recuerdo de dosis, cumplimiento |
| `vaccination_records` *(simplificado)* | **Aplicación de vacunas prenatales** |
| `educational_content` *(soporte)* | Claridad de información, comprensión del tratamiento |
| `conversations` + `messages` (chat) | Acompañamiento percibido, claridad, comprensión |
| `notifications` + cron | Conocimiento anticipado, recuerdo de dosis |
| `home_visits` *(simple)* | Continuidad del cuidado |
| `prenatal_controls` *(ligero)* | Cuenta de controles (registro clínico Obj.1) |
| `lab_results` *(solo Hb, opcional)* | Proxy de resultado (anemia/hierro) |
| `reports` | Tablero de impacto (medición de la tesis) |
| `system_config`, `audit_logs`, `health_facilities` | Infraestructura |

---

## 3. ❌ SE OCULTA / DESACTIVA (ningún indicador lo mide)

Estas 6 áreas NO aparecen en ninguno de tus 11 indicadores. Son detalle clínico
que ya queda en la ficha física MINSA. **No se borran**: se ocultan de la UI y se
desactivan sus endpoints.

| # | Módulo / tabla | Pantallas/menús que desaparecen | Por qué |
|---|---|---|---|
| 1 | `ultrasounds` (ecografías) | sección ecografías en ficha de gestante | No está en ningún indicador |
| 2 | `weight_records` (curva de peso) | gráfica/registro de peso | No está en ningún indicador |
| 3 | `violence_screenings` (tamizaje violencia) | pantalla de tamizajes | Proceso clínico aparte |
| 4 | `mental_health_screenings` (SRQ-18) | pantalla de tamizajes | Proceso clínico aparte |
| 5 | `pathologies` (CIE-10) | sección patologías | Detalle diagnóstico |
| 6 | `dental_records` (odontograma) | sección odontograma | Detalle clínico |
| 7 | `nutritional_counseling` | sección consejería nutricional | Se cubre por educación/chat |

**En la práctica esto significa:** quitar del menú del obstetra la pantalla
`gestante/tamizajes`, y de la ficha de gestante (`gestante/[id]`) las secciones de
ecografías, peso, patologías, odontograma y consejería. El backend deja de exponer
sus rutas (`/clinical/ultrasounds`, `/weight-records`, `/screenings/*`,
`/pathologies`, `/dental`, `/nutritional-counseling`).

---

## 4. ✂️ SE SIMPLIFICA (no se elimina, se reduce a lo esencial)

| Módulo | Antes (ahora) | Después (objetivo) |
|---|---|---|
| `prenatal_controls` | ~35 campos clínicos por control | **registro ligero**: n° control, fecha, EG, ¿asistió?, observación libre. (+ peso/PA opcionales) |
| `gestantes` | ~60 campos | **mínimos obligatorios**: DNI, nombre, teléfono, tel. acompañante, FUM/FPP, riesgo (manual opcional) |
| `vaccination_records` | registro detallado | **checklist**: vacuna, aplicada (sí/no), fecha |
| `lab_results` | múltiples exámenes | **solo hemoglobina** (opcional, por la relación con el hierro) |
| nivel de riesgo | autocálculo con muchos datos clínicos | **selector manual** (o autocálculo con 2-3 datos), nunca bloqueante |
| adherencia | **2 fórmulas distintas en el código** ⚠️ | **una sola fórmula** congelada antes de recolectar |

---

## 5. Resumen ejecutivo

- **Nada se borra de la base de datos.** Todo es reversible.
- **Se ocultan 7 áreas** (ecografías, peso, violencia, salud mental, patologías,
  odontograma, consejería nutricional) porque **ningún indicador tuyo las mide**.
- **Vacunas y educación SÍ se quedan** — tu propia operacionalización los incluye
  ("aplicación de vacunas", "claridad/comprensión").
- **Se simplifican** control prenatal, ficha de gestante, vacunas y laboratorios
  para eliminar la doble digitación con la ficha MINSA.
- **Se unifica** la fórmula de adherencia (hoy hay dos → riesgo para tu tesis).

> Con esto el sistema queda alineado exactamente a tus 11 indicadores: cada
> pantalla que sobrevive sirve para que la gestante puntúe mejor en la encuesta
> Likert o para contar controles/adherencia en los registros clínicos.
