#!/usr/bin/env node
/**
 * VITMATERNA — Auditoría de consistencia de diseño (sin dependencias)
 *
 * Recorre `app/` y reporta violaciones del sistema de diseño. Sirve como
 * barandilla de no-regresión durante la refactorización: el objetivo es que
 * cada cifra baje hacia 0 a medida que se migran pantallas.
 *
 * Uso:
 *   node scripts/audit-design.mjs            # informe legible
 *   node scripts/audit-design.mjs --strict   # sale con código 1 si hay violaciones bloqueantes
 *   node scripts/audit-design.mjs --json      # salida JSON (para CI)
 *
 * Reglas (en `app/`, las pantallas):
 *   R1  Sin literales de color hex (#rrggbb)            → usar tokens de theme/
 *   R2  Sin rgba(...) crudos                            → usar tokens / overlay
 *   R3  Sin Alert.alert                                 → useToast / ConfirmSheet
 *   R4  Sin <Modal> de react-native crudo               → AppModal / BottomSheet
 *   R5  Sin SafeAreaView importado de 'react-native'    → react-native-safe-area-context
 *   R6  Sin z-index numérico suelto                     → theme/zIndex
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const APP_DIR = join(ROOT, 'app');

const args = process.argv.slice(2);
const STRICT = args.includes('--strict');
const JSON_OUT = args.includes('--json');

/** @type {{id:string,label:string,re:RegExp,blocking:boolean}[]} */
const RULES = [
  { id: 'R1', label: 'Color hex literal', re: /#[0-9A-Fa-f]{6}\b/g, blocking: true },
  { id: 'R2', label: 'rgba() crudo', re: /\brgba\(/g, blocking: true },
  { id: 'R3', label: 'Alert.alert', re: /Alert\.alert\s*\(/g, blocking: true },
  { id: 'R4', label: '<Modal> RN crudo', re: /<Modal[\s>]/g, blocking: true },
  { id: 'R5', label: "SafeAreaView desde 'react-native'", re: /SafeAreaView[^\n]*from ['"]react-native['"]/g, blocking: true },
  { id: 'R6', label: 'z-index numérico suelto', re: /zIndex:\s*\d/g, blocking: false },
];

function walk(dir) {
  /** @type {string[]} */
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(tsx|ts)$/.test(entry)) out.push(full);
  }
  return out;
}

const files = walk(APP_DIR);
/** @type {Record<string, {count:number, files:Record<string,number>}>} */
const results = Object.fromEntries(RULES.map((r) => [r.id, { count: 0, files: {} }]));

for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const rel = relative(ROOT, file);
  for (const rule of RULES) {
    const matches = text.match(rule.re);
    if (matches && matches.length) {
      results[rule.id].count += matches.length;
      results[rule.id].files[rel] = matches.length;
    }
  }
}

if (JSON_OUT) {
  console.log(JSON.stringify({ scanned: files.length, results }, null, 2));
} else {
  console.log(`\n  VITMATERNA · Auditoría de diseño — ${files.length} archivos en app/\n`);
  let total = 0;
  let blockingTotal = 0;
  for (const rule of RULES) {
    const r = results[rule.id];
    total += r.count;
    if (rule.blocking) blockingTotal += r.count;
    const flag = rule.blocking ? '' : ' (no bloqueante)';
    const mark = r.count === 0 ? 'OK ' : '!! ';
    console.log(`  ${mark}${rule.id}  ${rule.label}${flag}: ${r.count}`);
    const topFiles = Object.entries(r.files).sort((a, b) => b[1] - a[1]).slice(0, 5);
    for (const [f, c] of topFiles) console.log(`        ${c}  ${f}`);
  }
  console.log(`\n  Total violaciones: ${total} (bloqueantes: ${blockingTotal})\n`);
}

const blocking = RULES.filter((r) => r.blocking).reduce((s, r) => s + results[r.id].count, 0);
if (STRICT && blocking > 0) process.exit(1);
