#!/usr/bin/env node
/**
 * Pruebas de rendimiento (carga) de la API de VITMATERNA con autocannon.
 *
 * Mide latencia (media/p97.5/p99), throughput y errores sobre endpoints
 * representativos, bajo concurrencia configurable. Sirve para verificar el
 * RNF-2.01 (respuesta < 3 s) y RNF-2.04 (≥100 usuarios concurrentes).
 *
 * Uso:
 *   node scripts/perf-test.mjs
 *   API_URL=http://localhost:3000/v1 CONNECTIONS=100 DURATION=10 node scripts/perf-test.mjs
 *
 * IMPORTANTE: para medir la latencia REAL de los endpoints (y no la velocidad de
 * rechazo del rate limiter), el backend debe arrancarse con la bandera
 * DISABLE_RATE_LIMIT=true. De lo contrario, bajo alta concurrencia casi todas
 * las respuestas serán 429 y las métricas no reflejarán el rendimiento real.
 *   DISABLE_RATE_LIMIT=true npm run dev   # en otra terminal
 *   npm run perf
 *
 * Requiere backend corriendo y BD sembrada. Sale con código 1 si algún
 * escenario supera el umbral de latencia (p99 > 3000 ms) o produce errores.
 */
import autocannon from 'autocannon';

const BASE = process.env.API_URL || 'http://localhost:3000/v1';
const ROOT = BASE.replace(/\/v1\/?$/, '');
const CONNECTIONS = Number(process.env.CONNECTIONS || 100); // usuarios concurrentes
const DURATION = Number(process.env.DURATION || 10); // segundos por escenario
const P99_THRESHOLD_MS = 3000; // RNF-2.01

async function login(dni, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dni, password }),
  });
  const data = await res.json();
  return data?.data?.accessToken;
}

function run(opts) {
  return new Promise((resolve, reject) => {
    const instance = autocannon(
      { connections: CONNECTIONS, duration: DURATION, ...opts },
      (err, result) => (err ? reject(err) : resolve(result)),
    );
    autocannon.track(instance, { renderProgressBar: false, renderResultsTable: false });
  });
}

function fmt(result) {
  return {
    requests_por_seg: Math.round(result.requests.average),
    latencia_media_ms: result.latency.mean,
    latencia_p97_5_ms: result.latency.p97_5,
    latencia_p99_ms: result.latency.p99,
    latencia_max_ms: result.latency.max,
    no2xx: result.non2xx,
    errores: result.errors,
    timeouts: result.timeouts,
  };
}

async function main() {
  console.log(`\n=== Pruebas de rendimiento VITMATERNA ===`);
  console.log(`Base: ${BASE} · Conexiones: ${CONNECTIONS} · Duración: ${DURATION}s por escenario\n`);

  // Token para endpoints autenticados (obstetra: vista más pesada)
  const obstetraToken = await login('11111111', 'Test@1234');
  const gestanteToken = await login('33333333', 'Test@1234');
  if (!obstetraToken || !gestanteToken) {
    console.error('No se pudo autenticar. ¿Está el backend corriendo y sembrado?');
    process.exit(1);
  }

  const escenarios = [
    {
      nombre: 'GET /health (sin auth)',
      opts: { url: `${ROOT}/health`, method: 'GET' },
    },
    {
      nombre: 'GET /patients (obstetra, lista)',
      opts: {
        url: `${BASE}/patients?limit=1000`,
        method: 'GET',
        headers: { Authorization: `Bearer ${obstetraToken}` },
      },
    },
    {
      nombre: 'GET /appointments (obstetra)',
      opts: {
        url: `${BASE}/appointments`,
        method: 'GET',
        headers: { Authorization: `Bearer ${obstetraToken}` },
      },
    },
    {
      nombre: 'GET /reports/clinic (obstetra, agregaciones)',
      opts: {
        url: `${BASE}/reports/clinic`,
        method: 'GET',
        headers: { Authorization: `Bearer ${obstetraToken}` },
      },
    },
    {
      nombre: 'GET /clinical/treatments (gestante)',
      opts: {
        url: `${BASE}/clinical/treatments`,
        method: 'GET',
        headers: { Authorization: `Bearer ${gestanteToken}` },
      },
    },
  ];

  const resumen = [];
  let fallo = false;
  let avisoRateLimit = false;

  for (const esc of escenarios) {
    const result = await run(esc.opts);
    const m = fmt(result);
    resumen.push({ escenario: esc.nombre, ...m });
    // Un volumen alto de respuestas no-2xx bajo carga casi siempre significa que
    // el rate limiter está activo (429). Avisamos para que se use DISABLE_RATE_LIMIT.
    if (m.no2xx > 0) avisoRateLimit = true;
    const ok = m.latencia_p99_ms <= P99_THRESHOLD_MS && m.no2xx === 0 && m.errores === 0;
    if (!ok) fallo = true;
    console.log(`\n▶ ${esc.nombre}`);
    console.log(`   req/s: ${m.requests_por_seg} · media: ${m.latencia_media_ms} ms · p97.5: ${m.latencia_p97_5_ms} ms · p99: ${m.latencia_p99_ms} ms · max: ${m.latencia_max_ms} ms`);
    console.log(`   no-2xx: ${m.no2xx} · errores: ${m.errores} · timeouts: ${m.timeouts} · ${ok ? 'OK' : 'FALLA umbral'}`);
  }

  console.log(`\n=== Resumen (umbral p99 ≤ ${P99_THRESHOLD_MS} ms, RNF-2.01) ===`);
  console.table(resumen);

  if (avisoRateLimit) {
    console.log(
      '\n⚠  Se detectaron respuestas no-2xx (probable rate limiting 429).\n' +
        '   Reinicia el backend con DISABLE_RATE_LIMIT=true para medir la latencia real.',
    );
  }

  if (fallo) {
    console.log('\nAlgún escenario superó el umbral o produjo errores.');
    process.exit(1);
  }
  console.log('\nTodos los escenarios dentro del umbral de rendimiento.');
  process.exit(0);
}

main().catch((e) => {
  console.error('Error en la prueba de rendimiento:', e);
  process.exit(1);
});
