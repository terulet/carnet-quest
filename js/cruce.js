// CARNET QUEST — "¿QUIÉN PASA PRIMERO?" (§7): puzzles de prioridad jugables.
// Dibuja el cruce a vista de pájaro, el jugador toca los vehículos en su orden de
// paso y luego LOS VE CRUZAR. Nada de A/B/C sobre papel: esto se juega.

const VB = 320;          // viewBox cuadrado
const C = 160;           // centro
const HALF = 48;         // media anchura de calzada
const L = 22;            // separación del eje: carril derecho
const ESPERA = 96;       // distancia del centro a la que esperan los vehículos
const FUERA = 250;       // distancia a la que salen de escena

const DIR = {
  N: { x: 0, y: -1 }, E: { x: 1, y: 0 }, S: { x: 0, y: 1 }, W: { x: -1, y: 0 },
};
const OPUESTO = { N: 'S', S: 'N', E: 'W', W: 'E' };
// vector "a mi derecha" = rumbo girado 90° en sentido horario
const derechaDe = (h) => ({ x: -DIR[h].y, y: DIR[h].x });

/** Punto sobre el carril de circulación del rumbo h, a distancia d del centro
 *  (d<0 = todavía no ha llegado; d>0 = ya lo ha pasado). */
function pt(h, d, lane = L) {
  const v = DIR[h], r = derechaDe(h);
  return { x: C + v.x * d + r.x * lane, y: C + v.y * d + r.y * lane };
}

/** Punto de control del giro: cruce de la recta de entrada con la de salida. */
function control(hi, ho, lane = L) {
  const ri = derechaDe(hi), ro = derechaDe(ho);
  const vertical = (h) => DIR[h].x === 0;
  const fx = vertical(hi) ? C + ri.x * lane : (vertical(ho) ? C + ro.x * lane : C);
  const fy = !vertical(hi) ? C + ri.y * lane : (!vertical(ho) ? C + ro.y * lane : C);
  return { x: fx, y: fy };
}

const bez = (p0, p1, p2, t) => ({
  x: (1 - t) * (1 - t) * p0.x + 2 * (1 - t) * t * p1.x + t * t * p2.x,
  y: (1 - t) * (1 - t) * p0.y + 2 * (1 - t) * t * p1.y + t * t * p2.y,
});
const bezTan = (p0, p1, p2, t) => ({
  x: 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x),
  y: 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y),
});
const grados = (v) => (Math.atan2(v.y, v.x) * 180) / Math.PI + 90; // el coche se dibuja mirando al norte

/** Trayectoria de un vehículo: {p0, p1, p2} en coordenadas del viewBox. */
export function trayecto(v) {
  if (v.tipo === 'peaton') {
    // cruza el brazo `cruza` de un lado a otro por el paso de peatones
    const eje = DIR[v.cruza], per = DIR[v.hacia];
    const base = { x: C + eje.x * (HALF + 30), y: C + eje.y * (HALF + 30) };
    const p0 = { x: base.x - per.x * (HALF - 4), y: base.y - per.y * (HALF - 4) };
    const p2 = { x: base.x + per.x * (HALF - 4), y: base.y + per.y * (HALF - 4) };
    return { p0, p1: { x: (p0.x + p2.x) / 2, y: (p0.y + p2.y) / 2 }, p2 };
  }
  const hi = OPUESTO[v.desde];   // rumbo con el que entra
  const ho = v.hacia;            // rumbo con el que sale
  const lane = v.eje ? 0 : L;    // tranvía: por el eje de la calzada
  return {
    p0: pt(hi, -(v.d ?? ESPERA), lane),
    p1: control(hi, ho, lane),
    p2: pt(ho, FUERA, lane),
  };
}

/* ================= dibujo ================= */

const CUERPOS = {
  turismo: { w: 26, h: 46 },
  moto: { w: 15, h: 33 },
  bici: { w: 13, h: 30 },
  furgoneta: { w: 28, h: 54 },
  camion: { w: 30, h: 70 },
  bus: { w: 30, h: 76 },
  tranvia: { w: 32, h: 88 },
  prioritario: { w: 28, h: 52 },
};

function cuerpoSVG(v) {
  // grupo (pelotón de ciclistas): varios cuerpos en fila detrás del primero
  if (v.grupo > 1) {
    const m = CUERPOS[v.tipo] || CUERPOS.turismo;
    const uno = { ...v, grupo: 1 };
    return Array.from({ length: v.grupo }, (_, i) =>
      `<g transform="translate(0 ${i * (m.h + 9)})" opacity="${1 - i * 0.14}">${cuerpoSVG(uno)}</g>`).join('');
  }
  const m = CUERPOS[v.tipo] || CUERPOS.turismo;
  const w = m.w, h = m.h, x = -w / 2, y = -h / 2, r = Math.min(7, w / 3);
  const col = v.color || '#8FA0BE';
  if (v.tipo === 'peaton') {
    return `<g><circle cx="0" cy="-7" r="6.5" fill="${col}"/>
      <path d="M-6 -1 L6 -1 L4 12 L-4 12 Z" fill="${col}"/>
      <path d="M-4 12 L-5 20 M4 12 L5 20" stroke="${col}" stroke-width="3.4" stroke-linecap="round"/></g>`;
  }
  if (v.tipo === 'bici' || v.tipo === 'moto') {
    return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${col}"/>
      <circle cx="0" cy="${y + 9}" r="3.4" fill="#0B0D12" opacity=".55"/>
      <circle cx="0" cy="${y + h - 9}" r="3.4" fill="#0B0D12" opacity=".55"/></g>`;
  }
  const techo = v.tipo === 'tranvia' || v.tipo === 'bus' || v.tipo === 'camion';
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${col}"/>
    <rect x="${x + 3.5}" y="${y + (techo ? 7 : 9)}" width="${w - 7}" height="${techo ? h - 16 : h * 0.34}" rx="3"
          fill="#0B0D12" opacity="${techo ? '.32' : '.42'}"/>
    ${techo ? '' : `<rect x="${x + 3.5}" y="${y + h - 15}" width="${w - 7}" height="9" rx="3" fill="#0B0D12" opacity=".28"/>`}
    ${v.tipo === 'prioritario' ? `<rect x="${x}" y="${y + h * 0.44}" width="${w}" height="7" fill="#E2001A" opacity=".85"/>` : ''}
    <rect x="${x + 2}" y="${y + 1}" width="4.5" height="3" rx="1.5" fill="#FFF6D0"/>
    <rect x="${w / 2 - 6.5}" y="${y + 1}" width="4.5" height="3" rx="1.5" fill="#FFF6D0"/>
    ${v.urgencia ? `<rect class="cq-sirena" x="${x + 3}" y="${y + 5}" width="${w - 6}" height="6" rx="3" fill="#2E86FF"/>` : ''}
  </g>`;
}

const SENAL_SVG = {
  stop: `<polygon points="-9,-22 9,-22 22,-9 22,9 9,22 -9,22 -22,9 -22,-9" fill="#E2001A" stroke="#fff" stroke-width="2.5"/>
         <text y="4.5" text-anchor="middle" font-size="10.5" font-family="Overpass,Arial,sans-serif" font-weight="800" fill="#fff">STOP</text>`,
  ceda: `<path d="M-22 -17 L22 -17 L0 21 Z" fill="#E2001A"/><path d="M-15.5 -12.5 L15.5 -12.5 L0 14 Z" fill="#fff"/>`,
  prioridad: `<rect x="-15" y="-15" width="30" height="30" rx="3" transform="rotate(45)" fill="#fff" stroke="#d8d8d8" stroke-width="1.5"/>
              <rect x="-9.5" y="-9.5" width="19" height="19" rx="2" transform="rotate(45)" fill="#FFC800"/>`,
};

function senalEnBrazo(brazo, tipo) {
  if (!SENAL_SVG[tipo]) return '';
  const hi = OPUESTO[brazo];
  const p = pt(hi, -(HALF + 26), L + 40);
  return `<g class="cq-senal" transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})">${SENAL_SVG[tipo]}</g>`;
}

function semaforoEnBrazo(brazo, estado) {
  const hi = OPUESTO[brazo];
  const p = pt(hi, -(HALF + 24), L + 42);
  const on = (c) => (estado === c || (c === 'ambar' && estado === 'ambar-intermitente') ? 1 : 0.14);
  // el intermitente también debe leerse en una captura: nunca se apaga del todo
  return `<g class="cq-sema ${estado === 'ambar-intermitente' ? 'cq-sema--parpadea' : ''}" transform="translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})">
    <rect x="-9" y="-24" width="18" height="48" rx="5" fill="#0B0D12" stroke="#2A3145" stroke-width="1.5"/>
    <circle cx="0" cy="-14" r="5.4" fill="#E2001A" opacity="${on('rojo')}"/>
    <circle cx="0" cy="0" r="5.4" fill="#FFC800" opacity="${on('ambar')}"/>
    <circle cx="0" cy="14" r="5.4" fill="#00C464" opacity="${on('verde')}"/>
  </g>`;
}

function pasoPeatones(brazo) {
  const eje = DIR[brazo];
  const cx = C + eje.x * (HALF + 30), cy = C + eje.y * (HALF + 30);
  const vertical = eje.x === 0;
  let bandas = '';
  for (let i = -4; i <= 4; i++) {
    const o = i * 9;
    bandas += vertical
      ? `<rect x="${cx + o - 3}" y="${cy - 15}" width="6" height="30" fill="#F4F6FB" opacity=".62"/>`
      : `<rect x="${cx - 15}" y="${cy + o - 3}" width="30" height="6" fill="#F4F6FB" opacity=".62"/>`;
  }
  return bandas;
}

function calzadas(p) {
  const brazos = p.brazos || ['N', 'S', 'E', 'W'];
  const tierra = p.suelo || {};
  let out = '';
  for (const b of brazos) {
    const v = DIR[b];
    const largo = VB / 2;
    const x = v.x === 0 ? C - HALF : (v.x > 0 ? C : C - largo);
    const y = v.y === 0 ? C - HALF : (v.y > 0 ? C : C - largo);
    const w = v.x === 0 ? HALF * 2 : largo;
    const h = v.y === 0 ? HALF * 2 : largo;
    const color = tierra[b] === 'tierra' ? '#3E3327' : '#232A3B';
    out += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`;
    if (tierra[b] === 'tierra') {
      out += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#cq-tierra)"/>`;
    } else {
      // eje discontinuo del brazo
      const a = pt(b, HALF + 4, 0), z = pt(b, largo, 0);
      out += `<line x1="${a.x}" y1="${a.y}" x2="${z.x}" y2="${z.y}" stroke="#F4F6FB" stroke-width="2.4"
              stroke-dasharray="11 13" opacity=".38"/>`;
    }
  }
  out += `<rect x="${C - HALF}" y="${C - HALF}" width="${HALF * 2}" height="${HALF * 2}" fill="#252C3E"/>`;
  return out;
}

function rieles(p) {
  const tram = (p.vehiculos || []).find((v) => v.tipo === 'tranvia');
  if (!tram) return '';
  const hi = OPUESTO[tram.desde];
  const a = pt(hi, -VB, 0), b = pt(tram.hacia, VB, 0);
  const mid = control(hi, tram.hacia, 0);
  const d = `M ${a.x} ${a.y} Q ${mid.x} ${mid.y} ${b.x} ${b.y}`;
  return `<path d="${d}" fill="none" stroke="#5A6378" stroke-width="24" opacity=".28"/>
          <path d="${d}" fill="none" stroke="#9AA3B8" stroke-width="2" opacity=".65" stroke-dasharray="0"/>`;
}

/** SVG completo de la escena. */
export function svgCruce(p) {
  const vehiculos = p.vehiculos || [];
  const trazos = vehiculos.map((v) => {
    const { p0, p1, p2 } = trayecto(v);
    const fin = bez(p0, p1, p2, 0.42);
    const tan = bezTan(p0, p1, p2, 0.42);
    return `<g class="cq-ruta" data-k="${v.k}">
      <path d="M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} Q ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}"
            fill="none" stroke="${v.color || '#8FA0BE'}" stroke-width="3" stroke-dasharray="5 8" opacity=".5" stroke-linecap="round"/>
      <path d="M -6 -5 L 0 4 L 6 -5" fill="none" stroke="${v.color || '#8FA0BE'}" stroke-width="3"
            stroke-linecap="round" stroke-linejoin="round" opacity=".8"
            transform="translate(${fin.x.toFixed(1)} ${fin.y.toFixed(1)}) rotate(${(grados(tan) + 180).toFixed(1)})"/>
    </g>`;
  }).join('');

  const coches = vehiculos.map((v) => {
    const { p0, p1, p2 } = trayecto(v);
    const ang = v.tipo === 'peaton' ? grados(bezTan(p0, p1, p2, 0)) : grados(bezTan(p0, p1, p2, 0));
    return `<g class="cq-veh ${v.tu ? 'cq-veh--tu' : ''}" data-k="${v.k}">
      <g class="cq-veh__cuerpo" transform="translate(${p0.x.toFixed(1)} ${p0.y.toFixed(1)}) rotate(${ang.toFixed(1)})">
        ${cuerpoSVG(v)}
      </g>
      <g class="cq-veh__marca" transform="translate(${p0.x.toFixed(1)} ${p0.y.toFixed(1)})">
        <circle class="cq-veh__aro" r="20" fill="none" stroke="${v.color || '#8FA0BE'}" stroke-width="2.5" opacity=".0"/>
        <circle class="cq-veh__chapa" cx="0" cy="-34" r="13" fill="#0B0D12" stroke="${v.color || '#8FA0BE'}" stroke-width="2.5"/>
        <text class="cq-veh__letra" x="0" y="-29.5" text-anchor="middle" font-size="15"
              font-family="Anton, Arial Narrow, sans-serif" fill="${v.color || '#8FA0BE'}">${v.k}</text>
      </g>
      <circle class="cq-veh__hit" cx="${p0.x.toFixed(1)}" cy="${p0.y.toFixed(1)}" r="34" fill="transparent"/>
    </g>`;
  }).join('');

  const senales = Object.entries(p.senales || {}).map(([b, s]) => senalEnBrazo(b, s)).join('');
  const semaforos = Object.entries(p.semaforos || {}).map(([b, s]) => semaforoEnBrazo(b, s)).join('');
  const pasos = (p.pasosPeatones || (p.vehiculos || []).filter((v) => v.tipo === 'peaton').map((v) => v.cruza))
    .map(pasoPeatones).join('');
  let agente = '';
  if (p.agente) {
    let flecha = '';
    if (p.agente.autoriza) {
      const v = DIR[p.agente.autoriza];
      const a = { x: C + v.x * 30, y: C + v.y * 30 }, b = { x: C + v.x * 64, y: C + v.y * 64 };
      const ang = (Math.atan2(v.y, v.x) * 180) / Math.PI;
      flecha = `<g class="cq-agente__flecha">
        <line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="#FFC800" stroke-width="4" stroke-linecap="round"/>
        <path d="M-7 -6 L0 0 L-7 6" fill="none" stroke="#FFC800" stroke-width="4" stroke-linecap="round"
              stroke-linejoin="round" transform="translate(${b.x} ${b.y}) rotate(${ang.toFixed(1)})"/></g>`;
    }
    agente = `${flecha}<g class="cq-agente" transform="translate(${C} ${C})">
         <circle r="21" fill="#0B0D12" stroke="#FFC800" stroke-width="2.5"/>
         <text y="8" text-anchor="middle" font-size="23">👮</text>
       </g>`;
  }

  return `<svg class="cruce-svg" viewBox="0 0 ${VB} ${VB}" xmlns="http://www.w3.org/2000/svg" aria-label="Cruce">
    <defs>
      <pattern id="cq-tierra" width="8" height="8" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1" fill="#5A4B37" opacity=".7"/>
        <circle cx="6" cy="5" r="0.8" fill="#6B5942" opacity=".6"/>
      </pattern>
    </defs>
    <rect width="${VB}" height="${VB}" fill="#0B0D12"/>
    ${calzadas(p)}
    ${rieles(p)}
    ${pasos}
    ${senales}
    ${semaforos}
    ${agente}
    ${trazos}
    ${coches}
  </svg>`;
}

/* ================= animación ================= */

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Mueve un vehículo por su trayectoria. Devuelve promesa al terminar. */
function conducir(svg, v, dur = 1100) {
  return new Promise((resolve) => {
    const g = svg.querySelector(`.cq-veh[data-k="${v.k}"]`);
    if (!g) return resolve();
    const cuerpo = g.querySelector('.cq-veh__cuerpo');
    const marca = g.querySelector('.cq-veh__marca');
    const { p0, p1, p2 } = trayecto(v);
    if (reduceMotion()) { g.style.opacity = '0'; return resolve(); }
    const t0 = performance.now();
    const paso = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      // arranque suave, salida rápida
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const p = bez(p0, p1, p2, e);
      const ang = grados(bezTan(p0, p1, p2, Math.min(0.999, e)));
      cuerpo.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)}) rotate(${ang.toFixed(1)})`);
      marca.setAttribute('transform', `translate(${p.x.toFixed(1)} ${p.y.toFixed(1)})`);
      marca.style.opacity = String(Math.max(0, 1 - e * 2.2));
      if (t < 1) requestAnimationFrame(paso);
      else { g.style.opacity = '0'; resolve(); }
    };
    requestAnimationFrame(paso);
  });
}

/** Anima el orden completo, uno detrás de otro. */
export async function animarPaso(svg, puzzle, orden, { alPasar } = {}) {
  const porK = new Map((puzzle.vehiculos || []).map((v) => [v.k, v]));
  for (const k of orden) {
    const v = porK.get(k);
    if (!v) continue;
    alPasar?.(v);
    const lento = v.tipo === 'peaton' || v.tipo === 'bici';
    await conducir(svg, v, reduceMotion() ? 0 : (lento ? 1500 : 1050));
    await new Promise((r) => setTimeout(r, reduceMotion() ? 0 : 120));
  }
}

/** Reinicia la escena a la posición de espera (para "otra vez" / mostrar la solución). */
export function reponer(svg, puzzle) {
  for (const v of puzzle.vehiculos || []) {
    const g = svg.querySelector(`.cq-veh[data-k="${v.k}"]`);
    if (!g) continue;
    const { p0, p1, p2 } = trayecto(v);
    const ang = grados(bezTan(p0, p1, p2, 0));
    g.style.opacity = '1';
    g.querySelector('.cq-veh__cuerpo').setAttribute('transform', `translate(${p0.x.toFixed(1)} ${p0.y.toFixed(1)}) rotate(${ang.toFixed(1)})`);
    const marca = g.querySelector('.cq-veh__marca');
    marca.setAttribute('transform', `translate(${p0.x.toFixed(1)} ${p0.y.toFixed(1)})`);
    marca.style.opacity = '1';
  }
}

/* ================= utilidades de contenido ================= */

export const ETIQUETA_TIPO = {
  turismo: 'Turismo', moto: 'Motocicleta', bici: 'Bicicleta', furgoneta: 'Furgoneta',
  camion: 'Camión', bus: 'Autobús', tranvia: 'Tranvía', prioritario: 'Vehículo prioritario',
  peaton: 'Peatón',
};

/** "va recto" / "gira a la derecha" / "gira a la izquierda" / "cambia de sentido" */
export function maniobra(v) {
  if (v.tipo === 'peaton') return 'cruza la calzada';
  const hi = OPUESTO[v.desde];
  const idx = { N: 0, E: 1, S: 2, W: 3 };
  const giro = (idx[v.hacia] - idx[hi] + 4) % 4;
  return ['sigue recto', 'gira a la derecha', 'cambia de sentido', 'gira a la izquierda'][giro];
}

const NOMBRE_BRAZO = { N: 'el norte', S: 'el sur', E: 'el este', W: 'el oeste' };
export const desdeTexto = (v) => (v.tipo === 'peaton' ? 'en el paso de peatones' : `viene desde ${NOMBRE_BRAZO[v.desde]}`);
