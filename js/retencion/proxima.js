// CARNET QUEST — "Tu Próxima Parada".
//
// Al terminar una sesión con sustancia, el juego deja preparada UNA sesión corta
// concreta para la próxima vez. La idea: no te vas sin saber qué te espera.
//
// Reglas innegociables (§12, cero dark patterns):
//   · Solo puede haber UNA pendiente. Jamás se acumulan siete deberes atrasados.
//   · No caduca. Si vuelves en cinco días, sigue ahí igual de válida.
//   · No penaliza: no quita XP, ni racha, ni toca el Predictor por no volver.
//   · No bloquea nada. El juego entero sigue disponible en todo momento.
//   · La parte "en frío" se sirve a partir del día local siguiente, porque su
//     valor pedagógico es comprobar el recuerdo espaciado. Pero eso NO impide
//     jugar hoy: solo cambia lo que dice la tarjeta.

import { getEstado, guardar, HOY } from '../state.js';
import { colaRepaso } from '../srs.js';

export const VERSION_PROXIMA = 1;
const N_FRIO = 3;
const N_RUTA = 5;

const idCorto = () => Math.random().toString(36).slice(2, 8);

/** Suma días a una fecha local YYYY-MM-DD. */
function sumarDias(fecha, dias) {
  const d = new Date(`${fecha}T00:00:00`);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

/**
 * Elige los recuerdos en frío: lo que más se te puede haber olvidado de ayer.
 * Prioridad: fallos recientes > poca estabilidad en Leitner > visto hace poco.
 */
function elegirFrio(bancoTotal, excluir) {
  const s = getEstado();
  const porId = new Map(bancoTotal.map((q) => [q.id, q]));
  const puntuar = (id) => {
    const srs = s.srs[id];
    let p = 0;
    if (s.taller[id]) p += 100 + (s.taller[id].fallos || 0) * 10;  // errores recientes
    if (srs) p += Math.max(0, 6 - (srs.caja || 0)) * 12;           // poca estabilidad
    return p;
  };
  // solo lo ya visto: un "recuerdo en frío" de algo nuevo no tiene sentido
  const recientes = [...new Set(s.respuestas.slice(-120).map((r) => r.id))].reverse();
  return recientes
    .filter((id) => porId.has(id) && !excluir.has(id))
    .map((id) => ({ id, p: puntuar(id) }))
    .sort((a, b) => b.p - a.p)
    .slice(0, N_FRIO)
    .map((x) => porId.get(x.id));
}

/**
 * Prepara la próxima parada. Reutiliza el motor pedagógico existente
 * (colaRepaso) en vez de montar un segundo sistema de selección paralelo.
 *
 * @param {object[]} bancoTotal  preguntas accesibles (ya filtradas por Pase)
 * @param {object[]} cruces      puzzles de cruce disponibles
 * @param {string}   origenId    id de la sesión que la generó
 */
export function prepararProxima(bancoTotal, cruces, origenId = null) {
  // Solo puede haber UNA pendiente. Si ya hay una esperando, se respeta: la
  // parada prometida es la que el jugador pudo apuntarse en el calendario.
  if (proximaPendiente()) return null;
  if (!bancoTotal || bancoTotal.length < N_FRIO + N_RUTA) return null;
  const hoy = HOY();
  const usados = new Set();

  const frio = elegirFrio(bancoTotal, usados);
  frio.forEach((q) => usados.add(q.id));

  // ruta: el propio motor Leitner decide, y se rellena con lo menos visto
  const s = getEstado();
  const repaso = colaRepaso(bancoTotal, usados).slice(0, N_RUTA);
  repaso.forEach((q) => usados.add(q.id));
  const ruta = repaso.slice();
  if (ruta.length < N_RUTA) {
    const frescas = bancoTotal
      .filter((q) => !usados.has(q.id))
      .sort((a, b) => (s.vistas[a.id] || 0) - (s.vistas[b.id] || 0));
    for (const q of frescas) {
      if (ruta.length >= N_RUTA) break;
      ruta.push(q); usados.add(q.id);
    }
  }

  // el cruce es la guinda; si no hay ninguno elegible, la parada sigue valiendo
  const cruceLibre = (cruces || []).filter((c) => !usados.has(c.id));
  const cruce = cruceLibre.length
    ? cruceLibre.sort((a, b) => (s.vistas[a.id] || 0) - (s.vistas[b.id] || 0))[0]
    : null;

  if (frio.length === 0 && ruta.length === 0) return null;

  return {
    version: VERSION_PROXIMA,
    id: `np-${Date.now().toString(36)}-${idCorto()}`,
    createdAt: new Date().toISOString(),
    createdLocalDate: hoy,
    readyLocalDate: sumarDias(hoy, 1),   // el "en frío" cobra sentido mañana
    estimatedSeconds: (frio.length + ruta.length) * 25 + (cruce ? 60 : 0),
    sourceSessionId: origenId,
    coldCheckQuestionIds: frio.map((q) => q.id),
    routeQuestionIds: ruta.map((q) => q.id),
    puzzleId: cruce ? cruce.id : null,
    fallbackType: cruce ? null : 'sin-cruce',
    status: 'pendiente',
    calendarPreference: null,
    completedAt: null,
  };
}

/** Guarda la parada. Solo puede existir una pendiente: nunca se acumulan. */
export function guardarProxima(np) {
  if (!np) return null;
  const s = getEstado();
  // segunda barrera: nada pisa una parada pendiente, ni por error de llamada
  const yaHay = proximaPendiente();
  if (yaHay && yaHay.id !== np.id) return yaHay;
  s.proxima = np;
  guardar();
  return np;
}

export function proximaPendiente() {
  const p = getEstado()?.proxima;
  return p && p.status === 'pendiente' ? p : null;
}

/** ¿Ya se puede jugar la parte en frío, o todavía es "preparada para mañana"? */
export function proximaLista(np = proximaPendiente()) {
  return !!np && HOY() >= np.readyLocalDate;
}

export function marcarCompletada() {
  const s = getEstado();
  if (!s.proxima) return;
  s.proxima.status = 'completada';
  s.proxima.completedAt = new Date().toISOString();
  guardar();
}

export function recordarHoraCalendario(hora) {
  const s = getEstado();
  s.prefs.horaRecordatorio = hora;
  if (s.proxima) s.proxima.calendarPreference = hora;
  guardar();
}

/** Reconstruye las preguntas reales a partir de los ids guardados. */
export function materializar(np, bancoTotal, cruces) {
  const porId = new Map(bancoTotal.map((q) => [q.id, q]));
  const crucePorId = new Map((cruces || []).map((c) => [c.id, c]));
  const frio = (np.coldCheckQuestionIds || []).map((id) => porId.get(id)).filter(Boolean);
  const ruta = (np.routeQuestionIds || []).map((id) => porId.get(id)).filter(Boolean);
  const cruce = np.puzzleId ? crucePorId.get(np.puzzleId) : null;
  // sin duplicados aunque el banco haya cambiado entre versiones
  const vistos = new Set();
  const lista = [...frio, ...ruta, ...(cruce ? [cruce] : [])].filter((q) => {
    if (!q || vistos.has(q.id)) return false;
    vistos.add(q.id);
    return true;
  });
  return { lista, nFrio: frio.length };
}
