/* ============================================================
   gamification.js — XP, niveles, rachas, logros y economía de recompensas.
   El error nunca castiga (principio #6): fallar da XP de aprendizaje.
   ============================================================ */
(function () {
  'use strict';

  // Niveles con nombres divertidos: de peatón despistado a leyenda del asfalto
  var NIVELES = [
    { xp: 0,     nombre: 'Peatón despistado', emoji: '🚶' },
    { xp: 120,   nombre: 'Aprendiz de volante', emoji: '🔰' },
    { xp: 320,   nombre: 'Conductor de prácticas', emoji: '🚙' },
    { xp: 620,   nombre: 'Dominador de rotondas', emoji: '🔄' },
    { xp: 1050,  nombre: 'Señor de las señales', emoji: '🛑' },
    { xp: 1650,  nombre: 'As del asfalto', emoji: '🏎️' },
    { xp: 2450,  nombre: 'Cazatrampas experto', emoji: '🕵️' },
    { xp: 3500,  nombre: 'Piloto veterano', emoji: '🏁' },
    { xp: 5000,  nombre: 'Maestro del código', emoji: '🎓' },
    { xp: 7000,  nombre: 'Leyenda del asfalto', emoji: '👑' }
  ];

  function nivelPara(xp) {
    var idx = 0;
    for (var i = 0; i < NIVELES.length; i++) {
      if (xp >= NIVELES[i].xp) idx = i;
    }
    return idx;
  }

  function infoNivel() {
    var xp = Store.state.profile.xp;
    var idx = nivelPara(xp);
    var actual = NIVELES[idx];
    var sig = NIVELES[idx + 1] || null;
    var base = actual.xp;
    var techo = sig ? sig.xp : actual.xp + 1000;
    var prog = sig ? (xp - base) / (techo - base) : 1;
    return {
      idx: idx + 1, nombre: actual.nombre, emoji: actual.emoji,
      xp: xp, faltan: sig ? (techo - xp) : 0, progreso: Math.max(0, Math.min(1, prog)),
      siguiente: sig ? sig.nombre : 'MÁXIMO'
    };
  }

  // Suma XP y detecta subida de nivel
  function ganarXP(cantidad) {
    var s = Store.state;
    var antes = nivelPara(s.profile.xp);
    s.profile.xp += cantidad;
    var ahora = nivelPara(s.profile.xp);
    s.profile.nivel = ahora + 1;
    Store.save();
    return { subioNivel: ahora > antes, nivel: NIVELES[ahora] };
  }

  // ---- Rachas diarias ----
  function registrarDiaJugado() {
    var s = Store.state, hoy = Store.hoy();
    var st = s.streak;
    // reset semanal del comodín
    var sem = semanaISO();
    if (st.freezeWeek !== sem) { st.freezes = 1; st.freezeWeek = sem; }

    if (st.lastDay === hoy) return { ya: true, current: st.current };

    var ayer = diaAnterior(hoy);
    if (st.lastDay === ayer) {
      st.current++;
    } else if (st.lastDay && st.lastDay !== hoy) {
      // ¿se rompió? Intenta gastar comodín para 1 día perdido
      var faltaUno = diaAnterior(ayer) === st.lastDay;
      if (faltaUno && st.freezes > 0) {
        st.freezes--; st.current++; // el comodín salva la racha
      } else {
        st.current = 1; // racha rota
      }
    } else {
      st.current = 1;
    }
    st.lastDay = hoy;
    if (st.current > st.best) st.best = st.current;
    Store.save();
    return { ya: false, current: st.current, best: st.best };
  }

  // ---- Logros / medallas ----
  var LOGROS = [
    { slug: 'primer-dia', nombre: 'Primer contacto', emoji: '🌱', desc: 'Completa tu primera sesión.' },
    { slug: 'racha-3', nombre: 'En marcha', emoji: '🔥', desc: 'Racha de 3 días.' },
    { slug: 'racha-7', nombre: 'Imparable', emoji: '⚡', desc: 'Racha de 7 días.' },
    { slug: 'racha-21', nombre: 'Misión cumplida', emoji: '🏆', desc: 'Racha de 21 días: ¡listo para el examen!' },
    { slug: 'rey-rotondas', nombre: 'Rey de las rotondas', emoji: '🔄', desc: 'Domina el mundo de Prioridad.' },
    { slug: 'senor-senales', nombre: 'Señor de las señales', emoji: '🛑', desc: 'Domina los 3 mundos de señales.' },
    { slug: 'cero-coma-cero', nombre: 'Cero coma cero', emoji: '🚫🍺', desc: 'Domina el mundo de Alcohol y drogas.' },
    { slug: 'cazatrampas', nombre: 'Cazatrampas', emoji: '🕵️', desc: 'Acierta 10 preguntas trampa seguidas.' },
    { slug: 'boss-primero', nombre: 'Matagigantes', emoji: '⚔️', desc: 'Supera tu primer BOSS de mundo.' },
    { slug: 'aprobado', nombre: 'Aprobado DGT', emoji: '🎉', desc: 'Aprueba un simulacro completo (≤3 fallos).' },
    { slug: 'triple-aprobado', nombre: 'Listo para el examen', emoji: '🥇', desc: '3 simulacros seguidos con ≤2 fallos.' },
    { slug: 'centurion', nombre: 'Centurión', emoji: '💯', desc: 'Responde 100 preguntas en total.' },
    { slug: 'maraton', nombre: 'Maratoniano', emoji: '🏃', desc: 'Responde 500 preguntas en total.' }
  ];

  function desbloquear(slug) {
    var s = Store.state;
    if (s.logros[slug]) return null;
    s.logros[slug] = Date.now();
    Store.save();
    return LOGROS.filter(function (l) { return l.slug === slug; })[0] || null;
  }

  function tiene(slug) { return !!Store.state.logros[slug]; }

  // Comprueba logros automáticos tras cada sesión; devuelve los recién ganados
  function revisarLogros(ctx) {
    ctx = ctx || {};
    var s = Store.state, nuevos = [];
    function u(slug) { var l = desbloquear(slug); if (l) nuevos.push(l); }

    if (s.stats.respondidas >= 1) u('primer-dia');
    if (s.streak.current >= 3) u('racha-3');
    if (s.streak.current >= 7) u('racha-7');
    if (s.streak.current >= 21) u('racha-21');
    if (s.stats.respondidas >= 100) u('centurion');
    if (s.stats.respondidas >= 500) u('maraton');

    // dominio de mundos
    if (Radar.dominioTema(8) >= 0.8) u('rey-rotondas');
    if (Radar.dominioTema(2) >= 0.8 && Radar.dominioTema(3) >= 0.8 && Radar.dominioTema(4) >= 0.8) u('senor-senales');
    if (Radar.dominioTema(11) >= 0.8) u('cero-coma-cero');

    if (ctx.bossPasado) u('boss-primero');
    if (ctx.trampasSeguidas >= 10) u('cazatrampas');
    if (ctx.simulacroAprobado) u('aprobado');
    if (ctx.tripleAprobado) u('triple-aprobado');

    return nuevos;
  }

  // ---- Cofres / recompensa variable ----
  var COFRE = {
    skins: ['🚗 Rojo clásico', '🏎️ Deportivo', '🚙 Todoterreno', '🚕 Taxi', '🚐 Furgo aventurera', '🏍️ Moto', '🚓 Patrulla', '🚌 Bus escolar'],
    curiosidades: [
      'El airbag se infla en 25 milésimas de segundo: más rápido que un parpadeo.',
      'La línea continua nació en 1917 en Michigan, EE. UU.',
      'A 120 km/h recorres 33 metros por segundo. ¡Mira lejos!',
      'El cinturón de 3 puntos lo inventó Volvo… y liberó la patente para salvar vidas.',
      'Las rotondas reducen los accidentes graves hasta un 75% frente a un cruce.',
      'El color rojo se ve de más lejos: por eso es el del STOP y los frenos.'
    ],
    frases: [
      '¡Mañana volvemos a por más! 💪', 'Cada fallo de hoy es un acierto en el examen.',
      'Vas mejor de lo que crees. 🚀', 'La constancia gana al talento. Sigue.'
    ]
  };

  function abrirCofre() {
    var r = Math.random();
    var tipo = r < 0.4 ? 'skin' : r < 0.75 ? 'curiosidad' : 'frase';
    var premio;
    if (tipo === 'skin') premio = pick(COFRE.skins);
    else if (tipo === 'curiosidad') premio = pick(COFRE.curiosidades);
    else premio = pick(COFRE.frases);
    Store.state.cofres.push({ tipo: tipo, premio: premio, ts: Date.now() });
    Store.save();
    return { tipo: tipo, premio: premio };
  }

  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  // ---- helpers de fecha ----
  function diaAnterior(fecha) {
    var p = fecha.split('-');
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    d.setDate(d.getDate() - 1);
    return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
  }
  function semanaISO() {
    var d = new Date();
    var onejan = new Date(d.getFullYear(), 0, 1);
    var week = Math.ceil((((d - onejan) / 86400000) + onejan.getDay() + 1) / 7);
    return d.getFullYear() + '-W' + week;
  }
  function z(n) { return n < 10 ? '0' + n : '' + n; }

  window.Gamif = {
    NIVELES: NIVELES, LOGROS: LOGROS,
    infoNivel: infoNivel, ganarXP: ganarXP,
    registrarDiaJugado: registrarDiaJugado,
    desbloquear: desbloquear, tiene: tiene, revisarLogros: revisarLogros,
    abrirCofre: abrirCofre
  };
})();
