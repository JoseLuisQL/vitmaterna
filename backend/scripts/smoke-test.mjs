#!/usr/bin/env node
/**
 * Pruebas de humo de la API de VITMATERNA.
 *
 * Inicia sesión con los tres roles (gestante, obstetra, admin) y verifica que
 * los endpoints críticos respondan correctamente. No modifica datos por defecto.
 *
 * Uso:
 *   node scripts/smoke-test.mjs
 *   API_URL=http://localhost:3000/v1 node scripts/smoke-test.mjs
 *
 * Requiere que el backend esté corriendo y la base de datos sembrada
 * (npm run prisma:seed). Devuelve código de salida 0 si todo pasa, 1 si algo falla.
 */

const BASE = process.env.API_URL || 'http://localhost:3000/v1';

// Credenciales de los usuarios sembrados (ver prisma/seed.ts)
const USERS = {
  obstetra: { dni: '11111111', password: 'Test@1234' },
  gestante: { dni: '33333333', password: 'Test@1234' },
  admin: { dni: '99999999', password: 'Admin@2026' },
};

const results = [];
let failures = 0;

function record(name, ok, detail = '') {
  const mark = ok ? 'OK  ' : 'FALLA';
  if (!ok) failures++;
  results.push({ mark, name, detail });
  const color = ok ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}[${mark}]\x1b[0m ${name}${detail ? ' — ' + detail : ''}`);
}

async function req(method, path, { token, body, params } = {}) {
  let url = BASE + path;
  if (params) url += '?' + new URLSearchParams(params).toString();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { status: res.status, data };
  } catch (e) {
    return { status: 0, data: { error: String(e) } };
  }
}

async function login(dni, password) {
  const { status, data } = await req('POST', '/auth/login', { body: { dni, password } });
  return { token: data?.data?.accessToken, status, data };
}

async function main() {
  console.log(`\n=== Pruebas de humo VITMATERNA — ${BASE} ===\n`);

  // Salud (fuera del prefijo /v1)
  const healthUrl = BASE.replace(/\/v1\/?$/, '') + '/health';
  let healthStatus = 0;
  try {
    healthStatus = (await fetch(healthUrl)).status;
  } catch {
    healthStatus = 0;
  }
  record('GET /health', healthStatus === 200, `status ${healthStatus}`);

  // Login de los tres roles
  const tokens = {};
  for (const [role, creds] of Object.entries(USERS)) {
    const { token, status, data } = await login(creds.dni, creds.password);
    tokens[role] = token;
    record(`Login ${role}`, !!token, token ? '' : `status ${status} ${JSON.stringify(data).slice(0, 120)}`);
  }

  // /auth/me por rol
  for (const role of Object.keys(USERS)) {
    if (!tokens[role]) continue;
    const { status } = await req('GET', '/auth/me', { token: tokens[role] });
    record(`GET /auth/me (${role})`, status === 200, `status ${status}`);
  }

  // === Obstetra ===
  const obs = tokens.obstetra;
  let gestanteId = null;
  if (obs) {
    const patients = await req('GET', '/patients', { token: obs, params: { limit: '1000' } });
    const list = Array.isArray(patients.data?.data) ? patients.data.data : [];
    record('GET /patients (obstetra)', patients.status === 200, `${list.length} gestantes`);
    if (list.length) gestanteId = list[0].id;

    const appts = await req('GET', '/appointments', { token: obs });
    record('GET /appointments (obstetra)', appts.status === 200);

    const danger = await req('GET', '/clinical/danger-signs', { token: obs, params: { estado: 'pendiente' } });
    record('GET /clinical/danger-signs', danger.status === 200);

    for (const rp of ['/reports/adherence', '/reports/attendance', '/reports/clinic']) {
      const r = await req('GET', rp, { token: obs });
      record(`GET ${rp}`, r.status === 200, `status ${r.status}`);
    }
  }

  // Sub-recursos clínicos de una gestante
  if (obs && gestanteId) {
    const subs = [
      'controls', 'labs', 'ultrasounds', 'vaccines', 'pathologies',
      'weight-records', 'dental', 'nutritional-counseling',
    ];
    for (const sub of subs) {
      const r = await req('GET', `/clinical/${sub}/${gestanteId}`, { token: obs });
      record(`GET /clinical/${sub}/:id`, r.status === 200, `status ${r.status}`);
    }
    for (const sub of ['mental', 'violence']) {
      const r = await req('GET', `/clinical/screenings/${sub}/${gestanteId}`, { token: obs });
      record(`GET /clinical/screenings/${sub}/:id`, r.status === 200, `status ${r.status}`);
    }
  }

  // === Gestante ===
  const ges = tokens.gestante;
  if (ges) {
    const treatments = await req('GET', '/clinical/treatments', { token: ges });
    record('GET /clinical/treatments (gestante)', treatments.status === 200);
    const edu = await req('GET', '/education', { token: ges });
    record('GET /education (gestante)', edu.status === 200);
    const appts = await req('GET', '/appointments', { token: ges });
    record('GET /appointments (gestante)', appts.status === 200);
    const conv = await req('GET', '/chat/conversations', { token: ges });
    record('GET /chat/conversations (gestante)', conv.status === 200);
  }

  // === Admin ===
  const adm = tokens.admin;
  if (adm) {
    for (const ap of ['/admin/users', '/admin/config', '/admin/audit-logs']) {
      const r = await req('GET', ap, { token: adm });
      record(`GET ${ap}`, r.status === 200, `status ${r.status}`);
    }
  }

  // Resumen
  console.log('\n=== Resumen ===');
  console.log(`Total: ${results.length}  ·  Fallas: ${failures}`);
  if (failures > 0) {
    console.log('\nEndpoints con falla:');
    for (const r of results.filter((x) => x.mark === 'FALLA')) {
      console.log(`  - ${r.name} ${r.detail}`);
    }
    process.exit(1);
  }
  console.log('\x1b[32mTodas las pruebas de humo pasaron.\x1b[0m');
  process.exit(0);
}

main().catch((e) => {
  console.error('Error inesperado en las pruebas de humo:', e);
  process.exit(1);
});
