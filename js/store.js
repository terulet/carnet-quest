/* ============================================================
   store.js — Persistencia local (localStorage) + export/import JSON
   Guarda TODO el progreso: perfil, XP, rachas, tarjetas de repaso,
   dominio por tema, logros, simulacros y ajustes.
   Sobrevive al cerrar el navegador. Sin backend.
   ============================================================ */
(function () {
  'use strict';

  var KEY = 'carnetquest_v1';

  function hoy() {
    // Fecha local YYY-MM-DD (para rachas por día natural)
    var d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function estadoInicial() {
    return {
      version: 1,
      createdAt: Date.now(),
      lastPlayed: Date.now(),
      profile: { nombre: '', avatar: '🚗', xp: 0, nivel: 1 },
      streak: { current: 0, best: 0, lastDay: null, freezes: 1, freezeWeek: null },
      cards: {},          // id -> tarjeta SR
      temas: {},          // numTema -> { vistas, aciertos, fallos }
      logros: {},         // slug -> timestamp
      worlds: {},         // numTema -> { niveles:{n:true}, boss:bool }
      simulacros: [],     // { fecha, aciertos, fallos, aprobado, ts }
      settings: { sonido: true, vibracion: true, tema: 'dark' },
      stats: { respondidas: 0, aciertos: 0, fallos: 0, trampasAcertadas: 0, minutos: 0 },
      planStart: null,
      cofres: []          // recompensas obtenidas
    };
  }

  var state = null;

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        state = mergeDefaults(JSON.parse(raw));
      } else {
        state = estadoInicial();
        save();
      }
    } catch (e) {
      console.warn('No se pudo cargar el estado, empezando de cero.', e);
      state = estadoInicial();
    }
    return state;
  }

  // Garantiza que los campos nuevos existan si el guardado es antiguo
  function mergeDefaults(s) {
    var base = estadoInicial();
    for (var k in base) {
      if (!(k in s)) s[k] = base[k];
    }
    for (var sk in base.settings) {
      if (!(sk in s.settings)) s.settings[sk] = base.settings[sk];
    }
    for (var stk in base.stats) {
      if (!(stk in s.stats)) s.stats[stk] = base.stats[stk];
    }
    if (!s.streak) s.streak = base.streak;
    return s;
  }

  var saveTimer = null;
  function save() {
    if (!state) return;
    state.lastPlayed = Date.now();
    // Debounce para no escribir en cada tecla
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(saveNow, 120);
  }
  function saveNow() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Error guardando estado (¿almacenamiento lleno?)', e);
    }
  }

  function reset() {
    state = estadoInicial();
    saveNow();
    return state;
  }

  function exportJSON() {
    return JSON.stringify(state, null, 2);
  }

  function importJSON(text) {
    var data = JSON.parse(text); // lanza si es inválido
    if (!data || typeof data !== 'object' || !data.profile) {
      throw new Error('El archivo no parece un guardado válido de Carnet Quest.');
    }
    state = mergeDefaults(data);
    saveNow();
    return state;
  }

  window.Store = {
    load: load,
    save: save,
    saveNow: saveNow,
    reset: reset,
    exportJSON: exportJSON,
    importJSON: importJSON,
    hoy: hoy,
    get state() { return state || load(); }
  };
})();
