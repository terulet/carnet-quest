/* ============================================================
   mezclador.js — El "cerebro" adaptativo que decide QUÉ pregunta toca ahora.
   Interleaving (principio #4): mezcla ~60% tema actual + ~30% repaso
   de puntos débiles + ~10% sorpresa de temas ya vistos.
   Prioridad del mezclador: ROJO > ÁMBAR > contenido NUEVO > VERDE.
   ============================================================ */
(function () {
  'use strict';

  // Baraja in-place (Fisher-Yates)
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function byId(id) { return Banco.byId(id); }

  // Sesión diaria mixta de N preguntas centrada en `temaActual` (número o null)
  function sesionDiaria(temaActual, n) {
    n = n || 15;
    var usados = {};
    var out = [];

    function push(p) {
      if (p && !usados[p.id]) { usados[p.id] = 1; out.push(p); }
    }

    // 1) Repaso de puntos débiles (vencidas): ~40% con prioridad rojo>ambar
    var venc = Motor.vencidas().map(byId).filter(Boolean);
    venc.sort(function (a, b) {
      return peso(Motor.estado(b.id)) - peso(Motor.estado(a.id));
    });
    var nRepaso = Math.round(n * 0.35);
    for (var i = 0; i < venc.length && out.length < nRepaso; i++) push(venc[i]);

    // 2) Contenido del tema actual (nuevas o poco vistas): ~55%
    if (temaActual) {
      var delTema = Banco.porTema(temaActual);
      // Prioriza no vistas y luego las de caja baja
      delTema.sort(function (a, b) { return orden(a) - orden(b); });
      var objetivo = Math.round(n * 0.9);
      for (var j = 0; j < delTema.length && out.length < objetivo; j++) push(delTema[j]);
    }

    // 3) Sorpresa: ~10% de cualquier tema ya visto
    var vistos = Object.keys(Store.state.temas).map(Number);
    if (vistos.length) {
      var pool = [];
      vistos.forEach(function (t) { pool = pool.concat(Banco.porTema(t)); });
      shuffle(pool);
      for (var k = 0; k < pool.length && out.length < n; k++) push(pool[k]);
    }

    // 4) Rellenar con lo que haya
    if (out.length < n) {
      var todo = shuffle(Banco.todas().slice());
      for (var m = 0; m < todo.length && out.length < n; m++) push(todo[m]);
    }

    return shuffle(out).slice(0, n);
  }

  // Test enfocado en un solo tema (para niveles de mundo)
  function porTema(tema, n, opts) {
    opts = opts || {};
    var pool = Banco.porTema(tema).slice();
    if (opts.soloTrampas) pool = pool.filter(function (p) { return p.esTrampa; });
    // Prioriza no dominadas
    pool.sort(function (a, b) { return orden(a) - orden(b); });
    var head = pool.slice(0, Math.max(n, Math.ceil(n * 1.5)));
    return shuffle(head).slice(0, n);
  }

  // Simulacro tipo examen DGT: 30 preguntas repartidas por todos los temas,
  // ponderando los temas con más peso real en el examen (señales, prioridad, velocidad).
  var PESO_EXAMEN = { 1:1, 2:2, 3:3, 4:2, 5:2, 6:1, 7:2, 8:2, 9:2, 10:2, 11:2, 12:2, 13:2, 14:1, 15:2 };
  function simulacro(n) {
    n = n || 30;
    var out = [], usados = {};
    var temas = Object.keys(PESO_EXAMEN);
    // bolsa ponderada
    var bolsa = [];
    temas.forEach(function (t) {
      for (var w = 0; w < PESO_EXAMEN[t]; w++) bolsa.push(Number(t));
    });
    shuffle(bolsa);
    var idx = 0, intentos = 0;
    while (out.length < n && intentos < n * 40) {
      intentos++;
      var tema = bolsa[idx % bolsa.length]; idx++;
      var pool = Banco.porTema(tema);
      if (!pool.length) continue;
      var p = pool[Math.floor(Math.random() * pool.length)];
      if (!usados[p.id]) { usados[p.id] = 1; out.push(p); }
    }
    // completar si faltan
    if (out.length < n) {
      var all = shuffle(Banco.todas().slice());
      for (var i = 0; i < all.length && out.length < n; i++) {
        if (!usados[all[i].id]) { usados[all[i].id] = 1; out.push(all[i]); }
      }
    }
    return shuffle(out).slice(0, n);
  }

  // Blitz de señales (contrarreloj): solo preguntas con imagen de señal
  function blitzSenales(n) {
    var pool = Banco.todas().filter(function (p) { return p.imagen; });
    if (pool.length < n) pool = Banco.porTema(3).concat(Banco.porTema(2), Banco.porTema(4));
    return shuffle(pool.slice()).slice(0, n);
  }

  // Ronda de trampas
  function rondaTrampas(n) {
    var pool = Banco.todas().filter(function (p) { return p.esTrampa; });
    return shuffle(pool.slice()).slice(0, n || 12);
  }

  // -- helpers --
  function peso(estado) {
    return estado === 'rojo' ? 3 : estado === 'ambar' ? 2 : estado === 'nueva' ? 1 : 0;
  }
  // Orden para priorizar: nuevas primero, luego rojo, ambar, verde
  function orden(p) {
    var e = Motor.estado(p.id);
    if (e === 'rojo') return 0;
    if (e === 'nueva') return 1;
    if (e === 'ambar') return 2;
    return 3; // verde
  }

  window.Mezclador = {
    sesionDiaria: sesionDiaria,
    porTema: porTema,
    simulacro: simulacro,
    blitzSenales: blitzSenales,
    rondaTrampas: rondaTrampas,
    shuffle: shuffle
  };
})();
