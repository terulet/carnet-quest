// CARNET QUEST — curador de FAMILIAS DE TRAMPA.
//
// POR QUÉ ESTO EXISTE
//
// El banco tiene 856 campos `trampa` explicando por qué tienta la opción
// incorrecta. Es contenido escrito a mano que ahora mismo solo se lee una vez,
// al fallar. Clasificándolo por MECANISMO se puede decir algo que ninguna app de
// tests dice: "el 41 % de tus fallos son de la misma familia".
//
// DECISIÓN DE MÉTODO, documentada a propósito:
//
// Los `tags` del banco (506 distintos) son de TEMA — velocidad, alcohol,
// glorieta. No sirven: saber que fallas en glorietas no te enseña nada que no
// supieras. Lo que enseña es el mecanismo: "te la cuelan con los absolutos",
// "confundes permiso con obligación". Eso hay que derivarlo del texto de la
// trampa, no de los tags.
//
// Las reglas van ORDENADAS de más específica a más general y solo se asigna UNA
// familia por pregunta: la primera que dispare con evidencia clara. Una pregunta
// puede tener dos mecanismos, pero para un diagnóstico honesto es mejor contar
// una vez el más característico que repartirla y inflar los porcentajes.
//
// Lo que NO dispare ninguna regla se queda SIN familia. No se fuerza. Una
// pregunta mal etiquetada envenena el diagnóstico entero, y el diagnóstico es
// justo lo que se vende.
//
// Uso:  node tools/curar-trampas.mjs [--escribir] [--muestra]

import { readFileSync, writeFileSync } from 'node:fs';

const MUNDOS = Array.from({ length: 15 }, (_, i) => String(i + 1).padStart(2, '0'));

/**
 * Las familias. `nombre` y `consejo` son lo que ve el jugador, así que se
 * escriben en su idioma, no en el del reglamento.
 */
export const FAMILIAS = {
  absoluto: {
    nombre: 'Los absolutos',
    corto: 'siempre / nunca',
    consejo: 'Cuando una opción dice "siempre", "nunca" o "en todos los casos", desconfía. La norma casi siempre tiene un matiz.',
  },
  excepcion: {
    nombre: 'La excepción escondida',
    corto: 'el "salvo…"',
    consejo: 'La regla general la sabes. Lo que te pillan es la excepción: lee hasta el final, ahí está el "salvo" o el "excepto".',
  },
  cifra: {
    nombre: 'Los números cruzados',
    corto: 'cifras que se parecen',
    consejo: 'Te ofrecen una cifra correcta… pero de otra situación. Ancla cada número a su contexto, no lo memorices suelto.',
  },
  permiso: {
    nombre: 'Poder no es deber',
    corto: 'permitido / obligatorio',
    consejo: 'Distingue lo que PUEDES hacer de lo que DEBES hacer. La trampa te da una opción legal pero no obligatoria, o al revés.',
  },
  via: {
    nombre: 'Depende de la vía',
    corto: 'urbana / interurbana',
    consejo: 'La misma maniobra cambia según dónde estés. Antes de responder, pregúntate en qué tipo de vía te han puesto.',
  },
  vehiculo: {
    nombre: 'Depende del vehículo',
    corto: 'quién conduce qué',
    consejo: 'Ciclomotores, camiones, noveles y profesionales tienen sus propias reglas. Comprueba de quién te están hablando.',
  },
  prioridad: {
    nombre: 'Prioridad al revés',
    corto: 'quién pasa primero',
    consejo: 'Te dan la vuelta a quién cede. Reconstruye el orden desde la norma, no desde quién parece más importante.',
  },
  sentidoComun: {
    nombre: 'Parece de sentido común',
    corto: 'lo razonable no es lo legal',
    consejo: 'La opción que suena razonable no siempre es la que dice la norma. Aquí toca fiarse del reglamento, no del instinto.',
  },
  parecido: {
    nombre: 'Se parecen demasiado',
    corto: 'señales y marcas gemelas',
    consejo: 'Dos señales o marcas casi iguales con significados distintos. Fíjate en la forma y el color antes que en el dibujo.',
  },
  orden: {
    nombre: 'El orden importa',
    corto: 'primero esto, luego aquello',
    consejo: 'Sabes los pasos, pero te los cambian de orden. Repasa la secuencia entera, no las piezas sueltas.',
  },
  parcial: {
    nombre: 'Se cumple a medias',
    corto: 'una condición no basta',
    consejo: 'La opción cumple UNA condición de las que hacen falta. Comprueba que se cumplen todas antes de darla por buena.',
  },
  definicion: {
    nombre: 'Dos palabras parecidas',
    corto: 'calzada / arcén, parada / estacionamiento',
    consejo: 'El reglamento usa palabras con significado exacto. Si confundes dos términos, fallas aunque entiendas la situación.',
  },
};

/* ---------- Reglas, de la más específica a la más general ---------- */

/**
 * Vocabulario del reglamento: términos con significado exacto que el examen
 * intercambia a propósito. Si una trampa CONTRASTA dos de estos, el mecanismo es
 * confusión de definiciones, por muy distinto que sea el tema de la pregunta.
 */
const GLOSARIO = [
  'calzada', 'arcén', 'acera', 'mediana', 'isleta', 'refugio', 'apartadero',
  'badén', 'paso a nivel', 'intersección', 'glorieta', 'travesía', 'autopista',
  'autovía', 'carril', 'zona peatonal', 'ramal', 'enlace', 'vía de servicio',
  'tara', 'masa máxima', 'peso máximo', 'automóvil', 'vehículo especial',
  'derivado de turismo', 'mixto adaptable', 'furgoneta', 'ciclomotor',
  'motocicleta', 'remolque', 'semirremolque', 'tranvía', 'conjunto de vehículos',
  'parada', 'estacionamiento', 'detención', 'adelantamiento', 'cambio de sentido',
  'cambio de dirección', 'incorporación', 'marcha atrás', 'conductor', 'peatón',
  'usuario', 'pasajero', 'carga', 'transporte',
];
const CONTRASTE = /;|\bno es\b|\bno son\b|\bfrente a\b|\ben cambio\b|\bmientras que\b|\bsin embargo\b|\bpero\b|\bmientras\b/i;

/** Cuántos términos DISTINTOS del glosario aparecen en un texto. */
function terminosDelGlosario(t) {
  const bajo = t.toLowerCase();
  return GLOSARIO.filter((g) => bajo.includes(g)).length;
}

/**
 * Cada regla mira el texto de la trampa y, cuando hace falta, las opciones de la
 * pregunta. Devolver true significa "hay evidencia clara", no "encaja un poco".
 */
const REGLAS = [
  // 1. Definiciones: el reglamento tiene pares de términos que se confunden.
  ['definicion', (t, q) => {
    const pares = [
      /calzada.*arc[ée]n|arc[ée]n.*calzada/i,
      /parada.*estacionamiento|estacionamiento.*parada/i,
      /adelantamiento.*cambio de carril|cambio de carril.*adelantamiento/i,
      /autopista.*autov[íi]a|autov[íi]a.*autopista/i,
      /travesía.*urbana|urbana.*travesía/i,
      /detenci[óo]n.*parada|parada.*detenci[óo]n/i,
    ];
    if (pares.some((r) => r.test(t))) return true;
    // El patrón real del banco no es "confunde A con B" sino "te cambian una
    // definición por otra": eso se detecta por la FORMA de la frase.
    return /te cambian? (una|la|el|los|las)? ?(definici[óo]n|palabra|t[ée]rmino|concepto)/i.test(t)
      || /cambiarlos de sitio|te mezclan|una definici[óo]n por otra|intercambian? (los|las)? ?(t[ée]rminos|nombres|conceptos)/i.test(t)
      || /\bno (es|son)\b[^.]{0,60}\b(es|son)\b/i.test(t)          // "no es X, es Y"
      || /la diferencia est[áa]|se diferencian?|usan? '[^']+' para despistar|usan? "[^"]+" para despistar/i.test(t)
      || /(no (es|son) lo mismo|por definici[óo]n|el t[ée]rmino|se llama)/i.test(t)
      // dos términos del reglamento enfrentados: "el refugio es para peatones;
      // el apartadero, para vehículos". Eso es confusión de definiciones aunque
      // la frase no diga en ningún momento la palabra "definición".
      || (terminosDelGlosario(t) >= 2 && CONTRASTE.test(t));
  }],

  // 2. Excepción escondida: la trampa vive en el "salvo".
  ['excepcion', (t) => /\bsalvo\b|\bexcepto\b|\bexcepci[óo]n\b|a no ser que|siempre que no|salvedad/i.test(t)],

  // 3. Absolutos: la opción falsa suena categórica.
  ['absoluto', (t, q) => {
    if (/\b(siempre|nunca|jam[áa]s|en ning[úu]n caso|en todos los casos|todo[s]? sin excepci[óo]n)\b/i.test(t)) return true;
    // o la propia opción incorrecta es un absoluto
    return q.opciones.some((o, i) => i !== q.correcta && /^(siempre|nunca|todas|ninguna|en ning)/i.test(String(o).trim()));
  }],

  // 4. Números cruzados: solo si de verdad hay dos cifras en juego.
  ['cifra', (t, q) => {
    const cifrasEnOpciones = q.opciones.filter((o) => /\d/.test(String(o))).length;
    if (cifrasEnOpciones < 2) return false;
    return /intercambia|cifra|n[úu]mero|confundir? (los|las)? ?(\d|km|metros|mg)|se parecen? (los|las)? ?(cifras|n[úu]meros)|otra (velocidad|tasa|distancia)|\bde otra\b/i.test(t)
      || /\b\d+\s*(km\/h|m\b|metros|mg\/l|g\/l|%)/i.test(t);
  }],

  // 5. Depende del vehículo.
  ['vehiculo', (t) => /ciclomotor|ciclista|bicicleta|motocicleta|cami[óo]n|remolque|autob[úu]s|novel|profesional|conductor de|veh[íi]culo (prioritario|especial|de emergencia)/i.test(t)],

  // 6. Depende de la vía.
  ['via', (t) => /\b(urbana|interurbana|travesía|autopista|autov[íi]a|poblado|v[íi]a r[áa]pida|carretera convencional)\b/i.test(t)],

  // 7. Prioridad invertida.
  ['prioridad', (t) => /prioridad|ceder el paso|preferencia|qui[ée]n pasa|cede\b|cedes\b|derecho de paso/i.test(t)],

  // 8. Permiso contra obligación.
  ['permiso', (t) => /obligator|\bdebes?\b|\bpuedes?\b|est[áa] permitido|no est[áa] prohibido|recomend|opcional|potestativ/i.test(t)],

  // 9. Se parecen demasiado (señales y marcas).
  ['parecido', (t, q) => (/se parec|casi id[ée]ntic|similar|gemel|misma forma|mismo color|confundir la se[ñn]al/i.test(t)
    || (!!q.senalId && /se[ñn]al|tri[áa]ngul|c[íi]rcul|cuadrad|panel|marca vial|l[íi]nea (continua|discontinua)/i.test(t)))],

  // 10. El orden importa.
  ['orden', (t) => /\bprimero\b|\bantes de\b|\bdespu[ée]s\b|\borden\b|secuencia|\bPAS\b|proteger.*avisar|paso a paso|\bel orden\b|invertir/i.test(t)],

  // 11. Se cumple a medias.
  ['parcial', (t) => /solo (una|uno|si|sirve|vale)|no basta|no es suficiente|hace falta (adem[áa]s|tambi[ée]n)|adem[áa]s de|todas las condiciones|una cosa no quita|cumple una|se queda a medias|solo la mitad/i.test(t)],

  // 12. Sentido común engañoso — la más general, va la última a propósito.
  ['sentidoComun', (t) => /parece|suena|tienta|tentador|intuici|intuiti|l[óo]gic|sentido com[úu]n|de caj[óo]n|razonable|pinta bien|relaja|tranquiliza|da la sensaci[óo]n|es lo que har[íi]a|por costumbre|el instinto|te fías/i.test(t)],
];

/**
 * SEGUNDA PASADA — evidencia estructural.
 *
 * Solo se aplica a lo que la prosa de la trampa no ha clasificado, y solo mira
 * hechos objetivos de la PREGUNTA: cuántas opciones llevan cifras, si hay señal
 * asociada, si las opciones son nombres del glosario. Es menos fina que leer la
 * trampa, pero no se inventa nada: o la evidencia está en la pregunta o no está.
 */
const ESTRUCTURALES = [
  // Tres o más opciones con cifra y unidad: el examen te está midiendo números.
  ['cifra', (t, q) => q.opciones.filter((o) => /\d+\s*(km\/h|m\b|metros|mg\/l|g\/l|%|minutos?|segundos?|horas?|años?)/i.test(String(o))).length >= 2],

  // NO hay fallback de "se parecen demasiado" por tener señal asociada: revisando
  // una muestra a mano etiquetaba cualquier pregunta con señal, tuviera o no ese
  // mecanismo ("como no ves hielo, te relajas" no es confusión visual). Precisión
  // por encima de cobertura: una etiqueta falsa envenena el diagnóstico entero.

  // Opciones cortas que son nombres del glosario: te miden el vocabulario.
  ['definicion', (t, q) => {
    const cortas = q.opciones.filter((o) => String(o).trim().split(/\s+/).length <= 8);
    if (cortas.length < q.opciones.length) return false;
    const conTermino = q.opciones.filter((o) => terminosDelGlosario(String(o)) >= 1).length;
    return conTermino >= 2;
  }],

  // La trampa habla de dos términos del glosario aunque no los contraste.
  ['definicion', (t) => terminosDelGlosario(t) >= 2],
];

/** Clasifica una pregunta. Devuelve la familia o null si no hay evidencia clara. */
export function familiaDe(q) {
  const t = String(q.trampa || '');
  if (t.length < 20) return null;      // una trampa demasiado corta no da evidencia
  for (const [id, prueba] of REGLAS) {
    try { if (prueba(t, q)) return id; } catch { /* una regla rota no tumba el curado */ }
  }
  for (const [id, prueba] of ESTRUCTURALES) {
    try { if (prueba(t, q)) return id; } catch { /* idem */ }
  }
  return null;
}

/* ---------- Ejecución ---------- */

if (process.argv[1] && process.argv[1].endsWith('curar-trampas.mjs')) {
  const entradas = [];
  const cuenta = {};
  let total = 0, sinFamilia = 0;
  const sinEjemplos = [];

  for (const m of MUNDOS) {
    let banco;
    try { banco = JSON.parse(readFileSync(`datos/preguntas/mundo-${m}.json`, 'utf8')); }
    catch { continue; }
    for (const q of banco) {
      total++;
      const f = familiaDe(q);
      if (!f) { sinFamilia++; if (sinEjemplos.length < 10) sinEjemplos.push(`${q.id}: ${String(q.trampa).slice(0, 90)}`); continue; }
      cuenta[f] = (cuenta[f] || 0) + 1;
      entradas.push({ questionId: q.id, familia: f });
    }
  }

  const clasificadas = total - sinFamilia;
  console.log(`preguntas: ${total} · clasificadas: ${clasificadas} (${Math.round(100 * clasificadas / total)} %) · sin familia: ${sinFamilia}\n`);
  for (const [k, v] of Object.entries(cuenta).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(v).padStart(4)}  ${k.padEnd(14)} ${FAMILIAS[k].nombre}`);
  }
  const usadas = Object.keys(cuenta).length;
  console.log(`\nfamilias con contenido: ${usadas}/${Object.keys(FAMILIAS).length}`);

  if (process.argv.includes('--muestra')) {
    console.log('\n--- sin familia (muestra) ---');
    for (const s of sinEjemplos) console.log('  ' + s);
  }

  if (process.argv.includes('--escribir')) {
    const doc = {
      version: 1,
      generadoPor: 'tools/curar-trampas.mjs',
      criterio: 'una sola familia por pregunta, la primera regla que dispara con evidencia clara; sin evidencia, sin familia',
      familias: FAMILIAS,
      total, clasificadas,
      entradas,
    };
    writeFileSync('datos/trampas.json', JSON.stringify(doc));
    console.log('\nescrito datos/trampas.json');
  }
}
