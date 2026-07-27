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

await p.screenshot({ path: `${OUT}/bote-0-mapa.png`, fullPage: true });
await abrirModo(p, 'bote');
await p.waitForSelector('.q-card, .cruce-escena', { timeout: 5000 });
await p.waitForTimeout(400);

// responde bien 3 veces (leyendo la respuesta correcta del banco)
const acertar = async () => {
  if (await p.locator('.cruce-fila:not([disabled])').count()) {
    const orden = await p.evaluate(async () => {
      const lista = await (await fetch('datos/cruces.json')).json();
      const tit = document.querySelector('.cruce__titulo').textContent.trim();
      return lista.find(c => (c.titulo || c.tema) === tit).orden;
    });
    for (const k of orden) { await p.click(`.cruce-fila[data-k="${k}"]`); await p.waitForTimeout(190); }
    await p.waitForTimeout(4200);
    return;
  }
  const i = await p.evaluate(async () => {
    const txt = document.querySelector('.q-card__texto').textContent.trim();
    for (let m = 1; m <= 15; m++) {
      const banco = await (await fetch(`datos/preguntas/mundo-${String(m).padStart(2,'0')}.json`)).json();
      const q = banco.find(x => x.pregunta.trim() === txt);
      if (q) return q.correcta;
    }
    return 0;
  });
  await p.click(`.q-opcion >> nth=${i}`);
  await p.waitForTimeout(600);
};

for (let n = 0; n < 3; n++) {
  await acertar();
  await p.waitForSelector('#seguir', { timeout: 8000 });
  if (n === 2) break;
  await p.click('#seguir');
  await p.waitForTimeout(500);
}
await p.screenshot({ path: `${OUT}/bote-1-escalera.png`, fullPage: true });
console.log('bote tras 3 aciertos:', (await p.locator('.bote-panel__valor').textContent()).trim());
console.log('chip:', (await p.locator('#bote-chip').textContent()).trim());

// ahora falla a propósito
await p.click('#seguir'); await p.waitForTimeout(500);
if (await p.locator('.cruce-fila:not([disabled])').count()) {
  const ks = await p.locator('.cruce-fila:not([disabled])').evaluateAll(n => n.map(x => x.dataset.k));
  for (const k of ks.slice().reverse()) { await p.click(`.cruce-fila[data-k="${k}"]`); await p.waitForTimeout(190); }
  await p.waitForTimeout(4200);
} else {
  const i = await p.evaluate(async () => {
    const txt = document.querySelector('.q-card__texto').textContent.trim();
    for (let m = 1; m <= 15; m++) {
      const banco = await (await fetch(`datos/preguntas/mundo-${String(m).padStart(2,'0')}.json`)).json();
      const q = banco.find(x => x.pregunta.trim() === txt);
      if (q) return (q.correcta + 1) % q.opciones.length;
    }
    return 0;
  });
  await p.click(`.q-opcion >> nth=${i}`);
  await p.waitForTimeout(700);
}
await p.waitForSelector('#cerrar-bote', { timeout: 8000 });
await p.screenshot({ path: `${OUT}/bote-2-perdido.png`, fullPage: true });
await p.click('#cerrar-bote');
await p.waitForTimeout(900);
await p.screenshot({ path: `${OUT}/bote-3-resultado.png`, fullPage: true });
const xp = await p.locator('.hud__chip--xp').textContent();
console.log('XP tras perder el bote (debe ser 0):', xp.trim());
console.log(errores.length ? '❌ ' + errores.join('\n') : '✅ sin errores de consola');
await b.close();
