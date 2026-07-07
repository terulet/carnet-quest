#!/usr/bin/env node
// Lint de esquema del banco de preguntas (§11 de CLAUDE.md).
// Uso: node tools/lint-preguntas.mjs [dirRelativo]  (por defecto datos/preguntas)
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIR = join(ROOT, process.argv[2] ?? join('datos', 'preguntas'));

const senalIds = new Set();
for (const f of ['senales.json', 'senales.expanded.json']) {
  const p = join(ROOT, 'datos', f);
  if (existsSync(p)) JSON.parse(readFileSync(p, 'utf8')).senales.forEach(s => senalIds.add(s.id));
}

const errores = [];
const avisos = [];
const stats = {};
const idsGlobales = new Set();
const textosVistos = new Map();

const err = (f, id, msg) => errores.push(`${f} ${id ?? ''}: ${msg}`);
const warn = (f, id, msg) => avisos.push(`${f} ${id ?? ''}: ${msg}`);

for (const file of readdirSync(DIR).filter(f => /^mundo-\d\d\.json$/.test(f)).sort()) {
  const mundoNum = parseInt(file.match(/mundo-(\d\d)/)[1], 10);
  let banco;
  try {
    banco = JSON.parse(readFileSync(join(DIR, file), 'utf8'));
  } catch (e) {
    err(file, null, `JSON inválido: ${e.message}`);
    continue;
  }
  if (!Array.isArray(banco)) { err(file, null, 'la raíz debe ser un array'); continue; }
  stats[file] = { total: banco.length, conTruco: 0, conTrampa: 0, dif: [0, 0, 0, 0, 0, 0], senales: 0, verificar: 0 };

  banco.forEach((q, i) => {
    const id = q.id ?? `[índice ${i}]`;
    if (!/^M\d\d-\d\d\d$/.test(q.id ?? '')) err(file, id, 'id no cumple el formato MXX-NNN');
    else if (parseInt(q.id.slice(1, 3), 10) !== mundoNum) err(file, id, `id de mundo ${q.id.slice(1, 3)} en archivo de mundo ${mundoNum}`);
    if (idsGlobales.has(q.id)) err(file, id, 'id duplicado'); else idsGlobales.add(q.id);
    if (q.mundo !== mundoNum) err(file, id, `campo mundo=${q.mundo}, esperado ${mundoNum}`);
    if (typeof q.tema !== 'string' || !q.tema.trim()) err(file, id, 'tema vacío');
    if (typeof q.pregunta !== 'string' || q.pregunta.trim().length < 10) err(file, id, 'pregunta vacía o demasiado corta');
    if (!Array.isArray(q.opciones) || q.opciones.length < 2 || q.opciones.length > 4) err(file, id, 'opciones debe tener entre 2 y 4 entradas');
    else {
      if (q.opciones.some(o => typeof o !== 'string' || !o.trim())) err(file, id, 'opción vacía');
      if (new Set(q.opciones.map(o => o.trim().toLowerCase())).size !== q.opciones.length) err(file, id, 'opciones duplicadas');
      if (!Number.isInteger(q.correcta) || q.correcta < 0 || q.correcta >= q.opciones.length) err(file, id, `correcta=${q.correcta} fuera de rango`);
    }
    if (!Number.isInteger(q.dificultad) || q.dificultad < 1 || q.dificultad > 5) err(file, id, `dificultad=${q.dificultad} fuera de 1-5`);
    else stats[file].dif[q.dificultad]++;
    if (typeof q.explicacion_corta !== 'string' || !q.explicacion_corta.trim()) err(file, id, 'falta explicacion_corta');
    if (typeof q.trampa !== 'string' || !q.trampa.trim()) err(file, id, 'falta trampa'); else stats[file].conTrampa++;
    if (typeof q.truco === 'string' && q.truco.trim()) stats[file].conTruco++;
    else warn(file, id, 'sin truco (permitido solo si de verdad no existe mnemotecnia)');
    if (q.dificultad >= 4 && (typeof q.explicacion_larga !== 'string' || q.explicacion_larga.trim().length < 80))
      err(file, id, 'dificultad>=4 exige explicacion_larga (>=80 caracteres)');
    if (q.dificultad < 4 && q.explicacion_larga) warn(file, id, 'explicacion_larga en dificultad <4 (permitido pero raro)');
    if (!Array.isArray(q.tags) || q.tags.length === 0) err(file, id, 'faltan tags');
    if (q.senalId != null) {
      if (!senalIds.has(q.senalId)) err(file, id, `senalId ${q.senalId} no existe en senales.json`);
      else stats[file].senales++;
    }
    if (!('imagen' in q)) err(file, id, 'falta el campo imagen (puede ser null)');
    const texto = JSON.stringify(q.opciones ?? []) + (q.pregunta ?? '').trim().toLowerCase();
    if (textosVistos.has(texto)) warn(file, id, `posible duplicado de ${textosVistos.get(texto)}`);
    else textosVistos.set(texto, q.id);
    if (JSON.stringify(q).includes('VERIFICAR')) stats[file].verificar++;
  });
}

console.log('— BANCO DE PREGUNTAS —');
let total = 0;
for (const [f, s] of Object.entries(stats)) {
  total += s.total;
  console.log(`${f}: ${s.total} preguntas · trucos ${s.conTruco} · trampas ${s.conTrampa} · dif[1-5] ${s.dif.slice(1).join('/')} · señales ${s.senales}${s.verificar ? ` · ⚠ VERIFICAR:${s.verificar}` : ''}`);
}
console.log(`TOTAL: ${total} preguntas`);
if (avisos.length) { console.log(`\n⚠ AVISOS (${avisos.length}):`); avisos.slice(0, 40).forEach(a => console.log('  ' + a)); if (avisos.length > 40) console.log(`  … y ${avisos.length - 40} más`); }
if (errores.length) { console.log(`\n✗ ERRORES (${errores.length}):`); errores.forEach(e => console.log('  ' + e)); process.exit(1); }
console.log('\n✓ Lint OK');
