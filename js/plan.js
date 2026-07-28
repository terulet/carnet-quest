// CARNET QUEST — el plan de examen.
//
// La fecha del examen convierte el juego en un plan con final. Deja de ser
// "llevas racha 4" y pasa a ser "faltan 11 días, vas al 68 %, hoy toca esto".
//
// DOS REGLAS QUE NO SE TOCAN:
//
//   1. La fecha NO mueve el Predictor. Ni un punto. Poner una fecha, cambiarla o
//      quitarla no cambia lo que sabes, y el Predictor solo mide lo que sabes.
//      La fecha cambia lo que se te SUGIERE hacer, no lo que se te dice que vales.
//
//   2. Ir retrasado no se castiga. Se dice. Si el ritmo que hace falta no es
//      realista, el juego lo dice en voz alta en vez de fingir que llegas — esa
//      es la misma honestidad que justifica los 49,99 €, aplicada al calendario.
//      Y nunca bloquea nada: el juego entero sigue disponible.

import { getEstado, guardar, HOY } from './state.js';

/** Días naturales entre hoy y la fecha, en horario local. Negativo si ya pasó. */
export function diasHasta(fecha, desde = HOY()) {
  if (!fecha) return null;
  const a = new Date(`${desde}T00:00:00`);
  const b = new Date(`${fecha}T00:00:00`);
  if (Number.isNaN(b.getTime())) return null;
  return Math.round((b - a) / 86400000);
}

/** La fecha guardada, o null. */
export const fechaExamen = () => getEstado()?.examen?.fecha || null;

/**
 * Fija la fecha. Solo se acepta si es hoy o futura y está dentro de un año:
 * una fecha absurda produciría un plan absurdo.
 */
export function fijarExamen(fecha) {
  const d = diasHasta(fecha);
  if (d === null || d < 0 || d > 365) return false;
  const s = getEstado();
  s.examen = { ...(s.examen || {}), fecha, fijadaEn: HOY(), avisado: false, resultado: null };
  guardar();
  return true;
}

/** Quitar la fecha es un derecho, no una penalización. No borra nada más. */
export function quitarExamen() {
  const s = getEstado();
  s.examen = { fecha: null, fijadaEn: null, avisado: false, resultado: null };
  guardar();
}

/** El jugador cuenta qué pasó. Es información, no puntuación. */
export function anotarResultado(resultado) {
  const s = getEstado();
  if (!s.examen) return;
  s.examen.resultado = resultado;    // 'apto' | 'no-apto' | 'aplazado'
  s.examen.avisado = true;
  if (resultado === 'aplazado') s.examen.fecha = null;
  guardar();
}

/** ¿Pasó la fecha y aún no hemos preguntado qué tal fue? */
export function examenPendienteDeContar() {
  const s = getEstado();
  const d = diasHasta(s?.examen?.fecha);
  return d !== null && d < 0 && !s.examen.avisado;
}

/* ---------- El plan de hoy ---------- */

const RITMO_COMODO = 40;     // preguntas nuevas al día que no cansan
const RITMO_MAXIMO = 80;     // por encima de esto, prometerlo sería mentir

/**
 * Qué toca hoy y si el ritmo da.
 *
 * @param {number} totalBanco  preguntas del banco accesible
 * @param {object} pred        salida de calcularPredictor()
 * @param {number} averias     coches en el Taller esperando reparación
 */
export function planDeHoy(totalBanco, pred, averias = 0) {
  const s = getEstado();
  const fecha = fechaExamen();
  const dias = diasHasta(fecha);
  const vistas = Object.keys(s.vistas || {}).length;
  const quedan = Math.max(0, totalBanco - vistas);

  if (dias === null) {
    // sin fecha, el plan es el de siempre: un poco cada día, sin cuentas atrás
    return {
      hayFecha: false, dias: null,
      nuevasHoy: Math.min(quedan, 20), averiasHoy: Math.min(averias, 6),
      quedan, vistas, totalBanco,
      ritmo: 'libre', alcanzable: true,
    };
  }

  // el día del examen no cuenta como día de estudio: se estudia hasta la víspera
  const diasUtiles = Math.max(1, dias);
  const nuevasPorDia = Math.ceil(quedan / diasUtiles);
  const alcanzable = nuevasPorDia <= RITMO_MAXIMO;
  const ritmo = nuevasPorDia <= RITMO_COMODO ? 'comodo'
    : nuevasPorDia <= RITMO_MAXIMO ? 'apretado' : 'imposible';

  return {
    hayFecha: true,
    fecha,
    dias,
    pasado: dias < 0,
    hoy: dias === 0,
    quedan, vistas, totalBanco,
    // lo que de verdad se pide hoy: nunca más de lo que cabe en una sesión larga
    nuevasHoy: Math.min(quedan, Math.min(nuevasPorDia, RITMO_MAXIMO)),
    averiasHoy: Math.min(averias, dias <= 7 ? 12 : 6),
    nuevasPorDia,
    ritmo,
    alcanzable,
    // simulacros: la DGT Tower es lo que calibra el Predictor, y hacen falta 5
    simulacrosQueFaltan: Math.max(0, 5 - (s.simulacros?.length || 0)),
    predictor: pred?.listo ? pred.pct : null,
    // recomendación honesta, la misma de §8.5 pero con calendario delante
    listoParaExaminarse: !!pred?.recomendacion,
  };
}

/**
 * Sugerencia de en qué mundo tocaría estar hoy si se reparte el temario a partes
 * iguales. Es orientación, no una orden: el mapa sigue abierto entero.
 */
export function mundoSugerido(plan, mundosConBanco) {
  if (!plan.hayFecha || !mundosConBanco.length) return null;
  const total = mundosConBanco.length;
  const transcurrido = plan.dias <= 0 ? 1
    : Math.min(1, plan.vistas / Math.max(1, plan.totalBanco));
  const idx = Math.min(total - 1, Math.floor(transcurrido * total));
  return mundosConBanco[idx];
}
