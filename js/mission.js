// CARNET QUEST — composición de misiones y economía (§6, §7)

import { getEstado, guardar, mundoEstado } from './state.js';
import { colaRepaso } from './srs.js';

export const RANGO_XP_ACIERTO = 10;

export function multiplicadorCombo(racha) {
  if (racha >= 10) return 3;
  if (racha >= 5) return 2;
  return 1;
}

export function estrellasPorAciertos(aciertos, total) {
  const fallos = total - aciertos;
  if (fallos === 0) return 3;
  if (fallos === 1) return 2;
  if (fallos === 2) return 1;
  return 0;
}

function barajar(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Misión estándar: ~70% nuevas del mundo + ~30% repaso SRS camuflado (§8.1). */
export function componerMision(banco, bancoTotal, misionIdx, n = 10) {
  const s = getEstado();
  const nNuevas = Math.ceil(n * 0.7);

  // rotación por misión para que cada slot cubra una zona distinta del banco
  const start = banco.length ? (misionIdx * 9) % banco.length : 0;
  const rotado = banco.slice(start).concat(banco.slice(0, start));
  const nuevas = rotado
    .slice()
    .sort((a, b) => (s.vistas[a.id] || 0) - (s.vistas[b.id] || 0))
    .slice(0, nNuevas);

  const elegidas = new Set(nuevas.map((q) => q.id));
  const repaso = colaRepaso(bancoTotal, elegidas).slice(0, n - nuevas.length);
  repaso.forEach((q) => elegidas.add(q.id));

  // relleno si no hay repaso suficiente
  const relleno = [];
  for (const q of rotado) {
    if (nuevas.length + repaso.length + relleno.length >= n) break;
    if (!elegidas.has(q.id)) { relleno.push(q); elegidas.add(q.id); }
  }

  // mezcla invisible: el jugador no distingue repaso de nuevas; rampa suave de dificultad
  const todas = barajar(nuevas.concat(repaso, relleno));
  todas.sort((a, b) => {
    const ia = todas.indexOf(a); // conserva aleatoriedad dentro de la misma dificultad
    return (a.dificultad - b.dificultad) || (ia - todas.indexOf(b));
  });
  return todas.slice(0, n);
}

/** Boss de mundo: 15 preguntas del mundo, priorizando tus fallos (hasta 5). */
export function componerBoss(banco, n = 15) {
  const s = getEstado();
  const falladas = banco.filter((q) => s.taller[q.id]);
  const resto = banco.filter((q) => !s.taller[q.id]);
  return barajar(barajar(falladas).slice(0, 5).concat(barajar(resto)).slice(0, n));
}

/** Examen DGT Tower: 30 preguntas de todo el temario disponible. */
export function componerExamen(bancoTotal, n = 30) {
  return barajar(bancoTotal).slice(0, n);
}

/** Boss del Taller: solo tus fallos. */
export function componerTaller(cochesAveriados, n = 10) {
  return barajar(cochesAveriados.map((c) => c.q)).slice(0, n);
}

/* ------- economía ------- */

export function darXP(cantidad, rangos) {
  const s = getEstado();
  const antes = rangoActual(rangos, s.xp);
  s.xp += cantidad;
  const despues = rangoActual(rangos, s.xp);
  guardar();
  return { subida: despues.idx > antes.idx ? despues : null };
}

export function rangoActual(rangos, xp) {
  let idx = 0;
  for (let i = 0; i < rangos.length; i++) if (xp >= rangos[i].xp) idx = i;
  return { idx, ...rangos[idx], siguiente: rangos[idx + 1] || null };
}

export function darChapas(n) {
  const s = getEstado();
  s.chapas += n;
  guardar();
}

/** Cofre al acabar misión: recompensa variable, NUNCA contenido educativo (§7). */
export function abrirCofre(estrellas) {
  const s = getEstado();
  const r = Math.random();
  if (r < 0.12 && s.racha.protectores < 3) {
    s.racha.protectores += 1;
    guardar();
    return { tipo: 'protector' };
  }
  const base = 8 + estrellas * 6;
  const chapas = base + Math.floor(Math.random() * 12);
  s.chapas += chapas;
  guardar();
  return { tipo: 'chapas', n: chapas };
}

export function guardarEstrellas(mundoN, misionIdx, estrellas) {
  const m = mundoEstado(mundoN);
  const antes = m.estrellas[misionIdx] || 0;
  if (estrellas > antes) m.estrellas[misionIdx] = estrellas;
  guardar();
  return estrellas > antes ? estrellas - antes : 0;
}
