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

// entra con el Pase activado por enlace → se abren los cruces de glorieta (mundo 8)
await p.goto(BASE + '?codigo=CQ-DJCQB-LRRHJ', { waitUntil: 'networkidle' });
await pasarArranque(p);
await p.waitForTimeout(700);

// fuerza una tanda solo de glorietas jugando hasta encontrar una
let encontrada = false;
for (let intento = 0; intento < 3 && !encontrada; intento++) {

  await abrirModo(p, 'cruces');
  await p.waitForSelector('.cruce-escena svg', { timeout: 5000 });
  for (let i = 0; i < 8; i++) {
    const esGlor = await p.evaluate(async () => {
      const lista = await (await fetch('datos/cruces.json')).json();
      const tit = document.querySelector('.cruce__titulo')?.textContent.trim();
      return lista.find(c => (c.titulo || c.tema) === tit)?.via === 'glorieta';
    });
    if (esGlor) {
      encontrada = true;
      await p.screenshot({ path: `${OUT}/glorieta-juego.png` });
      const orden = await p.evaluate(async () => {
        const lista = await (await fetch('datos/cruces.json')).json();
        const tit = document.querySelector('.cruce__titulo').textContent.trim();
        return lista.find(c => (c.titulo || c.tema) === tit).orden;
      });
      for (const k of orden) { await p.click(`.cruce-fila[data-k="${k}"]`); await p.waitForTimeout(200); }
      await p.waitForTimeout(1400);
      await p.screenshot({ path: `${OUT}/glorieta-animando.png` });
      await p.waitForSelector('#siguiente', { timeout: 12000 });
      await p.waitForTimeout(250);
      await p.screenshot({ path: `${OUT}/glorieta-resuelta.png`, fullPage: true });
      console.log('glorieta jugada:', orden.join('→'), '·', (await p.locator('.cruce__ayuda').textContent()).trim());
      break;
    }
    // resuelve lo que haya y avanza
    if (await p.locator('.cruce-fila:not([disabled])').count()) {
      const ks = await p.locator('.cruce-fila:not([disabled])').evaluateAll(n => n.map(x => x.dataset.k));
      for (const k of ks) { await p.click(`.cruce-fila[data-k="${k}"]`); await p.waitForTimeout(170); }
      await p.waitForSelector('#siguiente', { timeout: 12000 });
      await p.click('#siguiente'); await p.waitForTimeout(400);
    } else break;
  }
  if (!encontrada && await p.locator('#mapa-btn').count()) { await p.click('#mapa-btn'); await p.waitForTimeout(500); }
}
console.log(encontrada ? '✅ glorieta jugada en el modo real' : '⚠️ no salió ninguna glorieta');
console.log(errores.length ? '❌ ' + errores.join('\n') : '✅ sin errores de consola');
await b.close();
