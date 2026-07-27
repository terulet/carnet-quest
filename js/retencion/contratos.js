// CARNET QUEST — contratos de ruta.
//
// Tensión opcional en la misión normal. La clave ética: un contrato solo puede
// AÑADIR. Fallarlo no quita estrellas, ni XP, ni chapas que ya tuvieras, ni
// racha, ni toca el Predictor. Lo único que pasa es que no cobras el extra.
// Por eso la ruta normal es la opción por defecto y se ve igual de válida.

import { getEstado, guardar } from '../state.js';
import { darChapas } from '../mission.js';

/** Premio único y fijo, definido en un solo sitio. Sin "casi lo tenías". */
export const PREMIO_CHAPAS = 25;

/**
 * Catálogo. `posible` decide si el contrato puede ofrecerse con las preguntas
 * que realmente van a salir: nunca se ofrece algo imposible de cumplir.
 */
export const CONTRATOS = [
  {
    id: 'precision',
    texto: 'Termina con un máximo de un fallo.',
    posible: (lista) => lista.length >= 6,
    evaluar: (r) => r.fallos <= 1,
  },
  {
    id: 'sangre-fria',
    texto: 'Consigue cinco aciertos seguidos.',
    posible: (lista) => lista.length >= 6,
    evaluar: (r) => r.maxCombo >= 5,
  },
  {
    id: 'taller-movil',
    texto: 'Repara dos averías durante esta ruta.',
    // solo si de verdad viajan dos averías dentro de la misión
    posible: (lista) => {
      const s = getEstado();
      return lista.filter((q) => s.taller[q.id]).length >= 2;
    },
    evaluar: (r) => r.reparadas >= 2,
  },
  {
    id: 'senalizacion',
    texto: 'No falles ninguna pregunta de señales.',
    posible: (lista) => lista.filter((q) => q.senalId).length >= 3,
    evaluar: (r) => r.fallosSenal === 0,
  },
  {
    id: 'pre-boss',
    texto: 'Termina con un máximo de dos fallos.',
    posible: (lista) => lista.length >= 10,
    evaluar: (r) => r.fallos <= 2,
  },
];

/**
 * Ofrece un contrato posible, evitando repetir el último cuando hay alternativa.
 * @returns {object|null}
 */
export function ofrecerContrato(lista, ultimoId = null) {
  const posibles = CONTRATOS.filter((c) => c.posible(lista));
  if (!posibles.length) return null;
  // "precision" y "pre-boss" se solapan: si caben las dos, quédate con una
  const filtrados = posibles.filter((c) => !(c.id === 'pre-boss' && posibles.some((x) => x.id === 'precision')));
  const pool = filtrados.length ? filtrados : posibles;
  const sinRepetir = pool.filter((c) => c.id !== ultimoId);
  const finales = sinRepetir.length ? sinRepetir : pool;
  return finales[Math.floor(Math.random() * finales.length)];
}

/**
 * Resuelve el contrato al terminar la misión.
 * Idempotente: `yaCobrado` impide que recargar duplique el premio.
 */
export function resolverContrato(contrato, resumen, yaCobrado = false) {
  if (!contrato) return { hubo: false };
  const logrado = !!contrato.evaluar(resumen);
  const s = getEstado();
  if (logrado && !yaCobrado) {
    darChapas(PREMIO_CHAPAS);
    s.contratos.completados = (s.contratos.completados || 0) + 1;
  } else if (!logrado) {
    s.contratos.fallados = (s.contratos.fallados || 0) + 1;
  }
  guardar();
  // fallar NO resta nada: solo no suma
  return { hubo: true, logrado, premio: logrado && !yaCobrado ? PREMIO_CHAPAS : 0 };
}
