/* ============================================================
   motor-repaso.js — Motor de repetición espaciada (SM-2 / Leitner)
   Regla de oro (principio científico #3):
     · Una pregunta FALLADA vuelve a las 24 h, luego 72 h, luego 7 días.
     · Una pregunta DOMINADA se espacia cada vez más.
   Cada respuesta reprograma el próximo repaso y suma XP de aprendizaje.
   ============================================================ */
(function () {
  'use strict';

  var DIA = 24 * 60 * 60 * 1000;
  // Escalera de intervalos (en días): 24h → 72h → 7d → 16d → 35d → 90d → 180d
  var STEPS = [1, 3, 7, 16, 35, 90, 180];
  var EF_INICIAL = 2.5;
  var EF_MIN = 1.3;

  function nuevaTarjeta() {
    return {
      box: 0,          // índice en STEPS
      ef: EF_INICIAL,  // factor de facilidad (SM-2)
      reps: 0,
      lapses: 0,
      due: 0,          // timestamp ms del próximo repaso
      seen: 0,         // veces vista
      correct: 0,
      wrong: 0,
      last: 0,         // 1 acierto / -1 fallo
      lastTs: 0
    };
  }

  function getCard(id) {
    var s = Store.state;
    if (!s.cards[id]) s.cards[id] = nuevaTarjeta();
    return s.cards[id];
  }

  // Registra una respuesta. acierto=bool, ms=tiempo de respuesta (opcional)
  // Devuelve info para el "juice" (xp ganada, si sube de box, próximo repaso).
  function registrar(pregunta, acierto, ms) {
    var s = Store.state;
    var c = getCard(pregunta.id);
    var now = Date.now();
    c.seen++;
    c.lastTs = now;

    var subeBox = false;
    if (acierto) {
      c.correct++;
      c.reps++;
      c.last = 1;
      c.ef = Math.min(3.0, c.ef + 0.08);
      if (c.box < STEPS.length - 1) { c.box++; subeBox = true; }
    } else {
      c.wrong++;
      c.reps = 0;
      c.lapses++;
      c.last = -1;
      c.ef = Math.max(EF_MIN, c.ef - 0.2);
      c.box = 0; // vuelve a 24 h
    }

    // Intervalo: STEPS[box] modulado por el ease factor en cajas altas
    var dias = STEPS[c.box];
    if (c.box >= 2) dias = Math.round(dias * (c.ef / EF_INICIAL));
    c.due = now + dias * DIA;

    // Estadísticas por tema
    if (!s.temas[pregunta.tema]) s.temas[pregunta.tema] = { vistas: 0, aciertos: 0, fallos: 0 };
    var t = s.temas[pregunta.tema];
    t.vistas++;
    if (acierto) t.aciertos++; else t.fallos++;

    // Estadísticas globales
    s.stats.respondidas++;
    if (acierto) s.stats.aciertos++; else s.stats.fallos++;
    if (acierto && pregunta.esTrampa) s.stats.trampasAcertadas++;

    // XP: acertar da más, pero FALLAR TAMBIÉN SUMA (el error nunca castiga)
    var xp = acierto ? (10 + (pregunta.dificultad || 1) * 3) : 4;
    if (acierto && pregunta.esTrampa) xp += 6; // cazar una trampa premia

    Store.save();
    return { xp: xp, subeBox: subeBox, proximo: c.due, dias: dias, acierto: acierto };
  }

  // ¿Está pendiente de repaso hoy?
  function tocaHoy(id) {
    var c = Store.state.cards[id];
    if (!c) return false;
    return c.due <= Date.now();
  }

  // Devuelve los ids de tarjetas vencidas (para repaso), ordenados por urgencia
  function vencidas() {
    var s = Store.state, now = Date.now(), out = [];
    for (var id in s.cards) {
      var c = s.cards[id];
      if (c.due <= now && c.seen > 0) out.push({ id: id, due: c.due, box: c.box });
    }
    // Más vencidas primero; dentro de eso, las de caja baja (peor dominadas)
    out.sort(function (a, b) { return (a.due - b.due) || (a.box - b.box); });
    return out.map(function (x) { return x.id; });
  }

  // Clasifica una tarjeta: 'rojo' (débil), 'ambar' (en progreso), 'verde' (dominada), 'nueva'
  function estado(id) {
    var c = Store.state.cards[id];
    if (!c || c.seen === 0) return 'nueva';
    if (c.last === -1 || c.box === 0) return 'rojo';
    if (c.box >= 3 && c.wrong === 0) return 'verde';
    if (c.box >= 2) return 'verde';
    return 'ambar';
  }

  window.Motor = {
    registrar: registrar,
    tocaHoy: tocaHoy,
    vencidas: vencidas,
    estado: estado,
    getCard: getCard,
    STEPS: STEPS
  };
})();
