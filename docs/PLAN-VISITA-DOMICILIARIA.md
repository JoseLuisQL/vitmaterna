# VITMATERNA — Plan: Módulo de Visita Domiciliaria

> Nuevo módulo para registrar **visitas domiciliarias** (seguimiento de consumo
> de micronutrientes/SOFE, plan de parto, consejería) **vinculado al módulo de
> citas**: cuando una gestante no puede acudir al establecimiento, el obstetra
> programa una **cita domiciliaria** (previa coordinación) y acude al domicilio,
> ubicándola por **GPS**.
>
> Diseño cuidadoso para **no romper** ninguna funcionalidad existente: se reutiliza
> la máquina de estados, RBAC, disponibilidad, notificaciones y bandeja in-app ya
> probadas (97/97 en la simulación integral).

> ✅ **ESTADO: IMPLEMENTADO** (Fases 1–5). Backend 133 tests, frontend 44 tests,
> simulación integral **109/109 OK** (incluye Fase I — Visita domiciliaria).
> Endpoints: `POST/GET/PATCH/DELETE /home-visits`, `PATCH /appointments/:id/convertir-domiciliaria`,
> `PATCH /patients/:id/ubicacion`, `Appointment.modalidad`, GPS en `Gestante`.

---

## 0. Análisis de la lógica actual (qué reutilizamos)

- **Citas (`Appointment`)** ya tienen: estados (`programada…cancelada` +
  `solicitud_reprogramacion`), RBAC + propiedad, anti–doble-booking,
  `GET /availability`, confirmación y flujo de reprogramación con aprobación,
  notificaciones (`notifyUser`) y bandeja in-app. **No se duplica nada de esto.**
- **`Appointment.motivo`** es texto libre y ya se usa para distinguir tipos en la
  UI. Falta un campo **tipado** para "domiciliaria" vs "establecimiento".
- **`PrenatalControl.visitaDomiciliaria`** (bool) existe pero está infrautilizado.
- **GPS**: hoy solo el botón de emergencia envía coordenadas (no se persisten en
  la gestante). Falta guardar la **ubicación del domicilio** de la gestante.
- **Obstetra** ya tiene `cop` y nombre → sirve para la firma del acta MINSA.

**Conclusión:** la forma profesional y de menor riesgo es (a) marcar la cita como
*modalidad domiciliaria* reutilizando todo el motor de citas, y (b) añadir una
entidad nueva **`HomeVisit`** para el acta de la visita (los campos del formato
MINSA que enviaste), opcionalmente ligada a la cita que la originó.

---

## Modelo de datos (cambios aditivos, sin romper nada)

### 1. Enum nuevo + campo en `Appointment`
```prisma
enum ModalidadCita {
  establecimiento   // por defecto (comportamiento actual)
  domiciliaria
}

model Appointment {
  // ...
  modalidad   ModalidadCita @default(establecimiento) @map("modalidad")
  // ...
}
```
> `@default(establecimiento)` ⇒ todas las citas existentes siguen igual. Cero
> migración de datos, cero cambios en los flujos actuales.

### 2. Ubicación GPS del domicilio en `Gestante`
```prisma
model Gestante {
  // ...
  domicilioLat   Decimal? @map("domicilio_lat") @db.Decimal(10, 7)
  domicilioLng   Decimal? @map("domicilio_lng") @db.Decimal(10, 7)
  referenciaDom  String?  @map("referencia_domicilio")  // "Casa azul frente a la loza"
}
```

### 3. Entidad nueva `HomeVisit` (acta de visita domiciliaria)
```prisma
model HomeVisit {
  id              String    @id @default(uuid()) @db.Uuid
  gestanteId      String    @map("gestante_id") @db.Uuid
  obstetraId      String    @map("obstetra_id") @db.Uuid
  appointmentId   String?   @map("appointment_id") @db.Uuid   // cita que la originó (opcional)
  numeroVisita    Int       @map("numero_visita")             // Visita 1, 2, 3...
  fecha           DateTime  @db.Date
  horaLlegada     DateTime? @map("hora_llegada") @db.Time()
  duracionMin     Int?      @map("duracion_min")              // 30
  motivo          String                                       // "Seguimiento de consumo de micronutrientes"
  acciones        String                                       // texto de acciones realizadas
  acuerdos        String?                                      // acuerdos de la visita
  // GPS donde se realizó la visita (para trazabilidad real)
  lat             Decimal?  @db.Decimal(10, 7)
  lng             Decimal?  @db.Decimal(10, 7)
  // Firmas (consentimiento simple: nombre + marca de aceptación)
  firmaGestante   Boolean   @default(false) @map("firma_gestante")
  firmaObstetra   Boolean   @default(false) @map("firma_obstetra")
  createdAt       DateTime  @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt       DateTime  @updatedAt @map("updated_at") @db.Timestamptz()

  gestante    Gestante     @relation(fields: [gestanteId], references: [id])
  obstetra    Obstetra     @relation(fields: [obstetraId], references: [id])
  appointment Appointment? @relation(fields: [appointmentId], references: [id])

  @@index([gestanteId, fecha], map: "idx_home_visits_gestante")
  @@map("home_visits")
}
```
Relaciones inversas: `Gestante.homeVisits`, `Obstetra.homeVisits`,
`Appointment.homeVisits`. Migración con `prisma db push` (aditiva).

---

## Fases de implementación

### Fase 1 — Backend: esquema + citas domiciliarias
- 1.1 Añadir enum `ModalidadCita`, `Appointment.modalidad`, GPS en `Gestante`,
  modelo `HomeVisit` + relaciones. `db push` + `generate`.
- 1.2 Citas: aceptar `modalidad` en crear/listar/filtrar. Para **domiciliarias**
  se relaja la validación de slot (el obstetra puede solapar porque se desplaza),
  pero se mantiene el registro y las notificaciones. Reutiliza RBAC/propiedad.
- 1.3 Endpoint para **convertir** una cita a domiciliaria (cuando la gestante no
  puede asistir): `PATCH /appointments/:id/convertir-domiciliaria` (obstetra),
  que cambia `modalidad`, ajusta `motivo` y **notifica a la gestante**.
- 1.4 Guardar/leer ubicación GPS del domicilio de la gestante (vía
  `PATCH /patients/:id` ya existente + nuevos campos, y un endpoint dedicado
  `PATCH /patients/:id/ubicacion` para que la gestante registre su GPS).
- 1.5 Tests de integración (modalidad, conversión, ubicación).

➡️ Commit: `feat(visita-domiciliaria): modalidad de cita domiciliaria y ubicacion GPS de la gestante`

### Fase 2 — Backend: módulo HomeVisit (CRUD + acta)
- 2.1 `home-visit` module (controller/service/schema/routes):
  - `POST /home-visits` (obstetra): registra el acta; calcula `numeroVisita`
    automáticamente (correlativo por gestante).
  - `GET /home-visits/:gestanteId`: historial de visitas (obstetra/admin; la
    gestante ve las suyas).
  - `PATCH /home-visits/:id`, `DELETE /home-visits/:id` (obstetra/admin).
  - Al crear, si viene `appointmentId`, marca la cita como `asistida`.
  - Notifica a la gestante: "Tu obstetra registró la visita domiciliaria N°X".
- 2.2 Integrar con notificaciones in-app (reutiliza `notifyUser`).
- 2.3 Tests de integración del CRUD + RBAC + correlativo.

➡️ Commit: `feat(visita-domiciliaria): registro de actas de visita domiciliaria (CRUD)`

### Fase 3 — Frontend: obstetra
- 3.1 En `NuevaCitaModal`: selector de **modalidad** (Establecimiento /
  Domiciliaria). Si es domiciliaria, muestra la dirección/GPS de la gestante.
- 3.2 En `cronograma`: badge/ícono distintivo para citas domiciliarias y acción
  "Convertir a domiciliaria" en citas que la gestante no puede asistir.
- 3.3 Botón **"Cómo llegar"** que abre Google Maps con el GPS del domicilio
  (`https://maps.google.com/?q=lat,lng`) — análogo al deep-link de WhatsApp.
- 3.4 Pantalla/flujo **"Registrar visita domiciliaria"**: formulario con los
  campos del acta MINSA (fecha, hora llegada, duración, motivo, acciones,
  acuerdos, firmas) + captura de GPS al momento. Accesible desde la ficha de la
  gestante (nuevo tab "Visitas") y desde la cita domiciliaria.
- 3.5 Historial de visitas en la ficha de la gestante (lista tipo acta, con
  obstetra + COP para la firma).

➡️ Commit: `feat(visita-domiciliaria): UI del obstetra (modalidad, mapa, registro e historial de actas)`

### Fase 4 — Frontend: gestante
- 4.1 Registrar/actualizar su **ubicación GPS** del domicilio (botón "Usar mi
  ubicación actual" + referencia textual). Reutiliza `navigator.geolocation` /
  `expo-location` ya usado en emergencia.
- 4.2 Ver sus **citas domiciliarias** diferenciadas en "Mis Citas".
- 4.3 Ver el **historial de visitas** recibidas (solo lectura, formato acta).

➡️ Commit: `feat(visita-domiciliaria): UI de la gestante (ubicacion GPS e historial de visitas)`

### Fase 5 — Reportes, QA y simulación
- 5.1 Indicador en `reports/clinic`: nº de visitas domiciliarias por periodo.
- 5.2 Ampliar `full-simulation.mjs` con una **Fase I — Visita domiciliaria**
  (crear cita domiciliaria, registrar GPS, crear acta, correlativo, historial).
- 5.3 typecheck + tests (backend/frontend) + smoke + simulación a 0 fallas.
- 5.4 Actualizar `docs/` (este plan + análisis de funciones + ISO si aplica).

➡️ Commit: `test(visita-domiciliaria): simulacion + reportes + documentacion`

---

## Garantías de no-regresión
- Todos los cambios de esquema son **aditivos con default** ⇒ las citas y fichas
  actuales no cambian de comportamiento.
- Se **reutiliza** el motor de citas (estados, RBAC, notificaciones) en lugar de
  duplicarlo.
- Cada fase termina con typecheck + tests + simulación verdes antes de commit.
- La modalidad domiciliaria es opt-in: si nadie la usa, el sistema funciona
  idéntico a hoy.

## Mapeo con tu formato MINSA
| Campo del acta | Campo en `HomeVisit` |
|---|---|
| VISITA DOMICILIARIA N° | `numeroVisita` (correlativo automático) |
| FECHA | `fecha` |
| HORA LLEGADA | `horaLlegada` |
| DURACIÓN DE LA VISITA | `duracionMin` |
| MOTIVO DE LA VISITA | `motivo` |
| ACCIONES REALIZADAS | `acciones` |
| ACUERDOS | `acuerdos` |
| Firma del Usuario / Personal | `firmaGestante` / `firmaObstetra` |
| Personal de Salud (nombre, COP) | `obstetra.user` + `obstetra.cop` |
| Nombre y Apellidos / HCL | `gestante.user` + `gestante.historiaClinica` |
