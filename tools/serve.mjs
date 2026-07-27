// CARNET QUEST — servidor estático de desarrollo.
//
// Existe por una razón concreta: `python3 -m http.server` no funciona en
// Windows (allí el binario se llama `python`), y pedir Python para servir
// ficheros estáticos en un proyecto que ya necesita Node es una dependencia de
// más. Esto son cuarenta líneas sin ni una librería.
//
// Uso:  node tools/serve.mjs [puerto]     ·     npm run serve

import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';

const PUERTO = Number(process.argv[2] || process.env.PORT || 8765);
const RAIZ = process.cwd();

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.ics': 'text/calendar; charset=utf-8',
};

const servidor = createServer(async (req, res) => {
  try {
    // solo la ruta: el hash no llega al servidor y la query no elige fichero
    let ruta = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (ruta.endsWith('/')) ruta += 'index.html';

    // normalize + comprobación de prefijo: sin esto, ../../ se sale de la raíz
    const destino = normalize(join(RAIZ, ruta));
    if (!destino.startsWith(RAIZ + sep) && destino !== RAIZ) {
      res.writeHead(403).end('403');
      return;
    }

    const info = await stat(destino);
    const fichero = info.isDirectory() ? join(destino, 'index.html') : destino;
    const cuerpo = await readFile(fichero);
    res.writeHead(200, {
      'Content-Type': TIPOS[extname(fichero).toLowerCase()] || 'application/octet-stream',
      // en desarrollo la caché solo estorba: el Service Worker ya cachea de verdad
      'Cache-Control': 'no-store',
      // el Service Worker necesita servirse desde el mismo origen y sin sorpresas
      'Service-Worker-Allowed': '/',
    });
    res.end(cuerpo);
  } catch (e) {
    res.writeHead(e.code === 'ENOENT' ? 404 : 500).end(e.code === 'ENOENT' ? '404' : '500');
  }
});

servidor.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`❌ El puerto ${PUERTO} ya está ocupado.\n   Prueba: node tools/serve.mjs ${PUERTO + 1}`);
    process.exit(1);
  }
  throw e;
});

servidor.listen(PUERTO, () => {
  console.log(`Carnet Quest en http://localhost:${PUERTO}/`);
  console.log('Ctrl+C para parar.');
});
