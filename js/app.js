/* ============================================================
   app.js — Aplicación principal: router, pantallas y motor de juego.
   Une todos los módulos: Banco, Store, Motor, Mezclador, Radar,
   Gamif, Juice, Senales y el contenido de los MUNDOS.
   ============================================================ */
(function () {
  'use strict';

  var app;               // contenedor principal
  var quiz = null;       // estado del quiz activo

  // ---------- Utilidades DOM ----------
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function pct(x) { return Math.round(x * 100); }
  function on(sel, ev, fn) { document.addEventListener(ev, function (e) { var t = e.target.closest(sel); if (t) fn(e, t); }); }

  // ---------- Arranque ----------
  function init() {
    app = $('#app');
    Store.load();
    aplicarTema();
    Banco.cargar().then(function (info) {
      if (!Store.state.planStart) { Store.state.planStart = Store.hoy(); Store.save(); }
      $('#loader').classList.add('oculto');
      window.addEventListener('hashchange', router);
      router();
    }).catch(function (e) {
      $('#loader').innerHTML = '<p style="color:#fff;padding:2rem">No se pudo cargar el contenido. Recarga la página.</p>';
      console.error(e);
    });

    // Registrar SW (PWA offline)
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    }
  }

  function aplicarTema() {
    document.documentElement.setAttribute('data-tema', Store.state.settings.tema || 'dark');
  }

  // ---------- Router ----------
  function router() {
    var h = location.hash.replace('#/', '') || '';
    var parts = h.split('/');
    cerrarQuiz();
    switch (parts[0]) {
      case '': case 'home': return pantallaHome();
      case 'mapa': return pantallaMapa();
      case 'mundo': return pantallaMundo(Number(parts[1]));
      case 'radar': return pantallaRadar();
      case 'logros': return pantallaLogros();
      case 'perfil': return pantallaPerfil();
      case 'plan': return pantallaPlan();
      case 'modos': return pantallaModos();
      default: return pantallaHome();
    }
  }
  function ir(hash) { location.hash = hash; }

  // ---------- Barra inferior de navegación ----------
  function navBar(activo) {
    var items = [
      ['', '🏠', 'Inicio'], ['mapa', '🗺️', 'Mundos'], ['radar', '📊', 'Radar'],
      ['logros', '🏅', 'Logros'], ['perfil', '👤', 'Perfil']
    ];
    return '<nav class="tabbar">' + items.map(function (it) {
      var act = (activo === it[0]) ? ' act' : '';
      return '<a class="tab' + act + '" href="#/' + it[0] + '"><span class="tabic">' + it[1] + '</span><span>' + it[2] + '</span></a>';
    }).join('') + '</nav>';
  }

  function cabeceraXP() {
    var n = Gamif.infoNivel();
    var s = Store.state.streak;
    return '<header class="topbar">' +
      '<div class="lvl"><span class="lvlemo">' + n.emoji + '</span>' +
      '<div class="lvlinfo"><b>Nivel ' + n.idx + '</b><small>' + esc(n.nombre) + '</small>' +
      '<div class="xpbar"><i style="width:' + pct(n.progreso) + '%"></i></div></div></div>' +
      '<div class="streak" title="Racha diaria">🔥 ' + s.current + '</div>' +
      '</header>';
  }

  // ================= HOME =================
  function pantallaHome() {
    var reg = Gamif.registrarDiaJugado();
    var nuevos = Gamif.revisarLogros({});
    var temaActual = temaDeHoy();
    var mundo = MUNDOS[temaActual - 1];
    var dg = Radar.dominioGlobal();
    var dia = diaDelPlan();

    var html = '<div class="screen home">' + cabeceraXP() +
      '<div class="pad">' +
      '<h1 class="saludo">¡Hola' + (Store.state.profile.nombre ? ', ' + esc(Store.state.profile.nombre) : '') + '! 👋</h1>' +
      '<p class="sub">Día ' + dia + ' de 21 · Vas al <b>' + pct(dg) + '%</b> de dominio</p>' +

      '<div class="card mision" style="--acc:' + mundo.color + '">' +
      '<div class="mision-top"><span class="memo">' + mundo.emoji + '</span>' +
      '<div><small>MISIÓN DE HOY</small><h2>' + esc(mundo.nombre) + '</h2></div></div>' +
      '<p class="lema">' + esc(mundo.lema) + '</p>' +
      '<button class="btn big" data-accion="misionHoy" data-tema="' + temaActual + '">▶ Empezar sesión de hoy</button>' +
      '</div>' +

      '<div class="grid2">' +
      '<button class="card mini" data-accion="pildora" data-tema="' + temaActual + '"><span>📖</span>Píldora de teoría</button>' +
      '<button class="card mini" data-accion="repaso"><span>🔁</span>Repaso inteligente</button>' +
      '<a class="card mini" href="#/modos"><span>🎮</span>Modos de juego</a>' +
      '<a class="card mini" href="#/plan"><span>📅</span>Plan de 21 días</a>' +
      '</div>' +

      progresoSimulacros() +
      '</div>' + navBar('') + '</div>';

    render(html);
    if (nuevos.length) setTimeout(function () { mostrarLogros(nuevos); }, 400);
  }

  function progresoSimulacros() {
    var sims = Store.state.simulacros.slice(-3).reverse();
    if (!sims.length) {
      return '<div class="card infobox"><b>🎯 Objetivo:</b> aprobar 3 simulacros seguidos con 2 fallos o menos. ¡El Modo Examen se desbloquea en la semana 3!</div>';
    }
    var listo = estaListo();
    return '<div class="card"><h3>Últimos simulacros</h3>' + sims.map(function (s) {
      return '<div class="simrow ' + (s.aprobado ? 'ok' : 'ko') + '"><span>' + (s.aprobado ? '✅' : '❌') + '</span>' +
        '<b>' + s.aciertos + '/' + (s.aciertos + s.fallos) + '</b><small>' + s.fallos + ' fallos</small></div>';
    }).join('') + (listo ? '<p class="listo">🥇 ¡Estás LISTO para el examen real!</p>' : '') + '</div>';
  }

  // ================= MAPA DE MUNDOS =================
  function pantallaMapa() {
    var html = '<div class="screen mapa">' + cabeceraXP() +
      '<div class="pad"><h1 class="titp">🗺️ Mapa de mundos</h1>' +
      '<p class="sub">15 mundos, del principiante a la leyenda del asfalto.</p>' +
      '<div class="mundos">';
    for (var i = 0; i < MUNDOS.length; i++) {
      var m = MUNDOS[i];
      var d = Radar.dominioTema(m.num);
      var w = Store.state.worlds[m.num] || {};
      var desbloq = i === 0 || bossPasado(MUNDOS[i - 1].num) || Radar.dominioTema(MUNDOS[i - 1].num) >= 0.6;
      var estrellas = w.boss ? '⭐⭐⭐' : d >= 0.5 ? '⭐⭐' : d > 0 ? '⭐' : '';
      html += '<a class="mundo' + (desbloq ? '' : ' lock') + (w.boss ? ' done' : '') + '" ' +
        (desbloq ? 'href="#/mundo/' + m.num + '"' : '') + ' style="--acc:' + m.color + '">' +
        '<span class="mnum">' + m.num + '</span>' +
        '<span class="memo">' + (desbloq ? m.emoji : '🔒') + '</span>' +
        '<span class="mname">' + esc(m.nombre) + '</span>' +
        '<span class="mstar">' + estrellas + '</span>' +
        '<span class="mbar"><i style="width:' + pct(d) + '%;background:' + m.color + '"></i></span>' +
        '</a>';
    }
    html += '</div></div>' + navBar('mapa') + '</div>';
    render(html);
  }

  // ================= DETALLE DE MUNDO =================
  function pantallaMundo(num) {
    var m = MUNDOS[num - 1];
    if (!m) return pantallaMapa();
    var w = Store.state.worlds[num] || { niveles: {} };
    var d = Radar.dominioTema(num);
    var nQ = Banco.countTema(num);

    var niveles = '';
    for (var lvl = 1; lvl <= m.pildoras.length; lvl++) {
      var hecho = w.niveles && w.niveles[lvl];
      niveles += '<div class="nivel">' +
        '<button class="btn line" data-accion="pildora" data-tema="' + num + '" data-lvl="' + lvl + '">' +
        '📖 Teoría ' + lvl + ': ' + esc(m.pildoras[lvl - 1].titulo) + '</button>' +
        '<button class="btn line ' + (hecho ? 'ok' : '') + '" data-accion="nivel" data-tema="' + num + '" data-lvl="' + lvl + '">' +
        (hecho ? '✅' : '▶') + ' Test nivel ' + lvl + ' (10 preguntas)</button>' +
        '</div>';
    }

    var html = '<div class="screen mundo-d" style="--acc:' + m.color + '">' +
      '<header class="topbar sub"><a class="back" href="#/mapa">‹</a><b>' + m.emoji + ' ' + esc(m.nombre) + '</b></header>' +
      '<div class="pad">' +
      '<div class="card hero-mundo"><p class="lema">' + esc(m.lema) + '</p>' +
      '<div class="mbar big"><i style="width:' + pct(d) + '%;background:' + m.color + '"></i></div>' +
      '<small>' + pct(d) + '% dominado · ' + nQ + ' preguntas</small></div>' +

      '<h3>Niveles</h3>' + niveles +

      '<button class="btn boss" data-accion="boss" data-tema="' + num + '">👹 BOSS del mundo · 15 preguntas (≥80%)' +
      (w.boss ? ' ✅' : '') + '</button>' +

      '<button class="btn line trap" data-accion="trampasMundo" data-tema="' + num + '">⚠️ Las trampas del examen</button>' +

      '</div>' + navBar('mapa') + '</div>';
    render(html);
  }

  // ================= TRAMPAS DEL MUNDO =================
  function pantallaTrampas(num) {
    var m = MUNDOS[num - 1];
    var html = '<div class="screen" style="--acc:' + m.color + '">' +
      '<header class="topbar sub"><a class="back" href="#/mundo/' + num + '">‹</a><b>⚠️ Trampas · ' + esc(m.nombre) + '</b></header>' +
      '<div class="pad"><p class="sub">Así retuerce la DGT este tema. Léelas y luego entrénalas.</p>' +
      '<div class="trampas-list">' + m.trampas.map(function (t, i) {
        return '<div class="card trampa-item"><span class="tnum">' + (i + 1) + '</span><p>' + esc(t) + '</p></div>';
      }).join('') + '</div>' +
      '<button class="btn big" data-accion="entrenarTrampas" data-tema="' + num + '">🎯 Entrenar estas trampas</button>' +
      '</div></div>';
    render(html);
  }

  // ================= PÍLDORA DE TEORÍA =================
  function pantallaPildora(num, lvl) {
    var m = MUNDOS[num - 1];
    lvl = lvl || 1;
    var pilds = m.pildoras;
    var idx = Math.min(lvl - 1, pilds.length - 1);

    function render1(i) {
      var p = pilds[i];
      var html = '<div class="screen pildora" style="--acc:' + m.color + '">' +
        '<header class="topbar sub"><a class="back" href="#/mundo/' + num + '">‹</a><b>' + m.emoji + ' Teoría</b>' +
        '<span class="pcount">' + (i + 1) + '/' + pilds.length + '</span></header>' +
        '<div class="pad pildora-body">' +
        '<div class="card pild"><h2>' + esc(p.titulo) + '</h2><p>' + p.texto + '</p></div>' +
        '<div class="pild-nav">' +
        (i > 0 ? '<button class="btn line" data-pild="' + (i - 1) + '">‹ Anterior</button>' : '<span></span>') +
        (i < pilds.length - 1
          ? '<button class="btn" data-pild="' + (i + 1) + '">Siguiente ›</button>'
          : '<button class="btn" data-accion="nivel" data-tema="' + num + '" data-lvl="' + (i + 1) + '">✅ ¡A practicar!</button>') +
        '</div></div></div>';
      render(html);
      // botones de navegación de píldora
      Array.prototype.forEach.call(document.querySelectorAll('[data-pild]'), function (b) {
        b.addEventListener('click', function () { render1(Number(b.getAttribute('data-pild'))); });
      });
    }
    render1(idx);
  }

  // ================= QUIZ (motor de test) =================
  function iniciarQuiz(cfg) {
    quiz = {
      cfg: cfg,
      preguntas: cfg.preguntas,
      i: 0,
      aciertos: 0, fallos: 0,
      respondida: false,
      inicio: Date.now(),
      trampasSeguidas: 0,
      xpTotal: 0,
      tRestante: cfg.tiempoTotalSeg || 0,
      timer: null
    };
    if (!quiz.preguntas || !quiz.preguntas.length) { alert('No hay preguntas disponibles para este modo todavía.'); ir('#/'); return; }
    if (cfg.tiempoTotalSeg) arrancarTimer();
    pintarPregunta();
  }

  function arrancarTimer() {
    quiz.timer = setInterval(function () {
      quiz.tRestante--;
      var t = $('#timer');
      if (t) { t.textContent = fmtTiempo(quiz.tRestante); if (quiz.tRestante <= 30) t.classList.add('warn'); }
      if (quiz.tRestante <= 0) { clearInterval(quiz.timer); terminarQuiz(); }
    }, 1000);
  }

  function pintarPregunta() {
    var q = quiz, cfg = q.cfg, p = q.preguntas[q.i];
    q.respondida = false;
    var progreso = ((q.i) / q.preguntas.length) * 100;
    var imgHtml = p.imagen ? '<div class="q-img">' + Senales.get(p.imagen) + '</div>' : '';
    var timerHtml = cfg.tiempoTotalSeg ? '<span id="timer" class="qtimer">' + fmtTiempo(q.tRestante) + '</span>' : '';
    var badges = '';
    if (cfg.mostrarTrampa && p.esTrampa) badges += '<span class="badge trap">⚠️ Trampa</span>';

    var opciones = p.opciones.map(function (o, idx) {
      return '<button class="opcion" data-op="' + idx + '"><span class="oplabel">' + String.fromCharCode(65 + idx) + '</span>' + esc(o) + '</button>';
    }).join('');

    var html = '<div class="screen quiz ' + (cfg.sobrio ? 'sobrio' : '') + '">' +
      '<header class="qbar"><button class="back" data-accion="salirQuiz">✕</button>' +
      '<div class="qprog"><i style="width:' + progreso + '%"></i></div>' +
      '<span class="qcount">' + (q.i + 1) + '/' + q.preguntas.length + '</span>' + timerHtml + '</header>' +
      '<div class="pad quiz-body">' +
      '<div class="qmeta">' + esc(cfg.titulo || '') + ' ' + badges + '</div>' +
      imgHtml +
      '<h2 class="q-text">' + esc(p.pregunta) + '</h2>' +
      '<div class="opciones">' + opciones + '</div>' +
      '<div class="feedback" id="feedback"></div>' +
      '</div></div>';
    render(html);
  }

  function responder(opIdx) {
    var q = quiz; if (q.respondida) return;
    var cfg = q.cfg, p = q.preguntas[q.i];
    q.respondida = true;
    var acierto = opIdx === p.correcta;
    var ms = Date.now() - q.inicio;

    // Motor de repaso + XP
    var res = Motor.registrar(p, acierto, ms);
    q.xpTotal += res.xp;
    Gamif.ganarXP(res.xp);

    if (acierto) {
      q.aciertos++;
      q.trampasSeguidas = p.esTrampa ? q.trampasSeguidas + 1 : q.trampasSeguidas;
      if (!cfg.sobrio) Juice.acierto();
    } else {
      q.fallos++;
      q.trampasSeguidas = 0;
      if (!cfg.sobrio) Juice.fallo();
    }

    // Muerte súbita
    if (cfg.muerteSubita && !acierto) { pintarSolucion(opIdx, p, acierto, cfg, true); return; }
    pintarSolucion(opIdx, p, acierto, cfg, false);
  }

  function pintarSolucion(opIdx, p, acierto, cfg, finPorMuerte) {
    // marca opciones
    var ops = document.querySelectorAll('.opcion');
    Array.prototype.forEach.call(ops, function (b) {
      var idx = Number(b.getAttribute('data-op'));
      b.classList.add('bloq');
      if (idx === p.correcta) b.classList.add('correcta');
      else if (idx === opIdx) b.classList.add('incorrecta');
    });

    var fb = $('#feedback');
    if (cfg.feedbackInmediato === false) {
      // modo examen/simulacro: sin explicación, avanza directo
      setTimeout(siguiente, 250);
      return;
    }
    var mnem = p.mnemotecnia ? '<p class="mnem">🧠 <b>Truco:</b> ' + esc(p.mnemotecnia) + '</p>' : '';
    fb.innerHTML =
      '<div class="fbcard ' + (acierto ? 'ok' : 'ko') + '">' +
      '<h3>' + (acierto ? '✅ ¡Correcto!' + (p.esTrampa ? ' 🕵️ (¡trampa cazada!)' : '') : '❌ Fallaste, pero aprendes') + '</h3>' +
      '<p>' + esc(p.explicacion) + '</p>' + mnem +
      '<p class="xpwin">+' + (acierto ? p.dificultad * 3 + 10 : 4) + ' XP</p>' +
      (finPorMuerte ? '<button class="btn big" data-accion="finQuiz">Ver resultado</button>'
        : '<button class="btn big" data-accion="siguiente">' + (quiz.i + 1 >= quiz.preguntas.length ? 'Ver resultado' : 'Siguiente ›') + '</button>') +
      '</div>';
    fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function siguiente() {
    quiz.i++;
    quiz.inicio = Date.now();
    if (quiz.i >= quiz.preguntas.length) terminarQuiz();
    else pintarPregunta();
  }

  function terminarQuiz() {
    if (quiz.timer) clearInterval(quiz.timer);
    var q = quiz, cfg = q.cfg;
    var total = q.aciertos + q.fallos;
    var tiempo = Math.round((Date.now() - q.inicio) / 1000);
    var resultado = { modo: cfg.modo, total: total, aciertos: q.aciertos, fallos: q.fallos, xp: q.xpTotal, trampasSeguidas: q.trampasSeguidas };

    // callbacks por modo
    var ctxLogros = {};
    var aprobado = null;

    if (cfg.modo === 'nivel') {
      marcarNivel(cfg.tema, cfg.lvl);
    } else if (cfg.modo === 'boss') {
      var passBoss = (q.aciertos / q.preguntas.length) >= 0.8;
      if (passBoss) marcarBoss(cfg.tema);
      ctxLogros.bossPasado = passBoss;
      resultado.aprobado = passBoss;
    } else if (cfg.modo === 'simulacro' || cfg.modo === 'examen') {
      aprobado = q.fallos <= 3;
      Store.state.simulacros.push({ fecha: Store.hoy(), aciertos: q.aciertos, fallos: q.fallos, aprobado: aprobado, ts: Date.now() });
      Store.save();
      ctxLogros.simulacroAprobado = aprobado;
      ctxLogros.tripleAprobado = estaListo();
      resultado.aprobado = aprobado;
    }
    ctxLogros.trampasSeguidas = q.trampasSeguidas;

    var nuevosLogros = Gamif.revisarLogros(ctxLogros);
    pantallaResultado(resultado, cfg, nuevosLogros);
  }

  function pantallaResultado(r, cfg, logros) {
    var bueno = true, titulo = '¡Sesión completada!';
    if (cfg.modo === 'boss') { bueno = r.aprobado; titulo = r.aprobado ? '👹 ¡BOSS derrotado!' : '👹 El boss aguanta...'; }
    if (cfg.modo === 'simulacro' || cfg.modo === 'examen') { bueno = r.aprobado; titulo = r.aprobado ? '🎉 ¡APROBADO!' : '📋 Simulacro completado'; }
    if (cfg.modo === 'muerte-subita') { titulo = '💀 Muerte súbita'; }

    var nota = r.total ? Math.round((r.aciertos / r.total) * 100) : 0;
    if (bueno && (cfg.modo === 'boss' || cfg.modo === 'simulacro' || cfg.modo === 'examen' || nota >= 80)) {
      Juice.confeti(); Juice.nivel();
    }

    var cofre = '';
    if (cfg.modo !== 'examen') {
      var c = Gamif.abrirCofre();
      cofre = '<div class="card cofre"><h3>🎁 Cofre</h3><p>' + esc(c.premio) + '</p></div>';
    }

    var html = '<div class="screen resultado">' +
      '<div class="pad res-body">' +
      '<div class="res-emoji">' + (bueno ? '🏆' : '💪') + '</div>' +
      '<h1>' + titulo + '</h1>' +
      '<div class="res-score"><b>' + r.aciertos + '</b> / ' + r.total + '</div>' +
      '<p class="sub">' + r.fallos + ' fallo' + (r.fallos === 1 ? '' : 's') + ' · +' + r.xp + ' XP</p>' +
      (cfg.modo === 'simulacro' || cfg.modo === 'examen'
        ? '<p class="regla">' + (r.aprobado ? 'Con ' + r.fallos + ' fallos, ¡apruebas! (máx. 3)' : 'Con más de 3 fallos no se aprueba. ¡Sigue!') + '</p>' : '') +
      cofre +
      '<div class="res-acc">' +
      '<button class="btn big" data-accion="home">Continuar</button>' +
      (cfg.repetible ? '<button class="btn line" data-accion="repetir">🔁 Otra ronda</button>' : '') +
      '</div></div></div>';
    render(html);
    quiz._cfgFin = cfg;
    if (logros && logros.length) setTimeout(function () { mostrarLogros(logros); }, 900);
  }

  // ================= RADAR =================
  function pantallaRadar() {
    var resumen = Radar.resumen();
    var dg = Radar.dominioGlobal();
    var filas = resumen.map(function (r) {
      var m = MUNDOS[r.tema - 1];
      return '<a class="radar-row ' + r.color + '" href="#/mundo/' + r.tema + '">' +
        '<span class="rdot"></span><span class="rname">' + m.emoji + ' ' + esc(r.nombre) + '</span>' +
        '<span class="rbar"><i style="width:' + pct(r.dominio) + '%"></i></span>' +
        '<span class="rpct">' + pct(r.dominio) + '%</span></a>';
    }).join('');
    var debiles = Radar.puntosDebiles().slice(0, 3);
    var consejo = debiles.length
      ? 'Ataca primero: ' + debiles.map(function (d) { return MUNDOS[d.tema - 1].emoji + ' ' + d.nombre; }).join(', ') + '.'
      : '¡Vas fino en todo! Prueba un simulacro.';

    var html = '<div class="screen radar">' + cabeceraXP() +
      '<div class="pad"><h1 class="titp">📊 Radar de debilidades</h1>' +
      '<div class="card gauge"><div class="gnum">' + pct(dg) + '%</div><small>dominio global</small></div>' +
      '<div class="card infobox">💡 ' + esc(consejo) + '</div>' +
      '<div class="radar-list">' + filas + '</div>' +
      '<p class="leyenda"><span class="verde">● Dominado</span> <span class="ambar">● En progreso</span> <span class="rojo">● Flojo</span></p>' +
      '</div>' + navBar('radar') + '</div>';
    render(html);
  }

  // ================= LOGROS =================
  function pantallaLogros() {
    var got = Store.state.logros;
    var cards = Gamif.LOGROS.map(function (l) {
      var tiene = !!got[l.slug];
      return '<div class="logro ' + (tiene ? 'got' : 'lock') + '">' +
        '<span class="lemo">' + (tiene ? l.emoji : '🔒') + '</span>' +
        '<b>' + esc(l.nombre) + '</b><small>' + esc(l.desc) + '</small></div>';
    }).join('');
    var n = Object.keys(got).length;
    var html = '<div class="screen logros">' + cabeceraXP() +
      '<div class="pad"><h1 class="titp">🏅 Logros</h1>' +
      '<p class="sub">' + n + ' de ' + Gamif.LOGROS.length + ' desbloqueados</p>' +
      '<div class="logros-grid">' + cards + '</div></div>' + navBar('logros') + '</div>';
    render(html);
  }

  // ================= PERFIL / AJUSTES =================
  function pantallaPerfil() {
    var s = Store.state, st = s.stats, n = Gamif.infoNivel();
    var html = '<div class="screen perfil">' + cabeceraXP() +
      '<div class="pad"><h1 class="titp">👤 Perfil</h1>' +
      '<div class="card">' +
      '<label class="fld">Tu nombre<input id="inpNombre" value="' + esc(s.profile.nombre) + '" placeholder="Escribe tu nombre" maxlength="20"></label>' +
      '</div>' +
      '<div class="card stats-grid">' +
      stat('Preguntas', st.respondidas) + stat('Aciertos', st.aciertos) +
      stat('% Global', pct(st.respondidas ? st.aciertos / st.respondidas : 0) + '%') +
      stat('Racha', s.streak.current + ' 🔥') + stat('Mejor racha', s.streak.best) +
      stat('Trampas ✓', st.trampasAcertadas) +
      '</div>' +
      '<div class="card">' +
      '<h3>Ajustes</h3>' +
      toggle('Sonido', 'sonido', s.settings.sonido) +
      toggle('Vibración', 'vibracion', s.settings.vibracion) +
      '<label class="fld">Tema<select id="selTema"><option value="dark"' + (s.settings.tema === 'dark' ? ' selected' : '') + '>Oscuro</option><option value="light"' + (s.settings.tema === 'light' ? ' selected' : '') + '>Claro</option></select></label>' +
      '</div>' +
      '<div class="card">' +
      '<h3>Copia de seguridad</h3><p class="sub">Tu progreso se guarda en este dispositivo. Expórtalo para no perderlo.</p>' +
      '<button class="btn line" data-accion="exportar">⬇️ Exportar progreso (JSON)</button>' +
      '<button class="btn line" data-accion="importar">⬆️ Importar progreso</button>' +
      '<input type="file" id="fileImport" accept="application/json" hidden>' +
      '<button class="btn line danger" data-accion="reset">🗑️ Borrar todo y empezar de cero</button>' +
      '</div>' +
      '<p class="creditos">Carnet Quest · Teórica DGT permiso B · ' + Banco.total() + ' preguntas</p>' +
      '</div>' + navBar('perfil') + '</div>';
    render(html);

    $('#inpNombre').addEventListener('change', function (e) { s.profile.nombre = e.target.value.trim(); Store.save(); });
    $('#selTema').addEventListener('change', function (e) { s.settings.tema = e.target.value; Store.save(); aplicarTema(); });
  }

  function stat(label, val) { return '<div class="statc"><b>' + val + '</b><small>' + label + '</small></div>'; }
  function toggle(label, key, val) {
    return '<label class="switch"><span>' + label + '</span><input type="checkbox" data-toggle="' + key + '"' + (val ? ' checked' : '') + '><i></i></label>';
  }

  // ================= PLAN 21 DÍAS =================
  function pantallaPlan() {
    var dia = diaDelPlan();
    var filas = PLAN_21.map(function (p, i) {
      var d = i + 1;
      var estado = d < dia ? 'pasado' : d === dia ? 'hoy' : 'futuro';
      return '<div class="plan-row ' + estado + '"><span class="pd">Día ' + d + '</span>' +
        '<span class="pt">' + esc(p) + '</span>' + (d === dia ? '<span class="phoy">HOY</span>' : d < dia ? '<span>✓</span>' : '') + '</div>';
    }).join('');
    var html = '<div class="screen plan">' + cabeceraXP() +
      '<div class="pad"><h1 class="titp">📅 Plan de 21 días</h1>' +
      '<p class="sub">15–20 min al día. El juego lo adapta a tu ritmo.</p>' +
      '<div class="plan-list">' + filas + '</div></div>' + navBar('') + '</div>';
    render(html);
  }

  // ================= MODOS DE JUEGO =================
  function pantallaModos() {
    var semana3 = diaDelPlan() >= 15 || Store.state.simulacros.length >= 1;
    var html = '<div class="screen modos">' + cabeceraXP() +
      '<div class="pad"><h1 class="titp">🎮 Modos de juego</h1>' +
      modoCard('📋', 'Simulacro completo', '30 preguntas, 30 min, máx 3 fallos. Como el examen real.', 'simulacro') +
      modoCard('🎓', 'Modo Examen Real', 'Interfaz sobria, cronómetro, sin ayudas.' + (semana3 ? '' : ' 🔒 Se desbloquea en la semana 3.'), semana3 ? 'examen' : 'lock') +
      modoCard('⚡', 'Contrarreloj de señales', 'Blitz: identifica señales a toda pastilla.', 'blitz') +
      modoCard('⚠️', 'Duelo de trampas', 'Solo preguntas trampa. Para cazadores.', 'trampasGlobal') +
      modoCard('💀', 'Muerte súbita', 'Un fallo y se acabó. ¿Cuánto aguantas?', 'muerteSubita') +
      '</div>' + navBar('') + '</div>';
    render(html);
  }
  function modoCard(emo, tit, desc, accion) {
    var lock = accion === 'lock';
    return '<button class="card modo-card' + (lock ? ' lock' : '') + '" ' + (lock ? '' : 'data-accion="' + accion + '"') + '>' +
      '<span class="memo">' + (lock ? '🔒' : emo) + '</span><div><b>' + esc(tit) + '</b><small>' + esc(desc) + '</small></div></button>';
  }

  // ================= LÓGICA DE JUEGO =================
  function temaDeHoy() {
    // Primer mundo cuyo boss no está pasado; si todos, el más flojo
    for (var i = 0; i < MUNDOS.length; i++) {
      if (!bossPasado(MUNDOS[i].num)) {
        // ¿está desbloqueado?
        if (i === 0 || bossPasado(MUNDOS[i - 1].num) || Radar.dominioTema(MUNDOS[i - 1].num) >= 0.6) return MUNDOS[i].num;
        return MUNDOS[i].num;
      }
    }
    var deb = Radar.puntosDebiles();
    return deb.length ? deb[0].tema : 1;
  }
  function bossPasado(num) { var w = Store.state.worlds[num]; return !!(w && w.boss); }
  function marcarNivel(tema, lvl) {
    var s = Store.state; if (!s.worlds[tema]) s.worlds[tema] = { niveles: {}, boss: false };
    if (!s.worlds[tema].niveles) s.worlds[tema].niveles = {};
    s.worlds[tema].niveles[lvl] = true; Store.save();
  }
  function marcarBoss(tema) {
    var s = Store.state; if (!s.worlds[tema]) s.worlds[tema] = { niveles: {}, boss: false };
    s.worlds[tema].boss = true; Store.save();
  }
  function estaListo() {
    var sims = Store.state.simulacros.slice(-3);
    if (sims.length < 3) return false;
    return sims.every(function (s) { return s.fallos <= 2; });
  }

  function diaDelPlan() {
    var start = Store.state.planStart;
    if (!start) return 1;
    var p = start.split('-');
    var d0 = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    var now = new Date();
    var diff = Math.floor((now - d0) / 86400000) + 1;
    return Math.max(1, Math.min(21, diff));
  }

  // ---------- Lanzadores de quiz ----------
  function lanzarNivel(tema, lvl) {
    iniciarQuiz({ modo: 'nivel', tema: tema, lvl: lvl, titulo: MUNDOS[tema - 1].nombre,
      preguntas: Mezclador.porTema(tema, 10), feedbackInmediato: true, mostrarTrampa: true, repetible: false });
  }
  function lanzarMisionHoy(tema) {
    var pregs = Mezclador.sesionDiaria(tema, 15);
    iniciarQuiz({ modo: 'nivel', tema: tema, lvl: 0, titulo: 'Misión de hoy',
      preguntas: pregs, feedbackInmediato: true, mostrarTrampa: true, repetible: false });
  }
  function lanzarRepaso() {
    var venc = Motor.vencidas().map(Banco.byId).filter(Boolean);
    if (!venc.length) venc = Mezclador.sesionDiaria(temaDeHoy(), 10);
    iniciarQuiz({ modo: 'nivel', titulo: 'Repaso inteligente',
      preguntas: Mezclador.shuffle(venc).slice(0, 10), feedbackInmediato: true, mostrarTrampa: true });
  }
  function lanzarBoss(tema) {
    iniciarQuiz({ modo: 'boss', tema: tema, titulo: 'BOSS: ' + MUNDOS[tema - 1].nombre,
      preguntas: Mezclador.porTema(tema, 15), feedbackInmediato: true, mostrarTrampa: false });
  }
  function lanzarSimulacro() {
    iniciarQuiz({ modo: 'simulacro', titulo: 'Simulacro DGT',
      preguntas: Mezclador.simulacro(30), feedbackInmediato: false, tiempoTotalSeg: 30 * 60 });
  }
  function lanzarExamen() {
    iniciarQuiz({ modo: 'examen', titulo: 'Examen real', sobrio: true,
      preguntas: Mezclador.simulacro(30), feedbackInmediato: false, tiempoTotalSeg: 30 * 60 });
  }
  function lanzarBlitz() {
    iniciarQuiz({ modo: 'blitz', titulo: 'Contrarreloj de señales', repetible: true,
      preguntas: Mezclador.blitzSenales(20), feedbackInmediato: true, tiempoTotalSeg: 120, mostrarTrampa: false });
  }
  function lanzarTrampas(tema) {
    var pregs = tema ? Mezclador.porTema(tema, 12, { soloTrampas: true }) : Mezclador.rondaTrampas(12);
    if (!pregs.length) pregs = Mezclador.rondaTrampas(12);
    iniciarQuiz({ modo: 'trampas', tema: tema, titulo: 'Duelo de trampas', repetible: true,
      preguntas: pregs, feedbackInmediato: true, mostrarTrampa: true });
  }
  function lanzarMuerteSubita() {
    iniciarQuiz({ modo: 'muerte-subita', titulo: 'Muerte súbita', repetible: true,
      preguntas: Mezclador.shuffle(Banco.todas().slice()).slice(0, 50), feedbackInmediato: true, muerteSubita: true, mostrarTrampa: true });
  }

  function cerrarQuiz() { if (quiz && quiz.timer) clearInterval(quiz.timer); quiz = null; }

  // ---------- Overlay de logros ----------
  function mostrarLogros(logros) {
    Juice.logro();
    var l = logros[0];
    var ov = el('<div class="overlay"><div class="pop"><div class="popemo">' + l.emoji + '</div>' +
      '<h2>¡Logro desbloqueado!</h2><b>' + esc(l.nombre) + '</b><p>' + esc(l.desc) + '</p>' +
      '<button class="btn" data-cerrar-ov>¡Genial!</button></div></div>');
    document.body.appendChild(ov);
    ov.addEventListener('click', function (e) {
      if (e.target.hasAttribute('data-cerrar-ov') || e.target === ov) {
        ov.remove();
        if (logros.length > 1) mostrarLogros(logros.slice(1));
      }
    });
  }

  // ---------- Render ----------
  function render(html) { app.innerHTML = ''; app.appendChild(el(html)); window.scrollTo(0, 0); }

  // ---------- Delegación de eventos ----------
  on('.opcion', 'click', function (e, t) { if (!t.classList.contains('bloq')) responder(Number(t.getAttribute('data-op'))); });

  on('[data-accion]', 'click', function (e, t) {
    var a = t.getAttribute('data-accion');
    var tema = Number(t.getAttribute('data-tema')) || 0;
    var lvl = Number(t.getAttribute('data-lvl')) || 0;
    switch (a) {
      case 'misionHoy': return lanzarMisionHoy(tema);
      case 'nivel': return lanzarNivel(tema, lvl);
      case 'pildora': return pantallaPildora(tema, lvl);
      case 'repaso': return lanzarRepaso();
      case 'boss': return lanzarBoss(tema);
      case 'trampasMundo': return pantallaTrampas(tema);
      case 'entrenarTrampas': return lanzarTrampas(tema);
      case 'trampasGlobal': return lanzarTrampas(0);
      case 'simulacro': return lanzarSimulacro();
      case 'examen': return lanzarExamen();
      case 'blitz': return lanzarBlitz();
      case 'muerteSubita': return lanzarMuerteSubita();
      case 'siguiente': return siguiente();
      case 'finQuiz': return terminarQuiz();
      case 'salirQuiz': if (confirm('¿Salir? Perderás el progreso de esta ronda.')) { cerrarQuiz(); ir('#/'); } return;
      case 'home': cerrarQuiz(); return ir('#/');
      case 'repetir': return repetirQuiz();
      case 'exportar': return exportar();
      case 'importar': return $('#fileImport').click();
      case 'reset': if (confirm('¿Seguro? Se borrará TODO tu progreso.')) { Store.reset(); ir('#/'); router(); } return;
    }
  });

  on('[data-toggle]', 'change', function (e, t) {
    var k = t.getAttribute('data-toggle');
    Store.state.settings[k] = t.checked; Store.save();
  });

  document.addEventListener('change', function (e) {
    if (e.target.id === 'fileImport' && e.target.files[0]) {
      var fr = new FileReader();
      fr.onload = function () {
        try { Store.importJSON(fr.result); alert('¡Progreso importado!'); aplicarTema(); ir('#/'); router(); }
        catch (err) { alert('Archivo no válido: ' + err.message); }
      };
      fr.readAsText(e.target.files[0]);
    }
  });

  function repetirQuiz() {
    var cfg = quiz && quiz._cfgFin;
    if (!cfg) return ir('#/');
    var map = { simulacro: lanzarSimulacro, examen: lanzarExamen, blitz: lanzarBlitz,
      'muerte-subita': lanzarMuerteSubita, trampas: function () { lanzarTrampas(cfg.tema); } };
    (map[cfg.modo] || function () { ir('#/'); })();
  }

  function exportar() {
    var blob = new Blob([Store.exportJSON()], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = 'carnet-quest-progreso.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function fmtTiempo(s) { var m = Math.floor(s / 60); var ss = s % 60; return m + ':' + (ss < 10 ? '0' + ss : ss); }

  // Plan de estudio de 21 días (adaptable)
  var PLAN_21 = [
    'Mundos 1–2: conceptos de la vía + agentes y semáforos.',
    'Mundo 3: señales verticales (peligro, prohibición, obligación).',
    'Mundo 4: marcas viales + repaso de señales.',
    'Mundo 5: velocidad (¡clave del examen!).',
    'Mundo 6: distancias de seguridad.',
    'Mundo 7: adelantamientos.',
    'Mundo 8: prioridad y rotondas + BOSS de la semana.',
    'Repaso de la semana 1 + puntos rojos del radar.',
    'Mundo 9: maniobras y estacionamiento.',
    'Mundo 10: alumbrado y meteorología.',
    'Mundo 11: alcohol, drogas y factor humano.',
    'Mundo 12: seguridad de los ocupantes.',
    'Mundo 13: documentación y puntos.',
    'Mundos 14–15: mecánica + accidentes. 1er SIMULACRO (diagnóstico).',
    'Modo Examen: simulacro + repaso quirúrgico del radar.',
    'Simulacro diario + ronda de trampas.',
    'Simulacro diario + puntos ámbar del radar.',
    'Simulacro diario + señales a contrarreloj.',
    'Simulacro diario + trampas por mundo flojo.',
    'Simulacro diario + repaso de fallos recientes.',
    '¡Día 21! 3 simulacros con ≤2 fallos = listo para la DGT. 🎉'
  ];

  document.addEventListener('DOMContentLoaded', init);
})();
