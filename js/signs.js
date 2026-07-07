// CARNET QUEST — renderizador SVG procedural de señales españolas (Álbum §7)
// v1: formas y glifos aproximados; ilustraciones finales en v2.

const NS = 'http://www.w3.org/2000/svg';

function texto(glifo, y = 55, size = 26, color = '#111') {
  if (!glifo) return '';
  const s = String(glifo);
  const fs = s.length <= 1 ? size : s.length <= 2 ? size * 0.86 : s.length <= 4 ? size * 0.55 : size * 0.38;
  return `<text x="50" y="${y}" font-size="${fs}" font-family="Overpass, Arial, sans-serif" font-weight="800" fill="${color}" text-anchor="middle" dominant-baseline="middle">${s}</text>`;
}

const barraRoja = `<line x1="24" y1="76" x2="76" y2="24" stroke="#E2001A" stroke-width="7" stroke-linecap="round"/>`;
const barraNegra = `<line x1="26" y1="74" x2="74" y2="26" stroke="#333" stroke-width="6" stroke-linecap="round"/>`;

const FORMAS = {
  triangulo: (g) => `
    <path d="M50 8 L94 86 L6 86 Z" fill="#E2001A"/>
    <path d="M50 20 L84 80 L16 80 Z" fill="#fff"/>
    ${texto(g, 62, 24)}`,
  'triangulo-inv': (g) => `
    <path d="M6 14 L94 14 L50 92 Z" fill="#E2001A"/>
    <path d="M16 20 L84 20 L50 80 Z" fill="#fff"/>
    ${texto(g, 40, 20)}`,
  'circulo-rojo': (g, barra) => `
    <circle cx="50" cy="50" r="46" fill="#E2001A"/>
    <circle cx="50" cy="50" r="36" fill="#fff"/>
    ${texto(g, 52, 26)}
    ${barra ? barraRoja : ''}`,
  'circulo-azul': (g, barra) => `
    <circle cx="50" cy="50" r="46" fill="#0055B8"/>
    <circle cx="50" cy="50" r="42" fill="none" stroke="#fff" stroke-width="3"/>
    ${texto(g, 52, 30, '#fff')}
    ${barra ? barraRoja : ''}`,
  'circulo-azul-rojo': (g) => `
    <circle cx="50" cy="50" r="46" fill="#E2001A"/>
    <circle cx="50" cy="50" r="37" fill="#0055B8"/>
    ${g === '✕' || g === 'X'
      ? `<line x1="26" y1="26" x2="74" y2="74" stroke="#E2001A" stroke-width="7" stroke-linecap="round"/>${barraRoja}`
      : barraRoja}`,
  'circulo-fin': (g) => `
    <circle cx="50" cy="50" r="46" fill="#f2f2f2" stroke="#bbb" stroke-width="2"/>
    ${texto(g, 52, 26, '#9a9a9a')}
    ${barraNegra}`,
  'circulo-direccion-prohibida': () => `
    <circle cx="50" cy="50" r="46" fill="#E2001A"/>
    <rect x="20" y="42" width="60" height="16" rx="3" fill="#fff"/>`,
  octogono: (g) => `
    <polygon points="31,6 69,6 94,31 94,69 69,94 31,94 6,69 6,31" fill="#E2001A" stroke="#fff" stroke-width="4"/>
    ${texto(g || 'STOP', 53, 24, '#fff')}`,
  rombo: (g, barra) => `
    <rect x="16" y="16" width="68" height="68" rx="8" transform="rotate(45 50 50)" fill="#fff" stroke="#d8d8d8" stroke-width="2"/>
    <rect x="30" y="30" width="40" height="40" rx="4" transform="rotate(45 50 50)" fill="#FFC800"/>
    ${barra ? barraNegra : ''}`,
  'cuadrado-azul': (g, barra) => `
    <rect x="6" y="6" width="88" height="88" rx="10" fill="#0055B8"/>
    <rect x="10" y="10" width="80" height="80" rx="7" fill="none" stroke="#fff" stroke-width="3"/>
    ${texto(g, 52, 28, '#fff')}
    ${barra ? barraRoja : ''}`,
};

export function svgSenal(senal, clase = 'senal-svg') {
  const fn = FORMAS[senal.forma] || FORMAS['cuadrado-azul'];
  return `<svg class="${clase}" viewBox="0 0 100 100" role="img" aria-label="${senal.nombre}" xmlns="${NS}">${fn(senal.glifo, senal.barra)}</svg>`;
}
