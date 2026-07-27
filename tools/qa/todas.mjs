// Ejecuta toda la suite de integración en serie y resume.
//
// En serie a propósito: son navegadores reales compitiendo por CPU, y en
// paralelo los tiempos de animación se vuelven poco fiables y aparecen fallos
// que no existen.
//
// Uso:  node tools/qa/todas.mjs        (o `npm run qa`)

import { spawn } from 'node:child_process';
import { readdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const BASE = process.env.CQ_URL || 'http://localhost:8765/';

// comprobación previa: sin servidor, el fallo sería críptico
try {
  const r = await fetch(BASE, { method: 'GET' });
  if (!r.ok) throw new Error(String(r.status));
} catch {
  console.error(`❌ No responde ${BASE}\n   Levanta el servidor con \`npm run serve\` (o exporta CQ_URL).`);
  process.exit(2);
}

const scripts = (await readdir(AQUI)).filter((f) => f.startsWith('qa-') && f.endsWith('.mjs')).sort();
const fallos = [];

for (const f of scripts) {
  process.stdout.write(`${f.padEnd(20)} `);
  const t0 = Date.now();
  const code = await new Promise((res) => {
    const p = spawn(process.execPath, [join(AQUI, f)], { stdio: ['ignore', 'pipe', 'pipe'] });
    let salida = '';
    p.stdout.on('data', (d) => { salida += d; });
    p.stderr.on('data', (d) => { salida += d; });
    p.on('close', (c) => {
      if (c !== 0) fallos.push({ f, salida: salida.trim().split('\n').slice(-12).join('\n') });
      res(c);
    });
  });
  const seg = ((Date.now() - t0) / 1000).toFixed(0);
  console.log(code === 0 ? `✅ ${seg}s` : `❌ ${seg}s`);
}

if (fallos.length) {
  for (const { f, salida } of fallos) console.error(`\n─── ${f} ───\n${salida}`);
  console.error(`\n❌ ${fallos.length} de ${scripts.length} scripts han fallado`);
  process.exit(1);
}
console.log(`\n✅ ${scripts.length} scripts de integración, todos en verde`);
