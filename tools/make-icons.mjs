#!/usr/bin/env node
// Genera los iconos PNG de la PWA sin dependencias: carretera nocturna con
// línea discontinua amarilla y horizonte de neón, dirección "Señal Neón" (§9).
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'icons');
mkdirSync(OUT, { recursive: true });

const crcTable = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf) => {
  let c = 0xffffffff;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
};
const png = (w, h, rgba) => {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
};

const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const ASFALTO = hex('#0B0D12'), ROAD = hex('#1B2030'), LINEA = hex('#FFC800'),
  MAGENTA = hex('#FF2D78'), CIAN = hex('#00E5FF'), BORDE = hex('#2A3040');
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));

function render(size) {
  const buf = Buffer.alloc(size * size * 4);
  const put = (x, y, [r, g, b], a = 255) => {
    const i = (y * size + x) * 4;
    const t = a / 255;
    buf[i] = Math.round(buf[i] * (1 - t) + r * t);
    buf[i + 1] = Math.round(buf[i + 1] * (1 - t) + g * t);
    buf[i + 2] = Math.round(buf[i + 2] * (1 - t) + b * t);
    buf[i + 3] = 255;
  };
  const horizonY = size * 0.42, vpX = size * 0.5;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // cielo nocturno con degradado magenta→asfalto sobre el horizonte
      let col = ASFALTO;
      if (y < horizonY) {
        const t = 1 - y / horizonY;
        col = mix(ASFALTO, MAGENTA, Math.pow(1 - t, 3.2) * 0.55);
      }
      put(x, y, col);
      if (y >= horizonY) {
        // carretera en perspectiva hacia el punto de fuga
        const p = (y - horizonY) / (size - horizonY);      // 0 en horizonte, 1 abajo
        const half = size * (0.045 + 0.42 * p);            // semiancho de la calzada
        const dx = Math.abs(x - vpX);
        if (dx < half) {
          put(x, y, mix(ROAD, ASFALTO, (1 - p) * 0.5));
          // bordes cian de neón
          if (half - dx < Math.max(1.5, size * 0.012)) put(x, y, CIAN, 210);
          // línea central discontinua amarilla
          const dashOn = Math.floor(Math.pow(p, 0.6) * 9) % 2 === 0;
          if (dx < Math.max(1.2, half * 0.055) && dashOn) put(x, y, LINEA);
        } else if (dx < half + Math.max(1.5, size * 0.02)) {
          put(x, y, BORDE, 120);
        }
      }
    }
  }
  // sol de neón sobre el horizonte
  const sunR = size * 0.16, sunY = horizonY - size * 0.02, sunX = vpX;
  for (let y = 0; y < horizonY; y++) {
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - sunX, y - sunY);
      if (d < sunR && (y % Math.max(2, Math.round(size * 0.03)) !== 0 || d < sunR * 0.5)) {
        const t = d / sunR;
        put(x, y, mix(LINEA, MAGENTA, t), 235);
      } else if (d < sunR * 1.6) {
        put(x, y, MAGENTA, Math.round(60 * (1 - d / (sunR * 1.6))));
      }
    }
  }
  return png(size, size, buf);
}

for (const size of [180, 192, 512]) {
  writeFileSync(join(OUT, `icon-${size}.png`), render(size));
  console.log(`icons/icon-${size}.png`);
}
