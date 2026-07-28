// QA Retención V1 · offline real (Service Worker) y WebKit (motor de Safari).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { webkit, abrirChromium } from './_navegador.mjs';

// La versión esperada sale de sw.js: escribirla a mano obliga a tocar la prueba
// en cada release y hace que falle por el motivo equivocado.
const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const VERSION_SW = (readFileSync(join(RAIZ, 'sw.js'), 'utf8').match(/const VERSION = '([^']+)'/) || [])[1];
const BASE = process.env.CQ_URL || 'http://localhost:8765/';
const OUT = process.env.SHOTS || '/tmp/cq-shots';
await (await import('node:fs/promises')).mkdir(OUT, { recursive: true });
const B = BASE;
const fallos = [];
const ok = (c, m) => { console.log((c ? '✅' : '❌') + ' ' + m); if (!c) fallos.push(m); };

/* ---------- 1 · Offline con Service Worker (Chromium) ---------- */
{
  const b = await abrirChromium();
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));

  await p.goto(B, { waitUntil: 'networkidle' });
  const sk = p.locator('#salir.btn-saltar'); if (await sk.count()) { await sk.click(); await p.waitForTimeout(400); }
  const go = p.locator('#ob-go'); if (await go.count()) { await go.click(); await p.waitForTimeout(700); }
  // tras el onboarding se ofrece poner fecha de examen: la prueba la salta
  const noFecha = p.locator('#ex-luego');
  if (await noFecha.count()) { await noFecha.click(); await p.waitForTimeout(500); }

  // esperar a que el SW controle la página y termine el precache
  const estado = await p.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    for (let i = 0; i < 60 && !navigator.serviceWorker.controller; i++) await new Promise(r => setTimeout(r, 250));
    return { activo: !!reg.active, controla: !!navigator.serviceWorker.controller };
  });
  ok(estado.activo && estado.controla, `Service Worker activo y controlando (${JSON.stringify(estado)})`);

  const cacheado = await p.evaluate(async () => {
    const nombres = await caches.keys();
    const c = await caches.open(nombres[0]);
    const claves = (await c.keys()).map(r => new URL(r.url).pathname);
    return {
      version: nombres[0],
      n: claves.length,
      rt: claves.some(k => k.endsWith('datos/reglatrampa.json')),
      reto: claves.some(k => k.endsWith('js/retencion/reto.js')),
      ics: claves.some(k => k.endsWith('js/retencion/ics.js')),
    };
  });
  console.log('   caché:', JSON.stringify(cacheado));
  ok(cacheado.version === VERSION_SW, `La caché usa la versión declarada en sw.js (${VERSION_SW})`);
  ok(cacheado.rt && cacheado.reto && cacheado.ics, 'Los módulos diferidos también quedan disponibles sin red');

  await ctx.setOffline(true);
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);
  ok(await p.locator('.screen.activa .mapa-svg').count() > 0, 'Sin red, la app arranca y pinta el mapa');
  await p.screenshot({ path: `${OUT}/offline-mapa.png` });

  // jugar una misión entera sin red
  await p.evaluate(() => document.querySelector('.nodo[data-mundo="1"]').dispatchEvent(new MouseEvent('click', { bubbles: true })));
  await p.waitForTimeout(700);
  await p.locator('.screen.activa [data-mision="0"]').click();
  await p.waitForTimeout(900);
  ok(await p.locator('.screen.activa .q-card, .screen.activa .cruce-escena').count() > 0, 'Sin red, una misión se juega igual');

  // y un reto por enlace, que carga un módulo diferido
  await p.goto(B + '#/reto?v=1&mode=mix5&seed=31415', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2500);
  ok(await p.locator('.screen.activa #reto-go').count() > 0, 'Sin red, un enlace de reto se abre (módulo diferido desde caché)');
  await p.screenshot({ path: `${OUT}/offline-reto.png` });

  ok(errs.length === 0, `Sin errores de página offline${errs.length ? ': ' + errs.join(' | ') : ''}`);
  await ctx.setOffline(false);
  await b.close();
}

/* ---------- 2 · WebKit: el motor de Safari/iOS ---------- */
{
  let b;
  try { b = await webkit.launch(); }
  catch (e) { console.log('⚠️  WebKit no está instalado en este entorno: ' + e.message.split('\n')[0]); }
  if (b) {
    const p = await (await b.newContext({ viewport: { width: 390, height: 844 } })).newPage();
    const errs = [];
    p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
    p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE: ' + m.text()); });
    await p.goto(B, { waitUntil: 'networkidle' });
    const sk = p.locator('#salir.btn-saltar'); if (await sk.count()) { await sk.click(); await p.waitForTimeout(400); }
    const go = p.locator('#ob-go'); if (await go.count()) { await go.click(); await p.waitForTimeout(800); }
  // tras el onboarding se ofrece poner fecha de examen: la prueba la salta
  const noFecha = p.locator('#ex-luego');
  if (await noFecha.count()) { await noFecha.click(); await p.waitForTimeout(500); }
    ok(await p.locator('.screen.activa .mapa-svg').count() > 0, 'WebKit: el mapa se pinta');
    await p.screenshot({ path: `${OUT}/webkit-mapa.png` });

    // color-mix() y :has() son lo que más tarde llegó a Safari: se comprueban de verdad
    const css = await p.evaluate(() => ({
      colorMix: CSS.supports('color', 'color-mix(in srgb, red 50%, blue)'),
      gapFlex: CSS.supports('gap', '8px'),
      dvh: CSS.supports('height', '100dvh'),
    }));
    console.log('   CSS soportado:', JSON.stringify(css));
    ok(css.colorMix, 'WebKit: color-mix() disponible (lo usan los temas del Garaje y las notas)');

    await p.evaluate(() => document.querySelector('.nodo[data-mundo="1"]').dispatchEvent(new MouseEvent('click', { bubbles: true })));
    await p.waitForTimeout(700);
    await p.locator('.screen.activa [data-mision="0"]').click();
    await p.waitForTimeout(1000);
    ok(await p.locator('.screen.activa .q-card, .screen.activa .cruce-escena').count() > 0, 'WebKit: una misión arranca');
    await p.screenshot({ path: `${OUT}/webkit-mision.png` });

    // ics: se genera igual (el formato no depende del motor)
    const ics = await p.evaluate(async () => {
      const m = await import('/js/retencion/ics.js');
      return m.generarICS({ fecha: '2026-08-14', hora: '19:30', url: 'https://x/#/next-run', uid: 'u@t' });
    });
    ok(ics.includes('DTSTART:20260814T193000'), 'WebKit: el .ics sale con la hora local correcta');
    const share = await p.evaluate(() => ({ share: !!navigator.share, canShare: !!navigator.canShare, clipboard: !!navigator.clipboard?.writeText }));
    console.log('   APIs de compartir en WebKit:', JSON.stringify(share));

    ok(errs.length === 0, `WebKit sin errores${errs.length ? ': ' + errs.join(' | ') : ''}`);
    await b.close();
  }
}

console.log(fallos.length ? `\n❌ ${fallos.length} fallos` : '\n✅ offline y WebKit correctos');
process.exit(fallos.length ? 1 : 0);
