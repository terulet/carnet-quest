import { abrirChromium } from './_navegador.mjs';
const BASE = process.env.CQ_URL || 'http://localhost:8765/';

// El arranque ahora es un cruce jugable: hay que pasarlo para llegar al juego.
async function pasarArranque(pg) {
  const saltar = pg.locator('#salir.btn-saltar');
  if (await saltar.count()) { await saltar.click(); await pg.waitForTimeout(250); }
  const go = pg.locator('#ob-go');
  if (await go.count()) { await go.click(); await pg.waitForTimeout(500); }
}

const OUT = process.env.SHOTS || '/tmp/cq-shots';
await (await import('node:fs/promises')).mkdir(OUT, { recursive: true });
const errs = [];
const b = await abrirChromium();
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));

await p.goto(BASE, { waitUntil: 'networkidle' });
await pasarArranque(p); await p.waitForTimeout(700);

// el coche del mapa debe ser el SVG del Garaje, no un emoji
console.log('coche del mapa es SVG:', await p.locator('.coche-avatar rect').count() > 0);

// dale chapas para poder comprar
await p.evaluate(() => new Promise(res => {
  const r = indexedDB.open('carnet-quest');
  r.onsuccess = () => { const db = r.result; const tx = db.transaction('jugador','readwrite');
    const st = tx.objectStore('jugador'); const g = st.get('estado');
    g.onsuccess = () => { const s = g.result; s.chapas = 400; st.put(s,'estado'); tx.oncomplete = () => res(); }; };
}));
await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(700);

await p.click('#hud-chapas');
await p.waitForSelector('.garaje-grid', { timeout: 5000 });
await p.waitForTimeout(400);
await p.screenshot({ path: `${OUT}/garaje-1.png`, fullPage: true });
console.log('artículos:', await p.locator('.garaje-card').count(), '· bloqueados por Pase:', await p.locator('.garaje-card--pase').count());

// comprar un tema y comprobar que el acento cambia de verdad
const antes = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--acento').trim());
await p.click('[data-comprar^="tema:obras"]');
await p.waitForTimeout(900);
const despues = await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--acento').trim());
const chapas = await p.locator('#garaje-chapas').textContent();
console.log(`acento ${antes} → ${despues} · chapas restantes ${chapas} (400-90=310)`);

// comprar un coche y ver que el mapa lo usa
await p.click('[data-comprar^="coche:furgo"]');
await p.waitForTimeout(900);
await p.screenshot({ path: `${OUT}/garaje-2-comprado.png`, fullPage: true });
await p.click('#volver'); await p.waitForTimeout(400);
await p.click('[data-ir="mapa"]'); await p.waitForTimeout(700);
const alto = await p.evaluate(() => {
  const r = document.querySelector('.coche-avatar rect');
  return r ? { h: r.getAttribute('height'), fill: r.getAttribute('fill') } : null;
});
console.log('coche del mapa tras comprar la furgo (h=54, fill #FFC800):', JSON.stringify(alto));
await p.screenshot({ path: `${OUT}/garaje-3-mapa.png` });

// intentar comprar sin saldo
await p.click('#hud-chapas'); await p.waitForTimeout(400);
const caro = await p.locator('[data-comprar]').first();
console.log(errs.length ? '❌ ' + errs.join('\n') : '✅ sin errores de consola');
await b.close();
