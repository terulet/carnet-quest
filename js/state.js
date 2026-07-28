// CARNET QUEST — estado del jugador: IndexedDB + migraciones + export/import (§5, §11)

const DB_NOMBRE = 'carnet-quest';
const DB_VERSION = 1;
const STORE = 'jugador';
const SCHEMA_VERSION = 3;

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
    cruces: { record: 0 },   // "¿Quién pasa primero?": mejor tanda
    bote: { record: 0 },     // "Doble o nada": mejor bote cobrado
    rush: { semana: null, record: 0 }, // "Señal Rush": récord semanal
    // Garaje: SOLO cosmética. Ni las Chapas ni el dinero real compran progreso (§6)
    garaje: { coche: 'escuela', tema: 'cian', celebracion: 'senales', comprados: ['escuela', 'cian', 'senales'] },

    /* ---- Retención V1 (esquema 2) ---- */
    // Descubrimiento progresivo: los modos se encienden por hitos, no de golpe
    desbloqueos: { cruces: true, rush: false, bote: false, torre: false, crono: false },
    // Tu Próxima Parada: como mucho UNA pendiente, nunca caduca, nunca penaliza
    proxima: null,
    // Preferencias locales de recordatorio (solo se usan si el jugador lo pide)
    prefs: { horaRecordatorio: '19:30' },
    // Contratos de ruta: contador informativo, sin economía nueva
    contratos: { completados: 0, fallados: 0 },
    // Modo de prueba: caja negra LOCAL, apagada por defecto, sin red jamás
    pruebas: { activo: false },

    /* ---- Plan de examen (esquema 3) ---- */
    // La fecha convierte el juego en un plan con final. NO toca el Predictor:
    // solo cambia qué se sugiere hacer y cómo se presenta el progreso.
    examen: { fecha: null, fijadaEn: null, avisado: false, resultado: null },
    compras: { pase: false, codigo: null },
    ajustes: { sonido: true, haptics: true },
  };
}

// Cada función lleva el estado de la versión N a la N+1. Nunca destructivas.
const MIGRACIONES = {
  // 1 → 2 · Retención V1. Deduce los desbloqueos del progreso ya existente,
  // SIEMPRE a favor del jugador: si hay cualquier rastro de haber usado un modo,
  // se queda abierto. Nadie pierde acceso a algo que ya estaba usando.
  1: (s) => {
    const album = s.album || {};
    const coleccionadas = Object.values(album).filter((n) => (n || 0) >= 2).length;
    const bossHecho = Object.values(s.mundos || {}).some((m) => m && m.bossSuperado);
    const simulacros = (s.simulacros || []).length > 0;
    s.desbloqueos = {
      cruces: true,
      rush: coleccionadas >= 12 || (s.rush?.record || 0) > 0,
      bote: bossHecho || (s.bote?.record || 0) > 0,
      torre: bossHecho || simulacros || (s.contrarreloj?.record || 0) > 0,
      crono: simulacros || (s.contrarreloj?.record || 0) > 0,
    };
    // un veterano con progreso real no debe encontrarse el juego recortado
    if ((s.xp || 0) >= 400) {
      s.desbloqueos = { cruces: true, rush: true, bote: true, torre: true, crono: true };
    }
    s.proxima = s.proxima ?? null;
    s.prefs = s.prefs || { horaRecordatorio: '19:30' };
    s.contratos = s.contratos || { completados: 0, fallados: 0 };
    s.pruebas = s.pruebas || { activo: false };
    s.schemaVersion = 2;
    return s;
  },

  // 2 → 3 · Plan de examen. Añade una rama y nada más: quien ya jugaba se
  // queda exactamente igual hasta que decida poner fecha, que es opcional.
  2: (s) => {
    s.examen = s.examen || { fecha: null, fijadaEn: null, avisado: false, resultado: null };
    s.schemaVersion = 3;
    return s;
  },
};

function migrar(s) {
  let v = s.schemaVersion || 1;
  while (v < SCHEMA_VERSION) {
    const fn = MIGRACIONES[v];
    if (!fn) break;
    s = fn(s);
    v = s.schemaVersion;
  }
  // Garantiza campos nuevos aunque no haya migración formal. Object.assign es
  // superficial, así que los objetos anidados nuevos se completan a mano: un
  // estado antiguo o dañado nunca debe dejar la app en pantalla blanca.
  const base = estadoInicial();
  // ¡copia! Object.assign(base, s) mutaría `base` y entonces los valores de
  // repuesto de abajo ya vendrían dañados: un `racha: null` acababa en `{}`.
  const fusion = Object.assign({}, base, s);
  for (const clave of ['desbloqueos', 'prefs', 'contratos', 'pruebas', 'garaje', 'racha', 'ajustes', 'compras', 'examen']) {
    const guardado = s[clave];
    // solo se fusiona lo que de verdad es un objeto: un string o un null se
    // descartan enteros (Object.assign con un string reparte sus letras)
    const valido = guardado && typeof guardado === 'object' && !Array.isArray(guardado) ? guardado : {};
    fusion[clave] = Object.assign({}, base[clave], valido);
  }
  for (const clave of ['mundos', 'srs', 'taller', 'album', 'vistas', 'diarias']) {
    if (!fusion[clave] || typeof fusion[clave] !== 'object') fusion[clave] = base[clave];
  }
  for (const clave of ['respuestas', 'simulacros', 'albumCategorias']) {
    if (!Array.isArray(fusion[clave])) fusion[clave] = base[clave];
  }
  if (!Array.isArray(fusion.garaje.comprados)) fusion.garaje.comprados = base.garaje.comprados;
  if (fusion.proxima && typeof fusion.proxima !== 'object') fusion.proxima = null;
  return fusion;
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
