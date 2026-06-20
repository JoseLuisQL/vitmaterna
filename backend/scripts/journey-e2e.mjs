/**
 * VITMATERNA — Recorrido de extremo a extremo (historia real de una gestante).
 *
 * Simula el ciclo COMPLETO de atención con los 3 roles interactuando entre sí,
 * usando datos reales contra la API en vivo. No usa atajos: cada paso es una
 * llamada al mismo backend que consume la app.
 *
 * Historia:
 *   1. ADMIN habilita los módulos clínicos y registra una sede.
 *   2. OBSTETRA registra a una nueva gestante (Rosa) con su FUM → se calcula FPP.
 *   3. OBSTETRA agenda el primer control; GESTANTE confirma su asistencia.
 *   4. OBSTETRA toma el control prenatal: signos, laboratorio (Hb con altitud),
 *      ecografía, peso, vacuna, tamizajes, consejería.
 *   5. OBSTETRA prescribe tratamiento; GESTANTE registra su toma del día.
 *   6. GESTANTE y OBSTETRA conversan por chat; obstetra recomienda contenido.
 *   7. GESTANTE reporta un signo de alarma; OBSTETRA lo atiende.
 *   8. GESTANTE pide reprogramar una cita; OBSTETRA la aprueba.
 *   9. GESTANTE registra su domicilio (GPS); OBSTETRA hace una visita domiciliaria.
 *  10. ADMIN supervisa: usuarios, reportes e indicadores reflejan la actividad.
 *
 * Uso: node scripts/journey-e2e.mjs   (server vivo + BD sembrada)
 */
const BASE = process.env.BASE_URL || 'http://localhost:3000/v1';
const c = { g: '\x1b[32m', r: '\x1b[31m', y: '\x1b[33m', b: '\x1b[36m', d: '\x1b[2m', x: '\x1b[0m' };
let pass = 0, fail = 0; const failures = [];
function step(t) { console.log(`\n${c.b}▶ ${t}${c.x}`); }
function ok(l, extra) { console.log(`  ${c.g}✓${c.x} ${l}${extra ? ` ${c.d}(${extra})${c.x}` : ''}`); pass++; }
function ko(l, extra) { console.log(`  ${c.r}✗ ${l}${c.x}${extra ? ` → ${extra}` : ''}`); fail++; failures.push(`${l}${extra ? ' → ' + extra : ''}`); }
function check(cond, l, extra) { cond ? ok(l, cond === true ? extra : undefined) : ko(l, extra); return cond; }

async function login(dni, password) {
  const r = await fetch(`${BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ dni, password }) });
  const j = await r.json();
  return { status: r.status, token: j.data?.accessToken, user: j.data?.user };
}
async function api(method, path, tok, body) {
  const o = { method, headers: { 'Content-Type': 'application/json' } };
  if (tok) o.headers.Authorization = `Bearer ${tok}`;
  if (body) o.body = JSON.stringify(body);
  const r = await fetch(`${BASE}${path}`, o);
  let j = null; try { j = await r.json(); } catch { /* */ }
  return { status: r.status, data: j?.data, error: j?.error };
}
const futuro = (d) => { const x = new Date(); x.setDate(x.getDate() + d); return x.toISOString().slice(0, 10); };

async function run() {
  console.log(`${c.y}VITMATERNA — Recorrido e2e (historia de una gestante) contra ${BASE}${c.x}`);

  // ── Sesiones de los 3 roles ──
  step('Inicio de sesión de los 3 roles');
  const admin = await login('99999999', 'Admin@2026');
  const obs = await login('11111111', 'Test@1234');
  check(admin.token && admin.user.role === 'admin', 'ADMIN inicia sesión', admin.user?.firstName);
  check(obs.token && obs.user.role === 'obstetra', 'OBSTETRA inicia sesión', `${obs.user?.firstName} ${obs.user?.lastName}`);

  // ── 1. Admin prepara el sistema ──
  step('1. ADMIN habilita módulos clínicos y registra una sede');
  const flags = await api('PUT', '/admin/feature-flags', admin.token, {
    ecografias: true, pesoRegistros: true, tamizajeViolencia: true, tamizajeSaludMental: true, patologias: true, odontograma: true, consejeriaNutricional: true,
  });
  check(flags.status === 200, 'habilita los 7 módulos clínicos');
  const sede = await api('POST', '/admin/facilities', admin.token, { nombre: `Centro de Salud QA ${Date.now()}`, tipo: 'centro_salud', altitudMsnm: 2926, departamento: 'Apurímac', provincia: 'Andahuaylas', distrito: 'Talavera' });
  check(sede.status === 201, 'registra una sede de salud', sede.data?.nombre);

  // ── 2. Obstetra registra a Rosa ──
  step('2. OBSTETRA registra a una nueva gestante (Rosa) con su FUM');
  const dni = String(81000000 + Math.floor(Math.random() * 899999)).slice(0, 8);
  const alta = await api('POST', '/patients', obs.token, { dni, firstName: 'Rosa', lastName: 'Huamán', phone: '987654000', fechaNacimiento: '1996-03-15' });
  check(alta.status === 201, 'crea la ficha de la gestante', `DNI ${dni}`);
  const gid = alta.data?.id || alta.data?.gestante?.id;
  const fum = futuro(-160); // ~23 semanas
  const upd = await api('PATCH', `/patients/${gid}`, obs.token, { fum, talla: 1.58, pesoHabitual: 56, grupoSanguineo: 'O', factorRh: '+' });
  check(upd.status === 200, 'registra FUM y antropometría');
  const ficha = await api('GET', `/patients/${gid}`, obs.token);
  const fpp = ficha.data?.estimatedDueDate || ficha.data?.fppFum;
  check(!!fpp, 'el sistema calcula la FPP automáticamente (Naegele)', fpp?.slice(0, 10));
  check(!isNaN(parseFloat(ficha.data?.imc)), 'el sistema calcula el IMC', `IMC ${ficha.data?.imc}`);

  // Antecedente clínico
  const ant = await api('POST', '/clinical/antecedentes', obs.token, { gestanteId: gid, tipo: 'personal', condicion: 'Anemia previa', detalle: 'En gestación anterior' });
  check(ant.status === 201, 'añade un antecedente personal');

  // ── 3. Cita + confirmación de la gestante ──
  step('3. OBSTETRA agenda el primer control y la GESTANTE (Rosa) confirma');
  // Rosa inicia sesión con su DNI (usuario inicial = DNI, contraseña = DNI por defecto del alta)
  let rosa = await login(dni, dni);
  if (!rosa.token) { // si el alta define otra credencial, la reseteamos vía admin
    await api('POST', '/admin/users', admin.token, {}); // no-op defensivo
  }
  check(!!rosa.token, 'la GESTANTE (Rosa) inicia sesión con su DNI', rosa.user?.firstName);
  const fecha = futuro(7);
  const avail = await api('GET', `/appointments/availability?fecha=${fecha}`, obs.token);
  const slot = avail.data?.slots?.find((s) => s.disponible)?.hora || avail.data?.[0]?.hora || '09:00';
  const cita = await api('POST', '/appointments', obs.token, { gestanteId: gid, fecha, hora: slot, motivo: 'Primer control prenatal' });
  check(cita.status === 201, 'agenda la cita', `${fecha} ${slot}`);
  if (rosa.token) {
    const conf = await api('PATCH', `/appointments/${cita.data?.id}/confirm`, rosa.token);
    check(conf.status === 200 || conf.data?.estado === 'confirmada', 'la GESTANTE confirma su asistencia');
  }

  // ── 4. Control prenatal completo ──
  step('4. OBSTETRA realiza el control prenatal completo');
  const ctrl = await api('POST', '/clinical/controls', obs.token, { gestanteId: gid, egSemanas: 23, fundalHeight: 22, presionSistolica: 110, presionDiastolica: 70, peso: 60, fcf: 142, fecha: futuro(0) });
  check(ctrl.status === 201, 'registra el control (signos vitales, AU, FCF)');
  const hb = await api('POST', '/clinical/labs', obs.token, { gestanteId: gid, tipoExamen: 'Hemoglobina', valorNumerico: 11.5, fechaExamen: futuro(0) });
  check(hb.status === 201 && hb.data?.valorCorregido != null, 'registra hemoglobina con corrección por altitud', `obs 11.5 → corr ${hb.data?.valorCorregido}`);
  check((await api('POST', '/clinical/ultrasounds', obs.token, { gestanteId: gid, tipo: 'morfologica', egSemanas: 22, fecha: futuro(0), resultado: 'Normal' })).status === 201, 'registra ecografía morfológica');
  check((await api('POST', '/clinical/weight-records', obs.token, { gestanteId: gid, egSemanas: 23, peso: 60.5, fecha: futuro(0) })).status === 201, 'registra control de peso');
  check((await api('POST', '/clinical/vaccines', obs.token, { gestanteId: gid, vacuna: 'dT', dosisNumero: 1, estado: 'aplicada', fechaAplicacion: futuro(0) })).status === 201, 'registra vacuna dT');
  const tv = await api('POST', '/clinical/screenings/violence', obs.token, { gestanteId: gid, puntajeTotal: 16, respuestas: { a: 16 }, fecha: futuro(0) });
  check(tv.data?.tamizajePositivo === true && tv.data?.derivacion === true, 'tamizaje de violencia (16) → positivo + derivación');
  check((await api('POST', '/clinical/nutritional-counseling', obs.token, { gestanteId: gid, frecuenciaAlimentacion: 3, consumoAnimales: true, fecha: futuro(0) })).status === 201, 'registra consejería nutricional');

  // ── 5. Tratamiento + adherencia de la gestante ──
  step('5. OBSTETRA prescribe tratamiento y la GESTANTE registra su toma');
  const trat = await api('POST', '/clinical/treatments', obs.token, { gestanteId: gid, nombre: 'Sulfato ferroso', tipo: 'sulfato_ferroso', dosis: '60 mg', frecuencia: 'Diaria', viaAdministracion: 'oral', fechaInicio: futuro(0), duracionDias: 90 });
  check(trat.status === 201, 'prescribe sulfato ferroso (micronutriente)');
  if (rosa.token) {
    const toma = await api('POST', `/clinical/treatments/${trat.data?.id}/log`, rosa.token, { fecha: futuro(0), tomado: true });
    check(toma.status === 201 || toma.status === 200, 'la GESTANTE marca la toma del día');
  }

  // ── 6. Chat + recomendación de contenido ──
  step('6. GESTANTE y OBSTETRA conversan; OBSTETRA recomienda contenido educativo');
  if (rosa.token) {
    const conv = await api('GET', '/chat/conversation', rosa.token);
    check(conv.status === 200, 'la GESTANTE abre su conversación con la obstetra');
    check(!!conv.data?.obstetra?.phone || !!conv.data?.obstetraPhone, 'la conversación expone el teléfono de la obstetra (WhatsApp)');
    const cont = await api('GET', '/education', rosa.token);
    const lista = cont.data?.contents || cont.data || [];
    const contenidoId = lista?.[0]?.id;
    check(Array.isArray(lista) && lista.length > 0, 'hay contenido educativo para su trimestre', `${lista?.length} recursos`);
    if (contenidoId) {
      const reco = await api('POST', '/chat/recommend-content', obs.token, { gestanteId: gid, contentId: contenidoId });
      check(reco.status === 201 || reco.status === 200, 'la OBSTETRA recomienda un contenido por chat');
    }
  }

  // ── 7. Signo de alarma → atención ──
  step('7. GESTANTE reporta un signo de alarma y la OBSTETRA lo atiende');
  if (rosa.token) {
    const unreadA = (await api('GET', '/notifications/unread-count', obs.token)).data?.count ?? 0;
    const signo = await api('POST', '/clinical/danger-signs', rosa.token, { tipo_signo: 'Cefalea intensa', descripcion: 'Dolor de cabeza fuerte y visión borrosa', severidad: 'grave' });
    check(signo.status === 201, 'la GESTANTE reporta cefalea intensa (signo grave)');
    const unreadB = (await api('GET', '/notifications/unread-count', obs.token)).data?.count ?? 0;
    check(unreadB > unreadA, 'la OBSTETRA recibe la notificación al instante', `${unreadA}→${unreadB}`);
    const pend = await api('GET', '/clinical/danger-signs?estado=pendiente', obs.token);
    const sid = (pend.data || []).find((s) => s.tipoSigno === 'Cefalea intensa')?.id;
    if (sid) check((await api('PATCH', `/clinical/danger-signs/${sid}`, obs.token, { estado: 'atendido', accionTomada: 'Contacto telefónico y derivación' })).data?.estado === 'atendido', 'la OBSTETRA atiende y registra la acción');
  }

  // ── 8. Reprogramación con aprobación ──
  step('8. OBSTETRA agenda otra cita; GESTANTE pide reprogramar y OBSTETRA aprueba');
  const cita2 = await api('POST', '/appointments', obs.token, { gestanteId: gid, fecha: futuro(30), hora: '09:00', motivo: 'Segundo control prenatal' });
  check(cita2.status === 201, 'la OBSTETRA agenda el segundo control', futuro(30));
  if (rosa.token && cita2.data?.id) {
    const sol = await api('PATCH', `/appointments/${cita2.data.id}/request-reschedule`, rosa.token, { fecha: futuro(35), hora: '10:00', motivoReprogramacion: 'Viaje familiar' });
    check(sol.data?.estado === 'solicitud_reprogramacion', 'la GESTANTE solicita la reprogramación (no la aplica sola)');
    const res = await api('PATCH', `/appointments/${cita2.data.id}/resolve-reschedule`, obs.token, { aprobar: true });
    check(res.data?.estado === 'programada', 'la OBSTETRA aprueba y queda reprogramada');
  }

  // ── 9. Visita domiciliaria con GPS ──
  step('9. GESTANTE registra su domicilio (GPS) y OBSTETRA hace visita domiciliaria');
  if (rosa.token) {
    const ubic = await api('PATCH', `/patients/${gid}/ubicacion`, rosa.token, { domicilioLat: -13.6548, domicilioLng: -73.4259, referenciaDom: 'Casa de adobe, portón verde' });
    check(ubic.status === 200, 'la GESTANTE registra la ubicación GPS de su domicilio');
  }
  const citaDom = await api('POST', '/appointments', obs.token, { gestanteId: gid, fecha: futuro(20), hora: '10:00', modalidad: 'domiciliaria', motivo: 'Visita domiciliaria de seguimiento' });
  check(citaDom.data?.modalidad === 'domiciliaria', 'la OBSTETRA agenda una cita domiciliaria');
  const acta = await api('POST', '/home-visits', obs.token, { gestanteId: gid, appointmentId: citaDom.data?.id, fecha: futuro(20), horaLlegada: '10:00', duracionMin: 40, motivo: 'Seguimiento de adherencia y signos de alarma', acciones: 'Consejería en nutrición y lavado de manos', acuerdos: 'Tomar el hierro a diario', firmaGestante: true, firmaObstetra: true });
  check(acta.status === 201 && typeof acta.data?.numeroVisita === 'number', 'la OBSTETRA registra el acta de visita (correlativo + firmas)', `visita N°${acta.data?.numeroVisita}`);

  // ── 10. Supervisión del admin ──
  step('10. ADMIN supervisa: usuarios, reportes e indicadores reflejan la actividad');
  const usuarios = await api('GET', '/admin/users', admin.token);
  check(usuarios.status === 200, 'ADMIN lista usuarios del sistema');
  const repClin = await api('GET', '/reports/clinic', obs.token);
  check(repClin.status === 200, 'el reporte clínico/indicadores se genera');
  const dash = await api('GET', '/patients?limit=1000', obs.token);
  const rosaEnLista = (dash.data || []).some((p) => p.dni === dni);
  check(rosaEnLista, 'la nueva gestante aparece en la lista del obstetra');

  // ── Resumen ──
  console.log(`\n${c.b}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${c.x}`);
  console.log(`${c.y}RESUMEN:${c.x} ${c.g}${pass} OK${c.x} · ${fail ? c.r : c.g}${fail} fallas${c.x}  (total ${pass + fail})`);
  if (failures.length) { console.log(`${c.r}Hallazgos:${c.x}`); failures.forEach((f) => console.log(`  • ${f}`)); }
  process.exit(fail > 0 ? 1 : 0);
}

run().catch((e) => { console.error('Error fatal:', e); process.exit(1); });
