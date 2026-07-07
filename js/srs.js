// CARNET QUEST — motor pedagógico §8: Leitner 5 cajas invisible + Taller de Errores

import { getEstado, guardar, HOY } from './state.js';

// Intervalos Leitner (días) por caja 1-5
const INTERVALOS = [0, 0, 1, 3, 7, 16];
const MAX_CAJA = 5;

function sumarDias(fecha, dias) {
  const d = new Date(fecha + 'T00:00:00');
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

/** Actualiza SRS + Taller tras responder. Devuelve eventos para la UI. */
export function procesarRespuesta(pregunta, ok) {
  const s = getEstado();
  const hoy = HOY();
  const id = pregunta.id;
  const eventos = { reparado: false, alTaller: false, seBusca: false, senalColeccionada: null };

  let item = s.srs[id];
  if (!item) item = s.srs[id] = { caja: 0, vence: hoy };

  if (ok) {
    item.caja = Math.min(MAX_CAJA, (item.caja || 0) + 1);
    item.vence = sumarDias(hoy, INTERVALOS[item.caja]);

    // reparación en el Taller: 2 aciertos en días distintos (§8.2)
    const av = s.taller[id];
    if (av) {
      if (av.ultimoDiaRep !== hoy) {
        av.reparaciones = (av.reparaciones || 0) + 1;
        av.ultimoDiaRep = hoy;
      }
      if (av.reparaciones >= 2) {
        delete s.taller[id];
        eventos.reparado = true;
        eventos.recompensaSeBusca = av.fallos >= 3 ? 40 : 0;
      }
    }

    // álbum: señal acertada 2 veces se colecciona (§7)
    if (pregunta.senalId) {
      const antes = s.album[pregunta.senalId] || 0;
      s.album[pregunta.senalId] = antes + 1;
      if (antes + 1 === 2) eventos.senalColeccionada = pregunta.senalId;
    }
  } else {
    item.caja = 1;
    item.vence = hoy; // vuelve a entrar cuanto antes
    const av = s.taller[id] || (s.taller[id] = { fallos: 0, reparaciones: 0, ultimoDiaRep: null });
    av.fallos += 1;
    av.reparaciones = 0;
    eventos.alTaller = true;
    eventos.seBusca = av.fallos >= 3;
  }

  guardar();
  return eventos;
}

/** Cola de repaso: falladas recientes > vencidas > señales sin coleccionar (§8.1). */
export function colaRepaso(bancoTotal, excluir = new Set()) {
  const s = getEstado();
  const hoy = HOY();
  const porId = new Map(bancoTotal.map((q) => [q.id, q]));
  const puntuar = (id) => {
    const it = s.srs[id];
    let p = 0;
    if (s.taller[id]) p += 100 + (s.taller[id].fallos || 0) * 10;
    if (it && it.vence <= hoy) p += 50 + (MAX_CAJA - it.caja) * 5;
    const q = porId.get(id);
    if (q && q.senalId && (s.album[q.senalId] || 0) < 2) p += 20;
    return p;
  };
  return Object.keys(s.srs)
    .filter((id) => porId.has(id) && !excluir.has(id))
    .map((id) => ({ q: porId.get(id), p: puntuar(id) }))
    .filter((x) => x.p > 0)
    .sort((a, b) => b.p - a.p)
    .map((x) => x.q);
}

export function cochesDelTaller(bancoTotal) {
  const s = getEstado();
  const porId = new Map(bancoTotal.map((q) => [q.id, q]));
  return Object.entries(s.taller)
    .filter(([id]) => porId.has(id))
    .map(([id, av]) => ({ q: porId.get(id), ...av }))
    .sort((a, b) => b.fallos - a.fallos);
}
