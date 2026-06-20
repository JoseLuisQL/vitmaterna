# Reporte de QA End-to-End — VITMATERNA

> Simulación de procesos completos con los 3 roles interactuando entre sí,
> contra el backend en vivo (Postgres + Redis + seed), usando la misma API que
> consume la app. Verificado además en la UI web.

## Entorno levantado en el sandbox
- **PostgreSQL 16** (`:5432`) + **Redis 7** (`:6379`)
- Backend Node/Express/Prisma (`:3000`) — 5 migraciones aplicadas + seed
- Frontend Expo web (`:8081`) apuntando a `localhost:3000/v1`

Credenciales del seed: admin `99999999`/`Admin@2026`, obstetra `11111111`/`Test@1234`,
gestante `33333333`/`Test@1234`.

---

## 1. Suites e2e existentes del backend (ejecutadas)

| Suite | Resultado | Cubre |
|---|---|---|
| `integration-e2e.mjs` | **19 OK · 0 fallas** | citas, RBAC, reprogramación, signos de alarma, chat imagen, tamizajes, contenido |
| `chat-e2e.mjs` | **9 OK · 0 fallas** | sockets autenticados, mensajería en tiempo real, persistencia, rechazo de token inválido |
| `full-simulation.mjs` | **108 OK · 1 falla** | recorrido por fases A→I (auth, ficha, citas, tratamientos, clínico, notificaciones, chat, reportes, admin, visita domiciliaria) |

La única "falla" de `full-simulation` es un **quirk del script de prueba** (busca la
cita domiciliaria en la vista por defecto de `/appointments`, que la filtra); el
flujo de visita domiciliaria en sí pasa todas sus aserciones (acta, correlativo,
firma COP, historial).

> Nota: los 7 módulos clínicos opcionales (ecografías, peso, tamizajes,
> patologías, odontograma, consejería) están **desactivados por defecto** por
> feature-flag (alcance de tesis). El ADMIN los habilita vía
> `PUT /admin/feature-flags` y entonces operan al 100%.

---

## 2. Recorrido narrativo completo (nuevo) — `journey-e2e.mjs`

Historia real de una gestante nueva ("Rosa Huamán"), con los 3 roles
interactuando en orden lógico. **Resultado: 37 OK · 0 fallas.**

| # | Paso | Roles | Verificado |
|---|---|---|---|
| 1 | Habilitar módulos clínicos + registrar sede | ADMIN | flags on · sede creada |
| 2 | Registrar gestante con FUM | OBSTETRA | FPP por Naegele (auto) · IMC auto · antecedente |
| 3 | Agendar primer control + confirmar | OBSTETRA → GESTANTE | cita creada · gestante confirma |
| 4 | Control prenatal completo | OBSTETRA | signos/AU/FCF · **Hb 11.5→10.2 corregida por altitud** · ecografía · peso · vacuna dT · tamizaje violencia (16→positivo+derivación) · consejería |
| 5 | Prescribir tratamiento + registrar toma | OBSTETRA → GESTANTE | sulfato ferroso · gestante marca la toma |
| 6 | Chat + recomendar contenido | GESTANTE ↔ OBSTETRA | conversación · teléfono WhatsApp · recomendación de contenido |
| 7 | Reportar signo de alarma + atender | GESTANTE → OBSTETRA | cefalea grave · **notificación en tiempo real** · obstetra atiende |
| 8 | Reprogramar con aprobación | OBSTETRA → GESTANTE → OBSTETRA | gestante solicita · obstetra aprueba |
| 9 | Domicilio GPS + visita domiciliaria | GESTANTE → OBSTETRA | ubicación GPS · cita domiciliaria · acta con correlativo y firmas |
| 10 | Supervisión | ADMIN / OBSTETRA | lista de usuarios · reporte clínico · gestante visible en lista |

Reglas de negocio confirmadas de paso: RBAC (gestante no crea citas/tratamientos
ni resuelve sus propias solicitudes), corrección de Hb por altitud (RF-10.03),
umbral de tamizaje de violencia ≥15 (RF-5.11), correlativo de visitas, FPP por
Naegele (RF-2.07).

---

## 3. Verificación en la UI (web, datos reales)

Con sesión por rol (token real inyectado), el portal web renderiza los datos
generados por el recorrido:

- **Obstetra · Gestantes**: la tabla (DataTable) muestra las pacientes del
  recorrido (Rosa Huamán) junto a las del seed, con badges de riesgo, semanas y FPP.
- **Obstetra · Ficha de Rosa**: cabecera SEMANA (22) / FPP / IMC, tabs
  Resumen/Tratamiento, resumen clínico con controles, **"Anemia leve (Hb 10.2 g/dL)"**
  (la hemoglobina corregida por altitud que registró el recorrido), antecedentes y
  datos personales.
- **Los 3 dashboards** (gestante/obstetra/admin) cargan con datos reales y sin
  errores de consola.

---

## 4. Veredicto

El sistema soporta el **flujo completo de atención prenatal de extremo a extremo**
con los 3 roles interactuando, sobre datos reales, y el rediseño de frontend
muestra correctamente toda esa información. Total agregado de QA e2e:

**173 verificaciones OK** (19 + 9 + 108 + 37) · 0 fallas reales
(1 quirk de script documentado).

Scripts reutilizables: `backend/scripts/journey-e2e.mjs` (recorrido narrativo),
`full-simulation.mjs`, `integration-e2e.mjs`, `chat-e2e.mjs`.
