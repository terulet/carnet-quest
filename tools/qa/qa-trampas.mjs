// QA · Familias de trampa: radiografía y Caza-trampas.
//
// La regla dura aquí: Caza-trampas entrena a leer exámenes, no normativa, así
// que NO puede tocar el Predictor ni el Leitner ni dar XP.
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

await p.goto(BASE, { waitUntil: 'networkidle' }); await p.waitForTimeout(900);
const sk = p.locator('#salir.btn-saltar'); if (await sk.count()) { await sk.click(); await p.waitForTimeout(400); }
const go = p.locator('#ob-go'); if (await go.count()) { await go.click(); await p.waitForTimeout(800); }
const noFecha = p.locator('#ex-luego');
if (await noFecha.count()) { await noFecha.click(); await p.waitForTimeout(500); }

/* ---------- 1 · Caza-trampas nace cerrado ---------- */
ok(await A().locator('#caza-card.card-juego--cerrada').count() === 1,
   'Sin fallos que analizar, Caza-trampas está cerrado y lo dice');

/* ---------- 2 · Con fallos reales, se abre ---------- */
// se siembran fallos de una MISMA familia para que haya patrón que detectar
const conFamilia = await p.evaluate(async () => {
  const doc = await (await fetch('datos/trampas.json')).json();
  const fam = doc.entradas[0].familia;
  return { fam, ids: doc.entradas.filter(e => e.familia === fam).slice(0, 14).map(e => e.questionId),
           nombre: doc.familias[fam].nombre, total: doc.total, clasificadas: doc.clasificadas };
});
console.log(`   familia sembrada: ${conFamilia.nombre} (${conFamilia.ids.length} fallos)`);
ok(conFamilia.clasificadas / conFamilia.total >= 0.6,
   `El manifiesto cubre el ${Math.round(100 * conFamilia.clasificadas / conFamilia.total)} % del banco`);
await escribirEstado(`
  s.compras.pase = true;
  s.respuestas = ${JSON.stringify(conFamilia.ids)}.map((id, i) => ({ id, ok: false, ts: i }));
  s.taller = Object.fromEntries(${JSON.stringify(conFamilia.ids.slice(0, 4))}.map(id => [id, { fallos: 2 }]));
`);
await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(1200);
ok(await A().locator('#caza-card:not(.card-juego--cerrada)').count() === 1, 'Con fallos, Caza-trampas se abre');

/* ---------- 3 · La radiografía señala el patrón ---------- */
await p.click('[data-ir="perfil"]'); await p.waitForTimeout(1600);
const hayTalon = await A().locator('.talon').count();
ok(hayTalon === 1, 'La radiografía señala un talón de Aquiles');
if (hayTalon) {
  const frase = (await A().locator('.talon__frase').textContent()).trim();
  console.log('   talón:', frase);
  ok(frase.includes(conFamilia.nombre), 'Y nombra la familia correcta');
  ok(/%/.test(frase), 'Con su porcentaje');
  const consejo = (await A().locator('.talon__consejo').textContent()).trim();
  ok(consejo.length > 40, 'Y da un consejo aprovechable, no solo el diagnóstico');
}
const filas = await A().locator('.reparto__fila').count();
ok(filas >= 1, `El reparto de fallos se pinta (${filas} familias)`);
const nota = await A().locator('#zona-radiografia .legal').textContent();
ok(/no entra|inventar/i.test(nota), 'Y dice que las preguntas sin familia NO entran en el cálculo');
ok(nota.includes(String(conFamilia.clasificadas)) && nota.includes(String(conFamilia.total)),
   `La nota da la cobertura REAL del manifiesto, no los fallos del jugador ("${nota.trim().slice(0, 70)}…")`);
await p.screenshot({ path: `${OUT}/tr-1-radiografia.png`, fullPage: true });

/* ---------- 4 · Reparto plano: no se inventa un patrón ---------- */
const unaDeCada = await p.evaluate(async () => {
  const doc = await (await fetch('datos/trampas.json')).json();
  const vistas = new Set(); const out = [];
  for (const e of doc.entradas) { if (vistas.has(e.familia)) continue; vistas.add(e.familia); out.push(e.questionId); }
  return out;
});
await escribirEstado(`
  s.taller = {};
  s.respuestas = ${JSON.stringify(unaDeCada)}.map((id, i) => ({ id, ok: false, ts: i }));
`);
await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(1000);
await p.click('[data-ir="perfil"]'); await p.waitForTimeout(1600);
ok(await A().locator('.talon').count() === 0, 'Con los fallos repartidos NO se inventa un talón de Aquiles');
ok(await A().locator('.reparto__fila').count() > 0, 'Pero el reparto sí se enseña');
await p.screenshot({ path: `${OUT}/tr-2-sin-talon.png`, fullPage: true });

/* ---------- 5 · Caza-trampas: jugarlo ---------- */
await p.click('[data-ir="mapa"]'); await p.waitForTimeout(900);
const antes = await leerEstado();
await A().locator('#caza-card').scrollIntoViewIfNeeded();
await A().locator('#caza-card').click();
await p.waitForTimeout(1600);
ok(await A().locator('.caza-correcta').count() === 1, 'Caza-trampas enseña la respuesta correcta ya marcada');
const ops = await A().locator('.caza-familia').count();
ok(ops === 3, `Y tres familias entre las que elegir (${ops})`);
await p.screenshot({ path: `${OUT}/tr-3-caza.png`, fullPage: true });

await A().locator('.caza-familia').first().click();
await p.waitForTimeout(800);
ok(await A().locator('.caza-familia--ok').count() === 1, 'Marca cuál era la buena');
const cajas = await A().locator('#feedback .feedback__caja').count();
ok(cajas === 2, 'Y revela la trampa escrita a mano más el consejo de la familia');
await p.screenshot({ path: `${OUT}/tr-4-caza-feedback.png`, fullPage: true });

/* ---------- 6 · No toca el progreso ---------- */
for (let i = 0; i < 10; i++) {
  if (await A().locator('.resultado').count()) break;
  const sig = A().locator('#caza-sig:visible');
  if (await sig.count()) { await sig.click(); await p.waitForTimeout(500); continue; }
  const fam = A().locator('.caza-familia:not([disabled])');
  if (await fam.count()) { await fam.first().click(); await p.waitForTimeout(600); }
  else await p.waitForTimeout(300);
}
const despues = await leerEstado();
ok(despues.xp === antes.xp, 'Caza-trampas NO da XP');
ok(despues.respuestas.length === antes.respuestas.length, 'NO toca el historial que alimenta el Predictor');
ok(JSON.stringify(despues.srs) === JSON.stringify(antes.srs), 'NO toca el Leitner');
ok(JSON.stringify(despues.taller) === JSON.stringify(antes.taller), 'NO repara averías del Taller');

console.log('\n' + (errs.length ? '❌ ' + errs.join('\n') : '✅ sin errores de consola'));
console.log(fallos.length ? `❌ ${fallos.length} comprobaciones fallidas` : '✅ todas las comprobaciones pasan');
await b.close();
process.exit(fallos.length || errs.length ? 1 : 0);
