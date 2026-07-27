// Resuelve Playwright esté donde esté instalado.
//
// Los `import` de ES modules no miran NODE_PATH, así que en un contenedor donde
// Playwright vive fuera del proyecto (por ejemplo en /opt) un import normal
// falla. Aquí se prueba primero la resolución de siempre y después las rutas de
// NODE_PATH, que es lo que usa este entorno.

import { createRequire } from 'node:module';

const req = createRequire(import.meta.url);
const candidatos = [
  'playwright',
  ...(process.env.NODE_PATH || '').split(':').filter(Boolean).map((p) => `${p}/playwright`),
  '/opt/node22/lib/node_modules/playwright',
];

let pw = null;
const errores = [];
for (const c of candidatos) {
  try { pw = req(c); break; } catch (e) { errores.push(`${c}: ${e.code || e.message}`); }
}
if (!pw) {
  throw new Error(`No encuentro Playwright. Prueba \`npm i -D playwright\` o exporta NODE_PATH.\n${errores.join('\n')}`);
}

export const { chromium, webkit, firefox } = pw;

/** Chromium preinstalado del contenedor; si no está, el que traiga Playwright. */
export const EJECUTABLE = process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium';

export async function abrirChromium(opciones = {}) {
  try { return await chromium.launch({ executablePath: EJECUTABLE, ...opciones }); }
  catch { return chromium.launch(opciones); }
}
