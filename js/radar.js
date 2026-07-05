/* ============================================================
   radar.js — Radar de debilidades: % de dominio por tema (verde/ámbar/rojo).
   El mezclador y el plan de estudio usan esto para decidir dónde insistir.
   ============================================================ */
(function () {
  'use strict';

  // Dominio de un tema en 0..1, combinando cobertura y acierto reciente.
  function dominioTema(n) {
    var pool = Banco.porTema(n);
    if (!pool.length) return 0;
    var s = Store.state;
    var suma = 0, vistas = 0;
    pool.forEach(function (p) {
      var c = s.cards[p.id];
      if (c && c.seen > 0) {
        vistas++;
        // valor por caja (0..1): box0=0.15 ... boxMax≈1
        var v = Math.min(1, 0.15 + c.box * 0.16);
        if (c.last === -1) v *= 0.5; // penaliza el último fallo
        suma += v;
      }
    });
    if (vistas === 0) return 0;
    // cobertura: cuántas del tema has tocado
    var cobertura = vistas / pool.length;
    var calidad = suma / vistas;
    // el dominio requiere haber visto una parte razonable del tema
    return Math.max(0, Math.min(1, calidad * (0.4 + 0.6 * cobertura)));
  }

  function color(d) {
    if (d >= 0.8) return 'verde';
    if (d >= 0.5) return 'ambar';
    if (d > 0) return 'rojo';
    return 'gris';
  }

  // Resumen de todos los temas
  function resumen() {
    var out = [];
    for (var n = 1; n <= 15; n++) {
      var d = dominioTema(n);
      out.push({ tema: n, nombre: Banco.nombreTema(n), dominio: d, color: color(d) });
    }
    return out;
  }

  // Dominio global (para el % "vas al 62%")
  function dominioGlobal() {
    var r = resumen();
    if (!r.length) return 0;
    var s = 0; r.forEach(function (x) { s += x.dominio; });
    return s / r.length;
  }

  // Temas más flojos (rojo/ámbar) ordenados de peor a mejor
  function puntosDebiles() {
    return resumen()
      .filter(function (x) { return x.dominio < 0.8; })
      .sort(function (a, b) { return a.dominio - b.dominio; });
  }

  window.Radar = {
    dominioTema: dominioTema, color: color, resumen: resumen,
    dominioGlobal: dominioGlobal, puntosDebiles: puntosDebiles
  };
})();
