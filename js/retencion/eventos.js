// CARNET QUEST — caja negra LOCAL para pruebas con personas.
//
// Reglas duras de este módulo:
//   · No existe ni una sola llamada de red. Ni fetch, ni beacon, ni imagen.
//   · Apagado por defecto. Sin activación explícita no se registra nada.
//   · No guarda texto de preguntas, respuestas escritas ni dato personal alguno.
//     Los IDs internos de pregunta sí, porque no identifican a nadie.
//   · Vive en su propia clave de localStorage, aparte del progreso del jugador,
//     para no contaminar el export/import de partida.

import { getEstado, guardar } from '../state.js';

const CLAVE = 'cq-pruebas';
const MAX_EVENTOS = 2000;       // buffer circular: nunca crece sin control
const FORMATO = 1;

let sesionId = null;
let buffer = null;              // caché en memoria, se vuelca con debounce
let volcadoPendiente = null;

const activo = () => getEstado()?.pruebas?.activo === true;

function idCorto() {
  // sin dependencias: 8 hex de aleatoriedad basta para separar sesiones locales
  const a = new Uint8Array(4);
  (globalThis.crypto || {}).getRandomValues?.(a);
  return Array.from(a, (b) => b.toString(16).padStart(2, '0')).join('')
    || String(Date.now() % 1e8);
}

function leer() {
  if (buffer) return buffer;
  try {
    const crudo = JSON.parse(localStorage.getItem(CLAVE));
    buffer = crudo && Array.isArray(crudo.eventos) ? crudo : { formato: FORMATO, eventos: [] };
  } catch { buffer = { formato: FORMATO, eventos: [] }; }
  return buffer;
}

function volcar() {
  if (volcadoPendiente) return;
  volcadoPendiente = setTimeout(() => {
    volcadoPendiente = null;
    try { localStorage.setItem(CLAVE, JSON.stringify(buffer)); }
    catch { /* almacenamiento lleno: se pierde el registro, nunca la partida */ }
  }, 250);
}

/** Campos que jamás se guardan, por mucho que se pasen en metadata. */
const PROHIBIDOS = new Set([
  'nombre', 'name', 'telefono', 'phone', 'email', 'correo', 'texto', 'text',
  'pregunta', 'enunciado', 'respuesta', 'opciones', 'contacto', 'ip', 'ua',
  'userAgent', 'device', 'huella', 'adId',
]);

/** Deja pasar solo primitivas cortas y descarta cualquier clave sensible. */
function limpiarMetadata(meta) {
  if (!meta || typeof meta !== 'object') return undefined;
  const out = {};
  for (const [k, v] of Object.entries(meta)) {
    if (PROHIBIDOS.has(k)) continue;
    if (v === null || v === undefined) continue;
    const t = typeof v;
    if (t === 'number' || t === 'boolean') out[k] = v;
    else if (t === 'string' && v.length <= 40) out[k] = v;   // ids y slugs, no frases
  }
  return Object.keys(out).length ? out : undefined;
}

export function nuevaSesion() {
  sesionId = `s-${Date.now().toString(36)}-${idCorto()}`;
  return sesionId;
}

export function sesionActual() {
  return sesionId || nuevaSesion();
}

/**
 * Registra un evento si el Modo de prueba está encendido.
 * @param {string} tipo  uno de los tipos documentados en docs/LOCAL_TEST_DATA_FORMAT.md
 * @param {object} datos campos conocidos (ruta, worldId, missionId, modeId, …)
 */
export function registrar(tipo, datos = {}) {
  if (!activo()) return;
  const b = leer();
  const ev = {
    eventId: `e-${Date.now().toString(36)}-${idCorto()}`,
    eventType: tipo,
    timestamp: new Date().toISOString(),
    sessionId: sesionActual(),
    appVersion: APP_VERSION,
    route: datos.route,
    worldId: datos.worldId,
    missionId: datos.missionId,
    modeId: datos.modeId,
    questionId: datos.questionId,
    questionFormat: datos.questionFormat,
    correct: typeof datos.correct === 'boolean' ? datos.correct : undefined,
    responseTimeMs: Number.isFinite(datos.responseTimeMs) ? Math.round(datos.responseTimeMs) : undefined,
    metadata: limpiarMetadata(datos.metadata),
  };
  for (const k of Object.keys(ev)) if (ev[k] === undefined) delete ev[k];
  b.eventos.push(ev);
  if (b.eventos.length > MAX_EVENTOS) b.eventos.splice(0, b.eventos.length - MAX_EVENTOS);
  volcar();
}

export let APP_VERSION = 'cq';
export function setAppVersion(v) { APP_VERSION = v; }

export function activar(on) {
  const s = getEstado();
  s.pruebas.activo = !!on;
  guardar();
  if (on) { nuevaSesion(); registrar('session_start', { route: 'ajustes' }); }
}

export function contarEventos() {
  return leer().eventos.length;
}

export function borrarEventos() {
  buffer = { formato: FORMATO, eventos: [] };
  try { localStorage.removeItem(CLAVE); } catch {}
}

/** JSON de exportación: sesiones derivadas de los propios eventos. */
export function exportar() {
  const b = leer();
  const sesiones = [...new Set(b.eventos.map((e) => e.sessionId))].map((id) => {
    const evs = b.eventos.filter((e) => e.sessionId === id);
    return {
      sessionId: id,
      primerEvento: evs[0]?.timestamp,
      ultimoEvento: evs[evs.length - 1]?.timestamp,
      eventos: evs.length,
    };
  });
  return JSON.stringify({
    formato: FORMATO,
    exportadoEn: new Date().toISOString(),
    appVersion: APP_VERSION,
    sesiones,
    eventos: b.eventos,
  }, null, 2);
}
