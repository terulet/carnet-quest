// CARNET QUEST — familias de trampa: diagnóstico y Caza-trampas.
//
// El banco tiene 856 explicaciones de POR QUÉ tienta la opción incorrecta.
// Clasificadas por mecanismo (tools/curar-trampas.mjs), permiten dos cosas que
// no hace ninguna app de tests:
//
//   · "El 41 % de tus fallos son de la misma familia" — tu talón de Aquiles.
//   · Caza-trampas: la respuesta correcta ya marcada, y tú aciertas por dónde
//     te la habrían colado. Aprendes el patrón, no la respuesta.
//
// HONESTIDAD (§8.5): Caza-trampas NO toca el Predictor ni el Leitner. No mide
// conocimiento de normativa, mide lectura de exámenes. Meterlo en el Predictor
// lo inflaría con algo que no es lo que te van a preguntar.
//
// Módulo diferido: el manifiesto se descarga la primera vez que hace falta.

let MAN = null;

export async function cargarTrampas() {
  if (MAN) return MAN;
  try {
    const doc = await (await fetch('datos/trampas.json')).json();
    MAN = {
      version: doc.version || 1,
      familias: doc.familias || {},
      porId: new Map((doc.entradas || []).map((e) => [e.questionId, e.familia])),
      total: doc.total || 0,
      clasificadas: doc.clasificadas || 0,
    };
  } catch {
    MAN = { version: 0, familias: {}, porId: new Map(), total: 0, clasificadas: 0 };
  }
  return MAN;
}

export const familiaDe = (id) => MAN?.porId.get(id) || null;
export const infoFamilia = (f) => MAN?.familias?.[f] || null;
export const hayManifiesto = () => !!MAN && MAN.porId.size > 0;
/** Cobertura del manifiesto sobre el banco, para poder decirla sin redondear. */
export const cobertura = () => ({ clasificadas: MAN?.clasificadas || 0, total: MAN?.total || 0 });

const MINIMO_PARA_DIAGNOSTICO = 8;   // con menos fallos, cualquier % es ruido

/**
 * Radiografía de los fallos del jugador.
 *
 * Solo cuenta los fallos de preguntas CON familia identificada, y lo dice: el
 * 30 % del banco no tiene familia clara y mentiría incluirlo en el reparto.
 *
 * @param {Array} respuestas  s.respuestas — [{id, ok, ts}]
 * @param {object} taller     s.taller — averías pendientes, pesan doble
 */
export function radiografia(respuestas = [], taller = {}) {
  if (!hayManifiesto()) return { listo: false, motivo: 'sin-manifiesto' };

  const cuenta = {};
  let conFamilia = 0, sinFamilia = 0;

  const sumar = (id, peso) => {
    const f = familiaDe(id);
    if (!f) { sinFamilia += peso; return; }
    cuenta[f] = (cuenta[f] || 0) + peso;
    conFamilia += peso;
  };

  // los fallos del historial reciente
  for (const r of respuestas.slice(-200)) if (!r.ok) sumar(r.id, 1);
  // y las averías vivas del Taller, que son fallos que además siguen sin arreglarse
  for (const [id, av] of Object.entries(taller)) sumar(id, 1 + Math.min(2, (av?.fallos || 1) - 1));

  if (conFamilia < MINIMO_PARA_DIAGNOSTICO) {
    return { listo: false, motivo: 'pocos-datos', tiene: conFamilia, minimo: MINIMO_PARA_DIAGNOSTICO };
  }

  const orden = Object.entries(cuenta)
    .map(([familia, n]) => ({ familia, n, pct: Math.round(100 * n / conFamilia), info: infoFamilia(familia) }))
    .sort((a, b) => b.n - a.n);

  return {
    listo: true,
    total: conFamilia,
    sinFamilia,
    reparto: orden,
    // el talón de Aquiles solo se nombra si de verdad destaca: si el reparto es
    // plano, decir "tu punto débil es X" sería inventarse un patrón
    talon: orden[0] && orden[0].pct >= 25 && orden[0].n >= 4 ? orden[0] : null,
  };
}

/**
 * Baraja para Caza-trampas: preguntas que el jugador ya ha visto y que tienen
 * familia. Se prioriza lo que ha fallado — es donde el patrón duele.
 */
export function barajaCazaTrampas(banco, respuestas = [], taller = {}, n = 8) {
  if (!hayManifiesto()) return [];
  const fallados = new Set(Object.keys(taller));
  for (const r of respuestas.slice(-200)) if (!r.ok) fallados.add(r.id);
  const vistos = new Set(respuestas.map((r) => r.id));

  const elegibles = banco.filter((q) => familiaDe(q.id) && q.trampa);
  const barajar = (a) => {
    const c = a.slice();
    for (let i = c.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [c[i], c[j]] = [c[j], c[i]];
    }
    return c;
  };

  // Los fallados van SIEMPRE, barajados entre ellos. Antes se barajaba la cabeza
  // entera y se cortaba, y eso destruía la prioridad que el nombre promete: un
  // fallo suelto entraba una de cada tres veces.
  const suyos = barajar(elegibles.filter((q) => fallados.has(q.id))).slice(0, n);
  if (suyos.length >= n) return suyos;

  // el resto se rellena con lo ya visto primero, y con lo nuevo si hace falta
  const dentro = new Set(suyos.map((q) => q.id));
  const resto = elegibles.filter((q) => !dentro.has(q.id));
  const relleno = barajar(resto.filter((q) => vistos.has(q.id)))
    .concat(barajar(resto.filter((q) => !vistos.has(q.id))));
  return suyos.concat(relleno.slice(0, n - suyos.length));
}

/** Las tres familias que se ofrecen: la verdadera y dos señuelos plausibles. */
export function opcionesDeFamilia(familiaReal) {
  const todas = Object.keys(MAN?.familias || {}).filter((f) => f !== familiaReal);
  const senuelos = [];
  const copia = todas.slice();
  while (senuelos.length < 2 && copia.length) {
    senuelos.push(copia.splice(Math.floor(Math.random() * copia.length), 1)[0]);
  }
  const lista = [familiaReal, ...senuelos];
  for (let i = lista.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [lista[i], lista[j]] = [lista[j], lista[i]];
  }
  return lista;
}
