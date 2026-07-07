// CARNET QUEST — sonido 100% procedural con WebAudio (0 KB de assets) + haptics (§10)

import { getEstado } from './state.js';

let ctx = null;
let silencioExamen = false;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// desbloquear audio en el primer gesto (iOS)
export function armarAudio() {
  const arrancar = () => { ac(); document.removeEventListener('touchstart', arrancar); document.removeEventListener('click', arrancar); };
  document.addEventListener('touchstart', arrancar, { once: true, passive: true });
  document.addEventListener('click', arrancar, { once: true });
}

export function setModoExamen(on) { silencioExamen = on; }

function activo() {
  return !silencioExamen && getEstado()?.ajustes?.sonido !== false;
}

function tono({ freq = 440, dur = 0.12, tipo = 'sine', vol = 0.22, delay = 0, slide = 0, curva = 'exp' }) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = tipo;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
  if (curva === 'exp') g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  else g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

function ruido({ dur = 0.15, vol = 0.12, delay = 0, freq = 900 }) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + delay;
  const n = Math.floor(c.sampleRate * dur);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(c.destination);
  src.start(t0);
}

export const sonido = {
  tap() { if (activo()) tono({ freq: 660, dur: 0.05, tipo: 'triangle', vol: 0.08 }); },
  acierto() {
    if (!activo()) return;
    tono({ freq: 740, dur: 0.09, tipo: 'triangle', vol: 0.2 });
    tono({ freq: 1180, dur: 0.14, tipo: 'triangle', vol: 0.18, delay: 0.07 });
  },
  fallo() {
    // grave, NO punitivo (§10)
    if (!activo()) return;
    tono({ freq: 190, dur: 0.22, tipo: 'sine', vol: 0.22, slide: -80 });
    ruido({ dur: 0.12, vol: 0.05, freq: 300 });
  },
  comboSube(nivel) {
    if (!activo()) return;
    const base = nivel >= 3 ? 620 : 520;
    [0, 4, 7].forEach((st, i) => tono({ freq: base * Math.pow(2, st / 12), dur: 0.1, tipo: 'square', vol: 0.07, delay: i * 0.06 }));
  },
  comboRoto() {
    if (!activo()) return;
    tono({ freq: 330, dur: 0.16, tipo: 'sine', vol: 0.14, slide: -120 });
  },
  estrella(i = 0) {
    if (!activo()) return;
    tono({ freq: 880 * Math.pow(2, i * 4 / 12), dur: 0.18, tipo: 'triangle', vol: 0.2, delay: 0 });
  },
  sello() {
    if (!activo()) return;
    tono({ freq: 120, dur: 0.25, tipo: 'sine', vol: 0.3, slide: -40 });
    ruido({ dur: 0.18, vol: 0.14, freq: 700 });
  },
  cofre() {
    if (!activo()) return;
    tono({ freq: 300, dur: 0.35, tipo: 'sawtooth', vol: 0.06, slide: 500 });
    [0, 4, 7, 12].forEach((st, i) => tono({ freq: 660 * Math.pow(2, st / 12), dur: 0.12, tipo: 'triangle', vol: 0.14, delay: 0.32 + i * 0.07 }));
  },
  fanfarria() {
    if (!activo()) return;
    [[0, 0], [4, .11], [7, .22], [12, .33], [12, .5], [16, .62]].forEach(([st, d]) =>
      tono({ freq: 523 * Math.pow(2, st / 12), dur: 0.22, tipo: 'square', vol: 0.09, delay: d }));
    ruido({ dur: 0.4, vol: 0.05, freq: 1500, delay: 0.5 });
  },
  derrota() {
    if (!activo()) return;
    [[7, 0], [4, .16], [0, .32]].forEach(([st, d]) =>
      tono({ freq: 392 * Math.pow(2, st / 12), dur: 0.22, tipo: 'sine', vol: 0.16, delay: d }));
  },
  tictac() { if (activo()) tono({ freq: 980, dur: 0.03, tipo: 'square', vol: 0.05 }); },
};

/* ------- haptics ------- */
function vibrar(patron) {
  if (getEstado()?.ajustes?.haptics === false) return;
  if (navigator.vibrate) navigator.vibrate(patron);
}
export const haptic = {
  ligero() { vibrar(8); },
  medio() { vibrar(18); },
  ok() { vibrar([8, 40, 12]); },
  ko() { vibrar(55); },
  celebracion() { vibrar([15, 40, 15, 40, 30]); },
};
