/* ============================================================
   juice.js — El "juice": confeti, sonidos (Web Audio) y vibración.
   Fallar suena NEUTRO, nunca humillante (principio #6).
   Todo desactivable desde ajustes.
   ============================================================ */
(function () {
  'use strict';

  var ac = null;
  function ctx() {
    if (!ac) {
      try { ac = new (window.AudioContext || window.webkitAudioContext)(); }
      catch (e) { ac = null; }
    }
    return ac;
  }
  function sonidoOn() { return Store.state.settings.sonido; }
  function vibrarOn() { return Store.state.settings.vibracion; }

  // Tono simple
  function tono(freq, dur, tipo, vol, delay) {
    if (!sonidoOn()) return;
    var c = ctx(); if (!c) return;
    var t0 = c.currentTime + (delay || 0);
    var o = c.createOscillator(), g = c.createGain();
    o.type = tipo || 'sine';
    o.frequency.setValueAtTime(freq, t0);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.2, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + dur + 0.02);
  }

  var Juice = {
    acierto: function () {
      tono(660, 0.12, 'triangle', 0.2, 0);
      tono(880, 0.14, 'triangle', 0.2, 0.09);
      vibrar(20);
    },
    fallo: function () {
      // neutro: un tono suave y grave, sin estridencia
      tono(300, 0.16, 'sine', 0.14, 0);
      vibrar([10, 40, 10]);
    },
    nivel: function () {
      tono(523, 0.12, 'triangle', 0.22, 0);
      tono(659, 0.12, 'triangle', 0.22, 0.1);
      tono(784, 0.12, 'triangle', 0.22, 0.2);
      tono(1046, 0.22, 'triangle', 0.24, 0.3);
      vibrar([30, 30, 30]);
    },
    logro: function () {
      tono(784, 0.1, 'square', 0.16, 0);
      tono(988, 0.1, 'square', 0.16, 0.08);
      tono(1318, 0.25, 'square', 0.18, 0.16);
      vibrar([40, 20, 40]);
    },
    tick: function () { tono(440, 0.04, 'sine', 0.08, 0); },
    confeti: confeti
  };

  function vibrar(p) {
    if (vibrarOn() && navigator.vibrate) { try { navigator.vibrate(p); } catch (e) {} }
  }

  // Confeti en canvas (sin librerías)
  function confeti(opts) {
    opts = opts || {};
    var n = opts.n || 90;
    var cv = document.createElement('canvas');
    cv.className = 'confeti-canvas';
    cv.width = window.innerWidth; cv.height = window.innerHeight;
    document.body.appendChild(cv);
    var g = cv.getContext('2d');
    var colores = ['#ffd23f', '#ff6b6b', '#4ecdc4', '#5b8cff', '#c780ff', '#ffffff'];
    var parts = [];
    for (var i = 0; i < n; i++) {
      parts.push({
        x: Math.random() * cv.width,
        y: -20 - Math.random() * cv.height * 0.3,
        r: 4 + Math.random() * 6,
        c: colores[Math.floor(Math.random() * colores.length)],
        vx: (Math.random() - 0.5) * 4,
        vy: 2 + Math.random() * 4,
        rot: Math.random() * 6.28,
        vr: (Math.random() - 0.5) * 0.3
      });
    }
    var frames = 0, max = 160;
    function step() {
      g.clearRect(0, 0, cv.width, cv.height);
      parts.forEach(function (p) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.rot += p.vr;
        g.save(); g.translate(p.x, p.y); g.rotate(p.rot);
        g.fillStyle = p.c; g.fillRect(-p.r / 2, -p.r / 2, p.r, p.r * 0.6);
        g.restore();
      });
      frames++;
      if (frames < max) requestAnimationFrame(step);
      else if (cv.parentNode) cv.parentNode.removeChild(cv);
    }
    requestAnimationFrame(step);
  }

  window.Juice = Juice;
})();
