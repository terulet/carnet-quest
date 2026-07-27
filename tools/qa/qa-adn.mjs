// QA Retención V1 · bloques 3-6: ADN de mundos, contratos, confianza,
// Regla contra Trampa, retos por enlace y modo de prueba.
//
// OJO: las pantallas viejas siguen en el DOM (solo se les quita .activa), así
// que TODOS los selectores de pantalla van dentro de `.screen.activa`. Los
// modales sí van sueltos: cuelgan de <body>.
import { abrirChromium } from './_navegador.mjs';
const BASE = process.env.CQ_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || '/tmp/cq-shots';
await (await import('node:fs/promises')).mkdir(OUT, { recursive: true });
const errs = [];
const fallos = [];
const ok = (cond, msg) => { console.log((cond ? '✅' : '❌') + ' ' + msg); if (!cond) fallos.push(msg); };

const b = await abrirChromium();
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
const B = BASE;

const A = () => p.locator('.screen.activa');
const hay = async (sel) => (await A().locator(sel).count()) > 0;

const leerEstado = () => p.evaluate(() => new Promise(r => {
  const q = indexedDB.open('carnet-quest');
  q.onsuccess = () => { const g = q.result.transaction('jugador').objectStore('jugador').get('estado');
    g.onsuccess = () => r(g.result); };
}));
const escribirEstado = (src) => p.evaluate((code) => new Promise(r => {
  const mut = new Function('s', code);
  const q = indexedDB.open('carnet-quest');
  q.onsuccess = () => { const tx = q.result.transaction('jugador', 'readwrite');
    const st = tx.objectStore('jugador'); const g = st.get('estado');
    g.onsuccess = () => { const s = g.result; mut(s); st.put(s, 'estado'); tx.oncomplete = () => r(); }; };
}), src);

const pasarArranque = async () => {
  const sk = p.locator('#salir.btn-saltar');
  if (await sk.count()) { await sk.click(); await p.waitForTimeout(400); }
  const go = p.locator('#ob-go'); if (await go.count()) { await go.click(); await p.waitForTimeout(800); }
};
const irAlMapa = async () => {
  const btn = A().locator('#mapa-btn');
  await btn.waitFor({ state: 'visible', timeout: 25000 });
  await btn.click();
  await p.waitForTimeout(700);
};
const irAMundo = async (n) => {
  await p.evaluate((nn) => document.querySelector(`.nodo[data-mundo="${nn}"]`).dispatchEvent(new MouseEvent('click', { bubbles: true })), n);
  await p.waitForTimeout(700);
};

/** Avanza por la sesión activa. Devuelve qué formatos ha visto. */
async function jugarSesion(maxPasos = 40) {
  const visto = { confianza: 0, rt: 0, correccion: 0, cruces: 0, normales: 0 };
  for (let i = 0; i < maxPasos; i++) {
    if (await hay('.resultado')) break;
    if (await hay('.confianza__botones')) {
      visto.confianza++;
      await A().locator(i % 2 ? '#conf-no' : '#conf-si').click();
      await p.waitForTimeout(450);
    } else if (await hay('.rt-carta:not([disabled])')) {
      visto.rt++;
      await A().locator('.rt-carta:not([disabled])').first().click();
      await p.waitForTimeout(450);
    } else if (await hay('.cruce-fila:not([disabled])')) {
      visto.cruces++;
      const ks = await A().locator('.cruce-fila:not([disabled])').evaluateAll(n => n.map(x => x.dataset.k));
      for (const k of ks) { await A().locator(`.cruce-fila[data-k="${k}"]`).click(); await p.waitForTimeout(150); }
      await p.waitForTimeout(3800);
    } else if (await hay('.q-opcion:not([disabled])')) {
      if (await hay('.q-card--correccion')) visto.correccion++; else visto.normales++;
      await A().locator('.q-opcion:not([disabled])').first().click();
      await p.waitForTimeout(450);
    }
    const rt = A().locator('#rt-seguir:visible');
    if (await rt.count()) { await rt.click(); await p.waitForTimeout(320); continue; }
    const sig = A().locator('#siguiente:visible');
    if (await sig.count()) { await sig.click(); await p.waitForTimeout(320); }
    else await p.waitForTimeout(240);
  }
  return visto;
}

await p.goto(B, { waitUntil: 'networkidle' });
await pasarArranque();

// Estado de laboratorio: Pase activo, bosses superados, modo de prueba encendido.
await escribirEstado(`
  s.compras.pase = true;
  for (let n = 1; n <= 14; n++) { s.mundos[String(n)] = s.mundos[String(n)] || { estrellas: [], bossSuperado: false }; s.mundos[String(n)].bossSuperado = true; }
  s.pruebas.activo = true;
`);
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(900);

/* ---------- 1 · Franja de ADN ---------- */
await irAMundo(1);
ok(!(await hay('.adn-franja')), 'Mundo 1 (tutorial) no muestra franja de ADN');
await A().locator('#volver').click(); await p.waitForTimeout(600);

await irAMundo(3);
const chips3 = await A().locator('.adn-chip').allTextContents();
ok(await A().locator('.adn-lema').count() === 1, 'Mundo 3 anuncia su lema de ADN');
ok(chips3.some(c => /seguro/i.test(c)), `Mundo 3 declara el chequeo de confianza (${chips3.join(' / ')})`);
await p.screenshot({ path: `${OUT}/adn-1-mundo3.png`, fullPage: true });

/* ---------- 2 · Chequeo de confianza ---------- */
await A().locator('[data-mision="0"]').click(); await p.waitForTimeout(800);
if (await p.locator('#c-no').count()) { await p.click('#c-no'); await p.waitForTimeout(600); }
const v3 = await jugarSesion();
ok(v3.confianza >= 1, `Aparece "¿Vas seguro?" en el Mundo 3 (${v3.confianza} veces)`);
await p.screenshot({ path: `${OUT}/adn-2-resultado-m3.png`, fullPage: true });
await irAlMapa();

/* ---------- 3 · Regla contra Trampa ---------- */
await irAMundo(4);
const chips4 = await A().locator('.adn-chip').allTextContents();
ok(chips4.some(c => /Regla contra Trampa/i.test(c)), `Mundo 4 declara Regla contra Trampa (${chips4.join(' / ')})`);
await A().locator('[data-mision="0"]').click(); await p.waitForTimeout(900);
let capturada = false;
for (let i = 0; i < 40 && !capturada; i++) {
  if (await hay('.resultado')) break;
  if (await hay('.rt-carta:not([disabled])')) {
    capturada = true;
    await p.screenshot({ path: `${OUT}/adn-3-regla-trampa.png`, fullPage: true });
    ok(await A().locator('.rt-carta').count() === 2, 'La tarjeta doble ofrece exactamente dos opciones');
    const nAntes = (await leerEstado()).respuestas.length;
    await A().locator('.rt-carta:not([disabled])').first().click();
    await p.waitForTimeout(600);
    const despues = await leerEstado();
    ok(despues.respuestas.length === nAntes + 1, 'El primer intento de Regla contra Trampa cuenta como respuesta real');
    const ultima = despues.respuestas[despues.respuestas.length - 1];
    await A().locator('#rt-seguir:visible').click(); await p.waitForTimeout(600);
    ok(await A().locator('.q-card--correccion').count() === 1, 'Tras la tarjeta doble llega la corrección guiada de 4 opciones');
    await p.screenshot({ path: `${OUT}/adn-4-correccion.png`, fullPage: true });
    await A().locator('.q-opcion:not([disabled])').first().click(); await p.waitForTimeout(600);
    const tras = await leerEstado();
    ok(tras.respuestas.length === nAntes + 1, 'La corrección guiada NO registra una segunda respuesta');
    ok(tras.respuestas[tras.respuestas.length - 1].ok === ultima.ok, 'La corrección guiada NO reescribe el resultado del primer intento');
    await A().locator('#siguiente:visible').click(); await p.waitForTimeout(500);
    break;
  }
  if (await hay('.confianza__botones')) { await A().locator('#conf-si').click(); await p.waitForTimeout(450); }
  else if (await hay('.q-opcion:not([disabled])')) { await A().locator('.q-opcion:not([disabled])').first().click(); await p.waitForTimeout(450); }
  const sig = A().locator('#siguiente:visible');
  if (await sig.count()) { await sig.click(); await p.waitForTimeout(320); } else await p.waitForTimeout(240);
}
ok(capturada, 'El Mundo 4 llega a jugar al menos una Regla contra Trampa');
await jugarSesion();
await irAlMapa();

/* ---------- 4 · Contrato de ruta ---------- */
let vioContrato = false;
for (let intento = 0; intento < 4 && !vioContrato; intento++) {
  await irAMundo(5);
  await A().locator('[data-mision="0"]').click(); await p.waitForTimeout(900);
  if (await p.locator('#c-si').count()) {
    vioContrato = true;
    await p.screenshot({ path: `${OUT}/adn-5-contrato.png`, fullPage: true });
    ok((await p.locator('.contrato-premio').textContent()).includes('25'), 'El contrato dice el premio exacto (25 🔩)');
    ok((await p.locator('.contrato-nota').textContent()).includes('No pierdes'), 'El contrato deja claro que no se pierde nada');
    ok(await p.locator('#c-no').count() === 1, 'La ruta normal sigue estando a un toque');
    const chapasAntes = (await leerEstado()).chapas;
    await p.click('#c-si'); await p.waitForTimeout(700);
    await jugarSesion();
    const cierre = await A().locator('.contrato-cierre').count();
    ok(cierre === 1, 'El resultado informa del contrato');
    if (cierre) console.log('   cierre del contrato:', (await A().locator('.contrato-cierre').textContent()).trim());
    const st = await leerEstado();
    ok(st.chapas >= chapasAntes, 'Fallar el contrato nunca resta Chapas');
    ok((st.contratos.completados + st.contratos.fallados) >= 1, 'El contrato queda contabilizado en el estado');
    await p.screenshot({ path: `${OUT}/adn-6-cierre-contrato.png`, fullPage: true });
    await irAlMapa();
  } else {
    await jugarSesion();
    await irAlMapa();
  }
}
ok(vioContrato, 'El Mundo 5 llega a ofrecer contrato de ruta');

/* ---------- 5 · Retos por enlace ---------- */
await p.goto(B, { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
ok(await A().locator('#reto-card').count() === 1, 'El mapa ofrece crear un reto');
await A().locator('#reto-card').click(); await p.waitForTimeout(1100);
ok(await A().locator('#reto-go').count() === 1, 'La pantalla de reto se pinta');
const enlace = await p.evaluate(async () => {
  const m = await import('/js/retencion/reto.js');
  return m.urlReto('mix5', 424242, location.origin + '/');
});
console.log('   enlace de ejemplo:', enlace);
ok(!/nombre|name|xp|score|progres|user|id=/i.test(enlace), 'El enlace no lleva ningún dato personal ni de progreso');
const estAntes = await leerEstado();
await A().locator('#reto-go').click(); await p.waitForTimeout(900);
await jugarSesion();
ok(await A().locator('#r-share').count() === 1, 'El resultado del reto ofrece revancha');
await p.screenshot({ path: `${OUT}/adn-7-reto.png`, fullPage: true });
const estDespues = await leerEstado();
ok(estDespues.respuestas.length === estAntes.respuestas.length, 'Un reto NO toca el historial que alimenta el Predictor');
ok(estDespues.xp === estAntes.xp, 'Un reto NO da XP');

// mismo enlace → mismo recorrido
const recorrido = async (url) => {
  await p.goto(url, { waitUntil: 'networkidle' }); await p.waitForTimeout(1100);
  await A().locator('#reto-go').click(); await p.waitForTimeout(800);
  const out = [];
  for (let i = 0; i < 14; i++) {
    if (await hay('.resultado')) break;
    const q = A().locator('.q-card__texto');
    if (await q.count()) out.push((await q.first().textContent()).trim().slice(0, 45));
    if (await hay('.q-opcion:not([disabled])')) { await A().locator('.q-opcion:not([disabled])').first().click(); await p.waitForTimeout(450); }
    const sig = A().locator('#siguiente:visible');
    if (await sig.count()) { await sig.click(); await p.waitForTimeout(320); } else await p.waitForTimeout(240);
  }
  return out;
};
const url1 = B + '#/reto?v=1&mode=mix5&seed=424242';
const a1 = await recorrido(url1);
const a2 = await recorrido(url1);
ok(a1.length > 0 && JSON.stringify(a1) === JSON.stringify(a2), `Misma semilla → mismo recorrido (${a1.length} preguntas)`);
const a3 = await recorrido(B + '#/reto?v=1&mode=mix5&seed=999999');
ok(JSON.stringify(a1) !== JSON.stringify(a3), 'Otra semilla → otro recorrido');

// enlace inválido
await p.goto(B + '#/reto?v=99&mode=raro&seed=-1', { waitUntil: 'networkidle' });
await p.waitForTimeout(1300);
ok(await A().locator('.mapa-svg').count() > 0, 'Un enlace de reto inválido acaba en el mapa, sin romper nada');
const toastTxt = await p.locator('.toast').count() ? (await p.locator('.toast').first().textContent()).trim() : '';
ok(/no es válido|más nueva/i.test(toastTxt), `Y lo dice con claridad ("${toastTxt}")`);

/* ---------- 6 · Modo de prueba ---------- */
await p.goto(B, { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
await p.click('[data-ir="perfil"]'); await p.waitForTimeout(900);
ok(await A().locator('#tg-pruebas').count() === 1, 'Perfil ofrece el Modo de prueba');
ok(await A().locator('#pruebas-exportar').count() === 1, 'Con el modo activo aparece exportar');
await p.screenshot({ path: `${OUT}/adn-8-pruebas.png`, fullPage: true });
const eventos = await p.evaluate(() => JSON.parse(localStorage.getItem('cq-pruebas') || '{"eventos":[]}').eventos);
console.log('   eventos registrados:', eventos.length);
console.log('   tipos:', [...new Set(eventos.map(e => e.eventType))].join(', '));
const sucio = eventos.filter(e => /"(nombre|email|telefono|texto|pregunta|respuesta|ua|userAgent|ip|device)"/i.test(JSON.stringify(e)));
ok(sucio.length === 0, 'Ni un evento guarda campos prohibidos');
const largos = eventos.filter(e => e.metadata && Object.values(e.metadata).some(v => typeof v === 'string' && v.length > 40));
ok(largos.length === 0, 'Ningún metadato guarda frases largas');
ok(eventos.some(e => e.eventType === 'challenge_started'), 'La caja negra registró el reto');
ok(eventos.some(e => e.eventType === 'ruletrap_first_attempt'), 'La caja negra registró el primer intento de Regla contra Trampa');
ok(eventos.some(e => e.eventType === 'contract_offered'), 'La caja negra registró la oferta de contrato');
const xpAntes = (await leerEstado()).xp;
await A().locator('#pruebas-borrar').click(); await p.waitForTimeout(500);
await p.click('#p-si'); await p.waitForTimeout(700);
ok((await p.evaluate(() => JSON.parse(localStorage.getItem('cq-pruebas') || '{"eventos":[]}').eventos.length)) === 0, 'Borrar datos de prueba los borra');
ok((await leerEstado()).xp === xpAntes, 'Borrar datos de prueba NO toca el progreso');

console.log('\n' + (errs.length ? '❌ ' + errs.join('\n') : '✅ sin errores de consola'));
console.log(fallos.length ? `❌ ${fallos.length} comprobaciones fallidas` : '✅ todas las comprobaciones pasan');
await b.close();
process.exit(fallos.length || errs.length ? 1 : 0);
