#!/usr/bin/env node
/**
 * VITMATERNA — Captura móvil + medición precisa para el manual (gestante).
 *
 * Para cada "shot" de manifest/shots.json:
 *   1. navega a la pantalla (por taps reales en la app, no por URL),
 *   2. abre el modal/menú si corresponde,
 *   3. mide el rectángulo REAL de cada target (getBoundingClientRect → px),
 *   4. captura el PNG del viewport móvil,
 *   5. guarda las medidas en manifest/measured.json.
 *
 * La anotación (02_annotate.py) consume measured.json para dibujar marcas
 * pixel-perfect sobre los elementos.
 *
 * Requiere: app web en localhost:8081, backend en :3000, agent-browser.
 * Uso: node 01_capture.mjs
 */
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = dirname(__dirname);

// Rol por argumento: node 01_capture.mjs [gestante|obstetra|admin]
const ROLE = process.argv[2] || 'gestante';
const CRED = {
  gestante: { dni: '33333333', pass: 'Test@1234' },
  obstetra: { dni: '11111111', pass: 'Test@1234' },
  admin: { dni: '99999999', pass: 'Admin@2026' },
}[ROLE];
if (!CRED) { console.error(`Rol inválido: ${ROLE}`); process.exit(1); }

// gestante usa los nombres "legacy" (shots.json/measured.json) para no romper;
// obstetra/admin usan archivos namespaced.
const MANIFEST = join(BASE, 'manifest', ROLE === 'gestante' ? 'shots.json' : `${ROLE}.shots.json`);
const MEASURED = join(BASE, 'manifest', ROLE === 'gestante' ? 'measured.json' : `${ROLE}.measured.json`);
const RAW = join(BASE, 'assets', ROLE === 'gestante' ? 'screens_raw' : `${ROLE}_raw`);
const MEASURE_JS = join(__dirname, 'measure.js');
mkdirSync(RAW, { recursive: true });

const API = 'http://localhost:3000/v1';
const WEB = 'http://localhost:8081/';
const VIEWPORT = ['390', '844', '2'];
const sleep = (ms) => execSync(`sleep ${ms / 1000}`);

function ab(args, { capture = false } = {}) {
  const cmd = `agent-browser ${args}`;
  try {
    const out = execSync(cmd, { encoding: 'utf8', stdio: capture ? 'pipe' : 'pipe' });
    return out.trim();
  } catch (e) {
    return (e.stdout || '').toString().trim();
  }
}

function evalB64(jsCode) {
  const b64 = Buffer.from(jsCode, 'utf8').toString('base64');
  return ab(`eval -b "${b64}"`, { capture: true });
}

function setViewport() { ab(`set viewport ${VIEWPORT.join(' ')}`); }

function login() {
  const resp = execSync(
    `curl -s -X POST ${API}/auth/login -H "Content-Type: application/json" -d '{"dni":"${CRED.dni}","password":"${CRED.pass}"}'`,
    { encoding: 'utf8' },
  );
  const { accessToken, refreshToken, user } = JSON.parse(resp).data;
  const uid = user.id;
  ab('close --all');
  setViewport();
  ab(`open "${WEB}"`); sleep(3000);
  // Inyecta el token Y marca el onboarding (bienvenida + tour) como ya visto,
  // para que NO aparezcan la pantalla de bienvenida ni el recorrido guiado
  // encima de las capturas. Las claves replican las de useOnboarding.ts:
  //   vitmaterna_onboarding_welcome_<userId> / _tour_<userId>
  evalB64([
    `localStorage.setItem('vitmaterna_token','${accessToken}');`,
    `localStorage.setItem('vitmaterna_refresh_token','${refreshToken}');`,
    `localStorage.setItem('vitmaterna_onboarding_welcome_${uid}','true');`,
    `localStorage.setItem('vitmaterna_onboarding_tour_${uid}','true');`,
    `'ok';`,
  ].join(''));
  ab(`open "${WEB}"`); sleep(11000);
  setViewport(); sleep(1000);
  console.log(`   login ${ROLE} OK (onboarding marcado), url=`, ab('get url'));
}

// Busca el ref @eN de un botón por su aria-label exacto (vía snapshot).
function refByLabel(label) {
  const snap = ab('snapshot', { capture: true });
  const lines = snap.split('\n');
  for (const ln of lines) {
    if (ln.includes(`"${label}"`)) {
      const m = ln.match(/ref=(e\d+)/);
      if (m) return '@' + m[1];
    }
  }
  return null;
}

function tap(label) {
  const ref = refByLabel(label);
  if (!ref) { console.log(`   ⚠️ no encontré "${label}"`); return false; }
  ab(`click ${ref}`); sleep(3500); setViewport(); sleep(800);
  return true;
}

// Tap por TEXTO visible (para StaticText sin ref propio: ítems de menú, filas).
function tapText(text, { exact = true, wait = 3500 } = {}) {
  const flag = exact ? ' --exact' : '';
  const out = ab(`find text "${text}" click${flag}`, { capture: true });
  sleep(wait); setViewport(); sleep(800);
  return !/not found|no element|error/i.test(out);
}

function goHome() {
  ab(`open "${WEB}"`); sleep(7000); setViewport(); sleep(800);
}

function openMenu() {
  const ref = refByLabel('Abrir menú');
  if (ref) { ab(`click ${ref}`); sleep(2200); }
}

// Navegación por pantalla (taps reales).
function gotoUrl(path) {
  ab(`open "${WEB}${path}"`); sleep(6500); setViewport(); sleep(900);
}

// Navegación driven by manifest. Formatos del campo `nav`:
//   "home"            -> recarga el inicio
//   "url:ruta"        -> URL limpia directa (más fiable)
//   "tab:Etiqueta"    -> toca una pestaña inferior por aria-label
//   "drawer:Etiqueta" -> abre el menú y toca un ítem por texto
function navTo(nav) {
  if (!nav || nav === 'home') { goHome(); return; }
  const [kind, ...rest] = nav.split(':');
  const arg = rest.join(':');
  if (kind === 'url') { gotoUrl(arg); return; }
  if (kind === 'tab') { goHome(); tap(arg); return; }
  if (kind === 'drawer') { goHome(); openMenu(); tapText(arg); return; }
  // compat gestante (nombres simples)
  const map = { citas: 'citas', tratamiento: 'tratamiento', chat: 'chat', educacion: 'educacion', alarmas: 'alarmas', visitas: 'visitas' };
  if (map[nav]) { gotoUrl(map[nav]); return; }
  if (nav === 'perfil') { goHome(); openMenu(); tapText('Mi perfil'); return; }
  goHome();
}

// Apertura de modales/menus. Formatos del campo `open`:
//   "menu"            -> abre el menú lateral
//   "tap:Etiqueta"    -> toca un botón por aria-label (abre su modal)
//   "tapText:Texto"   -> toca por texto visible (filas/ítems)
//   "firstRow:Regex"  -> toca la primera fila que matchea (tarjetas de lista)
function openOverlay(kind) {
  if (!kind) return;
  if (kind === 'menu') return void openMenu();
  const [k, ...rest] = kind.split(':');
  const arg = rest.join(':');
  if (k === 'tap') return void tap(arg);
  if (k === 'tapText') return void tapText(arg, { exact: true });
  if (k === 'firstRow') {
    const re = new RegExp(arg, 'i');
    const r = ab('snapshot', { capture: true }).split('\n').find((l) => re.test(l) && /ref=e/.test(l));
    if (r) { const m = r.match(/ref=(e\d+)/); if (m) { ab(`click @${m[1]}`); sleep(2500); setViewport(); sleep(600); } }
    return;
  }
  // compat gestante
  if (kind === 'emergencia') return void tap('Emergencia Pedir auxilio');
  if (kind === 'calculadora') return void tapText('Mis semanas');
  if (kind === 'editar_perfil') return void tapText('Mis datos y fecha de última regla');
  if (kind === 'prefs_notif') return void tapText('Notificaciones', { exact: true });
}

function measure(targets) {
  const tlist = targets.map((t) => ({ label: t.label, mode: t.mode || 'auto', up: t.up || 0 }));
  const header = `const TARGETS = ${JSON.stringify(tlist)};\n`;
  const body = readFileSync(MEASURE_JS, 'utf8');
  const raw = evalB64(header + body);
  try {
    const clean = raw.replace(/^"|"$/g, '').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    return JSON.parse(clean);
  } catch {
    try { return JSON.parse(raw); } catch { return { rects: {} }; }
  }
}

function main() {
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  login();
  const measured = {};
  for (const shot of manifest.shots) {
    process.stdout.write(`\n▶ ${shot.id} (${shot.title}) … `);
    navTo(shot.nav);
    if (shot.scrollTo) {
      // scroll suave hacia un texto
      evalB64(`(function(){const el=[...document.querySelectorAll('div,span,p')].find(n=>(n.textContent||'').trim()==='${shot.scrollTo}');if(el)el.scrollIntoView({block:'center'});return 'ok';})()`);
      sleep(900);
    }
    if (shot.open) { openOverlay(shot.open); sleep(1200); }
    const m = measure(shot.targets);
    // mapear medidas a las claves del shot
    const rects = {};
    for (const t of shot.targets) {
      const r = m.rects && m.rects[t.label];
      if (r) rects[t.key] = { ...r, mark: t.mark, box: !!t.box };
    }
    measured[shot.id] = { title: shot.title, dpr: m.dpr || 2, vw: m.vw, vh: m.vh, rects };
    const png = join(RAW, `${shot.id}.png`);
    ab(`screenshot "${png}"`);
    const found = Object.keys(rects).length;
    const total = shot.targets.length;
    process.stdout.write(`captura ok · medidos ${found}/${total}`);
  }
  writeFileSync(MEASURED, JSON.stringify(measured, null, 2));
  console.log(`\n\n✅ Capturas en ${RAW}`);
  console.log(`✅ Medidas en ${MEASURED}`);
}

main();
