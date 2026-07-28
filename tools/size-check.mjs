// CARNET QUEST — control del presupuesto de arranque (CLAUDE.md §5: < 300 KB).
//
// CRITERIO DE MEDIDA, explícito a propósito para que el número signifique algo:
//
//   "Carga inicial" = todo lo que el navegador NECESITA descargar para pintar la
//   primera pantalla jugable, medido en BYTES TRANSFERIDOS (gzip), que es lo que
//   paga el jugador en datos móviles. Se cuenta:
//     · index.html
//     · el CSS que enlaza
//     · los módulos ES alcanzables por import ESTÁTICO desde js/main.js
//     · los JSON que se piden en el arranque (strings, mundos, señales, cruces,
//       garaje) y el banco del primer mundo jugable
//
//   NO se cuenta, y se lista aparte:
//     · los módulos que solo entran por import() dinámico
//     · los bancos de los mundos 2-15 (se piden al entrar en ellos)
//     · datos/reglatrampa.json (se descarga la primera vez que hace falta)
//     · fuentes e iconos (se pintan con fallback del sistema mientras cargan)
//     · lo que el Service Worker precachea EN SEGUNDO PLANO, ya jugando
//
// Uso:  node tools/size-check.mjs [--json]

import { readFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const TOPE_KB = 300;

const bytes = (f) => readFileSync(f);
const kb = (n) => Math.round((n / 1024) * 10) / 10;
const gz = (buf) => gzipSync(buf, { level: 9 }).length;

/** Sigue los imports estáticos desde una entrada. Ignora los dinámicos. */
function moduloYSusImports(entrada, vistos = new Set()) {
  if (vistos.has(entrada) || !existsSync(entrada)) return vistos;
  vistos.add(entrada);
  const src = readFileSync(entrada, 'utf8');
  // import ... from './x.js'  ·  export ... from './x.js'  (estáticos)
  const re = /^\s*(?:import|export)[\s\S]*?from\s+['"](\.[^'"]+)['"]/gm;
  const dir = entrada.slice(0, entrada.lastIndexOf('/'));
  let m;
  while ((m = re.exec(src))) {
    const rel = m[1].replace(/^\.\//, '');
    const ruta = rel.startsWith('../')
      ? `${dir.slice(0, dir.lastIndexOf('/'))}/${rel.slice(3)}`
      : `${dir}/${rel}`;
    moduloYSusImports(ruta, vistos);
  }
  return vistos;
}

const ARRANQUE_JSON = [
  'datos/strings.es.json',
  'datos/mundos.json',
  'datos/senales.json',
  'datos/cruces.json',
  'datos/garaje.json',
  'datos/preguntas/mundo-01.json',
];

const DIFERIDOS = [
  'js/trampas.js',
  'datos/trampas.json',
  'js/retencion/ics.js',
  'js/retencion/reto.js',
  'js/retencion/reglatrampa.js',
  'datos/reglatrampa.json',
  'datos/senales.expanded.json',
  ...Array.from({ length: 14 }, (_, i) => `datos/preguntas/mundo-${String(i + 2).padStart(2, '0')}.json`),
];

const modulos = [...moduloYSusImports('js/main.js')];
const inicial = ['index.html', 'css/tokens.css', 'css/app.css', ...modulos, ...ARRANQUE_JSON];

let crudo = 0, comprimido = 0;
const filas = [];
for (const f of inicial) {
  if (!existsSync(f)) { filas.push([f, 'FALTA', '']); continue; }
  const b = bytes(f);
  crudo += b.length;
  const g = gz(b);
  comprimido += g;
  filas.push([f, `${kb(b.length)} KB`, `${kb(g)} KB gz`]);
}

filas.sort((a, b) => parseFloat(b[2]) - parseFloat(a[2]));
console.log('CARGA INICIAL (lo que hace falta para la primera pantalla jugable)\n');
for (const [f, a, g] of filas) console.log(`  ${g.padStart(11)}  ${a.padStart(9)}  ${f}`);

console.log(`\n  TOTAL: ${kb(comprimido)} KB gzip · ${kb(crudo)} KB sin comprimir`);
console.log(`  Tope:  ${TOPE_KB} KB gzip\n`);

console.log('DIFERIDO (no entra en el arranque):');
let dif = 0;
for (const f of DIFERIDOS) {
  if (!existsSync(f)) continue;
  const g = gz(bytes(f));
  dif += g;
  console.log(`  ${String(kb(g)).padStart(7)} KB gz  ${f}`);
}
console.log(`  TOTAL diferido: ${kb(dif)} KB gzip\n`);

const pasa = kb(comprimido) <= TOPE_KB;
console.log(pasa
  ? `✅ Dentro de presupuesto (${kb(comprimido)} / ${TOPE_KB} KB)`
  : `❌ FUERA DE PRESUPUESTO: ${kb(comprimido)} KB > ${TOPE_KB} KB`);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ inicialGzipKB: kb(comprimido), inicialCrudoKB: kb(crudo), diferidoGzipKB: kb(dif), topeKB: TOPE_KB, pasa }));
}
process.exit(pasa ? 0 : 1);
