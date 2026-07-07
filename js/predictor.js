// CARNET QUEST — Predictor de Aprobado §8.5. Prohibido inflarlo.

import { getEstado } from './state.js';

/**
 * % de probabilidad de APTO estimada con:
 *  - precisión de las últimas 200 respuestas ponderada por recencia (50%)
 *  - cobertura del temario: preguntas vistas / banco total (25%)
 *  - resultado de los últimos 5 simulacros (25%)
 * Con topes honestos: sin datos no hay número alegre.
 */
export function calcularPredictor(totalBanco) {
  const s = getEstado();
  const resp = s.respuestas.slice(-200);
  if (resp.length < 30) {
    return { listo: false, minimo: 30, hechas: resp.length };
  }

  // precisión ponderada: lo reciente pesa más
  let peso = 0, suma = 0;
  resp.forEach((r, i) => {
    const w = Math.exp((i - resp.length) / 80); // ~e^-2.5 la más vieja
    peso += w;
    suma += w * (r.ok ? 1 : 0);
  });
  const precision = suma / peso;

  const vistasUnicas = Object.keys(s.vistas).length;
  const cobertura = totalBanco > 0 ? Math.min(1, vistasUnicas / totalBanco) : 0;

  const sims = s.simulacros.slice(-5);
  let notaSims = 0;
  if (sims.length) {
    notaSims = sims.reduce((acc, x) => acc + Math.max(0, Math.min(1, 1 - Math.max(0, x.fallos - 3) * 0.12 - (x.apto ? 0 : 0.15))), 0) / sims.length;
  }

  let pct = 100 * (0.5 * precision + 0.25 * cobertura + 0.25 * notaSims);

  // topes de honestidad: sin simulacros no pasas de 75; con poca cobertura, tampoco
  if (sims.length === 0) pct = Math.min(pct, 75);
  if (sims.length < 3) pct = Math.min(pct, 85);
  if (cobertura < 0.35) pct = Math.min(pct, 55 + cobertura * 60);

  const aptosSeguidos = (() => {
    let c = 0;
    for (let i = s.simulacros.length - 1; i >= 0; i--) {
      if (s.simulacros[i].apto) c++; else break;
    }
    return c;
  })();

  return {
    listo: true,
    pct: Math.round(Math.max(2, Math.min(99, pct))),
    precision: Math.round(precision * 100),
    cobertura: Math.round(cobertura * 100),
    simulacros: sims.length,
    aptosSeguidos,
    recomendacion: aptosSeguidos >= 5 && pct >= 90,
  };
}
