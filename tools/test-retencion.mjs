// CARNET QUEST — pruebas unitarias de Retención V1.
//
// Node puro, sin navegador: aquí se prueba la LÓGICA (migraciones, selección de
// contenido, determinismo, formatos). Lo que necesita DOM se prueba en la suite
// de integración con Playwright.
//
// Uso:  node --test tools/test-retencion.mjs
//   o:  node tools/test-retencion.mjs

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

/* ---------- entorno mínimo de navegador ---------- */
const almacen = new Map();
globalThis.localStorage = {
  getItem: (k) => (almacen.has(k) ? almacen.get(k) : null),
  setItem: (k, v) => almacen.set(k, String(v)),
  removeItem: (k) => almacen.delete(k),
  clear: () => almacen.clear(),
};
// sin IndexedDB: state.js debe caer al fallback sin romperse
globalThis.indexedDB = undefined;
globalThis.fetch = async (url) => {
  const ruta = String(url).replace(/^.*?(datos\/)/, '$1');
  const txt = readFileSync(ruta, 'utf8');
  return { ok: true, json: async () => JSON.parse(txt), text: async () => txt };
};

const { cargarEstado, getEstado, HOY } = await import('../js/state.js');
await cargarEstado();

/* ============ 1 · Migración de esquema ============ */

test('migración: un estado v1 se convierte en v2 sin perder nada', async () => {
  const { importarJSON, exportarJSON } = await import('../js/state.js');
  const v1 = {
    xp: 640, chapas: 30, srs: { 'M01-001': { caja: 3, vence: '2026-01-01' } },
    taller: { 'M02-005': { fallos: 2 } }, album: { 'S-1': 2 }, vistas: {},
    respuestas: [{ id: 'M01-001', ok: true, ts: 1 }], simulacros: [],
    mundos: { 1: { estrellas: [3], bossSuperado: true } },
    racha: { dias: 4, ultimoDia: '2026-01-01', protectores: 1 },
    ajustes: { sonido: false, haptics: true },
    compras: { pase: true, codigo: 'CQ-AAAAA-BBBBB' },
  };
  importarJSON(JSON.stringify(v1));
  const s = getEstado();
  assert.equal(s.schemaVersion, 2, 'sube a la versión 2');
  assert.equal(s.xp, 640, 'conserva la XP');
  assert.equal(s.compras.pase, true, 'conserva el Pase');
  assert.equal(s.ajustes.sonido, false, 'conserva los ajustes');
  assert.deepEqual(s.srs['M01-001'], { caja: 3, vence: '2026-01-01' }, 'conserva el SRS');
  assert.ok(s.desbloqueos && s.contratos && s.pruebas, 'crea las claves nuevas');
  assert.equal(s.pruebas.activo, false, 'el modo de prueba nace apagado');
  assert.equal(s.proxima, null, 'no inventa una parada');
  assert.ok(JSON.parse(exportarJSON()).estado.xp === 640, 'exporta lo migrado');
});

test('migración: con 400+ XP se abre todo, para no re-bloquear a quien ya jugaba', () => {
  const s = getEstado();
  assert.equal(s.desbloqueos.rush, true);
  assert.equal(s.desbloqueos.torre, true);
});

test('migración: un estado corrupto no deja la app en blanco', async () => {
  const { importarJSON } = await import('../js/state.js');
  const roto = { xp: 10, srs: {}, desbloqueos: null, racha: null, garaje: 'nope' };
  importarJSON(JSON.stringify(roto));
  const s = getEstado();
  assert.ok(s.desbloqueos && typeof s.desbloqueos === 'object', 'rehace desbloqueos');
  assert.ok(s.racha && typeof s.racha.dias === 'number', 'rehace la racha');
  assert.ok(Array.isArray(s.garaje.comprados), 'rehace el garaje');
});

/* ============ 2 · Desbloqueos progresivos ============ */

test('desbloqueos: nunca se vuelven a cerrar', async () => {
  const { importarJSON } = await import('../js/state.js');
  const { revisarDesbloqueos, estaDesbloqueado } = await import('../js/retencion/desbloqueos.js');
  importarJSON(JSON.stringify({ xp: 0, srs: {}, album: {}, mundos: {}, taller: {}, vistas: {}, respuestas: [], simulacros: [] }));
  const s = getEstado();
  s.desbloqueos = { cruces: true, rush: false, bote: false, torre: false, crono: false };
  assert.equal(estaDesbloqueado('rush'), false, 'empieza cerrado');
  for (let i = 0; i < 12; i++) s.album[`S-${i}`] = 2;
  const nuevos = revisarDesbloqueos();
  assert.ok(nuevos.includes('rush'), 'coleccionar 12 señales lo abre');
  assert.equal(estaDesbloqueado('rush'), true);
  s.album = {};                       // el jugador borra el álbum: da igual
  revisarDesbloqueos();
  assert.equal(estaDesbloqueado('rush'), true, 'sigue abierto: lo ganado no se quita');
});

test('desbloqueos: revisar dos veces no anuncia dos veces', async () => {
  const { revisarDesbloqueos } = await import('../js/retencion/desbloqueos.js');
  const s = getEstado();
  s.mundos['1'] = { estrellas: [3], bossSuperado: true };
  const a = revisarDesbloqueos();
  const b = revisarDesbloqueos();
  assert.ok(a.length >= 1, 'la primera vez sí anuncia');
  assert.equal(b.length, 0, 'la segunda ya no');
});

/* ============ 3 · Tu Próxima Parada ============ */

const bancoDe = (n) => JSON.parse(readFileSync(`datos/preguntas/mundo-${String(n).padStart(2, '0')}.json`, 'utf8'));
const CRUCES = JSON.parse(readFileSync('datos/cruces.json', 'utf8')).cruces
  || JSON.parse(readFileSync('datos/cruces.json', 'utf8'));

test('próxima parada: se construye solo con preguntas ya vistas en la parte fría', async () => {
  const { importarJSON } = await import('../js/state.js');
  const { prepararProxima, proximaLista, materializar } = await import('../js/retencion/proxima.js');
  const banco = bancoDe(1).concat(bancoDe(2));
  const vistas = banco.slice(0, 20);
  importarJSON(JSON.stringify({
    xp: 100, srs: {}, album: {}, mundos: {}, taller: {}, vistas: {}, simulacros: [],
    respuestas: vistas.map((q) => ({ id: q.id, ok: false, ts: Date.now() })),
  }));
  const np = prepararProxima(banco, CRUCES, 'sesion-test');
  assert.ok(np, 'la prepara');
  assert.equal(np.version, 1);
  assert.equal(np.status, 'pendiente');
  assert.equal(np.coldCheckQuestionIds.length, 3, 'tres recuerdos en frío');
  const idsVistos = new Set(vistas.map((q) => q.id));
  for (const id of np.coldCheckQuestionIds) {
    assert.ok(idsVistos.has(id), `${id} ya se había visto: el arranque en frío no estrena contenido`);
  }
  assert.ok(np.readyLocalDate > np.createdLocalDate, 'la parte fría se sirve al día siguiente');
  assert.equal(proximaLista(np), false, 'hoy todavía no está "lista"');
  np.readyLocalDate = '2000-01-01';
  assert.equal(proximaLista(np), true, 'mañana sí');
});

test('próxima parada: sobrevive a que el banco cambie', async () => {
  const { prepararProxima, materializar } = await import('../js/retencion/proxima.js');
  const banco = bancoDe(1);
  const np = prepararProxima(banco, CRUCES, 's');
  // el banco se reduce a la mitad, como si una actualización quitara preguntas
  const { lista, nFrio } = materializar(np, banco.slice(0, Math.ceil(banco.length / 2)), CRUCES);
  assert.ok(lista.length > 0, 'sigue habiendo ruta jugable');
  assert.equal(new Set(lista.map((q) => q.id)).size, lista.length, 'sin duplicados');
  assert.ok(nFrio <= 3);
});

test('próxima parada: solo puede haber una pendiente', async () => {
  const { prepararProxima, guardarProxima, proximaPendiente } = await import('../js/retencion/proxima.js');
  const banco = bancoDe(1);
  const a = prepararProxima(banco, CRUCES, 's1');
  guardarProxima(a);
  const b = prepararProxima(banco, CRUCES, 's2');
  assert.equal(b, null, 'con una pendiente no se genera otra');
  assert.equal(proximaPendiente().id, a.id, 'sigue siendo la primera');
  // y aunque alguien llame a guardar a mano, la pendiente no se pisa
  guardarProxima({ ...a, id: 'np-intruso', status: 'pendiente' });
  assert.equal(proximaPendiente().id, a.id, 'guardarProxima tampoco la sustituye');
});

/* ============ 4 · Calendario (.ics) ============ */

test('ics: cumple el formato mínimo de RFC 5545', async () => {
  const { generarICS } = await import('../js/retencion/ics.js');
  const txt = generarICS({ fecha: '2026-08-14', hora: '19:30', url: 'https://x.test/#/next-run', minutos: 15, uid: 'fijo@test' });
  assert.ok(txt.startsWith('BEGIN:VCALENDAR\r\n'), 'abre el calendario');
  assert.ok(txt.trimEnd().endsWith('END:VCALENDAR'), 'lo cierra');
  assert.ok(txt.includes('\r\n'), 'usa CRLF');
  assert.match(txt, /DTSTART:20260814T193000\r\n/, 'la hora local va sin Z');
  assert.match(txt, /UID:fijo@test/);
  assert.ok(!/DTSTART:.*Z/.test(txt), 'DTSTART no lleva zona: es la hora que eligió el jugador');
});

test('ics: escapa comas, puntos y coma y saltos de línea', async () => {
  const { generarICS } = await import('../js/retencion/ics.js');
  const txt = generarICS({ fecha: '2026-08-14', hora: '09:05', url: 'https://x.test/?a=1;b=2,3' });
  const linea = txt.split('\r\n').find((l) => l.startsWith('URL:'));
  assert.ok(linea.includes('\\;') && linea.includes('\\,'), `URL escapada: ${linea}`);
});

/* ============ 5 · ADN de los mundos ============ */

test('adn: ningún mundo pasa de dos modificadores exigentes', async () => {
  const { ADN, adnDe, MODIFICADORES } = await import('../js/retencion/mundos-adn.js');
  for (const n of Object.keys(ADN)) {
    const { mods } = adnDe(n);
    const altos = Object.keys(mods).filter((k) => (MODIFICADORES[k]?.friccion || 0) >= 2);
    assert.ok(altos.length <= 2, `mundo ${n} tiene ${altos.length} modificadores de fricción alta`);
  }
});

test('adn: el mundo tutorial va limpio y todos los demás declaran lema', async () => {
  const { ADN, adnDe } = await import('../js/retencion/mundos-adn.js');
  assert.deepEqual(adnDe(1).mods, {}, 'el Mundo 1 no lleva modificadores');
  for (const n of Object.keys(ADN)) {
    const { mods, lema } = adnDe(n);
    if (Object.keys(mods).length) assert.ok(lema && lema.length > 5, `mundo ${n} sin lema`);
  }
});

test('adn: un mundo desconocido no revienta', async () => {
  const { adnDe } = await import('../js/retencion/mundos-adn.js');
  assert.deepEqual(adnDe(99).mods, {});
  assert.deepEqual(adnDe(undefined).mods, {});
});

/* ============ 6 · Contratos de ruta ============ */

test('contratos: nunca se ofrece uno imposible de cumplir', async () => {
  const { importarJSON } = await import('../js/state.js');
  const { ofrecerContrato, CONTRATOS } = await import('../js/retencion/contratos.js');
  importarJSON(JSON.stringify({ xp: 0, srs: {}, album: {}, mundos: {}, taller: {}, vistas: {}, respuestas: [], simulacros: [] }));
  const sinSenales = bancoDe(1).filter((q) => !q.senalId).slice(0, 10);
  for (let i = 0; i < 60; i++) {
    const c = ofrecerContrato(sinSenales);
    if (!c) continue;
    assert.notEqual(c.id, 'senalizacion', 'no ofrece "no falles señales" si no hay señales');
    assert.notEqual(c.id, 'taller-movil', 'no ofrece reparar averías si no viaja ninguna');
  }
  assert.equal(ofrecerContrato([]), null, 'con lista vacía no ofrece nada');
});

test('contratos: fallar no resta nada; cumplir paga una sola vez', async () => {
  const { importarJSON } = await import('../js/state.js');
  const { resolverContrato, CONTRATOS, PREMIO_CHAPAS } = await import('../js/retencion/contratos.js');
  importarJSON(JSON.stringify({ xp: 50, chapas: 100, srs: {}, album: {}, mundos: {}, taller: {}, vistas: {}, respuestas: [], simulacros: [] }));
  const s = getEstado();
  const precision = CONTRATOS.find((c) => c.id === 'precision');

  const falla = resolverContrato(precision, { fallos: 5, maxCombo: 0, reparadas: 0, fallosSenal: 3 });
  assert.equal(falla.logrado, false);
  assert.equal(s.chapas, 100, 'fallar no resta Chapas');
  assert.equal(s.xp, 50, 'fallar no resta XP');
  assert.equal(s.contratos.fallados, 1);

  const gana = resolverContrato(precision, { fallos: 1, maxCombo: 9, reparadas: 0, fallosSenal: 0 });
  assert.equal(gana.logrado, true);
  assert.equal(gana.premio, PREMIO_CHAPAS);
  assert.equal(s.chapas, 100 + PREMIO_CHAPAS, 'cumplir paga');

  const repite = resolverContrato(precision, { fallos: 1, maxCombo: 9, reparadas: 0, fallosSenal: 0 }, true);
  assert.equal(repite.premio, 0, 'no se cobra dos veces');
  assert.equal(s.chapas, 100 + PREMIO_CHAPAS);
});

test('contratos: sin contrato, resolver no hace nada', async () => {
  const { resolverContrato } = await import('../js/retencion/contratos.js');
  assert.deepEqual(resolverContrato(null, { fallos: 0 }), { hubo: false });
});

/* ============ 7 · Retos por enlace ============ */

test('retos: misma semilla → mismo recorrido, en cualquier orden de carga', async () => {
  const { componerReto } = await import('../js/retencion/reto.js');
  const banco = bancoDe(1).concat(bancoDe(2), bancoDe(3));
  const a = componerReto('mix5', 4242, banco, CRUCES);
  const b = componerReto('mix5', 4242, banco.slice().reverse(), CRUCES);
  assert.deepEqual(a.map((q) => q.id), b.map((q) => q.id), 'el orden de carga no influye');
  const c = componerReto('mix5', 4243, banco, CRUCES);
  assert.notDeepEqual(a.map((q) => q.id), c.map((q) => q.id), 'otra semilla, otro recorrido');
  assert.equal(a.length, 5);
});

test('retos: el modo "signals" solo trae preguntas con señal', async () => {
  const { componerReto } = await import('../js/retencion/reto.js');
  const banco = bancoDe(2).concat(bancoDe(3), bancoDe(4));
  const l = componerReto('signals', 7, banco, CRUCES);
  assert.ok(l.length > 0);
  for (const q of l) assert.ok(q.senalId, `${q.id} no tiene señal`);
});

test('retos: el enlace no lleva nada personal', async () => {
  const { urlReto, leerHashReto, VERSION_RETO } = await import('../js/retencion/reto.js');
  const u = urlReto('mix5', 12345, 'https://carnet.test/app/');
  assert.equal(u, `https://carnet.test/app/#/reto?v=${VERSION_RETO}&mode=mix5&seed=12345`);
  const qs = u.split('?')[1].split('&').map((p) => p.split('=')[0]).sort();
  assert.deepEqual(qs, ['mode', 'seed', 'v'], 'solo versión, modo y semilla');
  assert.deepEqual(leerHashReto('#/reto?v=1&mode=mix5&seed=12345'), { version: 1, modo: 'mix5', semilla: 12345 });
});

test('retos: los enlaces rotos se detectan, no se adivinan', async () => {
  const { leerHashReto } = await import('../js/retencion/reto.js');
  assert.equal(leerHashReto('#/mapa'), null, 'lo que no es un reto se ignora');
  assert.equal(leerHashReto('#/reto?v=99&mode=mix5&seed=1').error, 'version');
  assert.equal(leerHashReto('#/reto?v=1&mode=inventado&seed=1').error, 'modo');
  assert.equal(leerHashReto('#/reto?v=1&mode=mix5&seed=abc').error, 'semilla');
  assert.equal(leerHashReto('#/reto?v=1&mode=mix5&seed=-4').error, 'semilla');
});

test('retos: con banco insuficiente devuelve null en vez de un reto cojo', async () => {
  const { componerReto } = await import('../js/retencion/reto.js');
  assert.equal(componerReto('mix5', 1, bancoDe(1).slice(0, 2), []), null);
  assert.equal(componerReto('crossing', 1, bancoDe(1), []), null);
});

/* ============ 8 · Regla contra Trampa ============ */

test('regla contra trampa: el manifiesto validado llega al mínimo seguro', async () => {
  const { cargarReglaTrampa, estaDisponible, totalTarjetas, tarjetaDe } = await import('../js/retencion/reglatrampa.js');
  const { RULETRAP_MINIMO } = await import('../js/retencion/flags.js');
  await cargarReglaTrampa();
  assert.equal(estaDisponible(), true, `hacen falta ≥ ${RULETRAP_MINIMO} tarjetas`);
  console.log(`      tarjetas validadas: ${totalTarjetas()}`);
  assert.ok(totalTarjetas() >= RULETRAP_MINIMO);
});

test('regla contra trampa: cada tarjeta sale del banco ya verificado, sin texto nuevo', async () => {
  const doc = JSON.parse(readFileSync('datos/reglatrampa.json', 'utf8'));
  const banco = new Map();
  for (let n = 1; n <= 15; n++) for (const q of bancoDe(n)) banco.set(q.id, q);
  for (const e of doc.entradas) {
    const q = banco.get(e.questionId);
    assert.ok(q, `${e.questionId} no existe en el banco`);
    assert.equal(e.ruleText, String(q.opciones[q.correcta]).trim(), `${e.questionId}: la regla NO es la opción correcta literal`);
    assert.ok(q.opciones.some((o) => String(o).trim() === e.trapText), `${e.questionId}: la trampa no es una opción real`);
    assert.notEqual(e.trapText, e.ruleText);
    assert.equal(e.contexto, String(q.pregunta).trim(), `${e.questionId}: el contexto no es el enunciado literal`);
  }
});

test('regla contra trampa: el lado de la regla no es siempre el mismo', async () => {
  const { cargarReglaTrampa, tarjetaDe } = await import('../js/retencion/reglatrampa.js');
  await cargarReglaTrampa();
  const doc = JSON.parse(readFileSync('datos/reglatrampa.json', 'utf8'));
  const izq = doc.entradas.filter((e) => tarjetaDe(e.questionId)?.reglaIzquierda).length;
  const total = doc.entradas.length;
  assert.ok(izq > total * 0.3 && izq < total * 0.7, `reparto ${izq}/${total}: la posición se podría memorizar`);
  // y es estable: la misma pregunta siempre en el mismo lado
  const id = doc.entradas[0].questionId;
  assert.equal(tarjetaDe(id).reglaIzquierda, tarjetaDe(id).reglaIzquierda);
});

test('regla contra trampa: una pregunta sin tarjeta devuelve null, no inventa', async () => {
  const { cargarReglaTrampa, tarjetaDe } = await import('../js/retencion/reglatrampa.js');
  await cargarReglaTrampa();
  assert.equal(tarjetaDe('NO-EXISTE-001'), null);
});

/* ============ 9 · Caja negra local ============ */

test('eventos: apagado por defecto no registra ni un byte', async () => {
  const { importarJSON } = await import('../js/state.js');
  const EV = await import('../js/retencion/eventos.js');
  importarJSON(JSON.stringify({ xp: 0, srs: {}, album: {}, mundos: {}, taller: {}, vistas: {}, respuestas: [], simulacros: [] }));
  EV.borrarEventos();
  getEstado().pruebas.activo = false;
  EV.registrar('app_open', { route: 'mapa' });
  assert.equal(EV.contarEventos(), 0);
});

test('eventos: los campos prohibidos no entran ni pasándolos a propósito', async () => {
  const EV = await import('../js/retencion/eventos.js');
  EV.borrarEventos();
  getEstado().pruebas.activo = true;
  EV.registrar('test', {
    questionId: 'M01-001',
    metadata: {
      nombre: 'Marta', email: 'a@b.c', telefono: '600000000',
      texto: 'lo que sea', respuesta: 'B', ip: '1.2.3.4', userAgent: 'Mozilla',
      frase: 'x'.repeat(80),
      ok: true, intentos: 3, id: 'precision',
    },
  });
  // se lee del propio módulo: el volcado a localStorage va con debounce
  const ev = JSON.parse(EV.exportar()).eventos[0];
  assert.equal(ev.questionId, 'M01-001', 'el id de pregunta sí puede guardarse');
  assert.deepEqual(Object.keys(ev.metadata).sort(), ['id', 'intentos', 'ok'], `metadata filtrada: ${JSON.stringify(ev.metadata)}`);
});

test('eventos: el buffer no crece sin control', async () => {
  const EV = await import('../js/retencion/eventos.js');
  EV.borrarEventos();
  getEstado().pruebas.activo = true;
  for (let i = 0; i < 2100; i++) EV.registrar('ruido', { metadata: { i } });
  assert.ok(EV.contarEventos() <= 2000, `guardados ${EV.contarEventos()}`);
});

test('eventos: la exportación no toca el progreso ni al revés', async () => {
  const EV = await import('../js/retencion/eventos.js');
  const { exportarJSON } = await import('../js/state.js');
  const doc = JSON.parse(EV.exportar());
  assert.ok(Array.isArray(doc.eventos) && Array.isArray(doc.sesiones));
  assert.equal(JSON.parse(exportarJSON()).estado.pruebas.activo, true);
  assert.ok(!JSON.stringify(JSON.parse(exportarJSON()).estado).includes('eventId'), 'los eventos no viajan dentro del progreso');
});

test('eventos: el módulo no contiene ni una llamada de red', () => {
  const src = readFileSync('js/retencion/eventos.js', 'utf8');
  for (const patron of ['fetch(', 'XMLHttpRequest', 'sendBeacon', 'WebSocket', 'new Image']) {
    assert.ok(!src.includes(patron), `encontrado ${patron} en la caja negra`);
  }
});
