# VITMATERNA — Plan de Pruebas Manuales (interfaz gráfica)

> Guía paso a paso para que **tú mismo** pruebes todo el sistema en la app,
> en orden lógico, módulo por módulo, con datos concretos y el resultado
> esperado de cada acción. Marca cada casilla `[ ]` al completarla.

---

## 0. Preparación

1. **Servicios encendidos**
   - Backend: `http://localhost:3000/health` debe responder `healthy`.
   - App web: abre **`http://localhost:8081/`** en el navegador.
   - (Recomendado) Reinicia datos a un estado conocido: en `backend/`,
     `npm run prisma:seed`.
2. **Consejo:** usa 3 pestañas/ventanas del navegador (o ventana de incógnito)
   para tener sesiones simultáneas de **gestante**, **obstetra** y **admin**.
3. **Nota de seguridad:** el login tiene límite de **10 intentos / 15 min**.
   No reintentes en exceso; escribe bien las claves.

### Usuarios de prueba (seed)

| Rol | DNI | Contraseña | Nombre | Notas |
|-----|-----|-----------|--------|-------|
| Admin | `99999999` | `Admin@2026` | Administrador | Configuración del sistema |
| Obstetra | `11111111` | `Test@1234` | María Fernández | Profesional principal |
| Obstetra | `22222222` | `Test@1234` | Juan | Segundo profesional |
| Gestante | `33333333` | `Test@1234` | **Ana** | Riesgo VERDE, adherencia 90% |
| Gestante | `44444444` | `Test@1234` | **Lucía** | Riesgo ROJO, adherencia 60% |
| Gestante | `55555555` | `Test@1234` | Sofía | Riesgo AMARILLO |
| Gestante | `77777777` | `Test@1234` | María Elena | Riesgo VERDE |

---

## MÓDULO 1 — Autenticación y acceso

### 1.1 Login correcto (gestante)
- [ ] Abre la app → pantalla de Login.
- [ ] Ingresa DNI `33333333`, contraseña `Test@1234` → **Ingresar**.
- ✅ **Esperado:** entra al **Dashboard de la gestante** (saludo "Hola, Ana").

### 1.2 Login incorrecto
- [ ] Cierra sesión. Intenta DNI `33333333` con clave `claveMala`.
- ✅ **Esperado:** mensaje de error "credenciales inválidas"; no entra.

### 1.3 Recuperar contraseña
- [ ] En Login → "¿Olvidaste tu contraseña?" → ingresa DNI `33333333`.
- ✅ **Esperado:** confirma que se envió un código (en modo prueba se ve en la
  consola del backend, formato SMS/WhatsApp MOCK).

### 1.4 Registro de obstetra (opcional)
- [ ] En Login → "Registrarse" → completa: DNI `12121212`, Nombres `Test`,
  Apellidos `Prueba`, Teléfono `987111222`, COP `99999`, Contraseña
  `Test@1234`, confirmar igual.
- ✅ **Esperado:** registro exitoso / queda pendiente de aprobación del admin.

---

## MÓDULO 2 — Gestante: Dashboard y accesos directos
> Sesión: **Ana (33333333)**

### 2.1 Vista general del dashboard
- [ ] Observa: tarjeta "Tu Embarazo" (semana/trimestre + semáforo de riesgo),
  "Próxima Cita", "Tratamiento del Día" y "Acciones Rápidas".
- ✅ **Esperado:** datos coherentes; el riesgo de Ana es **Bajo (verde)**.

### 2.2 Accesos directos funcionales
- [ ] Toca la tarjeta **"Próxima Cita"**.
- ✅ **Esperado:** navega a la pantalla **Mis Citas**.
- [ ] Vuelve y toca **"Tratamiento del Día"**.
- ✅ **Esperado:** navega a **Tratamiento**.

### 2.3 Confirmar cita desde el dashboard
- [ ] Si la próxima cita está "Programada", pulsa **"Confirmar asistencia"**.
- ✅ **Esperado:** toast "Cita confirmada"; el estado cambia a Confirmada.
  (Esto genera una notificación al obstetra — se verifica en 7.x.)

### 2.4 Campana de notificaciones
- [ ] Toca el ícono de **campana** (arriba a la derecha).
- ✅ **Esperado:** abre la bandeja de notificaciones.

---

## MÓDULO 3 — Gestante: Citas (confirmar y reprogramar)
> Sesión: **Ana**. Pantalla **Mis Citas**.

### 3.1 Ver listado y detalle
- [ ] Pestañas "Próximas" / "Historial". Toca una cita próxima.
- ✅ **Esperado:** se abre un **modal de detalle** ordenado (fecha, hora,
  profesional, estado, indicaciones).

### 3.2 Confirmar cita
- [ ] En una cita "Programada" → botón **Confirmar**.
- ✅ **Esperado:** toast de éxito; estado → Confirmada.

### 3.3 Solicitar reprogramación (selección inteligente)
- [ ] En el detalle → **Solicitar reprogramación**.
- [ ] Elige una **fecha** (chips de próximos días) y luego un **horario**.
- ✅ **Esperado:** solo se muestran **horarios disponibles**; los ocupados
  aparecen tachados/deshabilitados.
- [ ] Escribe un motivo (mín. 5 caracteres) → **Enviar solicitud**.
- ✅ **Esperado:** toast "Solicitud enviada"; la cita pasa a
  **"Solicitud enviada"**. (La gestante NO cambia la fecha por sí misma.)

---

## MÓDULO 4 — Obstetra: Cronograma y aprobación de reprogramación
> Sesión nueva: **María (11111111)**.

### 4.1 Ver cronograma
- [ ] Entra → pestaña/tab **Cronograma**. Filtros "Todas / Hoy / Próximas".
- ✅ **Esperado:** lista de citas con hora, paciente y estado.

### 4.2 Aprobar la solicitud de reprogramación de Ana
- [ ] Busca la cita de **Ana** con estado "Solicita reprogramar" (resaltada).
- [ ] Verás la fecha/hora propuesta y el motivo → pulsa **Aprobar**.
- ✅ **Esperado:** toast "Reprogramación aprobada"; la cita vuelve a
  Programada con la nueva fecha. (Ana recibe notificación.)
- [ ] (Alternativa) Prueba **Rechazar** en otra solicitud → la cita vuelve a su
  estado anterior y la gestante es notificada.

### 4.3 Crear una cita nueva (agenda sin choques)
- [ ] Botón **+** (flotante) → **Programar Cita**.
- [ ] Selecciona paciente: busca "Lucía" (DNI `44444444`).
- [ ] Modalidad: **Establecimiento**. Motivo: Control Prenatal.
- [ ] Elige fecha y un **horario disponible** → **Programar Cita**.
- ✅ **Esperado:** la cita aparece en el cronograma. Si intentas el **mismo
  horario** para otra cita, el sistema lo impide (horario ocupado).

### 4.4 Marcar asistencia
- [ ] En una cita de hoy/programada → **Asistió** / **No asistió**.
- ✅ **Esperado:** el estado se actualiza; "No asistió" queda en rojo.

---

## MÓDULO 5 — Obstetra: Ficha clínica de la gestante
> Sesión: **María**. Ve a **Gestantes** → abre la ficha de **Lucía (44444444)**.

### 5.1 Datos y semáforo de riesgo
- [ ] Tab **Datos**: revisa edad, IMC, FUM, FPP, grupo sanguíneo, riesgo.
- ✅ **Esperado:** Lucía con riesgo **Alto (rojo)**.

### 5.2 Registrar la FUM y verificar FPP automática
- [ ] Si editas la FUM (p. ej. `2026-01-01`) y guardas.
- ✅ **Esperado:** la **FPP se calcula sola** (~`2026-10-08`, regla de Naegele).

### 5.3 Controles prenatales + gráficas
- [ ] Tab **Controles** → **Nuevo Control**: EG `24` sem, peso `62`, PA `110/70`,
  altura uterina `22`, FCF `140` → Guardar.
- ✅ **Esperado:** aparece en el historial. Con 2+ controles se ven las
  **gráficas**: "Altura Uterina vs Edad Gestacional" (con bandas P10/P90 y
  estado del último control) y "Curva de Ganancia de Peso".

### 5.4 Laboratorio + corrección de hemoglobina por altitud
- [ ] Tab **Lab.** → Registrar: tipo `Hemoglobina`, valor `10.5`, fecha hoy.
- ✅ **Esperado:** se guarda con **valor corregido por altitud** (a 2926 msnm
  resta ~1.3 → ~9.2), útil para detectar anemia.

### 5.5 Vacunas
- [ ] Tab **Vacunas** → Registrar `dT`, semana `20`, estado Aplicada.
- ✅ **Esperado:** aparece como Aplicada en el esquema.

### 5.6 Visitas domiciliarias (se prueba completo en el Módulo 9)
- [ ] Confirma que existe el tab **Visitas**.

---

## MÓDULO 6 — Gestante: Tratamiento y adherencia
> Sesión: **Ana**. Pantalla **Tratamiento**.

### 6.1 Registrar toma del día
- [ ] Pulsa "Tomar"/registrar la toma de un suplemento de hoy.
- ✅ **Esperado:** se marca como tomado; el % de adherencia y el calendario se
  actualizan **al instante**.

### 6.2 Ver Mi Progreso
- [ ] Perfil → **Mi Progreso** (o desde el dashboard).
- ✅ **Esperado:** anillo de **adherencia general** (~90% para Ana) y gráfica de
  los últimos 7 días.

### 6.3 Comparación (opcional)
- [ ] Repite con **Lucía**: su adherencia debe rondar **60%**.

---

## MÓDULO 7 — Mensajería y notificaciones

### 7.1 Chat en tiempo real (gestante ↔ obstetra)
- [ ] Sesión **Ana** → **Chat / Consultas** → escribe "Hola, tengo una consulta".
- [ ] Sesión **María** → Chat → abre la conversación de Ana.
- ✅ **Esperado:** el mensaje aparece **en tiempo real** sin recargar.
- [ ] Responde desde María → debe aparecer al instante en la pantalla de Ana.

### 7.2 Enviar una foto en el chat
- [ ] En el chat (Ana o María) → botón de **adjuntar foto** (ícono imagen) →
  elige una imagen.
- ✅ **Esperado:** la imagen se sube y se muestra en la conversación de ambos.

### 7.3 Consultar por WhatsApp
- [ ] Sesión **Ana** → Chat → botón **verde de WhatsApp** (arriba).
- ✅ **Esperado:** abre WhatsApp/`wa.me` con el número del obstetra y un mensaje
  de saludo prellenado.

### 7.4 Chatbot 24/7 + alerta automática
- [ ] Sesión **Ana** → Chat → **Asistente 24/7** → selecciona
  **"Sangrado vaginal"** (síntoma grave).
- ✅ **Esperado:** el bot responde "URGENTE", muestra botón de llamada, y avisa
  que **notificó a tu obstetra** (y deja una alerta en el chat clínico).
- [ ] Sesión **María** → revisa la **campana** y el **chat**.
- ✅ **Esperado:** notificación "🚨 Signo de alarma GRAVE" + mensaje de alerta
  en la conversación.

### 7.5 Emergencia con GPS
- [ ] Sesión **Ana** → Dashboard → **Emergencia** → confirma enviar.
- ✅ **Esperado:** toast "Emergencia enviada"; en el chat de María aparece la
  alerta con enlace de ubicación (el navegador pedirá permiso de ubicación).

### 7.6 Mensaje masivo (broadcast) del obstetra
- [ ] Sesión **María** → opción **Mensaje masivo** → filtra por trimestre/riesgo
  → escribe un mensaje → enviar.
- ✅ **Esperado:** confirma cuántas gestantes lo recibieron; aparece en sus chats.

### 7.7 Bandeja de notificaciones
- [ ] Sesión **María** → campana → revisa la lista.
- ✅ **Esperado:** ves notificaciones (cita confirmada, signo de alarma, etc.).
  Toca una → te lleva a la pantalla relevante. Usa **"Marcar todo"** → el
  contador (badge) baja a 0.

---

## MÓDULO 8 — Gestante: Signos de alarma y educación

### 8.1 Reportar signo de alarma
- [ ] Sesión **Ana** → Dashboard → **Reportar** (signo de alarma) → elige
  "Fiebre" → Enviar.
- ✅ **Esperado:** toast "Alerta enviada"; el obstetra la recibe (campana).

### 8.2 Mis Signos (varios)
- [ ] Dashboard → **Mis Signos** → selecciona varios síntomas → confirma.
- ✅ **Esperado:** se registran y notifican.

### 8.3 Educación
- [ ] Sesión **Ana** → **Educación**.
- ✅ **Esperado:** ves contenido por trimestre (artículos del seed).

---

## MÓDULO 9 — Visita Domiciliaria (módulo nuevo)

### 9.1 La gestante registra su ubicación GPS
- [ ] Sesión **Ana** → Perfil → **Visitas Domiciliarias** →
  **"Usar mi ubicación actual"** (acepta el permiso de ubicación del navegador).
- [ ] Escribe una referencia: "Casa azul frente a la loza" → **Guardar ubicación**.
- ✅ **Esperado:** toast "Ubicación guardada"; se ven las coordenadas.

### 9.2 El obstetra programa una cita domiciliaria
- [ ] Sesión **María** → Cronograma → **+** → paciente **Ana**, modalidad
  **Domiciliaria**, elige fecha/hora → Programar.
- ✅ **Esperado:** la cita aparece con ícono/badge de **Visita domiciliaria**.

### 9.3 Convertir una cita normal en domiciliaria
- [ ] En el cronograma, en una cita "Programada" de establecimiento →
  **"Convertir a domiciliaria"** → confirma.
- ✅ **Esperado:** la cita cambia a domiciliaria; **Ana recibe notificación**
  "Tu cita será domiciliaria".

### 9.4 Cómo llegar (mapa)
- [ ] Ficha de **Ana** → tab **Visitas** → botón **"Cómo llegar"**.
- ✅ **Esperado:** abre Google Maps con la ubicación que Ana registró en 9.1.

### 9.5 Registrar el acta de la visita (formato MINSA)
- [ ] Tab **Visitas** → **Nueva** → completa:
  - Fecha `2026-01-12`, Hora `09:00`, Duración `30`.
  - Motivo: "Seguimiento de consumo de micronutrientes".
  - Acciones: "Orientación y consejería en nutrición y signos de alarma, lavado de manos".
  - Acuerdos: "Comer carne de órgano 2 veces por semana".
  - Marca **Firma del usuario** y **Firma del personal** → **Guardar acta**.
- ✅ **Esperado:** se guarda como **Visita N°1**; aparece en el historial con tu
  nombre y **COP**. Se captura tu GPS al guardar.
- [ ] Registra una **segunda** visita.
- ✅ **Esperado:** numerada automáticamente **N°2** (correlativo).

### 9.6 La gestante ve su historial de visitas
- [ ] Sesión **Ana** → Perfil → Visitas Domiciliarias → baja al historial.
- ✅ **Esperado:** ve las visitas N°1 y N°2 (solo lectura, formato acta).

---

## MÓDULO 10 — Administración
> Sesión nueva: **Admin (99999999 / Admin@2026)**.

### 10.1 Gestión de usuarios
- [ ] Tab **Usuarios** → revisa la lista. Aprueba/activa/desactiva un usuario.
- ✅ **Esperado:** el estado del usuario cambia.

### 10.2 Contenido educativo (CMS)
- [ ] Tab **Contenido** → **+** → Título "Cuidados del 2° trimestre",
  Contenido (texto), Tipo **Artículo**, Categoría **Nutrición**, Trimestre `2`
  → Crear.
- ✅ **Esperado:** aparece en la lista. Pruébalo: **editar** (cambia título),
  **desactivar** y **eliminar**.

### 10.3 Establecimientos de salud (sedes)
- [ ] Tab **Sedes** → crea uno: nombre "Puesto Salud X", altitud `3000`.
- ✅ **Esperado:** se crea; pruébalo editar y eliminar.

### 10.4 Configuración del sistema
- [ ] Tab **Configuración** → cambia la **altitud** (p. ej. 2926) y/o el
  interruptor de "generar citas automáticas".
- ✅ **Esperado:** guarda. (La altitud afecta la corrección de hemoglobina del 5.4.)

### 10.5 Auditoría
- [ ] Tab **Auditoría** → revisa el registro de acciones.
- ✅ **Esperado:** ves entradas con usuario, acción y fecha (las acciones que
  hiciste en esta sesión deberían figurar).

### 10.6 Reportes (obstetra)
- [ ] Sesión **María** → **Reportes**.
- ✅ **Esperado:** ves KPIs MINSA, distribución de riesgo, asistencia por mes,
  adherencia promedio y **conteo de visitas domiciliarias**.

---

## MÓDULO 11 — Seguridad y permisos (verificación rápida)

- [ ] Como **gestante**, intenta entrar a una sección de obstetra/admin.
- ✅ **Esperado:** no tienes acceso (la navegación por rol no lo permite).
- [ ] La gestante **Ana** no debe ver datos/citas/chat de **Lucía**.
- ✅ **Esperado:** cada gestante solo ve lo suyo.

---

## Checklist final

- [ ] M1 Autenticación
- [ ] M2 Dashboard gestante
- [ ] M3 Citas gestante
- [ ] M4 Cronograma obstetra
- [ ] M5 Ficha clínica
- [ ] M6 Tratamiento/adherencia
- [ ] M7 Mensajería/notificaciones
- [ ] M8 Signos de alarma/educación
- [ ] M9 Visita domiciliaria
- [ ] M10 Administración
- [ ] M11 Seguridad/permisos

> **Si algo no funciona como el "Esperado":** anota el módulo, el paso y lo que
> pasó (captura de pantalla si puedes) para corregirlo.

### Notas para la versión web
- El **GPS** y **WhatsApp** dependen del navegador: acepta los permisos de
  ubicación; WhatsApp abrirá `web.whatsapp.com` o la app si la tienes.
- Las **notificaciones push** reales (al celular) requieren un build nativo
  (Expo) con dispositivo físico; en web se prueban como **notificaciones in-app**
  (la campana), que es lo que cubre este plan.
