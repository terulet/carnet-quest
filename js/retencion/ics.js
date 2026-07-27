// CARNET QUEST — recordatorio por calendario del propio usuario.
//
// Una PWA no puede enviar notificaciones fiables (sin backend no hay push, y en
// iPhone las locales programadas no son de fiar). En vez de fingir un canal que
// no existe, usamos el calendario del jugador: él elige la hora, él pulsa, y el
// evento vive en SU agenda. Nada automático, nada a sus espaldas.
//
// Este módulo se carga bajo demanda: no entra en el arranque.

/** Escapa según RFC 5545: coma, punto y coma, barra y saltos de línea. */
const esc = (t) => String(t)
  .replace(/\\/g, '\\\\')
  .replace(/;/g, '\\;')
  .replace(/,/g, '\\,')
  .replace(/\r?\n/g, '\\n');

/** YYYYMMDDTHHMMSS en hora local, sin Z: el evento cae a la hora que él eligió. */
function fechaLocalICS(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}T${p(d.getHours())}${p(d.getMinutes())}00`;
}

function fechaUTCICS(d) {
  return `${d.toISOString().replace(/[-:]/g, '').split('.')[0]}Z`;
}

/**
 * Genera el .ics de un recordatorio.
 * @param {object} o
 * @param {string} o.fecha    YYYY-MM-DD local
 * @param {string} o.hora     HH:MM local
 * @param {string} o.url      deep link a la app (#/next-run)
 * @param {number} o.minutos  duración en el calendario
 */
export function generarICS({ fecha, hora, url, minutos = 15, uid }) {
  const [h, m] = hora.split(':').map(Number);
  const inicio = new Date(`${fecha}T00:00:00`);
  inicio.setHours(h, m, 0, 0);
  const fin = new Date(inicio.getTime() + minutos * 60000);

  const lineas = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Carnet Quest//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid || `cq-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}@carnet-quest`}`,
    `DTSTAMP:${fechaUTCICS(new Date())}`,
    `DTSTART:${fechaLocalICS(inicio)}`,
    `DTEND:${fechaLocalICS(fin)}`,
    `SUMMARY:${esc('Carnet Quest · Próxima parada')}`,
    `DESCRIPTION:${esc(`Tienes preparada una ruta corta de Carnet Quest.\n${url}`)}`,
    `URL:${esc(url)}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  // RFC 5545 pide CRLF
  return lineas.join('\r\n') + '\r\n';
}

/**
 * Entrega el .ics por el mejor canal disponible.
 * @returns {Promise<'compartido'|'descargado'>} lo que REALMENTE ha pasado, para
 *          no decirle al jugador que se ha añadido algo que solo se ha bajado.
 */
export async function entregarICS(texto, nombre = 'carnet-quest.ics') {
  const blob = new Blob([texto], { type: 'text/calendar;charset=utf-8' });
  const archivo = new File([blob], nombre, { type: 'text/calendar' });
  if (navigator.canShare?.({ files: [archivo] })) {
    try {
      await navigator.share({ files: [archivo], title: 'Carnet Quest · Próxima parada' });
      return 'compartido';
    } catch (e) {
      if (e?.name === 'AbortError') throw e;   // el jugador canceló: no es un fallo
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'descargado';
}
