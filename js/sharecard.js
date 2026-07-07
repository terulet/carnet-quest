// CARNET QUEST — generador de tarjeta compartible (§7: "el marketing viral gratuito")
// Dibuja una imagen "Señal Neón" en canvas y la comparte como foto (Web Share nivel 2)
// con fallback a descarga. 0 dependencias, 0 assets.

const W = 1080, H = 1350;

const COL = {
  asfalto: '#0B0D12', asfalto2: '#161A26', road: '#1B2030', borde: '#2A3040',
  linea: '#F4F6FB', gris: '#9AA3B8', amarillo: '#FFC800',
  magenta: '#FF2D78', cian: '#00E5FF', verde: '#00C464',
};

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fondo(ctx) {
  // cielo nocturno con sol de neón + carretera en perspectiva
  ctx.fillStyle = COL.asfalto;
  ctx.fillRect(0, 0, W, H);
  const horizon = H * 0.46;

  // degradado de cielo
  const g = ctx.createLinearGradient(0, 0, 0, horizon);
  g.addColorStop(0, '#12060d');
  g.addColorStop(1, 'rgba(255,45,120,0.35)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, horizon);

  // sol de neón con franjas
  const sunR = W * 0.20, sx = W / 2, sy = horizon - 10;
  const sg = ctx.createLinearGradient(0, sy - sunR, 0, sy + sunR);
  sg.addColorStop(0, COL.amarillo);
  sg.addColorStop(1, COL.magenta);
  ctx.save();
  ctx.beginPath(); ctx.arc(sx, sy, sunR, Math.PI, 0); ctx.closePath(); ctx.clip();
  ctx.fillStyle = sg; ctx.fillRect(sx - sunR, sy - sunR, sunR * 2, sunR);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = '#000';
  for (let i = 1; i <= 6; i++) { const yy = sy - sunR + (i / 6.5) * sunR; ctx.fillRect(sx - sunR, yy, sunR * 2, 10); }
  ctx.restore();

  // carretera
  ctx.fillStyle = COL.road;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 40, horizon);
  ctx.lineTo(W / 2 + 40, horizon);
  ctx.lineTo(W * 0.95, H);
  ctx.lineTo(W * 0.05, H);
  ctx.closePath();
  ctx.fill();
  // bordes cian
  ctx.strokeStyle = COL.cian; ctx.lineWidth = 6; ctx.globalAlpha = 0.6;
  ctx.beginPath(); ctx.moveTo(W / 2 - 40, horizon); ctx.lineTo(W * 0.05, H); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(W / 2 + 40, horizon); ctx.lineTo(W * 0.95, H); ctx.stroke();
  ctx.globalAlpha = 1;
  // línea discontinua central
  ctx.strokeStyle = COL.amarillo; ctx.lineWidth = 14;
  for (let i = 0; i < 7; i++) {
    const t0 = i / 7, t1 = t0 + 0.5 / 7;
    const y0 = horizon + t0 * t0 * (H - horizon), y1 = horizon + t1 * t1 * (H - horizon);
    ctx.lineWidth = 6 + t0 * 22;
    ctx.beginPath(); ctx.moveTo(W / 2, y0); ctx.lineTo(W / 2, y1); ctx.stroke();
  }
}

function textoNeon(ctx, txt, x, y, font, color, glow = 30, align = 'center') {
  ctx.save();
  ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.font = font;
  ctx.shadowColor = color; ctx.shadowBlur = glow;
  ctx.fillStyle = color;
  ctx.fillText(txt, x, y);
  ctx.restore();
}

/**
 * Dibuja la tarjeta. tipo: 'crono' | 'apto' | 'racha'.
 * datos: { valor, titulo, sub, reto } — reto es la frase de pique.
 * Devuelve un Blob PNG.
 */
export async function generarTarjeta({ tipo = 'crono', valor, titulo, sub, reto }) {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');

  // asegura que las fuentes del juego estén cargadas antes de pintar
  try { await Promise.all([document.fonts.load("64px Anton"), document.fonts.load("700 40px Overpass")]); } catch {}
  try { await document.fonts.ready; } catch {}

  fondo(ctx);

  // marca arriba
  textoNeon(ctx, 'CARNET QUEST', W / 2, 120, "400 72px Anton, sans-serif", COL.linea, 24);
  textoNeon(ctx, 'N-CQ', W / 2, 185, "800 30px Overpass, sans-serif", COL.cian, 18);

  // panel central con el resultado
  const acento = tipo === 'apto' ? COL.verde : tipo === 'racha' ? COL.amarillo : COL.cian;
  ctx.save();
  ctx.shadowColor = acento; ctx.shadowBlur = 40;
  ctx.strokeStyle = acento; ctx.lineWidth = 8;
  roundRect(ctx, 90, 300, W - 180, 600, 40);
  ctx.fillStyle = 'rgba(11,13,18,0.80)';
  ctx.fill(); ctx.stroke();
  ctx.restore();

  // título arriba del panel, sin solaparse con la cifra
  textoNeon(ctx, titulo.toUpperCase(), W / 2, 400, "400 58px Anton, sans-serif", COL.linea, 14);
  // cifra gigante: número grande, texto (APTO) algo menor y ajustado al ancho
  const esNumero = /^\d+$/.test(String(valor));
  let size = esNumero ? 280 : 220;
  ctx.font = `400 ${size}px Anton, sans-serif`;
  while (ctx.measureText(String(valor)).width > W - 260 && size > 90) { size -= 10; ctx.font = `400 ${size}px Anton, sans-serif`; }
  textoNeon(ctx, String(valor), W / 2, 620, `400 ${size}px Anton, sans-serif`, acento, 50);
  if (sub) textoNeon(ctx, sub.toUpperCase(), W / 2, 820, "700 42px Overpass, sans-serif", COL.gris, 0);

  // frase de pique + claim
  ctx.textAlign = 'center';
  ctx.fillStyle = COL.linea; ctx.font = "800 52px Overpass, sans-serif";
  wrap(ctx, reto || '¿Me lo superas?', W / 2, 1010, W - 200, 62);

  textoNeon(ctx, 'ME SAQUÉ EL TEÓRICO JUGANDO', W / 2, H - 90, "400 46px Anton, sans-serif", COL.magenta, 24);
  ctx.fillStyle = COL.gris; ctx.font = "600 32px Overpass, sans-serif"; ctx.textAlign = 'center';
  ctx.fillText('carnet quest · permiso B', W / 2, H - 40);

  return await new Promise((res) => canvas.toBlob((b) => res(b), 'image/png', 0.92));
}

function wrap(ctx, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '', yy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxW && line) { ctx.fillText(line, x, yy); line = w; yy += lh; }
    else line = test;
  }
  ctx.fillText(line, x, yy);
}

/** Comparte la tarjeta como IMAGEN (con texto). Fallback: descarga + copia de texto. */
export async function compartirTarjeta(blob, texto) {
  const file = new File([blob], 'carnet-quest.png', { type: 'image/png' });
  // Web Share nivel 2 (archivos) — iOS/Android modernos
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], text: texto }); return 'compartida'; }
    catch { return 'cancelada'; }
  }
  // fallback: descargar la imagen + copiar el texto
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = 'carnet-quest.png'; a.click();
  URL.revokeObjectURL(url);
  try { await navigator.clipboard.writeText(texto); } catch {}
  return 'descargada';
}
