/* ============================================================
   aventura.js — Capa de AVENTURA: "El Gran Viaje del Carnet".
   - Mapa serpenteante (SVG) que cruza España, con tu coche moviéndose.
   - Historia por etapas y un mentor (el Profe).
   - Jefes con cara, mote y barra de vida (para las batallas).
   Reutiliza los MUNDOS y el motor de aprendizaje existentes.
   ============================================================ */
(function () {
  'use strict';

  // Narrativa: el viaje de la autoescuela hasta el examen final, cruzando España.
  var ETAPAS = [
    { lugar: 'La Autoescuela', bioma: 'ciudad', historia: 'Arrancas motor por primera vez. El Profe te espera: "Antes de volar, aprende dónde pisas."' },
    { lugar: 'El Cruce del Pueblo', bioma: 'pueblo', historia: 'Semáforos y un agente que dirige el tráfico. ¿A quién haces caso primero?' },
    { lugar: 'Bosque de Señales', bioma: 'bosque', historia: 'Triángulos que avisan, círculos que ordenan. Un bosque lleno de carteles.' },
    { lugar: 'Carretera Pintada', bioma: 'carretera', historia: 'Líneas en el asfalto que también mandan. Continua: ni la roces.' },
    { lugar: 'Puerto de Montaña', bioma: 'montana', historia: 'Cuestas y curvas. Aquí la velocidad correcta te salva la vida.' },
    { lugar: 'Valle de las Distancias', bioma: 'valle', historia: 'Deja hueco. El coche de delante no perdona los frenazos.' },
    { lugar: 'La Recta Larga', bioma: 'carretera', historia: 'Tentación de adelantar. Solo donde ves lo que viene.' },
    { lugar: 'La Gran Rotonda', bioma: 'ciudad', historia: 'El jefe de la circulación. Quien está dentro, manda.' },
    { lugar: 'Barrio de Maniobras', bioma: 'ciudad', historia: 'Aparcar sin rozar, girar sin sustos, marcha atrás con ojos en la nuca.' },
    { lugar: 'Niebla del Amanecer', bioma: 'niebla', historia: 'Poca visibilidad. La luz correcta en el momento correcto.' },
    { lugar: 'La Noche de Fiesta', bioma: 'noche', historia: 'Cero al volante. El alcohol te engaña haciéndote creer mejor.' },
    { lugar: 'Taller de Seguridad', bioma: 'taller', historia: 'Cinturón, sillita, airbag. Lo que te trae de vuelta a casa.' },
    { lugar: 'Oficina de la DGT', bioma: 'ciudad', historia: 'Papeles, puntos e ITV. La burocracia también cae en el examen.' },
    { lugar: 'La Cuesta del Motor', bioma: 'montana', historia: 'Mecánica y medio ambiente: cuida el coche y el planeta.' },
    { lugar: 'El Examen Final', bioma: 'ciudad', historia: '¡La prueba definitiva! Accidentes, peatones y la conducta PAS. Demuéstralo.' }
  ];

  // Un jefe por mundo: cara, mote y frases.
  var JEFES = [
    { cara: '🧑‍🏫', nombre: 'El Profe Gruñón', taunt: '¿Sabes siquiera qué es un arcén?', muerte: '¡Vaya, no lo haces mal, chaval!' },
    { cara: '👮', nombre: 'El Agente de Hierro', taunt: 'Mi brazo manda sobre tu semáforo.', muerte: 'Puedes pasar... esta vez.' },
    { cara: '🪧', nombre: 'El Señor de los Carteles', taunt: 'Confundirás peligro con prohibición, ya verás.', muerte: '¡Me has leído perfectamente!' },
    { cara: '🎨', nombre: 'El Pintalíneas', taunt: 'Pisarás mi línea continua, seguro.', muerte: '¡Respeto! No la rozaste.' },
    { cara: '🏁', nombre: 'Velocirrápido', taunt: '¿90 o 100? Te vas a liar fijo.', muerte: '¡Frenaste a tiempo, campeón!' },
    { cara: '📏', nombre: 'El Pegajoso', taunt: 'Te pegarás a mi parachoques.', muerte: '¡Buena distancia! Me dejaste sitio.' },
    { cara: '↔️', nombre: 'Don Adelanto', taunt: 'Adelantarás en curva, lo sé.', muerte: '¡Adelantamiento de manual!' },
    { cara: '🔄', nombre: 'La Reina Rotonda', taunt: 'Entrarás sin ceder, jajaja.', muerte: '¡Cediste como se debe!' },
    { cara: '🅿️', nombre: 'El Aparcacoches Caótico', taunt: 'Aparcarás en doble fila.', muerte: '¡Maniobra impecable!' },
    { cara: '🌫️', nombre: 'La Niebla', taunt: 'No verás nada... ni encenderás bien las luces.', muerte: '¡Me disipaste con tus cortas!' },
    { cara: '🍺', nombre: 'El Copazo', taunt: 'Un traguito no pasa nada, ¿no?', muerte: '¡Cero coma cero! Imposible engañarte.' },
    { cara: '💥', nombre: 'El Sin Cinturón', taunt: 'El airbag ya te salva, quítatelo.', muerte: '¡Bien atado, sobrevives!' },
    { cara: '📄', nombre: 'El Papeleo', taunt: '¿12 puntos o 8? A que fallas.', muerte: '¡Tienes los papeles en regla!' },
    { cara: '🔧', nombre: 'El Averías', taunt: 'Ignorarás el testigo rojo.', muerte: '¡Buen mecánico de salón!' },
    { cara: '🎓', nombre: 'El Examinador', taunt: 'Nadie aprueba a la primera conmigo.', muerte: '🎉 ¡APROBADO! Bienvenido a la carretera.' }
  ];

  var BIOMAS = {
    ciudad: '#5b8cff', pueblo: '#f7a83e', bosque: '#3fae6a', carretera: '#8a93b5',
    montana: '#7d6bd8', valle: '#48c9b0', niebla: '#9fb0c8', noche: '#3b4a8c', taller: '#ff7a59'
  };

  function etapa(n) { return ETAPAS[n - 1] || ETAPAS[0]; }
  function jefe(n) { return JEFES[n - 1] || JEFES[0]; }

  // Construye el mapa-viaje dentro de `host`, con nodos clicables y coche animado.
  // helpers: { desbloqueado(num), estrellas(num), current, onNode(num) }
  function buildMapa(host, mundos, helpers) {
    var N = mundos.length;
    var VBW = 100, stepY = 66, top = 40, VBH = top * 2 + (N - 1) * stepY;
    var xs = [24, 50, 76, 50]; // serpenteante
    function nx(i) { return xs[i % xs.length]; }
    function ny(i) { return top + i * stepY; }

    // path de la carretera
    var d = 'M' + nx(0) + ' ' + ny(0);
    for (var i = 1; i < N; i++) {
      var cy = (ny(i - 1) + ny(i)) / 2;
      d += ' C ' + nx(i - 1) + ' ' + cy + ', ' + nx(i) + ' ' + cy + ', ' + nx(i) + ' ' + ny(i);
    }

    var svg = '<svg viewBox="0 0 ' + VBW + ' ' + VBH + '" class="viaje-svg" preserveAspectRatio="xMidYMin meet">';
    // carretera base
    svg += '<path d="' + d + '" fill="none" stroke="#2a3252" stroke-width="9" stroke-linecap="round"/>';
    svg += '<path d="' + d + '" fill="none" stroke="#3a4266" stroke-width="7" stroke-linecap="round"/>';
    svg += '<path id="viaje-path" d="' + d + '" fill="none" stroke="#c9d3ee" stroke-width="1.1" stroke-dasharray="3 4" stroke-linecap="round" opacity=".7"/>';

    // nodos
    for (var j = 0; j < N; j++) {
      var m = mundos[j], x = nx(j), y = ny(j);
      var desb = helpers.desbloqueado(m.num);
      var col = BIOMAS[etapa(m.num).bioma] || m.color;
      var estrellas = helpers.estrellas(m.num);
      svg += '<g class="viaje-nodo' + (desb ? '' : ' lock') + '" data-num="' + m.num + '" transform="translate(' + x + ',' + y + ')">';
      svg += '<circle r="15" fill="' + (desb ? col : '#3a4266') + '" stroke="#fff" stroke-width="2"/>';
      svg += '<text y="6" text-anchor="middle" font-size="15">' + (desb ? m.emoji : '🔒') + '</text>';
      svg += '<text class="viaje-num" y="-19" text-anchor="middle" font-size="7" fill="#fff">' + m.num + '</text>';
      if (estrellas) svg += '<text y="27" text-anchor="middle" font-size="7">' + estrellas + '</text>';
      svg += '</g>';
    }
    // coche (se posiciona/animará por JS)
    svg += '<g id="viaje-coche"><text text-anchor="middle" font-size="17" y="6">🚗</text></g>';
    svg += '</svg>';

    host.innerHTML = svg;

    // click en nodos desbloqueados
    Array.prototype.forEach.call(host.querySelectorAll('.viaje-nodo'), function (g) {
      if (g.classList.contains('lock')) return;
      g.addEventListener('click', function () { helpers.onNode(Number(g.getAttribute('data-num'))); });
    });

    // animar coche desde el último nodo visto hasta el actual
    var pathEl = host.querySelector('#viaje-path');
    var coche = host.querySelector('#viaje-coche');
    var idxActual = Math.max(0, helpers.current - 1);
    var idxPrevio = Math.min(Math.max(0, (helpers.lastSeen || helpers.current) - 1), idxActual);

    function pointAt(idx) {
      var frac = N > 1 ? idx / (N - 1) : 0;
      var len = pathEl.getTotalLength();
      return pathEl.getPointAtLength(len * frac);
    }
    function place(p) { coche.setAttribute('transform', 'translate(' + p.x + ',' + (p.y - 16) + ')'); }

    if (idxActual > idxPrevio) {
      var t0 = null, dur = 550 * (idxActual - idxPrevio);
      var len = pathEl.getTotalLength();
      var fA = idxPrevio / (N - 1), fB = idxActual / (N - 1);
      function step(ts) {
        if (!t0) t0 = ts;
        var k = Math.min(1, (ts - t0) / dur);
        var e = k < .5 ? 2 * k * k : -1 + (4 - 2 * k) * k; // easeInOut
        var p = pathEl.getPointAtLength(len * (fA + (fB - fA) * e));
        place(p);
        if (k < 1) requestAnimationFrame(step);
        else if (helpers.onArrive) helpers.onArrive();
      }
      requestAnimationFrame(step);
    } else {
      place(pointAt(idxActual));
    }
  }

  window.Aventura = {
    ETAPAS: ETAPAS, JEFES: JEFES, etapa: etapa, jefe: jefe, buildMapa: buildMapa
  };
})();
