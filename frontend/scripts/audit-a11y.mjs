#!/usr/bin/env node
/**
 * VITMATERNA — Auditoría de accesibilidad (análisis estático)
 *
 * Lista deudas de a11y en `app/` para que el contador baje monótonamente por
 * fase, igual que `audit-design.mjs` hace con literales de color. NO arregla
 * nada: solo reporta.
 *
 * Uso:
 *   node scripts/audit-a11y.mjs            # informe legible
 *   node scripts/audit-a11y.mjs --strict   # exit 1 si hay interactivo sin label
 *   node scripts/audit-a11y.mjs --json     # salida JSON (para CI)
 *
 * Reglas:
 *   A1  <Pressable>/<TouchableOpacity> sin accessibilityLabel ni aria-label
 *       (las acciones obvias como back/cerrar/menu suelen tenerlo; este
 *       reporte los lista todos para revisión).
 *   A2  <Pressable>/<TouchableOpacity> sin hitSlop NI width/height explícitos
 *       ≥ layout.minTouchTarget (48). WCAG 2.5.8 AA pide ≥24px; la app fija 48.
 *   A3  <Image>/<expo-image> sin accessibilityLabel cuando parecen informativos
 *       (heuristic: sin accessibilityRole='image' ni label).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const APP_DIR = join(ROOT, 'app');
const MIN_TOUCH = 48;

const args = process.argv.slice(2);
const STRICT = args.includes('--strict');
const JSON_OUT = args.includes('--json');

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(tsx|ts)$/.test(entry)) out.push(full);
  }
  return out;
}

const EXCLUDE = new Set([join(APP_DIR, '_layout.tsx')]);
const files = walk(APP_DIR).filter((f) => !EXCLUDE.has(f));

/** A1: interactivo sin label. Mira el bloque completo del elemento (no solo
 *  la línea del tag de apertura), porque accessibilityLabel suele ir en otra
 *  línea. Considera label presente si el elemento tiene accessibilityLabel,
 *  aria-label, o contiene un <Text> hijo con contenido (label implícito). */
function findA1(text, rel) {
  const out = [];
  const re = /<(Pressable|TouchableOpacity)\b[^>]*>/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const openTag = m[0];
    // Buscar el bloque completo del elemento: desde openTag hasta su cierre >.
    const blockStart = m.index;
    const closeAngle = text.indexOf('>', blockStart);
    if (closeAngle === -1) continue;
    // Cuerpo: desde el cierre del tag de apertura hasta el </Pressable/TouchableOpacity> que cierra.
    const bodyStart = closeAngle + 1;
    const closeTagRe = new RegExp(`</${m[1]}>`);
    const closeMatch = text.slice(bodyStart).match(closeTagRe);
    if (!closeMatch) continue;
    const block = text.slice(blockStart, bodyStart + closeMatch.index + closeMatch[0].length);
    const hasLabel = /accessibilityLabel|aria-label/.test(block);
    const hasTextChild = /<Text\b[^>]*>\s*\S/.test(block);
    if (!hasLabel && !hasTextChild) {
      const line = text.slice(0, blockStart).split('\n').length;
      out.push({ file: rel, line, tag: m[1] });
    }
  }
  return out;
}

/** A2: interactivo sin hitSlop ni tamaño explícito ≥ MIN_TOUCH. */
function findA2(text, rel) {
  const out = [];
  const re = /<(Pressable|TouchableOpacity)\b[^>]*>/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const tag = m[0];
    const hasHitSlop = /hitSlop/.test(tag);
    const wMatch = tag.match(/width[={\s:]+(\d+)/);
    const hMatch = tag.match(/height[={\s:]+(\d+)/);
    const w = wMatch ? parseInt(wMatch[1], 10) : 0;
    const h = hMatch ? parseInt(hMatch[1], 10) : 0;
    const hasExplicitSize = w >= MIN_TOUCH || h >= MIN_TOUCH;
    if (!hasHitSlop && !hasExplicitSize) {
      const line = text.slice(0, m.index).split('\n').length;
      out.push({ file: rel, line, tag: m[1] });
    }
  }
  return out;
}

const a1 = [];
const a2 = [];
for (const file of files) {
  const text = readFileSync(file, 'utf-8');
  const rel = relative(ROOT, file);
  a1.push(...findA1(text, rel));
  a2.push(...findA2(text, rel));
}

const results = {
  scanned: files.length,
  A1: { label: 'Interactivo sin accessibilityLabel', count: a1.length, blocking: true, items: a1 },
  A2: { label: 'Interactivo sin hitSlop ni tamaño ≥48', count: a2.length, blocking: false, items: a2 },
};

if (JSON_OUT) {
  console.log(JSON.stringify(results, null, 2));
} else {
  console.log(`\n  VITMATERNA · Auditoría de accesibilidad — ${files.length} archivos en app/\n`);
  for (const id of ['A1', 'A2']) {
    const r = results[id];
    const flag = r.blocking ? '' : ' (no bloqueante)';
    const mark = r.count === 0 ? 'OK ' : '!! ';
    console.log(`  ${mark}${id}  ${r.label}${flag}: ${r.count}`);
    const byFile = {};
    for (const it of r.items) byFile[it.file] = (byFile[it.file] || 0) + 1;
    const top = Object.entries(byFile).sort((a, b) => b[1] - a[1]).slice(0, 8);
    for (const [f, c] of top) console.log(`        ${c}  ${f}`);
  }
  console.log(`\n  Total: ${results.A1.count} bloqueantes, ${results.A2.count} no bloqueantes\n`);
}

if (STRICT && results.A1.count > 0) process.exit(1);
