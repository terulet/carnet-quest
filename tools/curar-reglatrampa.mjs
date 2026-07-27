// CARNET QUEST — curador del manifiesto "Regla contra Trampa".
//
// DECISIÓN DE CONTENIDO, documentada a propósito:
//
// El plan original era usar `explicacion_corta` como regla verdadera y el campo
// `trampa` como afirmación falsa. No se puede: en este banco `trampa` es un
// META-COMENTARIO sobre por qué la respuesta incorrecta tienta ("mucha gente
// cede solo al de su derecha…"), no una proposición falsa autónoma. Convertirla
// en una lo exigiría reescribirla, y eso sería generar normativa nueva por
// paráfrasis, que está prohibido.
//
// Así que la tarjeta se construye con el par (opción correcta, opción
// incorrecta) de la propia pregunta, que YA está verificado: por construcción
// una es cierta y la otra falsa en el contexto de su enunciado. No se inventa
// ni una palabra; solo se reordena texto ya auditado.
//
// Uso:  node tools/curar-reglatrampa.mjs [--escribir]

import { readFileSync, writeFileSync } from 'node:fs';

const MUNDOS = Array.from({ length: 15 }, (_, i) => String(i + 1).padStart(2, '0'));
const VETADAS = /todas las anteriores|ninguna de|ninguna es|a y b|byc|las dos anteriores|todas son/i;
const MARCA_DUDA = /\[VERIFICAR/i;

const limpio = (t) => String(t || '').trim();
const palabras = (t) => new Set(limpio(t).toLowerCase().replace(/[^\wáéíóúñü ]/g, '').split(/\s+/).filter((w) => w.length > 3));

/** Solape de vocabulario: la incorrecta más parecida a la correcta es la que más tienta. */
function solape(a, b) {
  const A = palabras(a), B = palabras(b);
  if (!A.size || !B.size) return 0;
  let n = 0;
  for (const w of A) if (B.has(w)) n++;
  return n / Math.min(A.size, B.size);
}

function fraseAceptable(t) {
  const s = limpio(t);
  if (s.length < 15 || s.length > 130) return false;
  if (VETADAS.test(s)) return false;
  if (MARCA_DUDA.test(s)) return false;
  if (!/^[A-ZÁÉÍÓÚÑ0-9¿«"]/.test(s)) return false;   // debe leerse como afirmación, no como fragmento
  return true;
}

const entradas = [];
const descartes = { enunciado: 0, opciones: 0, vetadas: 0, gemelas: 0, duda: 0 };

for (const m of MUNDOS) {
  let banco;
  try { banco = JSON.parse(readFileSync(`datos/preguntas/mundo-${m}.json`, 'utf8')); }
  catch { continue; }

  for (const q of banco) {
    const enunciado = limpio(q.pregunta);
    if (enunciado.length < 15 || enunciado.length > 160) { descartes.enunciado++; continue; }
    if (MARCA_DUDA.test(enunciado) || MARCA_DUDA.test(q.explicacion_corta || '')) { descartes.duda++; continue; }
    if (!Array.isArray(q.opciones) || q.opciones.length < 2) { descartes.opciones++; continue; }

    const correcta = limpio(q.opciones[q.correcta]);
    if (!fraseAceptable(correcta)) { descartes.opciones++; continue; }

    const incorrectas = q.opciones
      .map((o, i) => ({ t: limpio(o), i }))
      .filter((o) => o.i !== q.correcta && fraseAceptable(o.t));
    if (!incorrectas.length) { descartes.vetadas++; continue; }

    // la más tentadora = la que más vocabulario comparte con la correcta,
    // pero descartando las casi idénticas (serían un pique de lectura, no de norma)
    const candidatas = incorrectas
      .map((o) => ({ ...o, s: solape(correcta, o.t) }))
      .filter((o) => o.s < 0.85)
      .sort((a, b) => b.s - a.s);
    if (!candidatas.length) { descartes.gemelas++; continue; }

    entradas.push({
      questionId: q.id,
      contexto: enunciado,
      ruleText: correcta,
      trapText: candidatas[0].t,
      reviewStatus: 'auto-derivado-de-opciones-verificadas',
      sourceFields: ['pregunta', `opciones[${q.correcta}]`, `opciones[${candidatas[0].i}]`],
    });
  }
}

// Poda: como mucho N por mundo, quedándose con las trampas más tentadoras
// (mayor solape de vocabulario con la regla). Variedad sin inflar el manifiesto,
// que se descarga aparte del arranque.
const POR_MUNDO = 14;
const porMundo = new Map();
for (const e of entradas) {
  const m = e.questionId.slice(1, 3);
  if (!porMundo.has(m)) porMundo.set(m, []);
  porMundo.get(m).push(e);
}
const podadas = [];
for (const [, lista] of [...porMundo.entries()].sort()) {
  podadas.push(...lista.slice(0, POR_MUNDO));
}

const manifiesto = {
  version: 1,
  generadoPor: 'tools/curar-reglatrampa.mjs',
  criterio: 'par (opción correcta, opción incorrecta) del banco ya verificado; sin texto nuevo',
  entradas: podadas,
};

console.log(`candidatas: ${entradas.length} · tras poda: ${podadas.length}`);
console.log('descartes:', descartes);

if (process.argv.includes('--escribir')) {
  writeFileSync('datos/reglatrampa.json', JSON.stringify(manifiesto));
  console.log('escrito datos/reglatrampa.json');
}
