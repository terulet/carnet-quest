# Presupuesto de tamaño

Tope: **300 KB de carga inicial** (CLAUDE.md §5).

## Criterio de medida

Un número sin criterio no significa nada, así que aquí está el de este proyecto:

> **Carga inicial** = todo lo que el navegador necesita descargar para pintar la
> primera pantalla jugable, medido en **bytes transferidos (gzip)**, que es lo
> que paga el jugador en datos móviles.

**Se cuenta:**

- `index.html` y el CSS que enlaza,
- todos los módulos ES alcanzables por `import` **estático** desde `js/main.js`,
- los JSON del arranque: `strings.es.json`, `mundos.json`, `senales.json`,
  `cruces.json`, `garaje.json`,
- el banco del primer mundo jugable (`mundo-01.json`).

**No se cuenta** (y se lista aparte en el informe):

- los módulos que solo entran por `await import()` dinámico,
- los bancos de los mundos 2–15, que se piden al entrar en ellos,
- `datos/reglatrampa.json`, que se descarga la primera vez que hace falta,
- fuentes e iconos, que se pintan con fallback del sistema mientras cargan,
- lo que el Service Worker precachea **en segundo plano**, con el jugador ya
  jugando.

La medida se hace con `gzipSync(level 9)`, que es una aproximación conservadora:
un servidor real suele servir Brotli y quedarse por debajo.

## Cómo medirlo

```
npm run size:check                 # informe legible, sale 1 si se pasa del tope
npm run size:json                  # además, una línea JSON para CI
npm run check                      # lint del banco + unitarias + peso
```

(o `node tools/size-check.mjs` directamente: el proyecto no tiene build step y
`package.json` existe solo para estos comandos. Todos son `node`, así que
funcionan igual en Windows, macOS y Linux.)

El script sigue los imports estáticos de verdad (recorre el árbol desde
`js/main.js` con una expresión regular que **ignora los `import()` dinámicos**),
así que no hay que mantener una lista a mano que se desincronice.

## Histórico

| Versión | gzip | sin comprimir | qué añadió |
|---|---|---|---|
| `cq-v16` (`55d9d3a`) | 84,4 KB | 300,6 KB | antes de Retención V1 |
| `cq-v17` | 109,6 KB | 375,5 KB | Retención V1 (+25,2 KB) |
| **`cq-v18`** | **118,0 KB** | 404,3 KB | plan de examen y familias de trampa (+8,4 KB) |
| Tope | 300 KB | — | |
| Margen restante | **182,0 KB** | — | |

De los +8,4 KB de `cq-v18`, unos 2 KB son `js/plan.js` —que sí entra en el
arranque porque la banda del mapa lo necesita en la primera pantalla— y el resto
es código de pantalla en `screens.js`, CSS y textos. `js/trampas.js` y
`datos/trampas.json` son **diferidos** y no cuentan aquí.

Los 25,2 KB se reparten así: unos 14 KB son código nuevo dentro de `screens.js`
(pantallas de reto, tarjeta doble, chequeo de confianza, contratos, modo de
prueba, trampa de foco), 6,8 KB son los seis módulos de `js/retencion/` que sí
entran en el arranque, y el resto son CSS y strings. Los tres módulos diferidos
y el manifiesto de Regla contra Trampa **no** cuentan aquí.

## Detalle de la medida actual (`cq-v17`)

Lo que más pesa dentro del arranque:

| gzip | sin comprimir | fichero |
|---|---|---|
| 33,0 KB | 117,7 KB | `js/screens.js` |
| 13,9 KB | 52,6 KB | `datos/preguntas/mundo-01.json` |
| 10,6 KB | 53,3 KB | `css/app.css` |
| 7,0 KB | 20,9 KB | `js/cruce.js` |
| 5,8 KB | 15,2 KB | `datos/strings.es.json` |
| 5,7 KB | 25,5 KB | `datos/cruces.json` |
| 3,6 KB | 9,2 KB | `js/state.js` |

**Diferido: 249,2 KB gzip**, de los cuales 225,0 KB son los bancos de los mundos
2–15, 17,4 KB el manifiesto de Regla contra Trampa y 4,4 KB los tres módulos
diferidos más el álbum ampliado.

## Qué carga tarde y por qué

| Módulo | Se carga cuando |
|---|---|
| `js/retencion/ics.js` | el jugador pide guardar la parada en el calendario |
| `js/retencion/reto.js` | se abre un enlace de reto o se crea uno |
| `js/retencion/reglatrampa.js` + `datos/reglatrampa.json` | se entra en una misión de un mundo que declara ese modificador |
| `datos/preguntas/mundo-NN.json` | se entra en ese mundo |
| `datos/senales.expanded.json` | se abre el Álbum |

Los tres módulos diferidos se cargan con `await import()` desde `screens.js`, no
con una etiqueta `<script>` condicional, así que el navegador los pide una sola
vez y los cachea.

## Nota sobre el precache del Service Worker

`sw.js` **sí** precachea los módulos diferidos y `reglatrampa.json`. Eso no entra
en el presupuesto de arranque —el precache ocurre en segundo plano, después de
que la app sea interactiva— pero **sí consume datos del jugador**. Es una
decisión consciente: la app tiene que estar completa sin red (CLAUDE.md §5,
"offline-first"), y un jugador que se mete en el metro con el Mundo 4 a medias no
debería encontrarse un formato de pregunta que no carga.

Coste del precache completo: ~356 KB gzip la primera vez, una sola vez, en
segundo plano.

## Si se pasa del tope

Por orden de rentabilidad:

1. **Partir `screens.js`.** Son 33 KB gzip, casi un tercio del arranque, y ya
   lleva dentro pantallas que no hacen falta para jugar (Álbum, Garaje, Paywall,
   Torre). Sacarlas a módulos diferidos por ruta liberaría en torno a 10 KB.
2. **Sacar `mundo-01.json` del arranque** y pedirlo al entrar en el mundo, como
   los otros catorce. Ahorra 13,9 KB pero mete una espera antes de la primera
   misión — justo lo contrario de "jugar primero".
3. **Diferir `datos/cruces.json`** salvo el puzzle del tutorial. 5,7 KB.

No hacer ninguna de las tres mientras haya 190 KB de margen: complican el código
a cambio de nada.
