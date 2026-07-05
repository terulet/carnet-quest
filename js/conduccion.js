/* ============================================================
   conduccion.js — MINIJUEGO DE CONDUCCIÓN (arcade + aprendizaje).
   Tu coche avanza por una carretera de 3 carriles: esquiva obstáculos,
   recoge gasolina y, en los "controles de señal", métete en el carril
   cuyo significado corresponde a la señal que aparece. Reacción real.
   Canvas + requestAnimationFrame. Sin dependencias.
   ============================================================ */
(function () {
  'use strict';

  var W = 0, H = 0, dpr = 1;
  var cv, ctx, raf, running, onEnd;
  var st;

  // Señales usadas en los controles, con sus 3 significados (0 = correcto).
  var CONTROLES = [
    { tipo: 'stop', dibujo: dibSTOP, opciones: ['Detenerse del todo', 'Reducir sin parar', 'Prioridad para ti'] },
    { tipo: 'v50', dibujo: dibVel(50), opciones: ['Máximo 50 km/h', 'Mínimo 50 km/h', 'Recomendado 50'] },
    { tipo: 'v30', dibujo: dibVel(30), opciones: ['Máximo 30 km/h', 'Zona de 30 casas', 'Fin de límite'] },
    { tipo: 'noentry', dibujo: dibNoEntry, opciones: ['Dirección prohibida', 'Sentido obligatorio', 'Solo bicis'] },
    { tipo: 'ceda', dibujo: dibCeda, opciones: ['Ceder el paso', 'Tienes prioridad', 'Prohibido girar'] },
    { tipo: 'noadelantar', dibujo: dibNoAdelantar, opciones: ['No adelantar', 'Fin de adelantar', 'Dos carriles'] }
  ];

  var COLORS = { road: '#3a3f52', lane: '#e9edf7', grass: '#2b7d4f', car: '#ff5a5f' };

  function start(container, opts) {
    opts = opts || {};
    onEnd = opts.onEnd || function () {};
    container.innerHTML =
      '<div class="cond-wrap">' +
      '<div class="cond-hud">' +
      '<button class="cond-exit" id="condExit">✕</button>' +
      '<span id="condVidas" class="cond-vidas">❤️❤️❤️</span>' +
      '<span id="condScore" class="cond-score">0 m</span>' +
      '</div>' +
      '<canvas id="condCanvas"></canvas>' +
      '<div class="cond-controls">' +
      '<button class="cond-btn" id="btnL">◀</button>' +
      '<div class="cond-mid" id="condMsg"></div>' +
      '<button class="cond-btn" id="btnR">▶</button>' +
      '</div></div>';

    cv = container.querySelector('#condCanvas');
    ctx = cv.getContext('2d');
    resize();
    window.addEventListener('resize', resize);

    st = {
      lane: 1, carX: 0.5, targetX: 0.5,
      dist: 0, speed: 0.28, base: 0.28,
      vidas: 3, score: 0, gatesOK: 0, gatesFail: 0,
      ent: [],           // obstáculos / gasolina
      gate: null,        // control de señal activo
      nextObst: 0, nextGate: 1600,
      inv: 0, shake: 0, flash: null, over: false, senalesVistas: {}
    };
    setLanesX();

    container.querySelector('#btnL').addEventListener('click', function () { mover(-1); });
    container.querySelector('#btnR').addEventListener('click', function () { mover(1); });
    container.querySelector('#condExit').addEventListener('click', function () { terminar(true); });
    cv.addEventListener('pointerdown', onTap);
    document.addEventListener('keydown', onKey);

    running = true;
    st.last = null;
    loop(performance.now());
  }

  function onKey(e) {
    if (!running) return;
    if (e.key === 'ArrowLeft') mover(-1);
    else if (e.key === 'ArrowRight') mover(1);
  }
  function onTap(e) {
    var r = cv.getBoundingClientRect();
    mover((e.clientX - r.left) < r.width / 2 ? -1 : 1);
  }

  var lanesX = [0.2, 0.5, 0.8];
  function setLanesX() { lanesX = [0.22, 0.5, 0.78]; }

  function mover(d) {
    if (st.over) return;
    st.lane = Math.max(0, Math.min(2, st.lane + d));
    st.targetX = lanesX[st.lane];
    if (window.Juice) Juice.tick();
  }

  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    var wrap = cv.parentElement;
    W = wrap.clientWidth;
    H = wrap.clientHeight - 64 - 74; // hud + controles
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    cv.width = W * dpr; cv.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function loop(t) {
    if (!running) return;
    var dt = st.last ? Math.min(50, t - st.last) : 16;
    st.last = t;
    update(dt);
    draw();
    raf = requestAnimationFrame(loop);
  }

  function update(dt) {
    if (st.over) return;
    var f = dt / 16;
    st.speed = st.base + Math.min(0.22, st.dist / 60000);
    st.dist += st.speed * f * 6;
    st.score = Math.floor(st.dist / 10);

    // suavizar movimiento lateral
    st.carX += (st.targetX - st.carX) * 0.2 * f;

    // spawns
    st.nextObst -= st.speed * f * 6;
    if (st.nextObst <= 0 && !st.gate) {
      spawnObstOrGas();
      st.nextObst = 260 + Math.random() * 260;
    }
    st.nextGate -= st.speed * f * 6;
    if (st.nextGate <= 0 && !st.gate) { spawnGate(); st.nextGate = 2400 + Math.random() * 1200; }

    var carY = H - 90;

    // mover entidades
    for (var i = st.ent.length - 1; i >= 0; i--) {
      var e = st.ent[i];
      e.y += st.speed * f * 6;
      if (e.y > H + 40) { st.ent.splice(i, 1); continue; }
      if (Math.abs(e.y - carY) < 42 && e.lane === st.lane && !e.hit) {
        e.hit = true;
        if (e.tipo === 'gas') { st.score += 25; if (window.Juice) Juice.acierto(); st.ent.splice(i, 1); }
        else { golpe('¡Choque!'); st.ent.splice(i, 1); }
      }
    }

    // gate
    if (st.gate) {
      st.gate.y += st.speed * f * 6;
      if (st.gate.y >= carY && !st.gate.res) {
        st.gate.res = true;
        if (st.lane === st.gate.correct) {
          st.gatesOK++; st.score += 60; st.flash = { c: '#35d07f', t: 12 };
          setMsg('✅ ' + st.gate.opciones[st.gate.correct], '#35d07f');
          if (window.Gamif) Gamif.ganarXP(8);
          if (window.Juice) Juice.acierto();
        } else {
          st.gatesFail++; golpe('❌ Era: ' + st.gate.opciones[st.gate.correct]);
        }
      }
      if (st.gate.y > H + 80) st.gate = null;
    }

    if (st.inv > 0) st.inv -= f;
    if (st.shake > 0) st.shake -= f;
    if (st.flash) { st.flash.t -= f; if (st.flash.t <= 0) st.flash = null; }
  }

  function spawnObstOrGas() {
    var lane = Math.floor(Math.random() * 3);
    var gas = Math.random() < 0.32;
    st.ent.push({ lane: lane, y: -40, tipo: gas ? 'gas' : 'obst', kind: Math.floor(Math.random() * 3) });
  }
  function spawnGate() {
    var c = CONTROLES[Math.floor(Math.random() * CONTROLES.length)];
    st.senalesVistas[c.tipo] = 1;
    // barajar la posición del significado correcto entre los 3 carriles
    var orden = [0, 1, 2];
    for (var i = orden.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var tmp = orden[i]; orden[i] = orden[j]; orden[j] = tmp; }
    var opciones = orden.map(function (k) { return c.opciones[k]; });
    var correct = orden.indexOf(0);
    st.gate = { y: -120, dibujo: c.dibujo, opciones: opciones, correct: correct, res: false };
    setMsg('¿Qué significa? Métete en el carril correcto', '#ffd23f');
  }

  function golpe(msg) {
    if (st.inv > 0) return;
    st.vidas--; st.inv = 60; st.shake = 12; st.flash = { c: '#ff6b6b', t: 12 };
    setMsg(msg, '#ff6b6b');
    if (window.Juice) Juice.fallo();
    if (st.vidas <= 0) terminar(false);
  }

  function setMsg(t, c) {
    var m = document.getElementById('condMsg');
    if (m) { m.textContent = t; m.style.color = c || '#fff'; }
  }

  function draw() {
    var sx = st.shake > 0 ? (Math.random() - 0.5) * st.shake : 0;
    ctx.save(); ctx.translate(sx, 0);
    // fondo hierba
    ctx.fillStyle = COLORS.grass; ctx.fillRect(0, 0, W, H);
    // carretera
    var rw = W * 0.72, rx = (W - rw) / 2;
    ctx.fillStyle = COLORS.road; ctx.fillRect(rx, 0, rw, H);
    // líneas de carril (animadas)
    ctx.strokeStyle = COLORS.lane; ctx.lineWidth = 4;
    ctx.setLineDash([26, 26]); ctx.lineDashOffset = -(st.dist % 52);
    for (var l = 1; l < 3; l++) {
      var x = rx + rw * (l / 3);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    ctx.setLineDash([]);
    // bordes
    ctx.fillStyle = '#e9edf7'; ctx.fillRect(rx - 5, 0, 5, H); ctx.fillRect(rx + rw, 0, 5, H);

    // entidades
    st.ent.forEach(function (e) {
      var ex = rx + rw * lanesX[e.lane];
      if (e.tipo === 'gas') dibGas(ex, e.y);
      else dibObst(ex, e.y, e.kind);
    });

    // gate (señal + etiquetas por carril)
    if (st.gate) {
      var gy = st.gate.y;
      // etiquetas
      ctx.font = '600 12px -apple-system,sans-serif'; ctx.textAlign = 'center';
      for (var k = 0; k < 3; k++) {
        var lx = rx + rw * lanesX[k];
        ctx.fillStyle = 'rgba(0,0,0,.55)';
        roundRect(lx - rw / 7, gy - 14, rw / 3.5, 28, 6); ctx.fill();
        ctx.fillStyle = '#fff';
        wrapText(st.gate.opciones[k], lx, gy, rw / 3.6, 12);
      }
      // señal centrada arriba del gate
      st.gate.dibujo(ctx, W / 2, gy - 46, 34);
    }

    // coche del jugador
    var cx = rx + rw * st.carX, cy = H - 90;
    if (!(st.inv > 0 && Math.floor(st.inv / 6) % 2)) dibCoche(cx, cy);

    // flash
    if (st.flash) { ctx.fillStyle = st.flash.c; ctx.globalAlpha = 0.18 * (st.flash.t / 12); ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
    ctx.restore();

    // HUD
    var v = document.getElementById('condVidas');
    if (v) v.textContent = '❤️'.repeat(Math.max(0, st.vidas)) || '💀';
    var s = document.getElementById('condScore');
    if (s) s.textContent = st.score + ' m';
  }

  // ---- dibujos ----
  function dibCoche(x, y) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(0, 34, 22, 8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = COLORS.car; roundRect(-20, -34, 40, 68, 10); ctx.fill();
    ctx.fillStyle = '#b3d8ff'; roundRect(-14, -26, 28, 18, 5); ctx.fill();
    roundRect(-14, 8, 28, 16, 5); ctx.fill();
    ctx.fillStyle = '#111'; ctx.fillRect(-24, -20, 5, 16); ctx.fillRect(19, -20, 5, 16);
    ctx.fillRect(-24, 6, 5, 16); ctx.fillRect(19, 6, 5, 16);
    ctx.restore();
  }
  function dibObst(x, y, kind) {
    ctx.save(); ctx.translate(x, y);
    if (kind === 0) { // cono
      ctx.fillStyle = '#ff7a1a'; ctx.beginPath(); ctx.moveTo(0, -18); ctx.lineTo(14, 16); ctx.lineTo(-14, 16); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.fillRect(-9, 0, 18, 5);
    } else if (kind === 1) { // bache
      ctx.fillStyle = '#1a1a22'; ctx.beginPath(); ctx.ellipse(0, 0, 18, 12, 0, 0, 7); ctx.fill();
    } else { // coche rival
      ctx.fillStyle = '#5b8cff'; roundRect(-18, -30, 36, 60, 9); ctx.fill();
      ctx.fillStyle = '#cfe0ff'; roundRect(-12, 6, 24, 15, 4); ctx.fill();
    }
    ctx.restore();
  }
  function dibGas(x, y) {
    ctx.save(); ctx.translate(x, y);
    ctx.fillStyle = '#ffd23f'; roundRect(-13, -16, 26, 32, 6); ctx.fill();
    ctx.fillStyle = '#7a5b00'; ctx.font = '700 18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('⛽', 0, 1); ctx.restore();
  }

  // señales dibujadas en canvas (versión simplificada para el minijuego)
  function dibSTOP(c, x, y, r) {
    c.save(); c.translate(x, y); c.fillStyle = '#c1121f';
    c.beginPath(); for (var i = 0; i < 8; i++) { var a = Math.PI / 8 + i * Math.PI / 4; var px = Math.cos(a) * r, py = Math.sin(a) * r; i ? c.lineTo(px, py) : c.moveTo(px, py); } c.closePath(); c.fill();
    c.fillStyle = '#fff'; c.font = '700 ' + (r * 0.6) + 'px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('STOP', 0, 1); c.restore();
  }
  function dibVel(n) {
    return function (c, x, y, r) {
      c.save(); c.translate(x, y);
      c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill();
      c.strokeStyle = '#d11'; c.lineWidth = r * 0.18; c.beginPath(); c.arc(0, 0, r - c.lineWidth / 2, 0, 7); c.stroke();
      c.fillStyle = '#111'; c.font = '700 ' + (r * 0.8) + 'px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(n, 0, 2); c.restore();
    };
  }
  function dibNoEntry(c, x, y, r) {
    c.save(); c.translate(x, y); c.fillStyle = '#c1121f'; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill();
    c.fillStyle = '#fff'; c.fillRect(-r * 0.6, -r * 0.16, r * 1.2, r * 0.32); c.restore();
  }
  function dibCeda(c, x, y, r) {
    c.save(); c.translate(x, y); c.fillStyle = '#fff'; c.strokeStyle = '#d11'; c.lineWidth = r * 0.2;
    c.beginPath(); c.moveTo(0, r); c.lineTo(r, -r * 0.8); c.lineTo(-r, -r * 0.8); c.closePath(); c.fill(); c.stroke(); c.restore();
  }
  function dibNoAdelantar(c, x, y, r) {
    c.save(); c.translate(x, y); c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, r, 0, 7); c.fill();
    c.strokeStyle = '#d11'; c.lineWidth = r * 0.16; c.beginPath(); c.arc(0, 0, r - c.lineWidth / 2, 0, 7); c.stroke();
    c.fillStyle = '#111'; roundRectC(c, -r * 0.55, -r * 0.35, r * 0.4, r * 0.7, 3);
    c.fillStyle = '#d11'; roundRectC(c, r * 0.15, -r * 0.35, r * 0.4, r * 0.7, 3); c.restore();
  }

  function roundRect(x, y, w, h, r) { roundRectC(ctx, x, y, w, h, r); }
  function roundRectC(c, x, y, w, h, r) {
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); c.fill();
  }
  function wrapText(text, x, y, maxW, lh) {
    var words = text.split(' '), line = '', lines = [];
    for (var i = 0; i < words.length; i++) {
      var test = line + words[i] + ' ';
      if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = words[i] + ' '; }
      else line = test;
    }
    lines.push(line);
    var oy = y - (lines.length - 1) * lh / 2;
    lines.forEach(function (ln, i) { ctx.fillText(ln.trim(), x, oy + i * lh); });
  }

  function terminar(salir) {
    st.over = true; running = false;
    cancelAnimationFrame(raf);
    document.removeEventListener('keydown', onKey);
    window.removeEventListener('resize', resize);
    onEnd({ salir: !!salir, score: st.score, gatesOK: st.gatesOK, gatesFail: st.gatesFail, dist: Math.floor(st.dist / 10) });
  }

  window.Conduccion = { start: start };
})();
