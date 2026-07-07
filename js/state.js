// CARNET QUEST — estado del jugador: IndexedDB + migraciones + export/import (§5, §11)

const DB_NOMBRE = 'carnet-quest';
const DB_VERSION = 1;
const STORE = 'jugador';
const SCHEMA_VERSION = 1;

export const HOY = () => new Date().toISOString().slice(0, 10);

export function semanaISO(d = new Date()) {
  const f = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dia = f.getUTCDay() || 7;
  f.setUTCDate(f.getUTCDate() + 4 - dia);
  const inicio = new Date(Date.UTC(f.getUTCFullYear(), 0, 1));
  const num = Math.ceil((((f - inicio) / 86400000) + 1) / 7);
  return `${f.getUTCFullYear()}-W${String(num).padStart(2, '0')}`;
}

function estadoInicial() {
  return {
    schemaVersion: SCHEMA_VERSION,
    creado: HOY(),
    onboarded: false,
    xp: 0,
    chapas: 0,
    racha: { dias: 0, ultimoDia: null, protectores: 1, semanaProtector: semanaISO() },
    mundos: {},          // "1": { estrellas: [3,0,...], bossSuperado: false }
    srs: {},             // "M01-001": { caja: 1, vence: "2026-07-05" }
    taller: {},          // "M01-002": { fallos: 2, reparaciones: 0, ultimoDiaRep: null }
    album: {},           // "S-28": nº de aciertos (coleccionada con 2)
    albumCategorias: [], // categorías ya premiadas
    vistas: {},          // "M01-001": veces mostrada
    respuestas: [],      // [{id, ok, ts}] — últimas 400, para el predictor
    simulacros: [],      // [{fecha, fallos, apto, segundos}]
    simulacroHoy: null,  // fecha del último simulacro gratis
    diarias: { fecha: null, lista: [] },
    contrarreloj: { semana: null, record: 0 },
    compras: { pase: false, codigo: null },
    ajustes: { sonido: true, haptics: true },
  };
}

// Migraciones futuras: cada función lleva el estado de la versión N a la N+1.
const MIGRACIONES = {
  // 1: (s) => { ...; s.schemaVersion = 2; return s; }
};

function migrar(s) {
  let v = s.schemaVersion || 1;
  while (v < SCHEMA_VERSION) {
    const fn = MIGRACIONES[v];
    if (!fn) break;
    s = fn(s);
    v = s.schemaVersion;
  }
  // garantiza campos nuevos aunque no haya migración formal
  return Object.assign(estadoInicial(), s);
}

let db = null;
let estado = null;
let guardarPendiente = null;

function abrirDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NOMBRE, DB_VERSION);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function cargarEstado() {
  if (estado) return estado;
  try {
    db = await abrirDB();
    const leido = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly').objectStore(STORE).get('estado');
      tx.onsuccess = () => resolve(tx.result);
      tx.onerror = () => reject(tx.error);
    });
    estado = leido ? migrar(leido) : estadoInicial();
  } catch {
    // Safari privado u otros fallos de IDB: fallback a localStorage
    try { estado = migrar(JSON.parse(localStorage.getItem('cq-estado'))); }
    catch { estado = estadoInicial(); }
  }
  return estado;
}

export function getEstado() { return estado; }

export function guardar() {
  // debounce: agrupa escrituras del mismo frame
  if (guardarPendiente) return;
  guardarPendiente = setTimeout(() => {
    guardarPendiente = null;
    const copia = JSON.parse(JSON.stringify(estado));
    if (db) {
      try { db.transaction(STORE, 'readwrite').objectStore(STORE).put(copia, 'estado'); }
      catch { /* sin pánico: queda el fallback */ }
    }
    try { localStorage.setItem('cq-estado', JSON.stringify(copia)); } catch { /* lleno */ }
  }, 60);
}

export function exportarJSON() {
  return JSON.stringify({ app: 'carnet-quest', exportado: new Date().toISOString(), estado }, null, 2);
}

export function importarJSON(texto) {
  const doc = JSON.parse(texto);
  const s = doc.estado ?? doc;
  if (!s || typeof s !== 'object' || !('xp' in s) || !('srs' in s)) {
    throw new Error('formato no válido');
  }
  estado = migrar(s);
  guardar();
  return estado;
}

export async function borrarTodo() {
  estado = estadoInicial();
  guardar();
}

/* ------- helpers de dominio ------- */

export function mundoEstado(n) {
  const k = String(n);
  if (!estado.mundos[k]) estado.mundos[k] = { estrellas: [], bossSuperado: false };
  return estado.mundos[k];
}

export function estrellasDeMundo(n) {
  const m = estado.mundos[String(n)];
  return m ? m.estrellas.reduce((a, b) => a + (b || 0), 0) : 0;
}

export function estrellasTotales() {
  return Object.keys(estado.mundos).reduce((s, k) => s + estrellasDeMundo(k), 0);
}

export function registrarRespuesta(id, ok) {
  estado.respuestas.push({ id, ok, ts: Date.now() });
  if (estado.respuestas.length > 400) estado.respuestas.splice(0, estado.respuestas.length - 400);
  estado.vistas[id] = (estado.vistas[id] || 0) + 1;
}

// Racha: se llama al completar cualquier misión/boss/simulacro
export function tocarRacha() {
  const hoy = HOY();
  const r = estado.racha;
  // protector semanal gratis
  const semana = semanaISO();
  if (r.semanaProtector !== semana) { r.semanaProtector = semana; r.protectores = Math.max(r.protectores, 1); }
  if (r.ultimoDia === hoy) return { evento: null, dias: r.dias };
  const ayer = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const anteayer = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10);
  let evento = 'sube';
  if (r.ultimoDia === ayer || r.ultimoDia === null) {
    r.dias += 1;
  } else if (r.ultimoDia === anteayer && r.protectores > 0) {
    r.protectores -= 1; r.dias += 1; evento = 'protegida';
  } else {
    r.dias = 1; evento = r.ultimoDia ? 'perdida' : 'sube';
  }
  r.ultimoDia = hoy;
  return { evento, dias: r.dias };
}
