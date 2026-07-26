// CARNET QUEST — "¿QUIÉN PASA PRIMERO?" (§7): puzzles de prioridad jugables.
// Dibuja el cruce a vista de pájaro, el jugador toca los vehículos en su orden de
// paso y luego LOS VE CRUZAR. Nada de A/B/C sobre papel: esto se juega.
//
// Dos trazados posibles, misma tubería: cruce/T (bézier cuadrática entre carriles)
// y glorieta (recta de entrada → arco por el anillo → recta de salida). Todo se
// convierte en una polilínea, así que dibujo y animación comparten geometría.

const VB = 320;          // viewBox cuadrado
const C = 160;           // centro
const HALF = 48;         // media anchura de calzada en cruce
const HG = 36;           // media anchura de los ramales de la glorieta
const L = 22;            // separación del eje: carril derecho
const ESPERA = 96;       // distancia del centro a la que esperan los vehículos
const FUERA = 250;       // distancia a la que salen de escena
const RIN = 34;          // isleta central
const ROUT = 78;         // borde exterior del anillo
const RRING = 56;        // eje del carril del anillo
const ESPERA_G = 110;    // espera en la glorieta (fuera del anillo)

const DIR = {
  N: { x: 0, y: -1 }, E: { x: 1, y: 0 }, S: { x: 0, y: 1 }, W: { x: -1, y: 0 },
};
const OPUESTO = { N: 'S', S: 'N', E: 'W', W: 'E' };
// vector "a mi derecha" = rumbo girado 90° en sentido horario
const derechaDe = (h) => ({ x: -DIR[h].y, y: DIR[h].x });

export const esGlorieta = (p) => p.via === 'glorieta';
const media = (p) => (esGlorieta(p) ? HG : HALF);

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
const grados = (v) => (Math.atan2(v.y, v.x) * 180) / Math.PI + 90; // el coche se dibuja mirando al norte

/* ================= trayectorias como polilínea ================= */

// distancia del centro a la que el carril de entrada corta el eje del anillo
const D_ANILLO = Math.sqrt(RRING * RRING - L * L);

function puntosGlorieta(v) {
  const pts = [];
  let th0;
  if (v.dentro != null) {
    // ya circula por el anillo: 0° = este, 90° = sur, 180° = oeste, 270° = norte
    th0 = (v.dentro * Math.PI) / 180;
  } else {
    const hi = OPUESTO[v.desde];
    const entrada = pt(hi, -D_ANILLO, L);
    pts.push(pt(hi, -(v.d ?? ESPERA_G), L), entrada);
    th0 = Math.atan2(entrada.y - C, entrada.x - C);
  }
  const salida = pt(v.hacia, D_ANILLO, L);
  const th1 = Math.atan2(salida.y - C, salida.x - C);
  // en España se rodea la isleta dejándola a la izquierda → theta decreciente
  let giro = th0 - th1;
  while (giro <= 0.05) giro += Math.PI * 2;
  const pasos = Math.max(8, Math.round((giro * 180) / Math.PI / 6));
  for (let i = 0; i <= pasos; i++) {
    const th = th0 - (giro * i) / pasos;
    pts.push({ x: C + RRING * Math.cos(th), y: C + RRING * Math.sin(th) });
  }
  pts.push(pt(v.hacia, FUERA, L));
  return pts;
}

/** Polilínea que recorre el vehículo, en coordenadas del viewBox. */
export function puntos(v, p = {}) {
  if (v.tipo === 'peaton') {
    const eje = DIR[v.cruza], per = DIR[v.hacia];
    const d = (esGlorieta(p) ? ROUT : media(p)) + 30;
    const base = { x: C + eje.x * d, y: C + eje.y * d };
    const alcance = media(p) - 4;
    return [
      { x: base.x - per.x * alcance, y: base.y - per.y * alcance },
      { x: base.x + per.x * alcance, y: base.y + per.y * alcance },
    ];
  }
  if (esGlorieta(p)) return puntosGlorieta(v);
  const hi = OPUESTO[v.desde];
  const lane = v.eje ? 0 : L;        // tranvía: por el eje de la calzada
  const p0 = pt(hi, -(v.d ?? ESPERA), lane);
  const p1 = control(hi, v.hacia, lane);
  const p2 = pt(v.hacia, FUERA, lane);
  const out = [];
  for (let i = 0; i <= 30; i++) out.push(bez(p0, p1, p2, i / 30));
  return out;
}

function acumuladas(pts) {
  const acc = [0];
  for (let i = 1; i < pts.length; i++) {
    acc.push(acc[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  }
  return acc;
}

/** Posición y rumbo a la fracción t (0..1) del recorrido, por longitud de arco. */
function enT(pts, acc, t) {
  const total = acc[acc.length - 1] || 1;
  const d = Math.max(0, Math.min(1, t)) * total;
  let i = 1;
  while (i < acc.length - 1 && acc[i] < d) i++;
  const seg = acc[i] - acc[i - 1] || 1;
  const f = (d - acc[i - 1]) / seg;
  const a = pts[i - 1], b = pts[i];
  return {
    x: a.x + (b.x - a.x) * f,
    y: a.y + (b.y - a.y) * f,
    ang: grados({ x: b.x - a.x, y: b.y - a.y }),
  };
}

const trazoD = (pts) => pts.map((q, i) => `${i ? 'L' : 'M'} ${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(' ');

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

function cuerpoSVG(v, anillo = 0) {
  // grupo (pelotón de ciclistas): varios cuerpos en fila detrás del primero.
  // Dentro de una glorieta la fila sigue la curva del anillo (con la isleta a la
  // izquierda); en recta, el tercero se saldría de la calzada anular.
  if (v.grupo > 1) {
    const m = CUERPOS[v.tipo] || CUERPOS.turismo;
    const uno = { ...v, grupo: 1 };
    const sep = m.h + 9;
    return Array.from({ length: v.grupo }, (_, i) => {
      const t = anillo
        ? `translate(${-anillo} 0) rotate(${((i * sep) / anillo * 180 / Math.PI).toFixed(2)}) translate(${anillo} 0)`
        : `translate(0 ${i * sep})`;
      return `<g transform="${t}" opacity="${1 - i * 0.14}">${cuerpoSVG(uno)}</g>`;
    }).join('');
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
  glorieta: `<circle r="15" fill="#0055B8" stroke="#fff" stroke-width="1.8"/>
             <path d="M-7 3 A 7 7 0 1 1 0 8" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round"/>
             <path d="M-10 -1 L-7 4 L-3 1" fill="none" stroke="#fff" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>`,
};

function senalEnBrazo(brazo, tipo, p) {
  if (!SENAL_SVG[tipo]) return '';
  const hi = OPUESTO[brazo];
  const q = pt(hi, -((esGlorieta(p) ? ROUT : HALF) + 28), L + 40);
  return `<g class="cq-senal" transform="translate(${q.x.toFixed(1)} ${q.y.toFixed(1)})">${SENAL_SVG[tipo]}</g>`;
}

function semaforoEnBrazo(brazo, estado, p) {
  const hi = OPUESTO[brazo];
  const q = pt(hi, -((esGlorieta(p) ? ROUT : HALF) + 26), L + 42);
  const on = (c) => (estado === c || (c === 'ambar' && estado === 'ambar-intermitente') ? 1 : 0.14);
  return `<g class="cq-sema ${estado === 'ambar-intermitente' ? 'cq-sema--parpadea' : ''}" transform="translate(${q.x.toFixed(1)} ${q.y.toFixed(1)})">
    <rect x="-9" y="-24" width="18" height="48" rx="5" fill="#0B0D12" stroke="#2A3145" stroke-width="1.5"/>
    <circle cx="0" cy="-14" r="5.4" fill="#E2001A" opacity="${on('rojo')}"/>
    <circle cx="0" cy="0" r="5.4" fill="#FFC800" opacity="${on('ambar')}"/>
    <circle cx="0" cy="14" r="5.4" fill="#00C464" opacity="${on('verde')}"/>
  </g>`;
}

function pasoPeatones(brazo, p) {
  const eje = DIR[brazo];
  const d = (esGlorieta(p) ? ROUT : media(p)) + 30;
  const cx = C + eje.x * d, cy = C + eje.y * d;
  const vertical = eje.x === 0;
  const alcance = media(p) - 2;
  let bandas = '';
  for (let o = -alcance + 4; o <= alcance - 4; o += 9) {
    bandas += vertical
      ? `<rect x="${cx + o - 3}" y="${cy - 15}" width="6" height="30" fill="#F4F6FB" opacity=".62"/>`
      : `<rect x="${cx - 15}" y="${cy + o - 3}" width="30" height="6" fill="#F4F6FB" opacity=".62"/>`;
  }
  return bandas;
}

function ramales(p) {
  const brazos = p.brazos || ['N', 'S', 'E', 'W'];
  const tierra = p.suelo || {};
  const M = media(p);
  let out = '';
  for (const b of brazos) {
    const v = DIR[b];
    const largo = VB / 2;
    const x = v.x === 0 ? C - M : (v.x > 0 ? C : C - largo);
    const y = v.y === 0 ? C - M : (v.y > 0 ? C : C - largo);
    const w = v.x === 0 ? M * 2 : largo;
    const h = v.y === 0 ? M * 2 : largo;
    const color = tierra[b] === 'tierra' ? '#3E3327' : '#232A3B';
    out += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${color}"/>`;
    if (tierra[b] === 'tierra') {
      out += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#cq-tierra)"/>`;
    } else {
      const desde = esGlorieta(p) ? ROUT + 6 : M + 4;
      const a = pt(b, desde, 0), z = pt(b, largo, 0);
      out += `<line x1="${a.x}" y1="${a.y}" x2="${z.x}" y2="${z.y}" stroke="#F4F6FB" stroke-width="2.4"
              stroke-dasharray="11 13" opacity=".38"/>`;
    }
  }
  return out;
}

function calzadas(p) {
  if (esGlorieta(p)) {
    let out = ramales(p);
    out += `<circle cx="${C}" cy="${C}" r="${ROUT}" fill="#252C3E"/>`;
    out += `<circle cx="${C}" cy="${C}" r="${RIN}" fill="#16241C" stroke="#2A3145" stroke-width="3"/>`;
    out += `<circle cx="${C}" cy="${C}" r="${RIN - 11}" fill="none" stroke="#00E5FF" stroke-width="1.5" opacity=".16"/>`;
    // dientes de "ceda el paso" pintados en cada entrada (la R-402 solo si la pide
    // el puzzle vía `senales`: cuatro carteles azules se comían la escena)
    for (const b of (p.brazos || ['N', 'S', 'E', 'W'])) {
      const hi = OPUESTO[b];
      const ang = (Math.atan2(DIR[hi].y, DIR[hi].x) * 180) / Math.PI + 90;
      for (const lat of [7, 18, 29]) {
        const q = pt(hi, -(ROUT + 7), lat);
        out += `<path d="M-4 4 L0 -4 L4 4 Z" fill="#F4F6FB" opacity=".6"
                transform="translate(${q.x.toFixed(1)} ${q.y.toFixed(1)}) rotate(${ang.toFixed(1)})"/>`;
      }
    }
    return out;
  }
  let out = ramales(p);
  out += `<rect x="${C - HALF}" y="${C - HALF}" width="${HALF * 2}" height="${HALF * 2}" fill="#252C3E"/>`;
  return out;
}

function rieles(p) {
  const tram = (p.vehiculos || []).find((v) => v.tipo === 'tranvia');
  if (!tram || esGlorieta(p)) return '';
  const via = puntos({ ...tram, d: VB, eje: true }, p);
  const d = trazoD(via);
  return `<path d="${d}" fill="none" stroke="#5A6378" stroke-width="24" opacity=".28"/>
          <path d="${d}" fill="none" stroke="#9AA3B8" stroke-width="2" opacity=".65"/>`;
}

/** SVG completo de la escena. */
export function svgCruce(p) {
  const vehiculos = p.vehiculos || [];
  const geo = new Map(vehiculos.map((v) => {
    const pts = puntos(v, p);
    return [v.k, { pts, acc: acumuladas(pts) }];
  }));

  const trazos = vehiculos.map((v) => {
    const { pts, acc } = geo.get(v.k);
    const f = enT(pts, acc, 0.42);
    return `<g class="cq-ruta" data-k="${v.k}">
      <path d="${trazoD(pts)}" fill="none" stroke="${v.color || '#8FA0BE'}" stroke-width="3"
            stroke-dasharray="5 8" opacity=".5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M -6 -5 L 0 4 L 6 -5" fill="none" stroke="${v.color || '#8FA0BE'}" stroke-width="3"
            stroke-linecap="round" stroke-linejoin="round" opacity=".8"
            transform="translate(${f.x.toFixed(1)} ${f.y.toFixed(1)}) rotate(${(f.ang + 180).toFixed(1)})"/>
    </g>`;
  }).join('');

  const coches = vehiculos.map((v) => {
    const { pts, acc } = geo.get(v.k);
    const f = enT(pts, acc, 0);
    return `<g class="cq-veh ${v.tu ? 'cq-veh--tu' : ''}" data-k="${v.k}">
      <g class="cq-veh__cuerpo" transform="translate(${f.x.toFixed(1)} ${f.y.toFixed(1)}) rotate(${f.ang.toFixed(1)})">
        ${cuerpoSVG(v, esGlorieta(p) && v.dentro != null ? RRING : 0)}
      </g>
      <g class="cq-veh__marca" transform="translate(${f.x.toFixed(1)} ${f.y.toFixed(1)})">
        <circle class="cq-veh__aro" r="20" fill="none" stroke="${v.color || '#8FA0BE'}" stroke-width="2.5" opacity="0"/>
        <circle class="cq-veh__chapa" cx="0" cy="-34" r="13" fill="#0B0D12" stroke="${v.color || '#8FA0BE'}" stroke-width="2.5"/>
        <text class="cq-veh__letra" x="0" y="-29.5" text-anchor="middle" font-size="15"
              font-family="Anton, Arial Narrow, sans-serif" fill="${v.color || '#8FA0BE'}">${v.k}</text>
      </g>
      <circle class="cq-veh__hit" cx="${f.x.toFixed(1)}" cy="${f.y.toFixed(1)}" r="34" fill="transparent"/>
    </g>`;
  }).join('');

  const senales = Object.entries(p.senales || {}).map(([b, s]) => senalEnBrazo(b, s, p)).join('');
  const semaforos = Object.entries(p.semaforos || {}).map(([b, s]) => semaforoEnBrazo(b, s, p)).join('');
  const pasos = (p.pasosPeatones || vehiculos.filter((v) => v.tipo === 'peaton').map((v) => v.cruza))
    .map((b) => pasoPeatones(b, p)).join('');

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
function conducir(svg, v, p, dur = 1100) {
  return new Promise((resolve) => {
    const g = svg.querySelector(`.cq-veh[data-k="${v.k}"]`);
    if (!g) return resolve();
    const cuerpo = g.querySelector('.cq-veh__cuerpo');
    const marca = g.querySelector('.cq-veh__marca');
    if (reduceMotion()) { g.style.opacity = '0'; return resolve(); }
    const pts = puntos(v, p), acc = acumuladas(pts);
    const t0 = performance.now();
    const paso = (now) => {
      const t = Math.min(1, (now - t0) / dur);
      // arranque suave, salida rápida
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      const f = enT(pts, acc, e);
      cuerpo.setAttribute('transform', `translate(${f.x.toFixed(1)} ${f.y.toFixed(1)}) rotate(${f.ang.toFixed(1)})`);
      marca.setAttribute('transform', `translate(${f.x.toFixed(1)} ${f.y.toFixed(1)})`);
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
    // la glorieta se recorre entera: dale algo más de aire
    const base = esGlorieta(puzzle) ? 1350 : 1050;
    await conducir(svg, v, puzzle, reduceMotion() ? 0 : (lento ? base + 400 : base));
    await new Promise((r) => setTimeout(r, reduceMotion() ? 0 : 120));
  }
}

/** Reinicia la escena a la posición de espera. */
export function reponer(svg, puzzle) {
  for (const v of puzzle.vehiculos || []) {
    const g = svg.querySelector(`.cq-veh[data-k="${v.k}"]`);
    if (!g) continue;
    const pts = puntos(v, puzzle);
    const f = enT(pts, acumuladas(pts), 0);
    g.style.opacity = '1';
    g.querySelector('.cq-veh__cuerpo').setAttribute('transform', `translate(${f.x.toFixed(1)} ${f.y.toFixed(1)}) rotate(${f.ang.toFixed(1)})`);
    const marca = g.querySelector('.cq-veh__marca');
    marca.setAttribute('transform', `translate(${f.x.toFixed(1)} ${f.y.toFixed(1)})`);
    marca.style.opacity = '1';
  }
}

/* ================= utilidades de contenido ================= */

export const ETIQUETA_TIPO = {
  turismo: 'Turismo', moto: 'Motocicleta', bici: 'Bicicleta', furgoneta: 'Furgoneta',
  camion: 'Camión', bus: 'Autobús', tranvia: 'Tranvía', prioritario: 'Vehículo prioritario',
  peaton: 'Peatón',
};

const IDX = { N: 0, E: 1, S: 2, W: 3 };
const NOMBRE_BRAZO = { N: 'el norte', S: 'el sur', E: 'el este', W: 'el oeste' };

/** "sigue recto" / "gira a la izquierda" / "toma la segunda salida"… */
export function maniobra(v, p = {}) {
  if (v.tipo === 'peaton') return 'cruza la calzada';
  if (esGlorieta(p)) {
    if (v.dentro != null) return `sale por ${NOMBRE_BRAZO[v.hacia]}`;
    // en glorieta se cuenta por salidas: derecha=1ª, recto=2ª, izquierda=3ª, vuelta=4ª
    const giro = (IDX[v.hacia] - IDX[OPUESTO[v.desde]] + 4) % 4;
    const salida = { 1: 'primera', 0: 'segunda', 3: 'tercera', 2: 'cuarta' }[giro];
    return `toma la ${salida} salida`;
  }
  const giro = (IDX[v.hacia] - IDX[OPUESTO[v.desde]] + 4) % 4;
  return ['sigue recto', 'gira a la derecha', 'cambia de sentido', 'gira a la izquierda'][giro];
}

export function desdeTexto(v, p = {}) {
  if (v.tipo === 'peaton') return 'en el paso de peatones';
  if (v.dentro != null) return 'ya circula por la glorieta';
  return `${esGlorieta(p) ? 'entra desde' : 'viene desde'} ${NOMBRE_BRAZO[v.desde]}`;
}
