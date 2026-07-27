// CARNET QUEST — "Regla contra Trampa".
//
// Rompe la monotonía del test de cuatro opciones: dos tarjetas, una regla
// verdadera y una trampa. Elección binaria, rápida, con la misma exigencia.
//
// Integridad pedagógica (§8.5) — la parte que importa:
//   · El PRIMER intento es el que cuenta. Si fallas, cuenta como fallo real.
//   · La pregunta de cuatro opciones que aparece después es CORRECCIÓN GUIADA,
//     no un segundo intento: no borra el fallo ni infla la precisión.
//   · No se usa en la DGT Tower ni en los boss: allí manda el formato del examen.
//
// Módulo diferido: el manifiesto se descarga la primera vez que hace falta.

import { RULETRAP_MINIMO } from './flags.js';

let MANIFIESTO = null;
let disponible = null;      // null = aún sin comprobar

/** Valida una entrada. Lo dudoso se descarta: mejor menos tarjetas y seguras. */
function valida(e, vistos) {
  if (!e || typeof e !== 'object') return false;
  if (!e.questionId || vistos.has(e.questionId)) return false;
  const r = String(e.ruleText || '').trim();
  const t = String(e.trapText || '').trim();
  if (r.length < 10 || t.length < 10) return false;
  if (r.length > 200 || t.length > 200) return false;
  if (r.toLowerCase() === t.toLowerCase()) return false;
  if (!e.reviewStatus) return false;
  return true;
}

/** Carga y valida el manifiesto. Decide si el modo puede activarse. */
export async function cargarReglaTrampa() {
  if (MANIFIESTO) return MANIFIESTO;
  try {
    const doc = await (await fetch('datos/reglatrampa.json')).json();
    const vistos = new Set();
    const entradas = (doc.entradas || []).filter((e) => {
      if (!valida(e, vistos)) return false;
      vistos.add(e.questionId);
      return true;
    });
    MANIFIESTO = { version: doc.version || 1, porId: new Map(entradas.map((e) => [e.questionId, e])) };
    disponible = entradas.length >= RULETRAP_MINIMO;
  } catch {
    MANIFIESTO = { version: 0, porId: new Map() };
    disponible = false;
  }
  return MANIFIESTO;
}

export const estaDisponible = () => disponible === true;
export const totalTarjetas = () => (MANIFIESTO ? MANIFIESTO.porId.size : 0);

/** Tarjeta para una pregunta, o null si esa pregunta no tiene una segura. */
export function tarjetaDe(questionId) {
  const e = MANIFIESTO?.porId.get(questionId);
  if (!e) return null;
  // El lado de la regla alterna de forma determinista por id: si siempre
  // estuviera a la izquierda se aprendería la posición, no la norma.
  let h = 0;
  for (let i = 0; i < questionId.length; i++) h = (h * 31 + questionId.charCodeAt(i)) >>> 0;
  const reglaIzquierda = (h & 1) === 0;
  return { ...e, reglaIzquierda };
}
