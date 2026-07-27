// QA Retención V1 · escenarios 10, 12, 13 y 14 del plan de pruebas:
// migrar progreso antiguo, segundo plano y vuelta, datos locales dañados e
// importar un progreso anterior a esta versión.
//
// Todo en navegador real: las unitarias ya prueban `migrar()` en frío, pero lo
// que importa aquí es que la app ARRANCA y se puede jugar con esos datos.
import { abrirChromium } from './_navegador.mjs';
const BASE = process.env.CQ_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || '/tmp/cq-shots';
await (await import('node:fs/promises')).mkdir(OUT, { recursive: true });

const fallos = [];
const errs = [];
const ok = (c, m) => { console.log((c ? '✅' : '❌') + ' ' + m); if (!c) fallos.push(m); };

const b = await abrirChromium();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();
p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));

const A = () => p.locator('.screen.activa');
const leerEstado = () => p.evaluate(() => new Promise(r => {
  const q = indexedDB.open('carnet-quest');
  q.onsuccess = () => { const g = q.result.transaction('jugador').objectStore('jugador').get('estado');
    g.onsuccess = () => r(g.result); };
}));
/** Mete un estado crudo en IndexedDB, como si viniera de una versión vieja. */
const sembrar = (obj) => p.evaluate((raw) => new Promise(r => {
  const q = indexedDB.open('carnet-quest');
  q.onsuccess = () => { const tx = q.result.transaction('jugador', 'readwrite');
    tx.objectStore('jugador').put(JSON.parse(raw), 'estado');
    tx.oncomplete = () => r(); };
}), JSON.stringify(obj));

const arrancar = async () => {
  await p.goto(BASE, { waitUntil: 'networkidle' });
  await p.waitForTimeout(900);
  const sk = p.locator('#salir.btn-saltar');
  if (await sk.count()) { await sk.click(); await p.waitForTimeout(400); }
  const go = p.locator('#ob-go'); if (await go.count()) { await go.click(); await p.waitForTimeout(700); }
};

await arrancar();

/* ===== 10 · Migrar progreso antiguo (v1 de verdad, sin schemaVersion) ===== */
// un veterano: Pase comprado, dos bosses, 14 señales, un simulacro, chapas
await sembrar({
  creado: '2026-05-01', onboarded: true, xp: 1240, chapas: 310,
  racha: { dias: 9, ultimoDia: '2026-07-20', protectores: 1 },
  mundos: { 1: { estrellas: [3, 3, 2], bossSuperado: true }, 2: { estrellas: [3], bossSuperado: true } },
  srs: { 'M01-001': { caja: 4, vence: '2026-08-01' } },
  taller: { 'M02-005': { fallos: 2, reparaciones: 0, ultimoDiaRep: null } },
  album: Object.fromEntries(Array.from({ length: 14 }, (_, i) => [`S-${i}`, 2])),
  albumCategorias: [], vistas: { 'M01-001': 3 },
  respuestas: [{ id: 'M01-001', ok: true, ts: 1 }],
  simulacros: [{ fecha: '2026-07-10', fallos: 2, apto: true, segundos: 900 }],
  simulacroHoy: null, diarias: { fecha: null, lista: [] },
  contrarreloj: { semana: null, record: 12 }, cruces: { record: 4 },
  bote: { record: 0 }, rush: { semana: null, record: 0 },
  garaje: { coche: 'furgo', tema: 'ambar', celebracion: 'senales', comprados: ['escuela', 'cian', 'senales', 'furgo', 'ambar'] },
  compras: { pase: true, codigo: 'CQ-AAAAA-BBBBB' },
  ajustes: { sonido: false, haptics: true },
});
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(1000);

let s = await leerEstado();
ok(await A().locator('.mapa-svg').count() > 0, 'Con progreso v1, la app arranca en el mapa');
ok(s.schemaVersion === 2, `El esquema migra a v2 (era sin versión) → ${s.schemaVersion}`);
ok(s.xp === 1240 && s.chapas === 310, 'Conserva XP y chapas');
ok(s.compras.pase === true, 'Conserva el Pase comprado');
ok(s.garaje.coche === 'furgo' && s.garaje.tema === 'ambar', 'Conserva la cosmética elegida');
ok(s.ajustes.sonido === false, 'Conserva los ajustes');
ok(s.racha.dias === 9, 'Conserva la racha');
ok(s.srs['M01-001'].caja === 4, 'Conserva el Leitner');
ok(s.taller['M02-005'].fallos === 2, 'Conserva el Taller');
// lo importante del §10: no re-bloquear lo que ya usaba
ok(s.desbloqueos.bote === true, 'Un veterano con boss superado NO pierde Doble o nada');
ok(s.desbloqueos.rush === true, 'Con 14 señales coleccionadas NO pierde Señal Rush');
ok(s.desbloqueos.torre === true, 'Con simulacro hecho NO pierde DGT Tower');
ok(s.desbloqueos.crono === true, 'Con simulacro hecho NO pierde Contrarreloj');
const cerradas = await A().locator('.card-juego--cerrada').count();
ok(cerradas === 0, `Y en el mapa no hay ni un modo cerrado (${cerradas})`);
await p.screenshot({ path: `${OUT}/mig-1-veterano.png`, fullPage: true });

/* ===== 12 · Segundo plano y vuelta ===== */
await p.evaluate(() => document.querySelector('.nodo[data-mundo="1"]').dispatchEvent(new MouseEvent('click', { bubbles: true })));
await p.waitForTimeout(600);
await A().locator('[data-mision="0"]').click();
await p.waitForTimeout(900);
const enMision = await A().locator('.q-card, .cruce-escena').count() > 0;
await p.evaluate(() => {
  Object.defineProperty(document, 'hidden', { value: true, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
});
await p.waitForTimeout(500);
await p.evaluate(() => {
  Object.defineProperty(document, 'hidden', { value: false, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
});
await p.waitForTimeout(600);
ok(enMision && await A().locator('.q-card, .cruce-escena').count() > 0,
   'Irse a segundo plano y volver no interrumpe la misión en curso');
// y se puede seguir respondiendo
if (await A().locator('.q-opcion:not([disabled])').count()) {
  await A().locator('.q-opcion:not([disabled])').first().click();
  await p.waitForTimeout(600);
  ok(await A().locator('#feedback').count() > 0, 'Y se sigue pudiendo responder tras volver');
}

/* ===== 13 · Datos locales parcialmente dañados ===== */
await sembrar({
  xp: 500, chapas: 40, srs: null, taller: 'roto', album: 12345,
  mundos: { 1: { estrellas: [3], bossSuperado: true } },
  racha: null, garaje: 'nope', ajustes: undefined, compras: { pase: true },
  respuestas: 'no-es-un-array', simulacros: null, vistas: [],
  desbloqueos: null, proxima: 'texto-suelto', contratos: 7, pruebas: [],
  schemaVersion: 2,
});
await p.reload({ waitUntil: 'networkidle' });
await p.waitForTimeout(1200);
// el estado dañado no traía `onboarded`, así que lo correcto es que arranque en
// el tutorial jugable. Lo que se comprueba es que hay ALGO en pantalla, no blanco.
const pintado = await A().locator('.mapa-svg, .cruce-escena, .onboard').count();
ok(pintado > 0, `Con el estado dañado a propósito, la app NO se queda en blanco (pinta ${pintado} zonas)`);
s = await leerEstado();
ok(s.xp === 500 && s.compras.pase === true, 'Y rescata lo que sí era legible (XP y Pase)');
ok(s.racha && typeof s.racha.dias === 'number', 'Rehace la racha');
ok(Array.isArray(s.respuestas), 'Rehace el historial de respuestas');
ok(Array.isArray(s.garaje.comprados), 'Rehace el garaje');
ok(s.proxima === null, 'Descarta una próxima parada que no era ni un objeto');
ok(s.desbloqueos && typeof s.desbloqueos === 'object', 'Rehace los desbloqueos');
ok(errs.filter(e => e.startsWith('PAGEERROR')).length === 0, 'Sin excepciones de página al abrir datos dañados');
await p.screenshot({ path: `${OUT}/mig-2-danado.png`, fullPage: true });
// y sigue siendo jugable: se pasa el arranque y se entra en un mundo
const sk2 = p.locator('#salir.btn-saltar');
if (await sk2.count()) { await sk2.click(); await p.waitForTimeout(400); }
const go2 = p.locator('#ob-go'); if (await go2.count()) { await go2.click(); await p.waitForTimeout(800); }
ok(await A().locator('.mapa-svg').count() > 0, 'Se llega al mapa desde un estado dañado');
await p.evaluate(() => document.querySelector('.nodo[data-mundo="1"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true })));
await p.waitForTimeout(800);
ok(await A().locator('[data-mision="0"]').count() > 0, 'Y se puede seguir jugando con normalidad');

/* ===== 14 · Importar un progreso exportado con la versión anterior ===== */
await p.goto(BASE, { waitUntil: 'networkidle' }); await p.waitForTimeout(900);
const importado = await p.evaluate(async () => {
  const st = await import('/js/state.js');
  const viejo = JSON.stringify({
    app: 'carnet-quest', exportado: '2026-06-01T10:00:00.000Z',
    estado: {
      xp: 880, chapas: 120, srs: { 'M03-004': { caja: 2, vence: '2026-06-10' } },
      taller: {}, album: {}, albumCategorias: [], vistas: {}, respuestas: [], simulacros: [],
      mundos: { 1: { estrellas: [3, 3], bossSuperado: true } },
      racha: { dias: 3, ultimoDia: '2026-06-01', protectores: 1 },
      garaje: { coche: 'escuela', tema: 'cian', celebracion: 'senales', comprados: ['escuela', 'cian', 'senales'] },
      compras: { pase: false, codigo: null }, ajustes: { sonido: true, haptics: true },
    },
  });
  const s = st.importarJSON(viejo);
  return { v: s.schemaVersion, xp: s.xp, chapas: s.chapas, caja: s.srs['M03-004']?.caja,
           desb: s.desbloqueos, proxima: s.proxima, pruebas: s.pruebas?.activo };
});
ok(importado.v === 2, `Importar un export antiguo lo migra a v2 (${importado.v})`);
ok(importado.xp === 880 && importado.chapas === 120, 'Sin perder XP ni chapas');
ok(importado.caja === 2, 'Sin perder el Leitner');
ok(importado.desb && importado.desb.bote === true, 'Y le mantiene abierto lo que ya había usado (boss → Doble o nada)');
ok(importado.proxima === null, 'No le inventa una próxima parada');
ok(importado.pruebas === false, 'El modo de prueba sigue apagado tras importar');
await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(1000);
ok(await A().locator('.mapa-svg, .onboard').count() > 0, 'Y la app arranca con el progreso importado');

console.log('\n' + (errs.length ? '❌ ' + errs.join('\n') : '✅ sin errores de consola'));
console.log(fallos.length ? `❌ ${fallos.length} comprobaciones fallidas` : '✅ todas las comprobaciones pasan');
await b.close();
process.exit(fallos.length || errs.length ? 1 : 0);
