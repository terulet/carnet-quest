import { abrirChromium } from './_navegador.mjs';

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


const BASE = process.env.CQ_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || '/tmp/cq-shots';
await (await import('node:fs/promises')).mkdir(OUT, { recursive: true });
const errores = [];

const b = await abrirChromium();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const p = await ctx.newPage();
p.on('console', (m) => { if (m.type() === 'error') errores.push('CONSOLE: ' + m.text()); });
p.on('pageerror', (e) => errores.push('PAGEERROR: ' + e.message));

await p.goto(BASE, { waitUntil: 'networkidle' });
await pasarArranque(p);
await p.waitForTimeout(600);

// --- 1. abrir el modo dedicado desde el mapa

await abrirModo(p, 'cruces');
await p.waitForSelector('.cruce-escena svg', { timeout: 5000 });
await p.waitForTimeout(500);
await p.screenshot({ path: `${OUT}/cruce-1-inicio.png` });

// --- 2. leer el puzzle real y responder BIEN
const orden = await p.evaluate(async () => {
  const r = await fetch('datos/cruces.json'); const lista = await r.json();
  const titulo = document.querySelector('.cruce__titulo').textContent.trim();
  const q = lista.find((c) => (c.titulo || c.tema) === titulo);
  return { titulo, orden: q.orden, ks: q.vehiculos.map((v) => v.k) };
});
console.log('puzzle:', orden.titulo, '→', orden.orden.join('-'));

for (const k of orden.orden) {
  await p.click(`.cruce-fila[data-k="${k}"]`);
  await p.waitForTimeout(220);
}
await p.screenshot({ path: `${OUT}/cruce-2-elegido.png` });
await p.waitForTimeout(700);
await p.screenshot({ path: `${OUT}/cruce-3-animando.png` });
await p.waitForSelector('#siguiente', { timeout: 8000 });
await p.waitForTimeout(300);
await p.screenshot({ path: `${OUT}/cruce-4-acierto.png`, fullPage: true });
const okTexto = await p.locator('.cruce__ayuda').textContent();
console.log('veredicto acierto:', okTexto.trim());

// --- 3. siguiente puzzle: responder MAL (orden invertido)
await p.click('#siguiente');
await p.waitForSelector('.cruce-escena svg, .q-card', { timeout: 5000 });
let esCruce = await p.locator('.cruce-escena').count();
let vueltas = 0;
while (!esCruce && vueltas < 8) { // avanza hasta el siguiente cruce
  await p.click('.q-opcion >> nth=0');
  await p.waitForSelector('#siguiente', { timeout: 5000 });
  await p.click('#siguiente');
  await p.waitForTimeout(300);
  esCruce = await p.locator('.cruce-escena').count();
  vueltas++;
}
if (esCruce) {
  const q2 = await p.evaluate(async () => {
    const r = await fetch('datos/cruces.json'); const lista = await r.json();
    const titulo = document.querySelector('.cruce__titulo').textContent.trim();
    return lista.find((c) => (c.titulo || c.tema) === titulo).orden;
  });
  for (const k of q2.slice().reverse()) {
    await p.click(`.cruce-fila[data-k="${k}"]`);
    await p.waitForTimeout(200);
  }
  await p.waitForTimeout(800);
  await p.screenshot({ path: `${OUT}/cruce-5-fallo.png` });
  await p.waitForSelector('#siguiente', { timeout: 9000 });
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${OUT}/cruce-6-fallo-feedback.png`, fullPage: true });
  console.log('veredicto fallo:', (await p.locator('.cruce__ayuda').textContent()).trim());
}

// --- 4. terminar la tanda
for (let i = 0; i < 12; i++) {
  if (await p.locator('#otra').count()) break;
  if (await p.locator('#siguiente').count()) { await p.click('#siguiente'); await p.waitForTimeout(350); continue; }
  if (await p.locator('.cruce-fila:not([disabled])').count()) {
    const ks = await p.locator('.cruce-fila:not([disabled])').evaluateAll((n) => n.map((x) => x.dataset.k));
    for (const k of ks) { await p.click(`.cruce-fila[data-k="${k}"]`); await p.waitForTimeout(180); }
    await p.waitForTimeout(3500); continue;
  }
  if (await p.locator('.q-opcion').count()) { await p.click('.q-opcion >> nth=0'); await p.waitForTimeout(400); continue; }
  await p.waitForTimeout(400);
}
await p.waitForTimeout(500);
await p.screenshot({ path: `${OUT}/cruce-7-resultado.png`, fullPage: true });

// --- 5. una misión normal del Mundo 2 debe traer un cruce incrustado
await p.evaluate(() => new Promise((res) => {
  const req = indexedDB.open('carnet-quest');
  req.onsuccess = () => {
    const db = req.result;
    const tx = db.transaction('jugador', 'readwrite');
    const st = tx.objectStore('jugador');
    const g = st.get('estado');
    g.onsuccess = () => {
      const s = g.result;
      s.mundos['1'] = { estrellas: [3, 3, 3], bossSuperado: true };
      st.put(s, 'estado');
      tx.oncomplete = () => res();
    };
  };
}));
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(700);
await p.screenshot({ path: `${OUT}/cruce-8-mapa.png`, fullPage: true });
await p.evaluate(() => document.querySelector('.nodo[data-mundo="2"]').dispatchEvent(new MouseEvent('click', { bubbles: true })));
await p.waitForTimeout(600);
await p.click('[data-mision="0"]');
await p.waitForTimeout(700);
let visto = false;
for (let i = 0; i < 14 && !visto; i++) {
  if (await p.locator('.cruce-escena').count()) {
    visto = true;
    await p.screenshot({ path: `${OUT}/cruce-9-en-mision.png` });
    break;
  }
  if (await p.locator('.q-opcion').count()) {
    await p.click('.q-opcion >> nth=0');
    await p.waitForSelector('#siguiente', { timeout: 5000 });
    await p.click('#siguiente');
    await p.waitForTimeout(280);
  } else break;
}
console.log(visto ? '✅ cruce incrustado en misión normal' : '⚠️ no apareció cruce dentro de la misión');

console.log(errores.length ? '❌ ERRORES:\n' + errores.join('\n') : '✅ sin errores de consola');
await b.close();
