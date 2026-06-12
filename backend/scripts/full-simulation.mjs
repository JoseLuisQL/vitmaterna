/**
 * VITMATERNA — Simulación integral de TODAS las funciones (orden lógico).
 *
 * Recorre el sistema completo por fases (A→H) con aserciones internas intensivas,
 * para identificar problemas/errores funcionales y de lógica de negocio.
 *
 * Requiere: server corriendo + BD sembrada (`npm run prisma:seed`).
 * Uso: node scripts/full-simulation.mjs
 *
 * Credenciales del seed:
 *   admin    99999999 / Admin@2026
 *   obstetra 11111111 / Test@1234   (María)
 *   obstetra 22222222 / Test@1234   (Juan)
 *   gestante 33333333 / Test@1234   (Ana, verde, adherencia 90%)
 *   gestante 44444444 / Test@1234   (Lucía, rojo, adherencia 60%)
 *   gestante 55555555 / Test@1234   (Sofía, amarillo)
 *   gestante 77777777 / Test@1234   (María Elena, verde)
 */
const BASE = process.env.BASE_URL || 'http://localhost:3000/v1';

let pass = 0, fail = 0;
const failures = [];
let phase = '';

const c = { g: '\x1b[32m', r: '\x1b[31m', y: '\x1b[33m', b: '\x1b[36m', x: '\x1b[0m' };
function setPhase(p) { phase = p; console.log(`\n${c.b}━━━ ${p} ━━━${c.x}`); }
function ok(label) { console.log(`  ${c.g}✓${c.x} ${label}`); pass++; }
function ko(label, extra) {
  console.log(`  ${c.r}✗ ${label}${c.x}${extra ? ` → ${extra}` : ''}`);
  fail++; failures.push(`[${phase}] ${label}${extra ? ` → ${extra}` : ''}`);
}
function check(cond, label, extra) { cond ? ok(label) : ko(label, extra); return cond; }

const tokens = {};
async function login(dni, password) {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dni, password }),
  });
  const j = await r.json();
  return { status: r.status, token: j.data?.accessToken, user: j.data?.user, raw: j };
}
function H(tok, body, method = 'GET') {
  const o = { method, headers: { 'Content-Type': 'application/json' } };
  if (tok) o.headers.Authorization = `Bearer ${tok}`;
  if (body) o.body = JSON.stringify(body);
  return o;
}
async function api(method, path, tok, body) {
  const r = await fetch(`${BASE}${path}`, H(tok, body, method));
  let j = null;
  try { j = await r.json(); } catch { /* sin cuerpo */ }
  return { status: r.status, body: j, data: j?.data };
}
const rndFutureDate = () => {
  const y = 2032 + Math.floor(Math.random() * 40);
  const m = String(1 + Math.floor(Math.random() * 12)).padStart(2, '0');
  const d = String(1 + Math.floor(Math.random() * 28)).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

async function run() {
  console.log(`${c.y}VITMATERNA — Simulación integral${c.x}  (${BASE})`);

  // ─────────────────────────────────────────────────────────────
  setPhase('FASE A — Autenticación, RBAC y sesiones');
  // ─────────────────────────────────────────────────────────────
  for (const [rol, dni] of [['admin', '99999999'], ['obstetra', '11111111'], ['obstetra2', '22222222'], ['gestante', '33333333'], ['gestante2', '44444444'], ['gestante3', '55555555']]) {
    const pw = dni === '99999999' ? 'Admin@2026' : 'Test@1234';
    const res = await login(dni, pw);
    tokens[rol] = res.token;
    check(res.status === 200 && res.token, `login ${rol} (${dni})`, `status ${res.status}`);
  }
  check((await login('33333333', 'malaclave')).status === 401, 'login con clave incorrecta → 401');
  check((await api('GET', '/auth/me', tokens.gestante)).data?.user?.dni === '33333333', 'GET /auth/me devuelve el usuario correcto');
  check((await api('GET', '/auth/me', null)).status === 401, 'GET /auth/me sin token → 401');
  check((await api('GET', '/admin/users', tokens.gestante)).status === 403, 'RBAC: gestante NO accede a /admin/users → 403');
  check((await api('GET', '/admin/users', tokens.obstetra)).status === 403, 'RBAC: obstetra NO accede a /admin/users → 403');
  check((await api('GET', '/admin/users', tokens.admin)).status === 200, 'admin SÍ accede a /admin/users → 200');
  // Recuperación de contraseña (RF-1.05): debe iniciar el flujo (no 501)
  const forgot = await api('POST', '/auth/forgot-password', null, { dni: '33333333' });
  check(forgot.status === 200 || forgot.status === 202, 'POST /auth/forgot-password inicia flujo (no 501)', `status ${forgot.status}`);

  // ─────────────────────────────────────────────────────────────
  setPhase('FASE B — Gestantes / Ficha clínica (FPP, IMC, riesgo, antecedentes)');
  // ─────────────────────────────────────────────────────────────
  const pacientes = await api('GET', '/patients?limit=1000', tokens.obstetra);
  check(pacientes.status === 200 && Array.isArray(pacientes.data), 'obstetra lista pacientes');
  // DNI normalizado a nivel superior (`dni`) y en `user.dni`.
  check((pacientes.data || []).every((p) => p.dni === p.user?.dni), '/patients expone DNI consistente (dni == user.dni)');
  const ana = (pacientes.data || []).find((p) => p.dni === '33333333') || pacientes.data?.[0];
  check(ana?.dni === '33333333', 'localizar gestante Ana (DNI 33333333) por campo dni', `encontrado dni=${ana?.dni}`);
  const gestanteId = ana.id;

  // Alta de una nueva gestante con FUM → debe calcular FPP (Naegele) automáticamente
  const nuevoDni = String(80000000 + Math.floor(Math.random() * 999999)).slice(0, 8);
  const alta = await api('POST', '/patients', tokens.obstetra, {
    dni: nuevoDni, firstName: 'Prueba', lastName: 'Simulacion', phone: '987000111', fechaNacimiento: '1998-05-20',
  });
  check(alta.status === 201, 'obstetra crea una nueva gestante (201)', `status ${alta.status} ${JSON.stringify(alta.body?.error||'')}`);
  check(alta.data?.dni === nuevoDni, 'la creación devuelve el DNI normalizado a nivel superior', `dni=${alta.data?.dni}`);
  const nuevaId = alta.data?.id || alta.data?.gestante?.id;

  if (nuevaId) {
    // Setear FUM y verificar cálculo de FPP por Naegele (+1 año, -3 meses, +7 días aprox 280d)
    const fum = '2026-01-01';
    const upd = await api('PATCH', `/patients/${nuevaId}`, tokens.obstetra, { fum, talla: 1.60, pesoHabitual: 55 });
    check(upd.status === 200, 'actualizar FUM/antropometría de la gestante');
    const ficha = await api('GET', `/patients/${nuevaId}`, tokens.obstetra);
    check(ficha.data?.dni === nuevoDni, 'GET /patients/:id expone DNI normalizado', `dni=${ficha.data?.dni}`);
    const fpp = ficha.data?.estimatedDueDate || ficha.data?.fppFum;
    check(!!fpp, 'FPP calculada automáticamente al registrar FUM (RF-2.07)', `fpp=${fpp}`);
    if (fpp) {
      const dias = Math.round((new Date(fpp).getTime() - new Date(fum).getTime()) / 86400000);
      check(dias >= 270 && dias <= 290, `FPP ≈ 280 días desde FUM (Naegele) — ${dias} días`);
    }
    // IMC: 55 / 1.60^2 = 21.5 (normal)
    const imc = parseFloat(ficha.data?.imc);
    check(!isNaN(imc) && imc > 20 && imc < 23, `IMC calculado correctamente (~21.5) — ${ficha.data?.imc}`);
  }

  // Antecedentes (RF-2.03): crear, listar, eliminar
  const antCreate = await api('POST', '/clinical/antecedentes', tokens.obstetra, { gestanteId, tipo: 'personal', condicion: 'Diabetes sim', detalle: 'DM2' });
  check(antCreate.status === 201, 'crear antecedente personal');
  const antId = antCreate.data?.id;
  const antList = await api('GET', `/clinical/antecedentes/${gestanteId}`, tokens.obstetra);
  check((antList.data || []).some((a) => a.id === antId), 'listar antecedentes incluye el creado');
  check((await api('POST', '/clinical/antecedentes', tokens.gestante, { gestanteId, tipo: 'personal', condicion: 'x' })).status === 403, 'RBAC: gestante NO crea antecedentes → 403');
  if (antId) check((await api('DELETE', `/clinical/antecedentes/${antId}`, tokens.obstetra)).status === 200, 'eliminar antecedente');

  // ─────────────────────────────────────────────────────────────
  setPhase('FASE C — Citas (crear, disponibilidad, confirmar, reprogramar, estados)');
  // ─────────────────────────────────────────────────────────────
  const fechaCita = rndFutureDate();
  const avail = await api('GET', `/appointments/availability?fecha=${fechaCita}`, tokens.obstetra);
  check(Array.isArray(avail.data?.slots) && avail.data.slots.length > 0, 'GET /availability devuelve slots de agenda');
  const slotLibre = (avail.data?.slots || []).find((s) => s.disponible)?.hora || '09:00';

  const citaCreate = await api('POST', '/appointments', tokens.obstetra, { gestanteId, fecha: fechaCita, hora: slotLibre, motivo: 'Control prenatal' });
  check(citaCreate.status === 201 && citaCreate.data?.estado === 'programada', 'obstetra crea cita en slot libre');
  const citaId = citaCreate.data?.id;
  check((await api('POST', '/appointments', tokens.gestante, { gestanteId, fecha: fechaCita, hora: slotLibre })).status === 403, 'RBAC: gestante NO crea cita → 403');
  check((await api('POST', '/appointments', tokens.obstetra, { gestanteId, fecha: fechaCita, hora: slotLibre })).status === 409, 'doble booking mismo slot → 409');
  check((await api('POST', '/appointments', tokens.obstetra, { gestanteId, fecha: fechaCita, hora: '07:00' })).status === 400, 'hora fuera de horario laboral → 400');

  if (citaId) {
    check((await api('PATCH', `/appointments/${citaId}/status`, tokens.gestante, { estado: 'asistida' })).status === 403, 'gestante NO marca asistida (solo obstetra) → 403');
    check((await api('PATCH', `/appointments/${citaId}/confirm`, tokens.gestante)).data?.estado === 'confirmada', 'gestante confirma su cita');
    const reqR = await api('PATCH', `/appointments/${citaId}/request-reschedule`, tokens.gestante, { fecha: rndFutureDate(), hora: '11:00', motivoReprogramacion: 'Motivo de prueba' });
    check(reqR.data?.estado === 'solicitud_reprogramacion', 'gestante solicita reprogramación (no la aplica sola)');
    check((await api('PATCH', `/appointments/${citaId}/resolve-reschedule`, tokens.gestante, { aprobar: true })).status === 403, 'gestante NO resuelve su solicitud → 403');
    const appr = await api('PATCH', `/appointments/${citaId}/resolve-reschedule`, tokens.obstetra, { aprobar: true });
    check(appr.data?.estado === 'programada', 'obstetra aprueba reprogramación');
    check((await api('PATCH', `/appointments/${citaId}/status`, tokens.obstetra, { estado: 'asistida' })).data?.estado === 'asistida', 'obstetra marca asistida');
    check((await api('PATCH', `/appointments/${citaId}/status`, tokens.obstetra, { estado: 'confirmada' })).status === 409, 'transición ilegal asistida→confirmada → 409');
  }
  // Aislamiento: gestante solo ve sus propias citas
  const citasGes = await api('GET', '/appointments', tokens.gestante);
  check((citasGes.data || []).every((a) => a.gestanteId === gestanteId || a.gestante), 'gestante solo ve sus citas');

  // ─────────────────────────────────────────────────────────────
  setPhase('FASE D — Tratamientos y adherencia');
  // ─────────────────────────────────────────────────────────────
  const trat = await api('POST', '/clinical/treatments', tokens.obstetra, {
    gestanteId, nombre: 'Sulfato Ferroso Sim', dosis: '60mg', frecuencia: 'Diario', fechaInicio: '2026-06-01', duracionDias: 90,
  });
  check(trat.status === 201, 'obstetra crea tratamiento');
  const tratId = trat.data?.id;
  // La gestante registra toma de hoy
  if (tratId) {
    const log1 = await api('POST', `/clinical/treatments/${tratId}/log`, tokens.gestante);
    check(log1.status === 200 || log1.status === 201, 'gestante registra toma de suplemento');
    const log2 = await api('POST', `/clinical/treatments/${tratId}/log`, tokens.gestante);
    check(log2.status === 200 || log2.status === 201 || log2.status === 409, 'segunda toma el mismo día es idempotente/controlada', `status ${log2.status}`);
    // Modificar y suspender (RF-4.10)
    check((await api('PATCH', `/clinical/treatments/${tratId}`, tokens.obstetra, { dosis: '120mg' })).data?.dosis === '120mg', 'obstetra modifica dosis');
    check((await api('PATCH', `/clinical/treatments/${tratId}`, tokens.obstetra, { estado: 'suspendido' })).status === 400, 'suspender sin motivo → 400');
    check((await api('PATCH', `/clinical/treatments/${tratId}`, tokens.obstetra, { estado: 'suspendido', motivoSuspension: 'Prueba' })).data?.estado === 'suspendido', 'obstetra suspende con motivo');
    check((await api('PATCH', `/clinical/treatments/${tratId}`, tokens.gestante, { dosis: 'x' })).status === 403, 'RBAC: gestante NO modifica tratamiento → 403');
  }
  // Reporte de adherencia de la gestante
  const adh = await api('GET', '/reports/adherence', tokens.gestante);
  check(adh.status === 200 && typeof adh.data?.adherencePercentage === 'number', 'reporte de adherencia de la gestante', `status ${adh.status}`);
  check(adh.data?.adherencePercentage >= 0 && adh.data?.adherencePercentage <= 100, 'adherencia en rango 0–100%');

  // ─────────────────────────────────────────────────────────────
  setPhase('FASE E — Clínico (controles, labs+Hb altitud, ecografías, peso, vacunas, tamizajes, odontograma)');
  // ─────────────────────────────────────────────────────────────
  const ctrl = await api('POST', '/clinical/controls', tokens.obstetra, {
    gestanteId, egSemanas: 24, fundalHeight: 22, presionSistolica: 110, presionDiastolica: 70, peso: 62, fcf: 140, fecha: '2026-06-11',
  });
  check(ctrl.status === 201, 'crear control prenatal', `status ${ctrl.status} ${JSON.stringify(ctrl.body?.error||'')}`);

  // Hb con corrección por altitud (RF-10.03): a nivel del mar = observado; a 2926 = -1.3
  await api('PUT', '/admin/config', tokens.admin, { altitudMsnm: 0 });
  const hbMar = await api('POST', '/clinical/labs', tokens.obstetra, { gestanteId, tipoExamen: 'Hemoglobina', valorNumerico: 12.0, fechaExamen: '2026-06-11' });
  check(Math.abs(Number(hbMar.data?.valorCorregido) - 12.0) < 0.2, `Hb corregida a nivel del mar ≈ 12.0 — ${hbMar.data?.valorCorregido}`);
  await api('PUT', '/admin/config', tokens.admin, { altitudMsnm: 2926 });
  const hbAlt = await api('POST', '/clinical/labs', tokens.obstetra, { gestanteId, tipoExamen: 'Hemoglobina', valorNumerico: 12.0, fechaExamen: '2026-06-11' });
  check(Math.abs(Number(hbAlt.data?.valorCorregido) - 10.7) < 0.3, `Hb corregida a 2926 msnm ≈ 10.7 — ${hbAlt.data?.valorCorregido}`);

  check((await api('POST', '/clinical/ultrasounds', tokens.obstetra, { gestanteId, tipo: 'morfologica', egSemanas: 22, fecha: '2026-06-11', resultado: 'Normal' })).status === 201, 'registrar ecografía');
  check((await api('POST', '/clinical/weight-records', tokens.obstetra, { gestanteId, egSemanas: 24, peso: 63.5, fecha: '2026-06-11' })).status === 201, 'registrar peso');
  check((await api('POST', '/clinical/vaccines', tokens.obstetra, { gestanteId, vacuna: 'dT', dosisNumero: 1, estado: 'aplicada', fechaAplicacion: '2026-06-11' })).status === 201, 'registrar vacuna');
  check((await api('POST', '/clinical/dental', tokens.obstetra, { gestanteId, estadoBucal: 'Regular', caries: 'Pieza 16', fecha: '2026-06-11' })).status === 201, 'registrar odontograma');
  check((await api('POST', '/clinical/pathologies', tokens.obstetra, { gestanteId, codigoCie10: 'O99', descripcion: 'Anemia', fechaDiagnostico: '2026-06-11' })).status === 201, 'registrar patología CIE-10');
  check((await api('POST', '/clinical/nutritional-counseling', tokens.obstetra, { gestanteId, frecuenciaAlimentacion: 3, consumoAnimales: true, fecha: '2026-06-11' })).status === 201, 'registrar consejería nutricional');

  // Tamizaje de violencia: umbral autoritativo ≥15 (RF-5.11)
  const tvNeg = await api('POST', '/clinical/screenings/violence', tokens.obstetra, { gestanteId, puntajeTotal: 5, tamizajePositivo: true, respuestas: { a: 5 }, fecha: '2026-06-11' });
  check(tvNeg.data?.tamizajePositivo === false, 'tamizaje violencia puntaje 5 → negativo (servidor ignora cliente)');
  const tvPos = await api('POST', '/clinical/screenings/violence', tokens.obstetra, { gestanteId, puntajeTotal: 16, respuestas: { a: 16 }, fecha: '2026-06-11' });
  check(tvPos.data?.tamizajePositivo === true && tvPos.data?.derivacion === true, 'tamizaje violencia puntaje 16 → positivo + derivación');
  // SRQ-18 salud mental
  const sm = await api('POST', '/clinical/screenings/mental', tokens.obstetra, { gestanteId, respuestas: {}, puntajeP1_18: 10, puntajeP19_22: 0, puntajeP24_28: 0, fecha: '2026-06-11' });
  check(sm.data?.resultado === 'positivo', 'SRQ-18 con P1-18≥9 → positivo');

  // Signo de alarma GRAVE (RF-9.02) → notif + chat
  const unreadAntes = (await api('GET', '/notifications/unread-count', tokens.obstetra)).data?.count ?? 0;
  check((await api('POST', '/clinical/danger-signs', tokens.gestante, { tipo_signo: 'Sangrado sim', descripcion: 'sim', severidad: 'grave' })).status === 201, 'gestante reporta signo de alarma grave');
  const unreadDespues = (await api('GET', '/notifications/unread-count', tokens.obstetra)).data?.count ?? 0;
  check(unreadDespues > unreadAntes, `signo de alarma genera notificación al obstetra (${unreadAntes}→${unreadDespues})`);
  // El obstetra atiende el signo
  const signos = await api('GET', '/clinical/danger-signs?estado=pendiente', tokens.obstetra);
  const signoId = (signos.data || []).find((s) => s.tipoSigno === 'Sangrado sim')?.id;
  if (signoId) check((await api('PATCH', `/clinical/danger-signs/${signoId}`, tokens.obstetra, { estado: 'atendido', accionTomada: 'Llamada' })).data?.estado === 'atendido', 'obstetra atiende el signo de alarma');

  // ─────────────────────────────────────────────────────────────
  setPhase('FASE F — Notificaciones y bandeja in-app');
  // ─────────────────────────────────────────────────────────────
  const notifs = await api('GET', '/notifications', tokens.obstetra);
  check(notifs.status === 200 && Array.isArray(notifs.data), 'listar notificaciones del obstetra');
  check((notifs.data || []).some((n) => n.tipo === 'signo_alarma'), 'bandeja incluye notif de signo_alarma');
  const notifId = notifs.data?.[0]?.id;
  if (notifId) {
    check((await api('PATCH', `/notifications/${notifId}/read`, tokens.obstetra)).data?.leidaAt, 'marcar notificación como leída');
    check((await api('PATCH', `/notifications/${notifId}/read`, tokens.gestante)).status === 404, 'no se puede leer notificación de otro usuario → 404');
  }
  check((await api('PATCH', '/notifications/read-all', tokens.obstetra)).status === 200, 'marcar todas como leídas');
  check((await api('GET', '/notifications/unread-count', tokens.obstetra)).data?.count === 0, 'contador de no leídas en 0 tras read-all');
  // Push token
  check((await api('POST', '/notifications/token', tokens.gestante, { expoPushToken: 'ExponentPushToken[sim]' })).status === 200, 'guardar push token');
  check((await api('DELETE', '/notifications/token', tokens.gestante)).status === 200, 'eliminar push token (logout)');

  // ─────────────────────────────────────────────────────────────
  setPhase('FASE G — Chat / Mensajería');
  // ─────────────────────────────────────────────────────────────
  const conv = await api('GET', '/chat/conversation', tokens.gestante);
  check(conv.status === 200 && conv.data?.id, 'gestante resuelve su conversación');
  check(!!conv.data?.obstetra?.phone, 'conversación expone teléfono del obstetra (WhatsApp RF-9.05)');
  const convId = conv.data?.id;
  if (convId) {
    const hist = await api('GET', `/chat/history/${convId}`, tokens.gestante);
    check(hist.status === 200 && Array.isArray(hist.data), 'historial de chat paginado');
    check((await api('GET', `/chat/history/${convId}`, tokens.gestante2)).status === 403, 'tercero NO accede al historial ajeno → 403');
  }
  // Subir imagen (RF-9.01)
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC';
  const up = await api('POST', '/chat/upload', tokens.gestante, { base64: png, mimeType: 'image/png' });
  check(up.status === 201 && /^\/uploads\/chat\/.+\.png$/.test(up.data?.mediaUrl || ''), 'subir imagen al chat');
  // Emergencia GPS (RF-9.04)
  check((await api('POST', '/chat/emergencia', tokens.gestante, { latitude: -13.65, longitude: -73.42 })).status === 201, 'enviar alerta de emergencia con GPS');
  // Broadcast (RF-9.03)
  const bc = await api('POST', '/chat/broadcast', tokens.obstetra, { contenido: 'Mensaje masivo (prueba sim)', trimestre: 2 });
  check(bc.status === 201 && typeof bc.data?.enviados === 'number', 'broadcast del obstetra con filtros');
  check((await api('POST', '/chat/broadcast', tokens.gestante, { contenido: 'x' })).status === 403, 'RBAC: gestante NO hace broadcast → 403');

  // ─────────────────────────────────────────────────────────────
  setPhase('FASE H — Reportes y Administración');
  // ─────────────────────────────────────────────────────────────
  check((await api('GET', '/reports/attendance', tokens.obstetra)).status === 200, 'reporte de asistencia');
  check((await api('GET', '/reports/clinic', tokens.obstetra)).status === 200, 'reporte clínico/indicadores');
  check((await api('GET', '/education', tokens.gestante)).status === 200, 'contenido educativo por trimestre (gestante)');

  // Admin: usuarios, config, auditoría, backup, sedes, educación
  check((await api('GET', '/admin/users', tokens.admin)).status === 200, 'admin lista usuarios');
  check((await api('GET', '/admin/config', tokens.admin)).status === 200, 'admin lee configuración');
  check((await api('GET', '/admin/audit-logs', tokens.admin)).status === 200, 'admin lee auditoría (RF-10.04)');
  const backup = await api('GET', '/admin/backup', tokens.admin);
  check(backup.status === 200, 'admin genera backup (GET)');
  // Sedes (RF-10.02)
  const fac = await api('POST', '/admin/facilities', tokens.admin, { nombre: 'Puesto Sim', codigo: 'SIM01', altitudMsnm: 3000 });
  check(fac.status === 201, 'admin crea establecimiento de salud');
  const facId = fac.data?.id;
  if (facId) {
    check((await api('GET', '/admin/facilities', tokens.admin)).data?.some((f) => f.id === facId), 'admin lista establecimientos');
    check((await api('PUT', `/admin/facilities/${facId}`, tokens.admin, { nombre: 'Puesto Sim Editado' })).status === 200, 'admin edita establecimiento');
    check((await api('DELETE', `/admin/facilities/${facId}`, tokens.admin)).status === 200, 'admin elimina establecimiento');
  }
  // Educación admin (RF-10.05) con enum correcto
  const edu = await api('POST', '/admin/education', tokens.admin, { titulo: 'Sim contenido', contenido: 'texto', tipo: 'articulo', categoria: 'nutricion', trimestre: 2 });
  check(edu.status === 201, 'admin crea contenido educativo (enum correcto)');
  check((await api('POST', '/admin/education', tokens.admin, { titulo: 'x', contenido: 'y', tipo: 'article' })).status === 400, 'enum inválido (article) → 400');
  const eduId = edu.data?.id;
  if (eduId) {
    check((await api('GET', '/admin/education', tokens.admin)).data?.some((e) => e.id === eduId), 'admin lista contenido educativo');
    check((await api('PUT', `/admin/education/${eduId}`, tokens.admin, { activo: false })).data?.activo === false, 'admin desactiva contenido');
    check((await api('DELETE', `/admin/education/${eduId}`, tokens.admin)).status === 200, 'admin elimina contenido');
  }
  // Crear usuario por admin
  const nu = await api('POST', '/admin/users', tokens.admin, { dni: String(81000000 + Math.floor(Math.random()*99999)).slice(0,8), firstName: 'Nuevo', lastName: 'Obstetra', role: 'obstetra', password: 'Test@1234', cop: 'COP123' });
  check(nu.status === 201 || nu.status === 200, 'admin crea usuario', `status ${nu.status} ${JSON.stringify(nu.body?.error||'')}`);

  // ─────────────────────────────────────────────────────────────
  console.log(`\n${c.b}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.x}`);
  console.log(`${c.y}RESUMEN:${c.x} ${c.g}${pass} OK${c.x} · ${fail ? c.r : c.g}${fail} fallas${c.x}  (total ${pass + fail})`);
  if (failures.length) {
    console.log(`\n${c.r}HALLAZGOS:${c.x}`);
    failures.forEach((f) => console.log(`  • ${f}`));
  }
  process.exit(fail === 0 ? 0 : 1);
}

run().catch((e) => { console.error('Error fatal de simulación:', e); process.exit(2); });
