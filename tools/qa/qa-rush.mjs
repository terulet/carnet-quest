import { abrirChromium } from './_navegador.mjs';
const BASE = process.env.CQ_URL || 'http://localhost:8765/';

// Los modos ya no viven en #xxx-card: se abren desde el mapa con [data-modo].
// Y desde Retención V1 nacen cerrados, así que la prueba los abre a mano.
async function abrirModo(p, id) {
  await p.evaluate(() => new Promise(r => {
    const q = indexedDB.open('carnet-quest');
    q.onsuccess = () => { const tx = q.result.transaction('jugador', 'readwrite');
      const st = tx.objectStore('jugador'); const g = st.get('estado');
      g.onsuccess = () => { const s = g.result;
        s.desbloqueos = { cruces: true, rush: true, bote: true, torre: true, crono: true };
        s.compras.pase = true;
        st.put(s, 'estado'); tx.oncomplete = () => r(); }; };
  }));
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(700);
  const sel = `.screen.activa [data-modo="${id}"]`;
  await p.locator(sel).scrollIntoViewIfNeeded();
  await p.click(sel);
}


// El arranque ahora es un cruce jugable: hay que pasarlo para llegar al juego.
async function pasarArranque(pg) {
  const saltar = pg.locator('#salir.btn-saltar');
  if (await saltar.count()) { await saltar.click(); await pg.waitForTimeout(250); }
  const go = pg.locator('#ob-go');
  if (await go.count()) { await go.click(); await pg.waitForTimeout(500); }
}

const OUT = process.env.SHOTS || '/tmp/cq-shots';
await (await import('node:fs/promises')).mkdir(OUT, { recursive: true });
const errores = [];
const b = await abrirChromium();
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
p.on('console', m => { if (m.type() === 'error') errores.push('CONSOLE: ' + m.text()); });
p.on('pageerror', e => errores.push('PAGEERROR: ' + e.message));

await p.goto(BASE, { waitUntil: 'networkidle' });
await pasarArranque(p); await p.waitForTimeout(600);

await abrirModo(p, 'rush');
await p.waitForSelector('.rush__grid', { timeout: 5000 });
await p.waitForTimeout(400);
await p.screenshot({ path: `${OUT}/rush-1-juego.png` });

// clasifica correctamente leyendo la categoría de la señal en pantalla
const familiaActual = () => p.evaluate(async () => {
  const doc = await (await fetch('datos/senales.expanded.json')).json();
  const nombre = document.querySelector('.rush-svg')?.getAttribute('aria-label');
  return doc.senales.find(x => x.nombre === nombre)?.categoria || null;
});

let aciertos = 0;
for (let i = 0; i < 12; i++) {
  const f = await familiaActual();
  if (!f) break;
  await p.click(`.rush-btn[data-f="${f}"]`);
  aciertos++;
  await p.waitForTimeout(130);
}
const marcador = await p.locator('#rush-n').textContent();
console.log(`clasificadas ${aciertos} · marcador en pantalla: ${marcador}`);
await p.screenshot({ path: `${OUT}/rush-2-combo.png` });

// ahora falla a propósito: debe descontar tiempo y señalar la correcta
const antes = await p.locator('#rush-timer').textContent();
const f = await familiaActual();
const mala = ['peligro','prioridad','prohibicion','obligacion','fin','indicacion'].find(x => x !== f);
await p.click(`.rush-btn[data-f="${mala}"]`);
await p.waitForTimeout(200);
await p.screenshot({ path: `${OUT}/rush-3-fallo.png` });
const despues = await p.locator('#rush-timer').textContent();
console.log(`timer antes ${antes} → después ${despues} (debe bajar ~3 s de golpe)`);

// espera al final del rush
await p.waitForSelector('.rush-final', { timeout: 70000 });
await p.waitForTimeout(600);
await p.screenshot({ path: `${OUT}/rush-4-resultado.png`, fullPage: true });
console.log('resultado:', (await p.locator('.rush-final').textContent()).trim(), '·', (await p.locator('.marcador').textContent()).trim());
console.log(errores.length ? '❌ ' + errores.join('\n') : '✅ sin errores de consola');
await b.close();
