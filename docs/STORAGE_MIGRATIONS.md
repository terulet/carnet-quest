# Migraciones de almacenamiento

## Dónde vive el estado

| Clave | Dónde | Qué |
|---|---|---|
| `carnet-quest` → `jugador` → `estado` | IndexedDB | progreso del jugador |
| `cq-estado` | localStorage | copia de seguridad y fallback (Safari privado) |
| `cq-pruebas` | localStorage | caja negra del Modo de prueba, **separada** |

El progreso se escribe en los dos sitios (`guardar()`, con *debounce* de 60 ms).
Si IndexedDB falla al abrir —Safari en navegación privada es el caso típico—,
`cargarEstado()` cae a `localStorage` sin que el jugador note nada.

## Versión actual: `schemaVersion: 3`

La versión vive **dentro** del estado. Cada migración lleva de N a N+1 y **nunca
es destructiva**.

```js
const SCHEMA_VERSION = 3;
function migrar(s) {
  let v = s.schemaVersion || 1;
  while (v < SCHEMA_VERSION) { s = MIGRACIONES[v](s); v = s.schemaVersion; }
  /* … red de seguridad … */
}
```

## 1 → 2 · Retención V1

Añade cinco ramas nuevas: `desbloqueos`, `proxima`, `prefs`, `contratos`,
`pruebas`.

La parte delicada es `desbloqueos`: la V1 no tenía descubrimiento progresivo, así
que quien ya jugaba tenía todos los modos abiertos. **Volver a cerrárselos sería
quitarle algo que ya usaba.** La migración deduce el estado desde el progreso
existente, y **siempre a favor del jugador**:

```js
rush:  coleccionadas >= 12 || (s.rush?.record || 0) > 0
bote:  bossHecho          || (s.bote?.record || 0) > 0
torre: bossHecho || simulacros || (s.contrarreloj?.record || 0) > 0
crono: simulacros            || (s.contrarreloj?.record || 0) > 0
```

Y por encima de todo eso: **con 400 XP o más se abre todo**. Un veterano no debe
encontrarse el juego recortado por una actualización.

`proxima` arranca en `null` (no se inventa una parada), `pruebas.activo` en
`false` (la caja negra nace apagada).

## 2 → 3 · Plan de examen

Añade una sola rama, `examen`, y nada más:

```js
examen: { fecha: null, fijadaEn: null, avisado: false, resultado: null }
```

Quien ya jugaba se queda **exactamente igual** hasta que decida poner fecha, que
es opcional. No se deduce nada, no se activa nada, no se inventa una fecha.

`examen` está en la lista de la red de seguridad, así que un `examen: null`
guardado por lo que sea se repone entero en vez de dejar la app leyendo
`examen.fecha` sobre un null.

## La red de seguridad

Después de la cadena de migraciones formales, `migrar()` fusiona con el estado
inicial para garantizar que las claves nuevas existan aunque el estado venga de
un sitio raro (un export editado a mano, un `localStorage` a medio escribir, una
versión futura degradada).

Esta parte tuvo **un fallo real**, encontrado por las pruebas unitarias y ya
corregido:

```js
// MAL — Object.assign MUTA el primer argumento
const fusion = Object.assign(base, s);
for (const clave of [...]) fusion[clave] = Object.assign({}, base[clave], s[clave] || {});
```

Con `s.racha === null`, la primera línea dejaba `base.racha` en `null`; la segunda
leía ese `base.racha` ya envenenado y producía `racha: {}`. La app se caía al leer
`racha.dias`. Ahora:

```js
const fusion = Object.assign({}, base, s);          // copia, no mutación
const valido = guardado && typeof guardado === 'object' && !Array.isArray(guardado) ? guardado : {};
fusion[clave] = Object.assign({}, base[clave], valido);
```

El `typeof` importa: `Object.assign({}, {a:1}, 'nope')` reparte las letras del
string como claves numéricas. Un `garaje: "nope"` en el estado guardado producía
un garaje con las propiedades `0:'n', 1:'o', 2:'p', 3:'e'`.

Además se reponen:

- objetos-mapa dañados: `mundos`, `srs`, `taller`, `album`, `vistas`, `diarias`;
- arrays dañados: `respuestas`, `simulacros`, `albumCategorias`, `garaje.comprados`;
- `proxima` si no es un objeto.

**Un estado dañado nunca debe dejar la app en pantalla blanca.** Hay una prueba
(`migración: un estado corrupto no deja la app en blanco`) que le mete
`desbloqueos: null`, `racha: null` y `garaje: 'nope'` a la vez.

## Export / import entre móviles

Sin backend, cambiar de móvil se hace con un `.json`:

```json
{ "app": "carnet-quest", "exportado": "2026-07-27T…", "estado": { … } }
```

`importarJSON()` acepta tanto el envoltorio como el estado pelado, valida que
tenga `xp` y `srs`, y **pasa siempre por `migrar()`** — así un export viejo se
actualiza al importarlo.

Los datos del Modo de prueba **no viajan** en este fichero. Hay una prueba que lo
comprueba buscando `eventId` dentro del export de progreso.

## Añadir la migración siguiente

1. Sube `SCHEMA_VERSION` en `js/state.js`.
2. Añade la entrada `N:` en `MIGRACIONES`, que **solo** añade o transforma, nunca
   borra, y termina con `s.schemaVersion = N + 1`.
3. Añade las claves nuevas a `estadoInicial()`.
4. Si la clave nueva es un objeto anidado, mételo en la lista de la red de
   seguridad de `migrar()`.
5. Escribe una prueba en `tools/test-retencion.mjs` que parta de un estado real
   de la versión anterior y compruebe que no se pierde nada.
6. Sube `VERSION` en `sw.js` y `VERSION_APP` en `screens.js`.

Las pruebas **no** llevan el número escrito a mano: `qa-migracion.mjs` lee
`SCHEMA_VERSION` de `state.js` y `qa-offline.mjs` lee `VERSION` de `sw.js`. Así
siguen valiendo sin tocarlas.

## Service Worker

`sw.js` cachea con nombre versionado (`cq-v18`). Al activarse, borra todas las
cachés con otro nombre. Estrategia *cache-first* con actualización en segundo
plano. La caché es solo de red: **no guarda estado del jugador**, así que subir
la versión del SW nunca hace perder progreso.
