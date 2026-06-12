# VITMATERNA — Simulación integral de funciones

> Resultado de ejecutar una simulación end-to-end de **todas las funciones** del
> sistema, en orden lógico, con aserciones internas intensivas, para identificar
> problemas o errores de lógica de negocio.

## Cómo ejecutarla

```bash
cd backend
npm run prisma:seed   # estado conocido
npm run dev           # servidor en :3000 (otra terminal)
npm run simulate      # corre scripts/full-simulation.mjs
```

> Nota: el endpoint de autenticación tiene un **rate-limit estricto (10 intentos
> / 15 min por IP)**. La simulación hace ~7 logins, dentro del límite. Si se
> ejecuta varias veces seguidas, reiniciar el server limpia el contador en
> memoria (o esperar 15 min). Esto es comportamiento de seguridad esperado.

## Cobertura (109 comprobaciones, 9 fases)

| Fase | Área | Comprobaciones clave |
|------|------|----------------------|
| A | Autenticación / RBAC | login por rol, clave incorrecta→401, `/auth/me`, RBAC admin/obstetra/gestante, forgot-password (no 501) |
| B | Gestantes / Ficha | alta, **FPP por Naegele (~280 días)**, **IMC (~21.5)**, antecedentes (crear/listar/eliminar + RBAC) |
| C | Citas | disponibilidad, crear, RBAC, **doble booking→409**, fuera de horario→400, confirmar, **solicitud+aprobación de reprogramación**, transiciones de estado, aislamiento por dueño |
| D | Tratamientos | crear, registrar toma, modificar, **suspender (con/sin motivo)**, RBAC, reporte de adherencia 0–100% |
| E | Clínico | control prenatal, **Hb corregida por altitud (12.0 mar / 10.7 a 2926 msnm)**, ecografía, peso, vacuna, odontograma, patología, consejería, **tamizaje violencia ≥15 autoritativo**, SRQ-18, signo de alarma→notificación |
| F | Notificaciones | bandeja in-app, leída individual/masiva, propiedad (404 a terceros), push token guardar/eliminar |
| G | Chat | conversación, teléfono del obstetra (WhatsApp), historial, RBAC de historial, **subir imagen**, emergencia GPS, broadcast con filtros |
| H | Reportes / Admin | asistencia, clínico, educación por trimestre, usuarios, config, **auditoría**, backup, **sedes CRUD**, **educación CRUD + enum válido** |
| I | Visita domiciliaria | ubicación GPS, cita domiciliaria, conversión + RBAC, **acta con correlativo**, cita→asistida, historial, COP firma, reporte |

## Resultado

**109 / 109 OK · 0 fallas** (estado limpio).

```
RESUMEN: 109 OK · 0 fallas (total 109)
```

No se encontraron errores funcionales ni de lógica de negocio en la aplicación.

## Hallazgos y notas

1. **Rate-limit de autenticación (no es bug).** Ejecuciones repetidas de pruebas
   agotan el límite de `/auth/*` (10/15 min) y devuelven 429. Es la protección
   anti fuerza bruta funcionando (RF-1.08 / seguridad). Para baterías de prueba,
   reiniciar el server o espaciar las corridas.

2. ~~**Consistencia de nomenclatura en `/patients`.**~~ ✅ **Normalizado:** todos
   los endpoints de pacientes (`GET /patients`, `GET /patients/:id`,
   `GET /patients/buscar`, `POST /patients`, `PATCH /patients/:id`) exponen ahora
   el DNI de forma consistente como **`dni`** a nivel superior, además de
   mantener `user.dni` por compatibilidad. La simulación verifica
   `dni === user.dni` en listado, detalle y creación.

3. **Cálculos clínicos verificados numéricamente:** FPP por regla de Naegele
   (~280 días desde FUM), IMC, y corrección de hemoglobina por altitud (factor
   −1.3 a 2926 msnm) dan los valores esperados.

4. **Reglas de negocio de citas confirmadas end-to-end:** la gestante no puede
   crear citas, ni marcar asistencia, ni autoaprobar su reprogramación; el
   obstetra es quien aprueba/rechaza; no hay doble booking ni horarios fuera de
   agenda.

5. **Seguridad por propiedad confirmada:** una gestante no accede a citas,
   historial de chat ni notificaciones de otra; los roles están segregados.
