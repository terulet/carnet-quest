# Suite de integración (Playwright)

Pruebas end-to-end con navegador real, a 390×844 (iPhone de referencia del §3).
Las unitarias, que no necesitan navegador, están en `tools/test-retencion.mjs`.

## Cómo ejecutarlas

```bash
# 1. servir el proyecto (desde la raíz de carnet-quest)
npm run serve            # = node tools/serve.mjs — funciona igual en Windows

# 2. toda la suite, en serie, con resumen
npm run qa               # = node tools/qa/todas.mjs

# o una sola
node tools/qa/qa-adn.mjs
```

`todas.mjs` comprueba primero que el servidor responde: sin él, el fallo sería
críptico. Va en serie a propósito — son navegadores reales compitiendo por CPU y
en paralelo los tiempos de animación dejan de ser fiables.

Variables de entorno:

| Variable | Para qué | Por defecto |
|---|---|---|
| `CQ_URL` | URL de la app | `http://localhost:8765/` |
| `SHOTS` | dónde dejar las capturas | `/tmp/cq-shots` |
| `PW_CHROMIUM` | ruta al binario de Chromium | `/opt/pw-browsers/chromium` |
| `NODE_PATH` | dónde buscar Playwright si no está en el proyecto | — |
| `PORT` | puerto del servidor de desarrollo | `8765` |

En **Windows** funciona igual: todo son comandos `node`, sin Python ni utilidades
de shell POSIX. Para la suite de integración hace falta instalar Playwright una
vez (`npm install` y después `npx playwright install chromium`).

`_navegador.mjs` resuelve Playwright aunque esté instalado fuera del proyecto
(los `import` de ES modules no miran `NODE_PATH`) y cae al Chromium que traiga
Playwright si el del contenedor no existe.

## Qué cubre cada una

| Script | Qué prueba |
|---|---|
| `qa-arranque.mjs` | jugar primero: el primer contacto es un cruce, no un muro de texto |
| `qa-cruce.mjs` | "¿Quién pasa primero?" suelto y dentro de una misión |
| `qa-glorieta.mjs` | glorietas con el Pase activo |
| `qa-rush.mjs` | Señal Rush: marcador, timer y retirada de pistas por combo |
| `qa-bote.mjs` | Doble o nada: la escalera y perder el bote |
| `qa-garaje.mjs` | Garaje: compra, repintado del acento y coche del mapa |
| `qa-proxima.mjs` | Tu Próxima Parada: composición, calendario, viaje al día siguiente, deep link |
| `qa-adn.mjs` | **47 comprobaciones**: ADN de mundos, confianza, Regla contra Trampa, contratos, los tres tipos de reto, revancha con semilla nueva, catálogo de eventos y modo de prueba |
| `qa-migracion.mjs` | **35 comprobaciones**: progreso v1 antiguo, segundo plano y vuelta, estado dañado a propósito e importar un export anterior |
| `qa-offline.mjs` | Service Worker, juego sin red y compatibilidad WebKit (si está instalado) |

## Dos trampas al escribir pruebas aquí

1. **Las pantallas viejas siguen en el DOM.** `navegar()` solo quita la clase
   `.activa`. Un `p.locator('.resultado')` sin acotar encuentra el resultado de
   la misión *anterior* y la prueba pasa (o rompe) por el motivo equivocado.
   **Acota siempre a `.screen.activa`.** Los modales sí van sueltos: cuelgan de
   `<body>`.
2. **Los botones que se auto-ocultan.** `#siguiente` se queda en el DOM tras el
   auto-avance; usa `#siguiente:visible`. Y `#cofre` desaparece al abrirlo: si
   quieres saber si estaba, mira **antes** de pulsarlo.
