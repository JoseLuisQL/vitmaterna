/**
 * VITMATERNA — Prueba E2E integral (flujo cruzado entre módulos).
 *
 * Recorre el camino real del sistema usando la API HTTP:
 *  1. Obstetra crea cita (RBAC + disponibilidad)
 *  2. Gestante confirma  -> notifica al obstetra (bandeja in-app)
 *  3. Gestante solicita reprogramación -> obstetra aprueba -> notifica a gestante
 *  4. Gestante reporta signo de alarma GRAVE -> notif + mensaje en chat
 *  5. Subida de imagen al chat
 *  6. Tamizaje de violencia con umbral autoritativo (5 negativo, 15 positivo)
 *  7. Contenido educativo (admin) crear/listar/eliminar
 *  8. WhatsApp: /chat/conversation expone teléfono del obstetra
 *
 * Uso: node scripts/integration-e2e.mjs  (requiere el server corriendo)
 */
const BASE = process.env.BASE_URL || 'http://localhost:3000/v1';
let pass = 0;
let fail = 0;

function ok(label) { console.log(`\x1b[32m[OK]\x1b[0m ${label}`); pass++; }
function ko(label, extra) { console.log(`\x1b[31m[FALLA]\x1b[0m ${label}${extra ? ' -> ' + extra : ''}`); fail++; }
function assert(cond, label, extra) { cond ? ok(label) : ko(label, extra); }

async function login(dni, password) {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dni, password }),
  });
  const j = await r.json();
  return j.data?.accessToken;
}

const H = (tok, body) => ({
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
  ...(body ? { body: JSON.stringify(body) } : {}),
});

async function main() {
  console.log('\n=== VITMATERNA E2E integral —', BASE, '===\n');

  const obs = await login('11111111', 'Test@1234');
  const ges = await login('33333333', 'Test@1234');
  const adm = await login('99999999', 'Admin@2026');
  assert(obs && ges && adm, 'login obstetra + gestante + admin');

  // gestanteId
  const own = await (await fetch(`${BASE}/appointments`, H(ges))).json();
  const gestanteId = own.data?.[0]?.gestanteId;
  assert(!!gestanteId, 'resolver gestanteId de la gestante');

  // 1. Crear cita en horario futuro libre
  const year = 2031 + Math.floor(Math.random() * 30);
  const fecha = `${year}-03-10`;
  const create = await fetch(`${BASE}/appointments`, { method: 'POST', ...H(obs, { gestanteId, fecha, hora: '09:00', motivo: 'Control prenatal' }) });
  const created = await create.json();
  const apptId = created.data?.id;
  assert(create.status === 201 && apptId, 'obstetra crea cita (201)');

  // RBAC: gestante no puede crear
  const rbac = await fetch(`${BASE}/appointments`, { method: 'POST', ...H(ges, { gestanteId, fecha, hora: '10:00' }) });
  assert(rbac.status === 403, 'RBAC: gestante NO crea cita (403)');

  // disponibilidad
  const avail = await (await fetch(`${BASE}/appointments/availability?fecha=${fecha}`, H(obs))).json();
  assert(Array.isArray(avail.data?.slots) && avail.data.slots.length > 0, 'GET /availability devuelve slots');

  // unread obstetra antes
  const ub = (await (await fetch(`${BASE}/notifications/unread-count`, H(obs))).json()).data?.count ?? 0;

  // 2. Gestante confirma -> notifica al obstetra
  const conf = await fetch(`${BASE}/appointments/${apptId}/confirm`, { method: 'PATCH', ...H(ges) });
  assert(conf.status === 200 && (await conf.json()).data.estado === 'confirmada', 'gestante confirma cita');

  // 3. Solicita reprogramación -> obstetra aprueba
  const reqR = await fetch(`${BASE}/appointments/${apptId}/request-reschedule`, { method: 'PATCH', ...H(ges, { fecha: `${year}-03-15`, hora: '11:00', motivoReprogramacion: 'Viaje familiar' }) });
  assert(reqR.status === 200 && (await reqR.json()).data.estado === 'solicitud_reprogramacion', 'gestante solicita reprogramación');

  const noResolve = await fetch(`${BASE}/appointments/${apptId}/resolve-reschedule`, { method: 'PATCH', ...H(ges, { aprobar: true }) });
  assert(noResolve.status === 403, 'gestante NO resuelve su propia solicitud (403)');

  const appr = await fetch(`${BASE}/appointments/${apptId}/resolve-reschedule`, { method: 'PATCH', ...H(obs, { aprobar: true }) });
  const apprJson = await appr.json();
  assert(appr.status === 200 && apprJson.data.estado === 'programada' && String(apprJson.data.fecha).startsWith(`${year}-03-15`), 'obstetra aprueba reprogramación (nueva fecha)');

  // unread obstetra subió
  const ua = (await (await fetch(`${BASE}/notifications/unread-count`, H(obs))).json()).data?.count ?? 0;
  assert(ua > ub, `notificaciones del obstetra aumentaron (${ub} -> ${ua})`);

  // 4. Signo de alarma GRAVE -> notif + mensaje de chat
  const ds = await fetch(`${BASE}/clinical/danger-signs`, { method: 'POST', ...H(ges, { tipo_signo: 'Sangrado vaginal (e2e)', descripcion: 'e2e', severidad: 'grave' }) });
  assert(ds.status === 201, 'gestante reporta signo de alarma GRAVE');

  const notifs = await (await fetch(`${BASE}/notifications?limit=10`, H(obs))).json();
  assert((notifs.data || []).some((n) => n.tipo === 'signo_alarma'), 'obstetra recibe notif signo_alarma in-app');

  // 5. Subida de imagen
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M8AAAMBAQDJ/pLvAAAAAElFTkSuQmCC';
  const up = await fetch(`${BASE}/chat/upload`, { method: 'POST', ...H(ges, { base64: png, mimeType: 'image/png' }) });
  const upJson = await up.json();
  assert(up.status === 201 && /^\/uploads\/chat\/.+\.png$/.test(upJson.data?.mediaUrl || ''), 'subir imagen al chat (mediaUrl)');

  // 6. Tamizaje de violencia (umbral autoritativo)
  const neg = await (await fetch(`${BASE}/clinical/screenings/violence`, { method: 'POST', ...H(obs, { gestanteId, puntajeTotal: 5, tamizajePositivo: true, respuestas: { a: 5 }, fecha: '2026-06-11' }) })).json();
  assert(neg.data?.tamizajePositivo === false, 'tamizaje violencia 5 -> negativo (servidor ignora cliente)');
  const pos = await (await fetch(`${BASE}/clinical/screenings/violence`, { method: 'POST', ...H(obs, { gestanteId, puntajeTotal: 15, respuestas: { a: 15 }, fecha: '2026-06-11' }) })).json();
  assert(pos.data?.tamizajePositivo === true && pos.data?.derivacion === true, 'tamizaje violencia 15 -> positivo + derivación');

  // 7. Contenido educativo admin
  const eduCreate = await fetch(`${BASE}/admin/education`, { method: 'POST', ...H(adm, { titulo: 'E2E contenido', contenido: 'x', tipo: 'articulo', categoria: 'general' }) });
  const eduId = (await eduCreate.json()).data?.id;
  assert(eduCreate.status === 201 && eduId, 'admin crea contenido educativo');
  const eduList = await (await fetch(`${BASE}/admin/education`, H(adm))).json();
  assert(Array.isArray(eduList.data) && eduList.data.some((e) => e.id === eduId), 'admin lista contenido educativo');
  const eduDel = await fetch(`${BASE}/admin/education/${eduId}`, { method: 'DELETE', ...H(adm) });
  assert(eduDel.status === 200, 'admin elimina contenido educativo');

  // 8. WhatsApp: teléfono del obstetra en la conversación
  const conv = await (await fetch(`${BASE}/chat/conversation`, H(ges))).json();
  assert(!!conv.data?.obstetra?.phone, 'WhatsApp: /chat/conversation expone teléfono del obstetra');

  console.log(`\n=== Resumen: ${pass} OK, ${fail} fallas ===\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error('Error e2e:', e); process.exit(1); });
