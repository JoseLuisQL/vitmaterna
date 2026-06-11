# VITMATERNA — Análisis de Funciones Faltantes (vs. plan)

Auditoría RF por RF del `implementation_plan.md` (M1–M10) contra el código real
(backend `src/modules`, `prisma/schema.prisma`, frontend `app/` y
`src/services`). Verificado leyendo rutas/servicios/pantallas; no se asume nada.

> **Estado del modelo de datos:** muy completo — cubre casi todos los campos del
> plan. La mayoría de brechas no son de esquema, sino de **endpoints, UI o
> lógica de negocio** que aún no explotan ese esquema.

Leyenda: ✅ Implementado · 🟡 Parcial · ❌ Faltante

> **Actualización (módulo de Citas — M3):** se completó el flujo profesional de
> citas. Ya resuelto: confirmación de cita con aviso al obstetra (RF-3.05),
> solicitud de reprogramación **con aprobación/rechazo** del obstetra y
> notificación a la gestante (RF-3.08/3.09), agenda inteligente con horarios
> disponibles para evitar doble booking (`GET /appointments/availability`),
> RBAC y verificación de propiedad en todas las rutas de citas, y rediseño UI
> (detalle en modal + selección de horario) tanto en gestante como en obstetra.
> Ver `docs/PLAN-MEJORAS-CITAS-Y-DASHBOARD.md`.

## Resumen por módulo

| Módulo | RF | ✅ | 🟡 | ❌ |
|--------|----|----|----|----|
| M1 Autenticación | 8 | 5 | 2 | 1 |
| M2 Gestantes | 12 | 2 | 10 | 0* |
| M3 Citas | 13 | 5 | 7 | 1 |
| M4 Tratamientos | 10 | 4 | 3 | 3 |
| M5 Clínico | 12 | 6 | 5 | 1 |
| M6 Educación | 10 | 4 | 4 | 2 |
| M7 Notificaciones | 14 | 2 | 5 | 7 |
| M8 Reportes | 7 | 4 | 3 | 0 |
| M9 Mensajería | 5 | 2 | 2 | 1 |
| M10 Administración | 6 | 0 | 5 | 1 |
| **Total** | **97** | **34 (35%)** | **46 (47%)** | **17 (18%)** |

\* M2 RF-2.03 figura 🟡 pero en la práctica es ❌ (sin endpoint de creación).

---

## 🔴 Faltantes de alto impacto (prioridad)

1. **RF-1.05 Recuperación de contraseña** — `resetPassword` responde 501; no hay
   token de reset ni envío. Un usuario no puede recuperar acceso.
2. **RF-10.04 Auditoría no se registra** — `audit.middleware.ts` existe pero
   **nunca se monta** en rutas; la tabla de auditoría no se llena (afecta RNF-3.05,
   trazabilidad de datos médicos).
3. **RF-2.07 / RF-2.11 FPP no se calcula automáticamente** — `utils/dateCalc.ts`
   (regla de Naegele) nunca se invoca al registrar; rompe la cascada de alertas
   de FPP, educación por trimestre y cronograma.
4. **RF-2.03 Antecedentes familiares/personales** — se leen y afectan el riesgo,
   pero **no hay endpoint para crearlos** (no se pueden registrar).
5. **RF-4.06 / RF-7.05 Recordatorios de suplementos** — inexistentes pese a ser el
   objetivo central (adherencia). El cron solo procesa citas.
6. **RF-3.13 / RF-7.07 Alerta de cita perdida / inasistencia** — no hay job que
   marque `no_asistida` ni avise al obstetra.
7. **RF-7.08 Alerta de baja adherencia (<50%)** — inexistente.
8. **RF-7.11 / RF-7.12 Exámenes pendientes y FPP próxima** — inexistentes.
9. **RF-10.06 Backup roto** — el frontend hace `POST /admin/backup` pero la ruta
   es `GET`; además no hay restauración ni respaldo automático.
10. **RF-10.02 Gestión de establecimientos** — modelo `HealthFacility` existe;
    cero endpoints/UI (bloquea multi-tenant RNF-7.01 y factor de altitud por sede).
11. **RF-4.10 Modificar/suspender tratamiento** — sin endpoint PATCH/DELETE.
12. **RF-5.06 Bug de clasificación de ganancia de peso** — compara
    `clasificacionImc` con valores que nunca coinciden (`'bajo_peso'` vs `'bajo'`),
    por lo que la clasificación siempre resulta `null`.

## 🟡 Parciales que conviene completar

- **RF-1.08** Bloqueo a 15 min (hoy 30) y notificar al usuario.
- **RF-1.06** Biometría: solo hay flag en BD; falta integrar `expo-local-authentication`.
- **RF-3.02** Cronograma con la frecuencia MINSA real (mensual/quincenal/semanal),
  no semanas fijas.
- **RF-3.08/3.09** Flujo de aprobación de reprogramación + notificación a la gestante.
- **RF-3.11/7.04** Recordatorio de 2 h antes (campo existe, no se usa) y cron más
  frecuente (hoy corre cada 24 h).
- **RF-4.04** Adherencia sobre días transcurridos, no sobre la duración total.
- **RF-4.08** Alerta de anemia + orientación; usar altitud configurable.
- **RF-5.02/5.03** Percentiles P25/P90 en peso y **gráfica de altura uterina**.
- **RF-5.11** Aplicar umbral ≥15 en el tamizaje de violencia (hoy positivo si >0).
- **RF-5.12 / RF-2.08** UI para odontograma y ecografías (backend ya listo).
- **RF-7.13** UI de preferencias de notificación.
- **RF-8.05** Exportación a Excel además de PDF.
- **RF-9.01** Subida de fotos en el chat (modelo lo soporta; falta picker).
- **RF-9.02** Chatbot: alerta automática al obstetra en casos graves.
- **RF-10.03** Exponer parámetros reales (plantillas, Hb de referencia, altitud, horarios).
- ~~**RF-10.05** UI de listar/editar/eliminar contenido + alinear el enum `tipo`~~
  ✅ **Resuelto:** `GET /admin/education` (listar), UI admin de crear/listar/editar/
  eliminar con selección de tipo y categoría, y payload alineado al backend
  (`titulo/contenido/tipo/categoria/mediaUrl/duracionMin`); enum corregido a
  `articulo/infografia/video/audio/faq`.

---

## Módulo 9 — Mensajería / Chat (detalle, auditado y probado)

| RF | Estado | Nota |
|----|--------|------|
| RF-9.01 Chat directo gestante–obstetra | 🟡 | Texto en tiempo real (Socket.IO) **funciona y está probado**. Falta subida de fotos en la UI. |
| RF-9.02 Chatbot de emergencia 24/7 | ✅ | Triage local por síntomas + **alerta automática al obstetra**: notificación in-app persistente (campana) y push; en casos GRAVES, además inserta un mensaje de alerta en el chat clínico gestante↔obstetra. |
| RF-9.03 Mensajes masivos del obstetra | ✅ | Con filtros por trimestre y riesgo. Probado. |
| RF-9.04 Línea de emergencia (llamada + GPS) | ✅ | Botón emergencia → GPS → mensaje de alerta + push. Probado. |
| RF-9.05 WhatsApp para consultas (deep-link) | ❌ | No hay `wa.me`/`whatsapp://` para abrir chat con el obstetra. |

**Estado del chat tras esta revisión:** verificado end-to-end (REST + Socket.IO):
resolución de conversación, historial paginado, RBAC (403 a terceros), envío y
recepción en tiempo real entre gestante y obstetra, persistencia, emergencia GPS,
broadcast con filtros y rechazo de tokens inválidos. Se corrigió una verificación
de participante confusa/muerta en el socket. Cobertura automatizada añadida:
`tests/integration/chat.test.ts` y `scripts/chat-e2e.mjs` (`npm run chat:e2e`).

---

## Notas de veracidad

- **SMS/WhatsApp (M7):** el código es real (Twilio + WhatsApp Cloud) pero por
  defecto opera en *mock* sin credenciales; faltan plantillas/botones del plan.
- **Educación (RF-6.03/04/05/07):** mecanismo data-driven correcto, pero el seed
  trae solo 3 artículos de texto, así que la cobertura real es baja.
- **RF-3.02:** el cronograma se dispara al setear `fum` en el alta, pero con
  semanas fijas, no la frecuencia MINSA.

> Conclusión: el modelo de datos, los reportes y el semáforo de riesgo están
> sólidos. Las mayores brechas están en **automatizaciones de notificación/alertas
> (M7)**, **administración (M10)**, **recuperación de contraseña/biometría (M1)** y
> varias **UIs de creación** sobre backend ya existente (ecografías, odontograma,
> antecedentes, edición de tratamientos).
