// CARNET QUEST — juice §10: sellos, confeti, XP flotante, contadores, toasts

import { sonido, haptic } from './audio.js';

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Sello full-screen estilo GTA ("MISIÓN SUPERADA"). Devuelve promesa al retirarse. */
export function sello(texto, tipo = 'ok', sub = '') {
  return new Promise((resolve) => {
    const ov = document.createElement('div');
    ov.className = 'sello-overlay';
    ov.innerHTML = `<div class="sello sello--${tipo}">${texto}${sub ? `<span class="sub">${sub}</span>` : ''}</div>`;
    document.body.appendChild(ov);
    sonido.sello();
    haptic.medio();
    const fuera = () => { ov.remove(); resolve(); };
    setTimeout(fuera, reduceMotion() ? 600 : 1500);
    ov.addEventListener('click', fuera, { once: true });
  });
}

/** Confeti de mini-señales (§10: mundo completado / subida de rango). */
export function confeti(n = 26) {
  if (reduceMotion()) return;
  const glifos = ['⛔', '⚠️', '🔵', '🔺', '🅿️', '🏁', '⭐', '🔧'];
  for (let i = 0; i < n; i++) {
    const p = document.createElement('span');
    p.className = 'confeti-p';
    p.textContent = glifos[Math.floor(Math.random() * glifos.length)];
    p.style.left = `${Math.random() * 100}vw`;
    p.style.animationDuration = `${1.6 + Math.random() * 1.6}s`;
    p.style.animationDelay = `${Math.random() * 0.5}s`;
    p.style.fontSize = `${0.9 + Math.random() * 0.9}rem`;
    document.body.appendChild(p);
    setTimeout(() => p.remove(), 4200);
  }
}

/** +XP flotante junto al punto tocado. */
export function xpFlotante(x, y, cantidad) {
  const el = document.createElement('div');
  el.className = 'xp-float';
  el.textContent = `+${cantidad} XP`;
  el.style.left = `${Math.min(Math.max(x - 20, 10), window.innerWidth - 90)}px`;
  el.style.top = `${y - 30}px`;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 950);
}

/** Contador que rueda de a→b (XP, chapas). */
export function rodarContador(el, desde, hasta, dur = 700) {
  if (reduceMotion()) { el.textContent = String(hasta); return; }
  const t0 = performance.now();
  const paso = (t) => {
    const p = Math.min(1, (t - t0) / dur);
    const v = Math.round(desde + (hasta - desde) * (1 - Math.pow(1 - p, 3)));
    el.textContent = String(v);
    if (p < 1) requestAnimationFrame(paso);
  };
  requestAnimationFrame(paso);
}

let toastActivo = null;
export function toast(msg, ms = 2200) {
  if (toastActivo) toastActivo.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = msg;
  document.body.appendChild(el);
  toastActivo = el;
  setTimeout(() => {
    el.classList.add('saliendo');
    setTimeout(() => { el.remove(); if (toastActivo === el) toastActivo = null; }, 240);
  }, ms);
}

/** Shake de card al fallar + flash rojo suave de pantalla. */
export function sacudir(el) {
  el.classList.remove('q-card--shake');
  void el.offsetWidth; // reinicia la animación
  el.classList.add('q-card--shake');
  document.body.classList.add('flash-rojo');
  setTimeout(() => document.body.classList.remove('flash-rojo'), 450);
}

export function glowCombo(on) {
  document.body.classList.toggle('glow-combo', on && !reduceMotion());
}
