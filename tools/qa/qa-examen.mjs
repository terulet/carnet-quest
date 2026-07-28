// QA · Plan de examen: la fecha como eje de la app.
//
// Lo que más importa comprobar aquí no es que se pinte bonito, sino las dos
// reglas duras: la fecha NO mueve el Predictor, y ir retrasado no castiga.
import { abrirChromium } from './_navegador.mjs';
const BASE = process.env.CQ_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || '/tmp/cq-shots';
await (await import('node:fs/promises')).mkdir(OUT, { recursive: true });

const fallos = [], errs = [];
const ok = (c, m) => { console.log((c ? '✅' : '❌') + ' ' + m); if (!c) fallos.push(m); };

const b = await abrirChromium();
const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })).newPage();
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));

const A = () => p.locator('.screen.activa');
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
const enDias = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };

/* ---------- 1 · El arranque pregunta la fecha DESPUÉS de jugar ---------- */
await p.goto(BASE, { waitUntil: 'networkidle' });
await p.waitForTimeout(900);
ok(await A().locator('.cruce-escena').count() > 0, 'Lo primero sigue siendo un cruce jugable, no la fecha');
const sk = p.locator('#salir.btn-saltar');
if (await sk.count()) { await sk.click(); await p.waitForTimeout(400); }
const go = p.locator('#ob-go');
if (await go.count()) { await go.click(); await p.waitForTimeout(900); }
ok(await p.locator('#ex-fecha').count() === 1, 'Tras el primer contacto sí se pregunta la fecha');
ok(await p.locator('#ex-luego').count() === 1, 'Y "todavía no lo sé" está a la vista');
await p.screenshot({ path: `${OUT}/ex-1-pedir-fecha.png`, fullPage: true });

// saltarla no debe dejar nada roto ni fecha inventada
await p.click('#ex-luego'); await p.waitForTimeout(800);
let s = await leerEstado();
ok(s.examen && s.examen.fecha === null, 'Saltarla no inventa una fecha');
ok(await A().locator('.mapa-svg').count() > 0, 'Y se llega al mapa igual');
ok(await A().locator('#banda-fecha').count() === 1, 'El mapa ofrece ponerla más tarde, sin insistir');
await p.screenshot({ path: `${OUT}/ex-2-mapa-sin-fecha.png`, fullPage: true });

/* ---------- 2 · Poner fecha cambia la cabecera ---------- */
await A().locator('#banda-fecha').click(); await p.waitForTimeout(600);
await p.fill('#ex-fecha', enDias(11));
await p.click('#ex-ok'); await p.waitForTimeout(1400);
s = await leerEstado();
ok(s.examen.fecha === enDias(11), `La fecha queda guardada (${s.examen.fecha})`);
const cuenta = await A().locator('.banda-examen__cuenta').textContent();
ok(/11/.test(cuenta), `La cabecera dice los días que faltan ("${cuenta.trim()}")`);
const toca = await A().locator('.banda-examen__toca').textContent();
ok(toca.trim().length > 0, `Y qué toca hoy ("${toca.trim().slice(0, 60)}")`);
await p.screenshot({ path: `${OUT}/ex-3-mapa-con-fecha.png`, fullPage: true });

/* ---------- 3 · La fecha NO mueve el Predictor ---------- */
// se siembran respuestas reales para que el Predictor tenga datos
await escribirEstado(`
  s.respuestas = Array.from({length: 80}, (_, i) => ({ id: 'M01-' + i, ok: i % 4 !== 0, ts: i }));
  s.vistas = Object.fromEntries(Array.from({length: 300}, (_, i) => ['q' + i, 1]));
  s.simulacros = [{ fecha: '2026-07-01', fallos: 2, apto: true, segundos: 900 }];
`);
await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(1000);
const leerPredictor = () => p.evaluate(async () => {
  const m = await import('/js/predictor.js');
  return m.calcularPredictor(856);
});
const conFecha = await leerPredictor();
await escribirEstado(`s.examen.fecha = '${enDias(1)}';`);   // examen mañana
await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(900);
const inminente = await leerPredictor();
await escribirEstado(`s.examen.fecha = null;`);
await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(900);
const sinFecha = await leerPredictor();
ok(conFecha.pct === inminente.pct && conFecha.pct === sinFecha.pct,
   `El Predictor no se mueve con la fecha (${conFecha.pct} / ${inminente.pct} / ${sinFecha.pct} %)`);

/* ---------- 4 · Ritmo imposible: se dice, no se disimula ---------- */
await escribirEstado(`
  s.examen = { fecha: '${enDias(2)}', fijadaEn: '${enDias(0)}', avisado: false, resultado: null };
  s.vistas = {};
`);
await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
const aviso = await A().locator('.banda-examen__aviso').count();
ok(aviso === 1, 'Con 856 preguntas en 2 días, el juego avisa de que no es realista');
if (aviso) {
  const txt = (await A().locator('.banda-examen__aviso').textContent()).trim();
  console.log('   aviso:', txt.slice(0, 110));
  ok(!/racha|perder|fallas|vago/i.test(txt), 'Y lo dice sin culpar al jugador');
}
await p.screenshot({ path: `${OUT}/ex-4-ritmo-imposible.png`, fullPage: true });

/* ---------- 5 · Ir retrasado no quita nada ---------- */
const antesDeTodo = await leerEstado();
await p.evaluate(() => document.querySelector('.nodo[data-mundo="1"]').dispatchEvent(new MouseEvent('click', { bubbles: true })));
await p.waitForTimeout(700);
ok(await A().locator('[data-mision="0"]').count() > 0, 'Con la fecha encima, el mapa NO bloquea nada');
await A().locator('#volver').click();
await p.waitForTimeout(700);
const despues = await leerEstado();
ok(despues.xp === antesDeTodo.xp && despues.chapas === antesDeTodo.chapas,
   'Tener la fecha encima no resta XP ni chapas');
ok(despues.racha.dias === antesDeTodo.racha.dias, 'Ni toca la racha');

/* ---------- 6 · La fecha pasó: se pregunta qué tal, una sola vez ---------- */
await escribirEstado(`s.examen = { fecha: '${enDias(-2)}', fijadaEn: '${enDias(-20)}', avisado: false, resultado: null };`);
await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(2200);
ok(await p.locator('#ex-apto').count() === 1, 'Pasada la fecha, pregunta qué tal fue');
await p.screenshot({ path: `${OUT}/ex-5-que-tal.png`, fullPage: true });
const xpAntes = (await leerEstado()).xp;
await p.click('#ex-apto'); await p.waitForTimeout(2600);
s = await leerEstado();
ok(s.examen.resultado === 'apto', 'Se anota el resultado');
ok(s.xp === xpAntes, 'Contar que aprobaste NO da XP: es información, no puntuación');
await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(2000);
ok(await p.locator('#ex-apto').count() === 0, 'Y no se vuelve a preguntar');

/* ---------- 7 · Quitar la fecha ---------- */
await escribirEstado(`s.examen = { fecha: '${enDias(9)}', fijadaEn: '${enDias(0)}', avisado: false, resultado: null };`);
await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(1100);
await A().locator('#banda-fecha').click(); await p.waitForTimeout(600);
ok(await p.locator('#ex-quitar').count() === 1, 'Con fecha puesta se puede quitar');
const estadoAntes = await leerEstado();
await p.click('#ex-quitar'); await p.waitForTimeout(1000);
s = await leerEstado();
ok(s.examen.fecha === null, 'Quitarla la quita');
ok(s.xp === estadoAntes.xp && Object.keys(s.srs).length === Object.keys(estadoAntes.srs).length,
   'Y no toca ni el progreso ni el Leitner');

/* ---------- 8 · Perfil ---------- */
await p.click('[data-ir="perfil"]'); await p.waitForTimeout(900);
ok(await A().locator('#ajuste-fecha').count() === 1, 'Perfil deja poner o cambiar la fecha');

console.log('\n' + (errs.length ? '❌ ' + errs.join('\n') : '✅ sin errores de consola'));
console.log(fallos.length ? `❌ ${fallos.length} comprobaciones fallidas` : '✅ todas las comprobaciones pasan');
await b.close();
process.exit(fallos.length || errs.length ? 1 : 0);
