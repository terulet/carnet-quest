// CARNET QUEST — retos por enlace, sin servidor.
//
// Dos personas abren el mismo enlace y juegan EXACTAMENTE el mismo recorrido.
// No hay sincronización, ni ranking, ni cuentas: el marcador es la conversación
// que ya tienen por WhatsApp. Eso no se simula, se aprovecha.
//
// El enlace lleva solo versión, modo y semilla. Nunca nombre, resultado,
// progreso ni nada que identifique a nadie.
//
// Módulo diferido: no entra en el arranque.

export const VERSION_RETO = 1;

/* ---------- PRNG determinista (mulberry32) ---------- */
// Math.random no sirve: dos móviles darían retos distintos con la misma semilla.

export function prng(semilla) {
  let a = semilla >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Baraja determinista (Fisher-Yates alimentado por el PRNG). */
export function barajarCon(rnd, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export const nuevaSemilla = () => Math.floor(Math.random() * 1e6);

export const MODOS = {
  mix5: { n: 5, etiqueta: '5 preguntas' },
  signals: { n: 6, etiqueta: '6 señales' },
  crossing: { n: 1, etiqueta: '1 cruce' },
};

/**
 * Construye el reto. Determinista: misma (versión, modo, semilla) → mismo
 * contenido, siempre, en cualquier dispositivo.
 *
 * @param {string} modo
 * @param {number} semilla
 * @param {object[]} bancoLibre  preguntas de los mundos GRATUITOS (v1)
 * @param {object[]} crucesLibres
 */
export function componerReto(modo, semilla, bancoLibre, crucesLibres) {
  const rnd = prng(semilla);
  if (modo === 'crossing') {
    const pool = (crucesLibres || []).slice().sort((a, b) => a.id.localeCompare(b.id));
    if (!pool.length) return null;
    return [barajarCon(rnd, pool)[0]];
  }
  let pool = bancoLibre.slice();
  if (modo === 'signals') pool = pool.filter((q) => q.senalId);
  // orden canónico antes de barajar: el orden de carga no puede influir
  pool.sort((a, b) => a.id.localeCompare(b.id));
  if (pool.length < 3) return null;
  const n = MODOS[modo]?.n || 5;
  return barajarCon(rnd, pool).slice(0, Math.min(n, pool.length));
}

/** #/reto?v=1&mode=mix5&seed=482731 — hash, para que funcione en hosting estático. */
export function urlReto(modo, semilla, base = location.href) {
  const limpia = base.split('#')[0];
  return `${limpia}#/reto?v=${VERSION_RETO}&mode=${modo}&seed=${semilla}`;
}

/** Lee el hash. Devuelve null si no es un reto; {error} si es inválido. */
export function leerHashReto(hash = location.hash) {
  if (!hash || !hash.startsWith('#/reto')) return null;
  const qs = hash.slice(hash.indexOf('?') + 1);
  const p = new URLSearchParams(qs);
  const v = Number(p.get('v'));
  const modo = p.get('mode');
  const semilla = Number(p.get('seed'));
  if (!Number.isFinite(v) || v > VERSION_RETO) return { error: 'version' };
  if (!MODOS[modo]) return { error: 'modo' };
  if (!Number.isFinite(semilla) || semilla < 0) return { error: 'semilla' };
  return { version: v, modo, semilla };
}
