/* ============================================================
   banco.js — Carga y acceso al banco de preguntas (los 15 JSON).
   Los datos viven en /datos/tema-NN.json → añadir contenido sin tocar código.
   Ofline-first: si un JSON falla, sigue con los demás.
   ============================================================ */
(function () {
  'use strict';

  var TEMAS = 15;
  var _todas = [];
  var _porTema = {};   // num -> [preguntas]
  var _byId = {};
  var _nombres = {};   // num -> nombre del tema

  function ruta(n) {
    return 'datos/tema-' + (n < 10 ? '0' + n : n) + '.json';
  }

  function cargar() {
    var jobs = [];
    for (var i = 1; i <= TEMAS; i++) {
      jobs.push(cargarUno(i));
    }
    return Promise.all(jobs).then(function () {
      // índices
      _todas.forEach(function (p) { _byId[p.id] = p; });
      return { total: _todas.length, temas: _porTema };
    });
  }

  function cargarUno(n) {
    return fetch(ruta(n), { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (data) {
        var lista = Array.isArray(data) ? data : (data.preguntas || []);
        _nombres[n] = data.nombre || ('Tema ' + n);
        // sanea: garantiza campos mínimos
        lista = lista.filter(function (p) {
          return p && p.id && Array.isArray(p.opciones) && p.opciones.length === 3 &&
            typeof p.correcta === 'number' && p.correcta >= 0 && p.correcta <= 2;
        }).map(function (p) {
          p.tema = p.tema || n;
          p.dificultad = p.dificultad || 1;
          p.esTrampa = !!p.esTrampa;
          p.imagen = p.imagen || '';
          p.mnemotecnia = p.mnemotecnia || '';
          return p;
        });
        _porTema[n] = lista;
        _todas = _todas.concat(lista);
      })
      .catch(function (e) {
        console.warn('No se pudo cargar ' + ruta(n) + ':', e.message);
        _porTema[n] = _porTema[n] || [];
      });
  }

  window.Banco = {
    cargar: cargar,
    todas: function () { return _todas; },
    porTema: function (n) { return _porTema[n] || []; },
    byId: function (id) { return _byId[id] || null; },
    nombreTema: function (n) { return _nombres[n] || ('Tema ' + n); },
    countTema: function (n) { return (_porTema[n] || []).length; },
    total: function () { return _todas.length; }
  };
})();
