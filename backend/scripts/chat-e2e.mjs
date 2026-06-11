#!/usr/bin/env node
/**
 * Prueba e2e del chat en tiempo real (Socket.IO + REST).
 *
 * Verifica: resolución/creación de conversación, historial, conexión de
 * sockets autenticados, envío y recepción en tiempo real entre gestante y
 * obstetra, persistencia del mensaje y rechazo de tokens inválidos.
 *
 * Requiere el backend corriendo y la BD sembrada.
 *
 * Uso: `npm run chat:e2e`. Sale con código 1 si alguna comprobación falla.
 */
import { io } from 'socket.io-client';

const BASE = process.env.API_URL || 'http://localhost:3000/v1';
const ROOT = BASE.replace(/\/v1\/?$/, '');

async function login(dni, password) {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ dni, password }),
  });
  const d = await r.json();
  return { token: d?.data?.accessToken, user: d?.data?.user };
}
async function get(path, token) {
  const r = await fetch(BASE + path, { headers: { Authorization: 'Bearer ' + token } });
  return { status: r.status, body: await r.json() };
}

const results = [];
const check = (name, cond, extra = '') => {
  results.push({ name, cond });
  const color = cond ? '\x1b[32m' : '\x1b[31m';
  console.log(`${color}[${cond ? 'OK' : 'FALLA'}]\x1b[0m ${name}${extra ? ' — ' + extra : ''}`);
};

const waitConnect = (s, label) =>
  new Promise((res, rej) => {
    s.on('connect', () => res(true));
    s.on('connect_error', (e) => rej(new Error(label + ': ' + e.message)));
    setTimeout(() => rej(new Error(label + ': timeout')), 5000);
  });

async function main() {
  console.log(`\n=== Chat e2e (Socket.IO) — ${ROOT} ===\n`);
  const ges = await login('33333333', 'Test@1234');
  const obs = await login('11111111', 'Test@1234');
  check('login gestante + obstetra', !!ges.token && !!obs.token);

  const conv = await get('/chat/conversation', ges.token);
  const convId = conv.body?.data?.id;
  check('GET /chat/conversation', conv.status === 200 && !!convId);

  const histBefore = await get(`/chat/history/${convId}`, ges.token);
  check('GET /chat/history', histBefore.status === 200 && Array.isArray(histBefore.body.data));
  const beforeCount = histBefore.body.data.length;

  const sGes = io(ROOT, { auth: { token: ges.token }, transports: ['websocket'] });
  const sObs = io(ROOT, { auth: { token: obs.token }, transports: ['websocket'] });
  let gotByObs = null;
  let gotByGes = null;

  try {
    await Promise.all([waitConnect(sGes, 'gestante'), waitConnect(sObs, 'obstetra')]);
    check('conexión de sockets autenticados', true);

    sObs.emit('join_conversation', convId);
    sGes.emit('join_conversation', convId);
    await new Promise((r) => setTimeout(r, 400));

    const received = new Promise((res) => sObs.on('receive_message', (m) => { gotByObs = m; res(true); }));
    const receivedGes = new Promise((res) => sGes.on('receive_message', (m) => { gotByGes = m; res(true); }));

    const texto = 'Prueba e2e chat ' + Date.now();
    sGes.emit('send_message', { conversationId: convId, content: texto, type: 'texto' });

    await Promise.race([
      Promise.all([received, receivedGes]),
      new Promise((_, rej) => setTimeout(() => rej(new Error('timeout receive')), 5000)),
    ]);

    check('obstetra recibe el mensaje en tiempo real', gotByObs?.contenido === texto);
    check('gestante recibe el eco del mensaje', gotByGes?.contenido === texto);
    check('senderId = id del usuario gestante', gotByObs?.senderId === ges.user.id);

    await new Promise((r) => setTimeout(r, 300));
    const histAfter = await get(`/chat/history/${convId}`, obs.token);
    check('mensaje persistido en el historial', histAfter.body.data.length === beforeCount + 1,
      `${beforeCount} -> ${histAfter.body.data.length}`);

    const bad = io(ROOT, { auth: { token: 'token-invalido' }, transports: ['websocket'] });
    const rejected = await new Promise((res) => {
      bad.on('connect', () => res(false));
      bad.on('connect_error', () => res(true));
      setTimeout(() => res(false), 4000);
    });
    bad.close();
    check('rechaza conexión con token inválido', rejected);
  } catch (e) {
    check('flujo de socket', false, e.message);
  } finally {
    sGes.close();
    sObs.close();
  }

  const fails = results.filter((r) => !r.cond);
  console.log(`\n=== Resumen: ${results.length} comprobaciones, ${fails.length} fallas ===`);
  process.exit(fails.length ? 1 : 0);
}

main().catch((e) => {
  console.error('Error inesperado en chat e2e:', e);
  process.exit(1);
});
