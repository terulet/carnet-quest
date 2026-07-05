/* ============================================================
   senales.js — Biblioteca de señales de tráfico en SVG
   Dibujadas 100% en código (sin imágenes con copyright).
   Cada clave devuelve un string SVG. Uso: Senales.get('r2-stop')
   ============================================================ */
(function () {
  'use strict';

  // Envuelve el contenido en un SVG cuadrado responsivo
  function svg(inner, vb) {
    return '<svg viewBox="0 0 ' + (vb || '100 100') + '" xmlns="http://www.w3.org/2000/svg" ' +
      'class="senal-svg" role="img" aria-hidden="true">' + inner + '</svg>';
  }

  // Triángulo de peligro (borde rojo, fondo blanco) con contenido central
  function triangulo(inner) {
    return svg(
      '<polygon points="50,6 96,90 4,90" fill="#fff" stroke="#d11" stroke-width="7" stroke-linejoin="round"/>' +
      inner
    );
  }
  // Círculo de prohibición (borde rojo, fondo blanco)
  function circuloProh(inner) {
    return svg(
      '<circle cx="50" cy="50" r="44" fill="#fff" stroke="#d11" stroke-width="8"/>' + inner
    );
  }
  // Círculo azul de obligación
  function circuloAzul(inner) {
    return svg(
      '<circle cx="50" cy="50" r="46" fill="#0653a6"/>' + inner
    );
  }
  // Cuadrado azul de indicación
  function cuadradoAzul(inner) {
    return svg(
      '<rect x="6" y="6" width="88" height="88" rx="4" fill="#0653a6"/>' + inner
    );
  }

  var SIGNS = {
    // ---- Prioridad ----
    'r1-ceda': svg(
      '<polygon points="50,8 92,86 8,86" fill="#fff" stroke="#d11" stroke-width="9" ' +
      'stroke-linejoin="round" transform="rotate(180 50 50)"/>'
    ),
    'r2-stop': svg(
      '<polygon points="30,6 70,6 94,30 94,70 70,94 30,94 6,70 6,30" fill="#c1121f" stroke="#fff" stroke-width="4"/>' +
      '<text x="50" y="62" font-family="Arial,Helvetica,sans-serif" font-weight="700" font-size="26" ' +
      'fill="#fff" text-anchor="middle">STOP</text>'
    ),
    'p1-interseccion': triangulo(
      '<line x1="50" y1="34" x2="50" y2="80" stroke="#111" stroke-width="6"/>' +
      '<line x1="30" y1="52" x2="70" y2="52" stroke="#111" stroke-width="6"/>'
    ),

    // ---- Prohibición / restricción ----
    'r101-entrada-prohibida': svg(
      '<circle cx="50" cy="50" r="44" fill="#c1121f"/>' +
      '<rect x="18" y="42" width="64" height="16" fill="#fff"/>'
    ),
    'r301-30': circuloProh('<text x="50" y="66" font-family="Arial" font-weight="700" font-size="40" fill="#111" text-anchor="middle">30</text>'),
    'r301-50': circuloProh('<text x="50" y="66" font-family="Arial" font-weight="700" font-size="40" fill="#111" text-anchor="middle">50</text>'),
    'r301-90': circuloProh('<text x="50" y="66" font-family="Arial" font-weight="700" font-size="40" fill="#111" text-anchor="middle">90</text>'),
    'r301-120': circuloProh('<text x="50" y="65" font-family="Arial" font-weight="700" font-size="33" fill="#111" text-anchor="middle">120</text>'),
    'r305-adelantamiento': circuloProh(
      '<rect x="24" y="40" width="24" height="16" rx="3" fill="#111"/>' +
      '<rect x="52" y="40" width="24" height="16" rx="3" fill="#d11"/>' +
      '<circle cx="30" cy="58" r="4" fill="#111"/><circle cx="42" cy="58" r="4" fill="#111"/>' +
      '<circle cx="58" cy="58" r="4" fill="#d11"/><circle cx="70" cy="58" r="4" fill="#d11"/>'
    ),
    'r307-parada': svg(
      '<circle cx="50" cy="50" r="44" fill="#0653a6" stroke="#c1121f" stroke-width="8"/>' +
      '<line x1="20" y1="20" x2="80" y2="80" stroke="#c1121f" stroke-width="8"/>'
    ),
    'r308-estacionamiento': svg(
      '<circle cx="50" cy="50" r="44" fill="#0653a6" stroke="#c1121f" stroke-width="8"/>' +
      '<line x1="24" y1="24" x2="76" y2="76" stroke="#c1121f" stroke-width="8"/>' +
      '<text x="50" y="62" font-family="Arial" font-weight="700" font-size="34" fill="#fff" text-anchor="middle">P</text>'
    ),

    // ---- Obligación ----
    'r400-sentido': circuloAzul(
      '<line x1="50" y1="74" x2="50" y2="30" stroke="#fff" stroke-width="8"/>' +
      '<polygon points="50,20 40,38 60,38" fill="#fff"/>'
    ),
    'r402-glorieta': circuloAzul(
      '<path d="M35 40 A20 20 0 1 1 34 62" fill="none" stroke="#fff" stroke-width="7"/>' +
      '<polygon points="30,66 40,58 44,72" fill="#fff"/>' +
      '<polygon points="66,34 56,42 52,28" fill="#fff"/>' +
      '<path d="M52 60 A14 14 0 1 0 52 40" fill="none" stroke="#fff" stroke-width="7"/>'
    ),

    // ---- Peligro ----
    'p13-curva': triangulo(
      '<path d="M40 82 C40 60 60 58 60 40 L60 30" fill="none" stroke="#111" stroke-width="7"/>' +
      '<polygon points="60,22 52,36 68,36" fill="#111"/>'
    ),
    'p20-peatones': triangulo(
      '<circle cx="52" cy="38" r="6" fill="#111"/>' +
      '<path d="M52 44 L52 66 M52 50 L44 60 M52 50 L62 58 M52 66 L46 82 M52 66 L60 82" ' +
      'stroke="#111" stroke-width="4" fill="none" stroke-linecap="round"/>'
    ),
    'p21-ninos': triangulo(
      '<circle cx="44" cy="40" r="5" fill="#111"/>' +
      '<path d="M44 45 L44 64 M44 50 L36 58 M44 50 L52 56 M44 64 L38 80 M44 64 L50 80" stroke="#111" stroke-width="3.5" fill="none" stroke-linecap="round"/>' +
      '<circle cx="62" cy="44" r="4.5" fill="#111"/>' +
      '<path d="M62 48 L62 66 M62 53 L56 60 M62 53 L68 58 M62 66 L57 80 M62 66 L67 80" stroke="#111" stroke-width="3.5" fill="none" stroke-linecap="round"/>'
    ),
    'p50-otros': triangulo(
      '<text x="50" y="80" font-family="Arial" font-weight="700" font-size="46" fill="#111" text-anchor="middle">!</text>'
    ),

    // ---- Indicación ----
    's13-paso-peatones': cuadradoAzul(
      '<polygon points="50,16 84,50 66,50 66,84 34,84 34,50 16,50" fill="#fff"/>' +
      '<circle cx="50" cy="40" r="7" fill="#0653a6"/>' +
      '<path d="M50 46 L50 66 M50 52 L42 62 M50 52 L58 60 M50 66 L44 80 M50 66 L56 80" stroke="#0653a6" stroke-width="4" fill="none"/>'
    ),
    's1-autopista': cuadradoAzul(
      '<path d="M28 78 L40 26 L48 26 L40 78 Z" fill="#fff"/>' +
      '<path d="M52 78 L64 26 L72 26 L60 78 Z" fill="#fff"/>' +
      '<rect x="24" y="80" width="52" height="6" fill="#fff"/>'
    ),

    // ---- Semáforo ----
    'semaforo': svg(
      '<rect x="34" y="10" width="32" height="80" rx="6" fill="#222"/>' +
      '<circle cx="50" cy="28" r="10" fill="#e33"/>' +
      '<circle cx="50" cy="50" r="10" fill="#fc3"/>' +
      '<circle cx="50" cy="72" r="10" fill="#3c6"/>'
    )
  };

  var Senales = {
    get: function (key) {
      if (!key) return '';
      return SIGNS[key] || placeholder(key);
    },
    has: function (key) { return !!SIGNS[key]; },
    keys: function () { return Object.keys(SIGNS); }
  };

  function placeholder(key) {
    return svg('<rect x="6" y="6" width="88" height="88" rx="8" fill="#333" stroke="#555" stroke-width="3"/>' +
      '<text x="50" y="55" font-family="Arial" font-size="9" fill="#aaa" text-anchor="middle">' +
      (key.replace(/[<>&"]/g, '')) + '</text>');
  }

  window.Senales = Senales;
})();
