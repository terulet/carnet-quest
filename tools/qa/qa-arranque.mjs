import { abrirChromium } from './_navegador.mjs';
const BASE = process.env.CQ_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || '/tmp/cq-shots';
await (await import('node:fs/promises')).mkdir(OUT, { recursive: true });
const errs = [];
const b = await abrirChromium();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));

const t0 = Date.now();
await p.goto(BASE, { waitUntil: 'networkidle' });
// lo PRIMERO que se ve debe ser un cruce jugable, no texto
await p.waitForSelector('.cruce-escena svg', { timeout: 6000 });
console.log(`primer elemento jugable en pantalla: ${Date.now() - t0} ms`);
console.log('¿hay HUD?', await p.locator('#hud:not(.oculto)').count() > 0 ? 'SÍ (mal)' : 'no (bien)');
console.log('¿hay nav?', await p.locator('#nav:not(.oculto)').count() > 0 ? 'SÍ (mal)' : 'no (bien)');
console.log('¿hay botón saltar?', await p.locator('#salir.btn-saltar').count() > 0);
await p.waitForTimeout(400);
await p.screenshot({ path: `${OUT}/arranque-1-primer-vistazo.png` });

// resolver bien
const orden = await p.evaluate(async () => {
  const l = await (await fetch('datos/cruces.json')).json();
  const tit = document.querySelector('.cruce__titulo').textContent.trim();
  return l.find(c => (c.titulo || c.tema) === tit).orden;
});
for (const k of orden) { await p.click(`.cruce-fila[data-k="${k}"]`); await p.waitForTimeout(200); }
await p.waitForSelector('#tuto-seguir', { timeout: 9000 });
await p.screenshot({ path: `${OUT}/arranque-2-resuelto.png`, fullPage: true });
await p.click('#tuto-seguir');
await p.waitForSelector('#ob-go', { timeout: 5000 });
await p.waitForTimeout(400);
await p.screenshot({ path: `${OUT}/arranque-3-bienvenida.png`, fullPage: true });
console.log('veredicto:', (await p.locator('.onboard__veredicto').textContent()).trim());
await p.click('#ob-go');
await p.waitForTimeout(700);
console.log('acaba en el mapa:', await p.locator('.mapa-svg').count() > 0);
console.log('onboarded guardado:', await p.evaluate(() => new Promise(r => {
  const q = indexedDB.open('carnet-quest');
  q.onsuccess = () => { const g = q.result.transaction('jugador').objectStore('jugador').get('estado');
    g.onsuccess = () => r(g.result.onboarded); };
})));

// segunda visita: directo al mapa, sin tutorial
await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(800);
console.log('2ª visita va directa al mapa:', await p.locator('.mapa-svg').count() > 0);

// --- ahora la rama del FALLO, con perfil limpio
const p2 = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
p2.on('pageerror', e => errs.push('PAGEERROR2: ' + e.message));
await p2.goto(BASE, { waitUntil: 'networkidle' });
await p2.waitForSelector('.cruce-escena svg', { timeout: 6000 });
const o2 = await p2.evaluate(async () => {
  const l = await (await fetch('datos/cruces.json')).json();
  const tit = document.querySelector('.cruce__titulo').textContent.trim();
  return l.find(c => (c.titulo || c.tema) === tit).orden;
});
for (const k of o2.slice().reverse()) { await p2.click(`.cruce-fila[data-k="${k}"]`); await p2.waitForTimeout(200); }
await p2.waitForSelector('#tuto-seguir', { timeout: 9000 });
await p2.click('#tuto-seguir');
await p2.waitForSelector('.onboard__veredicto', { timeout: 5000 });
await p2.waitForTimeout(300);
await p2.screenshot({ path: `${OUT}/arranque-4-tras-fallo.png`, fullPage: true });
console.log('veredicto tras fallar:', (await p2.locator('.onboard__veredicto').textContent()).trim());

// --- y el botón saltar
const p3 = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
await p3.goto(BASE, { waitUntil: 'networkidle' });
await p3.waitForSelector('#salir.btn-saltar', { timeout: 6000 });
await p3.click('#salir.btn-saltar');
await p3.waitForSelector('#ob-go', { timeout: 5000 });
console.log('saltar lleva a la bienvenida:', await p3.locator('#ob-go').count() > 0);

console.log(errs.length ? '❌ ' + errs.join('\n') : '✅ sin errores de consola');
await b.close();
