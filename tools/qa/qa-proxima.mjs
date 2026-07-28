import { abrirChromium } from './_navegador.mjs';
const BASE = process.env.CQ_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || '/tmp/cq-shots';
await (await import('node:fs/promises')).mkdir(OUT, { recursive: true });
const errs = [];
const b = await abrirChromium();
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
const B = BASE;

const idb = (pg, fn) => pg.evaluate(fn);
const leerEstado = (pg) => pg.evaluate(() => new Promise(r => {
  const q = indexedDB.open('carnet-quest');
  q.onsuccess = () => { const g = q.result.transaction('jugador').objectStore('jugador').get('estado');
    g.onsuccess = () => r(g.result); };
}));

await p.goto(B, { waitUntil: 'networkidle' });
const sk = p.locator('#salir.btn-saltar');
if (await sk.count()) { await sk.click(); await p.waitForTimeout(300); }
const go = p.locator('#ob-go'); if (await go.count()) { await go.click(); await p.waitForTimeout(600); }
  // tras el onboarding se ofrece poner fecha de examen: la prueba la salta
  const noFecha = p.locator('#ex-luego');
  if (await noFecha.count()) { await noFecha.click(); await p.waitForTimeout(500); }

// --- los modos deben estar CERRADOS de inicio (menos cruces)
const cerradas = await p.locator('.card-juego--cerrada').count();
console.log('modos cerrados al empezar (esperado 3):', cerradas);
console.log('condición visible:', (await p.locator('[data-modo="rush"] .texto-suave').textContent()).trim());
await p.screenshot({ path: `${OUT}/ret-1-mapa-cerrado.png`, fullPage: true });

// --- jugar una misión entera del Mundo 1
await p.evaluate(() => document.querySelector('.nodo[data-mundo="1"]').dispatchEvent(new MouseEvent('click', {bubbles:true})));
await p.waitForTimeout(500);
await p.click('[data-mision="0"]');
await p.waitForTimeout(600);
for (let i = 0; i < 16; i++) {
  if (await p.locator('#zona-proxima').count()) break;
  if (await p.locator('.cruce-fila:not([disabled])').count()) {
    const ks = await p.locator('.cruce-fila:not([disabled])').evaluateAll(n => n.map(x => x.dataset.k));
    for (const k of ks) { await p.click(`.cruce-fila[data-k="${k}"]`); await p.waitForTimeout(160); }
    await p.waitForTimeout(3800);
  } else if (await p.locator('.q-opcion:not([disabled])').count()) {
    await p.click('.q-opcion:not([disabled]) >> nth=0'); await p.waitForTimeout(500);
  }
  const sg = p.locator('#siguiente:visible');
  if (await sg.count()) { await sg.click(); await p.waitForTimeout(350); }
  else await p.waitForTimeout(300);
}
await p.waitForSelector('.proxima-card', { timeout: 12000 });
await p.waitForTimeout(400);
await p.screenshot({ path: `${OUT}/ret-2-tarjeta-proxima.png`, fullPage: true });
console.log('tarjeta de próxima parada:', (await p.locator('.proxima-card__desglose').textContent()).trim(),
            '·', (await p.locator('.proxima-card__min').textContent()).trim());

let st = await leerEstado(p);
console.log('parada guardada en estado:', !!st.proxima, '· status:', st.proxima?.status,
            '· frío:', st.proxima?.coldCheckQuestionIds?.length, '· ruta:', st.proxima?.routeQuestionIds?.length,
            '· cruce:', st.proxima?.puzzleId || 'sin cruce (fallback)');
console.log('esquema migrado a v:', st.schemaVersion);

// --- guardar para mañana → debe ofrecer calendario
await p.click('#np-guardar'); await p.waitForTimeout(400);
console.log('ofrece hora de calendario:', await p.locator('#np-hora').count() > 0,
            '· y "sin recordatorio":', await p.locator('#np-nada').count() > 0);
await p.screenshot({ path: `${OUT}/ret-3-calendario.png`, fullPage: true });
await p.click('#np-nada'); await p.waitForTimeout(300);

// --- en el mapa, el MISMO día debe decir "preparada para mañana" y no penalizar
await p.click('#mapa-btn'); await p.waitForTimeout(700);
console.log('mapa mismo día:', (await p.locator('#proxima-card b').textContent()).trim());
console.log('  ¿marcada como lista?', await p.locator('.card-juego--lista').count() > 0, '(debe ser false)');

// --- viajamos a mañana: readyLocalDate a ayer
await p.evaluate(() => new Promise(r => {
  const q = indexedDB.open('carnet-quest');
  q.onsuccess = () => { const db = q.result; const tx = db.transaction('jugador','readwrite');
    const st = tx.objectStore('jugador'); const g = st.get('estado');
    g.onsuccess = () => { const s = g.result;
      s.proxima.readyLocalDate = '2000-01-01';
      st.put(s,'estado'); tx.oncomplete = () => r(); }; };
}));
await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(800);
console.log('mapa al día siguiente:', (await p.locator('#proxima-card b').textContent()).trim());
console.log('  ¿marcada como lista?', await p.locator('.card-juego--lista').count() > 0, '(debe ser true)');
await p.screenshot({ path: `${OUT}/ret-4-mapa-lista.png`, fullPage: true });

// --- jugarla: debe empezar por el arranque en frío
await p.click('#proxima-card'); await p.waitForTimeout(800);
console.log('rótulo de fase:', (await p.locator('.fase-rotulo b').textContent()).trim());
await p.screenshot({ path: `${OUT}/ret-5-arranque-frio.png`, fullPage: true });
for (let i = 0; i < 16; i++) {
  if (await p.locator('.resultado').count()) break;
  if (await p.locator('.cruce-fila:not([disabled])').count()) {
    const ks = await p.locator('.cruce-fila:not([disabled])').evaluateAll(n => n.map(x => x.dataset.k));
    for (const k of ks) { await p.click(`.cruce-fila[data-k="${k}"]`); await p.waitForTimeout(160); }
    await p.waitForTimeout(3800);
  } else if (await p.locator('.q-opcion:not([disabled])').count()) {
    await p.click('.q-opcion:not([disabled]) >> nth=0'); await p.waitForTimeout(450);
  }
  const sig = p.locator('#siguiente:visible');
  if (await sig.count()) { await sig.click(); await p.waitForTimeout(320); }
  else await p.waitForTimeout(250);
}
await p.waitForTimeout(1200);
await p.screenshot({ path: `${OUT}/ret-6-parada-hecha.png`, fullPage: true });
st = await leerEstado(p);
console.log('parada tras completarla · status:', st.proxima?.status, '(debe ser completada)');

// --- deep link a una parada ya hecha: no debe romper nada
await p.goto(B + '#/next-run', { waitUntil: 'networkidle' });
await p.waitForTimeout(900);
console.log('deep link con parada ya hecha → acaba en el mapa:', await p.locator('.mapa-svg').count() > 0);

console.log(errs.length ? '❌ ' + errs.join('\n') : '✅ sin errores de consola');
await b.close();
