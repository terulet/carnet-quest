// CARNET QUEST — descubrimiento progresivo de modos.
//
// Antes, un jugador nuevo veía las cuatro tarjetas de modo el primer día y a
// partir de ahí ya no aparecía nada nuevo. Ahora la novedad se reparte por los
// primeros mundos. Reglas: la condición SIEMPRE se dice literal (nunca
// "próximamente", nunca cuentas atrás, nunca fechas inventadas) y el desbloqueo
// es inmediato en cuanto se cumple el hito.

import { getEstado, guardar } from '../state.js';

/** Cada modo declara su hito, cómo se mide y qué texto ve el jugador. */
export const HITOS = [
  {
    id: 'rush',
    // 12 señales coleccionadas: obliga a jugar de verdad, pero llega pronto
    cumple: (s) => Object.values(s.album || {}).filter((n) => (n || 0) >= 2).length >= 12,
    progreso: (s) => ({
      hechas: Object.values(s.album || {}).filter((n) => (n || 0) >= 2).length,
      total: 12,
    }),
  },
  {
    id: 'bote',
    cumple: (s) => Object.values(s.mundos || {}).some((m) => m && m.bossSuperado),
  },
  {
    id: 'torre',
    // "llegar al Mundo 2" = haber vencido al boss del Mundo 1
    cumple: (s) => !!s.mundos?.['1']?.bossSuperado,
  },
  {
    id: 'crono',
    cumple: (s) => (s.simulacros || []).length > 0,
  },
];

/**
 * Revisa los hitos y enciende lo que toque.
 * @returns {string[]} ids de los modos que se acaban de desbloquear (para celebrar)
 */
export function revisarDesbloqueos() {
  const s = getEstado();
  if (!s.desbloqueos) return [];
  const nuevos = [];
  for (const h of HITOS) {
    if (s.desbloqueos[h.id]) continue;      // ya estaba abierto: nunca se re-bloquea
    if (h.cumple(s)) { s.desbloqueos[h.id] = true; nuevos.push(h.id); }
  }
  if (nuevos.length) guardar();
  return nuevos;
}

export const estaDesbloqueado = (id) => getEstado()?.desbloqueos?.[id] !== false;

/** Progreso legible para pintar la condición exacta ("7 de 12 señales"). */
export function progresoDe(id) {
  const h = HITOS.find((x) => x.id === id);
  return h?.progreso ? h.progreso(getEstado()) : null;
}
