# Retención V1 — qué se ha construido y por qué

> Documento de referencia de la capa de retención. Todo lo que aquí se describe
> **está implementado y probado**, no diseñado. Lo que falta o queda cojo está en
> la sección [Limitaciones reales](#limitaciones-reales), sin adornos.

## 0 · El marco: qué NO se puede hacer

Carnet Quest es una PWA estática servida desde GitHub Pages. Eso no es un detalle
de infraestructura: define lo que la retención puede y no puede ser.

- No hay servidor, ni cuentas, ni base de datos remota.
- No hay ranking global, ni ligas, ni multijugador sincronizado.
- No hay analítica remota ni push propio.
- Las notificaciones locales programadas de una PWA no son fiables (en iOS
  directamente no existen para este caso).

Y encima de eso, una lista de cosas que **están prohibidas por decisión de
producto**, no por limitación técnica (CLAUDE.md §12, "cero dark patterns"):

vidas que se gastan · esperas artificiales · recuperar progreso pagando ·
urgencia falsa · contenido que desaparece · culpar al jugador por perder la
racha · presión social inventada · jugadores falsos · rankings simulados · bots
disfrazados de personas · comprar respuestas o progreso · pagar por reparar
errores · alterar el Predictor con cualquier cosa que no sea conocimiento real.

Todo lo de abajo se ha construido dentro de esas dos listas.

---

## 1 · Tu Próxima Parada

**El problema:** el jugador cierra la app y no tiene ni idea de qué le espera. La
solución de la industria es una notificación. Aquí no la hay.

**La solución:** al terminar una sesión con sustancia, el juego deja preparada
**una** sesión corta y concreta, y te la enseña antes de que te vayas: cuántos
minutos, qué lleva dentro.

`js/retencion/proxima.js`

Una parada es un objeto con versión propia:

```js
{ version, id, createdAt, createdLocalDate, readyLocalDate, estimatedSeconds,
  sourceSessionId, coldCheckQuestionIds, routeQuestionIds, puzzleId,
  fallbackType, status, calendarPreference, completedAt }
```

**Composición:** 3 recuerdos "en frío" + 5 de ruta + 1 cruce cuando lo hay.

- El **arranque en frío** solo puede usar preguntas **que el jugador ya ha
  visto** (`s.respuestas`). Se prioriza lo que está en el Taller (`100 + fallos*10`)
  y lo que está en cajas Leitner bajas (`max(0, 6-caja)*12`). Nunca estrena
  contenido: su valor pedagógico es medir el recuerdo espaciado.
- La **ruta** la decide el motor Leitner de siempre y se rellena con lo menos
  visto.
- El **cruce** es la guinda. Si no hay ninguno elegible, `fallbackType` queda en
  `'sin-cruce'` y la parada sigue siendo perfectamente válida.

**Reglas que se cumplen en el código, no solo en el comentario:**

| Regla | Dónde se garantiza |
|---|---|
| Solo puede haber UNA pendiente | `prepararProxima()` devuelve `null` si hay una; `guardarProxima()` se niega a pisarla |
| No caduca | `proximaLista()` solo compara `HOY() >= readyLocalDate`; no hay borrado por tiempo |
| No penaliza | no toca XP, racha, chapas ni Predictor en ninguna rama |
| No bloquea nada | es una tarjeta más en el mapa; el juego entero sigue accesible |
| Sobrevive a que cambie el banco | `materializar()` filtra por ids existentes y deduplica |

`readyLocalDate` es el día siguiente porque un "recuerdo en frío" el mismo día no
mide nada. Pero eso **no impide jugar hoy**: solo cambia lo que dice la tarjeta
("Preparada para mañana" en vez de "Tu próxima parada está lista").

### Recordatorio por calendario

`js/retencion/ics.js` (carga diferida)

En vez de fingir un canal de notificación que no existe, se usa el calendario del
propio jugador: él elige la hora, él pulsa, y el evento vive en SU agenda.

- `.ics` conforme a RFC 5545: CRLF, escape de `\ ; ,` y saltos, `DTSTART` en hora
  **local sin `Z`** (la hora que eligió es la hora que sale).
- `entregarICS()` devuelve `'compartido'` o `'descargado'` — y la interfaz dice
  exactamente lo que ha pasado. Nunca "añadido a tu calendario" cuando en
  realidad solo se ha bajado un archivo.
- El evento apunta a `#/next-run`, un deep link que abre la parada directamente.

---

## 2 · Descubrimiento progresivo

`js/retencion/desbloqueos.js`

El mapa enseñaba cinco modos de golpe el primer día. Ahora nacen cerrados y se
encienden por hitos reales:

| Modo | Se abre con |
|---|---|
| ¿Quién pasa primero? | abierto de salida |
| Señal Rush | 12 señales coleccionadas |
| Doble o nada | primer boss superado |
| DGT Tower | llegar al Mundo 2 |
| Contrarreloj | primer simulacro completado |

Dos cosas importantes:

- **La condición se dice tal cual**, con progreso incluido: "Colecciona 12
  señales para encender Señal Rush. (7 de 12)". Ni "próximamente" ni cuentas
  atrás ni misterio.
- **Nunca se vuelven a cerrar.** `revisarDesbloqueos()` hace `if (s.desbloqueos[h.id]) continue`.
  Si el jugador borra el álbum, Señal Rush sigue abierto.

La revisión pasa por un único punto (`celebraciones()`), por el que pasan todos
los resultados de todos los modos.

---

## 3 · ADN de los mundos

`js/retencion/mundos-adn.js`

Quince mundos con seis misiones y un boss cada uno son el mismo mundo quince
veces. El ADN declara, **en un solo sitio**, qué cambia en cada uno.

```js
3:  { mods: { senales: 1, confianza: 2 }, lema: 'Aquí importa saber cuándo dudas.' },
6:  { mods: { cruces: 2, contrato: 1 },   lema: 'Prepárate para más cruces.' },
13: { mods: { taller: 2, reglaTrampa: 1 },lema: 'Tus averías vienen contigo.' },
```

**Regla de oro:** un modificador cambia **cómo** se juega, nunca **qué es
verdad**. No toca respuestas, ni explicaciones, ni el Predictor.

Modificadores disponibles y su fricción: `confianza` (2), `reglaTrampa` (2),
`taller` (1), `cruces` (1), `contrato` (1), `senales` (0).

`adnDe()` aplica un **tope de fricción**: nunca más de dos modificadores
exigentes a la vez. Si una combinación se pasa, se recorta el más caro — mejor un
mundo con menos sal que una misión imposible.

El Mundo 1 va limpio a propósito: es el tutorial, allí solo se aprende a jugar.

**Se anuncia, no se esconde.** Al entrar en el mundo hay una franja con el lema y
los modificadores en texto plano: "Te pregunta si vas seguro", "Regla contra
Trampa", "Más señales".

`aplicarADN()` (en `screens.js`) nunca alarga la misión ni mete duplicados: cada
modificador **sustituye** huecos, no añade. Si falta contenido compatible, el
hueco se queda como pregunta normal y no pasa nada.

---

## 4 · Contratos de ruta

`js/retencion/contratos.js`

Antes de la misión, algunos mundos ofrecen un contrato: "Termina con un máximo de
un fallo", "Consigue cinco aciertos seguidos", "Repara dos averías".

**La clave ética está en una sola frase: un contrato solo puede AÑADIR.**

- Cumplirlo paga 25 🔩 (premio fijo, definido en un solo sitio, sin "casi lo
  tenías").
- Fallarlo **no quita nada**: ni estrellas, ni XP, ni chapas que ya tuvieras, ni
  racha, ni toca el Predictor. Simplemente no cobras el extra.
- El copy de fallo es sobrio: *"Contrato no completado. La ruta sigue."*
- La **ruta normal es la opción por defecto** y se ve igual de válida.

`posible(lista)` decide si un contrato puede ofrecerse **con las preguntas que
realmente van a salir**: nunca se ofrece "no falles ninguna de señales" si en la
misión no hay al menos tres señales, ni "repara dos averías" si no viajan dos
averías dentro.

`resolverContrato()` es idempotente (`yaCobrado`): recargar no duplica el premio.

---

## 5 · Chequeo de confianza

Antes de revelar el resultado, en los mundos que lo declaran, el juego pregunta:
**¿Vas seguro?** — Seguro / Dudo.

Detalles que importan:

- Se pregunta **antes** de revelar. Después de ver el resultado, todo el mundo
  "lo sabía".
- Los dos botones tienen **el mismo peso visual** (los dos `btn--ghost`). Si uno
  brillara, estaríamos induciendo la respuesta que queremos medir.
- **No hay castigo ni premio.** Solo habla cuando dice algo útil:
  - dudabas y acertaste → *"Dudabas, pero lo sabías. Eso ya está más asentado de
    lo que crees."*
  - ibas seguro y fallaste → *"Ibas seguro. Justo por eso esta trampa funciona
    tan bien."*
- **No entra en el Predictor.** El Predictor solo se mueve con conocimiento real
  medido; la confianza declarada no es conocimiento.

---

## 6 · Regla contra Trampa

`js/retencion/reglatrampa.js` (carga diferida) · `datos/reglatrampa.json` (210 tarjetas)

Rompe la monotonía del test de cuatro opciones: dos tarjetas enfrentadas, una es
la regla real y la otra la trampa.

### La decisión de contenido, documentada a propósito

El plan original era usar `explicacion_corta` como regla verdadera y el campo
`trampa` como afirmación falsa. **No se puede:** en este banco `trampa` es un
META-COMENTARIO sobre por qué la opción incorrecta tienta ("mucha gente cede solo
al de su derecha…"), no una proposición falsa autónoma. Convertirla en una
exigiría reescribirla, y **generar normativa nueva por paráfrasis está
prohibido**.

Así que la tarjeta se construye con el par (opción correcta, opción incorrecta)
**de la propia pregunta**, que ya está verificado: por construcción una es cierta
y la otra falsa en el contexto de su enunciado. No se inventa ni una palabra;
solo se reordena texto ya auditado. El curador es `tools/curar-reglatrampa.mjs`.

De 613 candidatas se podan a **210** (14 por mundo, las trampas con más solape de
vocabulario con la regla, que son las que más tientan). El manifiesto pesa
80,7 KB (17,4 KB gzip) y **no entra en el arranque**.

### Integridad pedagógica

- **El primer intento es el que cuenta.** Si fallas, cuenta como fallo real: va
  al Taller, baja la caja Leitner y entra en el Predictor.
- La pregunta de cuatro opciones que aparece después es **corrección guiada**, no
  un segundo intento. No registra respuesta, no borra el fallo, no infla la
  precisión. Está verificado con una prueba de integración que compara
  `s.respuestas` antes y después.
- **No se usa en la DGT Tower ni en los boss.** Allí manda el formato del examen.
- El lado de la regla se decide con un hash del `questionId`: determinista (la
  misma pregunta siempre en el mismo lado) pero repartido, para que no se aprenda
  la posición en vez de la norma. Reparto medido: ~50/50.
- Si el manifiesto validado no llega a `RULETRAP_MINIMO` (60) tarjetas, el motor
  queda montado pero **invisible**. Nunca deja un botón muerto.

---

## 7 · Retos por enlace

`js/retencion/reto.js` (carga diferida)

Dos personas abren el mismo enlace y juegan **exactamente** el mismo recorrido.
No hay sincronización, ni ranking, ni cuentas: el marcador es la conversación que
ya tienen por WhatsApp. Eso no se simula, se aprovecha.

```
https://…/#/reto?v=1&mode=mix5&seed=482731
```

**El enlace lleva tres cosas: versión, modo y semilla.** Nada más. Ni nombre, ni
resultado, ni progreso, ni identificador de dispositivo. Hay una prueba que
comprueba que los parámetros del enlace son exactamente `['mode','seed','v']`.

- Determinismo con `mulberry32`, no `Math.random`: dos móviles con la misma
  semilla ven el mismo reto.
- El pool se ordena canónicamente por `id` **antes** de barajar, para que el
  orden de carga de los ficheros no pueda influir. Probado cargando el banco al
  derecho y al revés.
- Solo se usan mundos **gratuitos**: quien reciba el enlace debe poder jugarlo
  sin haber pagado.
- **Un reto no toca el progreso**: no da XP, no registra respuestas, no alimenta
  el Predictor, no mueve el Leitner. Se dice en pantalla: *"Los retos no tocan tu
  progreso ni tu Predictor. Son solo por el pique."*
- Un enlace roto o de versión futura no revienta la app: se detecta el motivo
  (`version` / `modo` / `semilla`), se vuelve al mapa y se explica.
- Compartir usa Web Share si existe y cae al portapapeles si no. **No se accede a
  contactos, no se envía nada automáticamente y no hay recompensa por invitar.**

---

## 8 · Modo de prueba (caja negra local)

`js/retencion/eventos.js` · formato en [LOCAL_TEST_DATA_FORMAT.md](LOCAL_TEST_DATA_FORMAT.md)

Para poder hacer pruebas con personas reales sin montar analítica.

- **Ni una sola llamada de red.** Hay una prueba que lee el fichero fuente y
  falla si aparece `fetch(`, `XMLHttpRequest`, `sendBeacon`, `WebSocket` o
  `new Image`.
- **Apagado por defecto.** Sin activarlo desde Perfil no se registra nada.
- **Lista negra de campos** aplicada al guardar, no al leer: nombre, teléfono,
  correo, texto de preguntas, texto de respuestas, contactos, IP, user-agent,
  huella de dispositivo, identificadores de publicidad. El `questionId` sí se
  guarda: es un id interno que no identifica a nadie.
- Solo pasan primitivas: números, booleanos y strings de **≤ 40 caracteres** (ids
  y slugs, no frases).
- Buffer circular de 2000 eventos: nunca crece sin control.
- Vive en su propia clave (`cq-pruebas`), **aparte del progreso**, para no
  contaminar el export/import de partida. Borrarlo no toca el progreso, y
  exportar el progreso no arrastra eventos.

---

## Limitaciones reales

Lo que **no** está resuelto, dicho sin adornos:

1. **WebKit no se ha podido ejecutar en este entorno.** El contenedor solo trae
   Chromium; `playwright install webkit` no dispone de red para descargarlo. La
   compatibilidad con Safari está auditada por código (ver
   [Compatibilidad](#compatibilidad-safari--ios)), no verificada en ejecución.
   **Falta una pasada en un iPhone real antes de vender.**
2. **El suelo real de versión es Safari 16.2** (diciembre 2022), por `color-mix()`,
   que usan los temas del Garaje y varias notas. En un iPhone con iOS 15 los
   colores caerán al valor sin `color-mix`; la app funciona, pero se ve peor. No
   está probado.
3. **`datos/reglatrampa.json` se precachea con el Service Worker.** Son 17,4 KB
   gzip que se descargan en segundo plano aunque el jugador no llegue nunca a un
   mundo con ese modificador. Se ha priorizado que el juego esté completo sin red
   sobre ahorrar esos kilobytes.
4. **210 tarjetas de Regla contra Trampa** cubren 14 preguntas por mundo de un
   banco de ~58. Un jugador intensivo repetirá tarjetas antes de agotarlas.
   Ampliar el manifiesto es trabajo de contenido, no de código.
5. **El "arranque en frío" solo se sirve a partir del día siguiente.** Quien juegue
   dos sesiones el mismo día verá "Preparada para mañana" y su segunda sesión no
   tendrá parada nueva hasta completar la que tiene pendiente. Es deliberado
   (invariante de "una sola pendiente"), pero puede leerse como que el juego no
   le prepara nada.
6. **No hay verificación de que el reto se haya jugado.** Nadie impide reabrir el
   mismo enlace y repetir hasta clavarlo antes de enseñar el resultado. Sin
   servidor no hay forma honesta de evitarlo, y añadir una falsa (bloquear
   reintentos localmente) engañaría solo a quien no sepa borrar datos.
7. **El chequeo de confianza no se explota todavía.** Se registra en la caja negra
   y se usa para el mensaje del momento, pero no alimenta ninguna estadística
   visible ni ajusta la selección de contenido. Es la base para una V2.

## Compatibilidad Safari / iOS

Auditoría por código de las APIs que históricamente rompen en Safari:

| API | Uso | Estado |
|---|---|---|
| `navigator.share` / `canShare({files})` | compartir tarjeta y `.ics` | siempre tras `if`/`?.`, con fallback a descarga o portapapeles |
| `navigator.clipboard` | copiar enlace de reto | dentro de `try/catch`, con fallback a un toast con el enlace |
| `navigator.vibrate` | haptics | tras `if (navigator.vibrate)`; en iOS simplemente no hace nada |
| IndexedDB | progreso | `try/catch` con fallback a `localStorage` (Safari privado) |
| `color-mix()` | temas y notas | **requiere Safari 16.2** — es el suelo real |
| `Array.prototype.at(-1)` | curva del mapa hacia la Torre | requiere Safari 15.4 |
| `import()` dinámico | módulos diferidos | Safari 11+ |
| Service Worker | offline | Safari 11.1+; en iOS solo en Safari y en la PWA instalada |
| Regex lookbehind | — | **no se usa** (es lo que más tarde llegó a Safari) |
| `structuredClone`, `findLast`, `toSorted`, `<dialog>` | — | **no se usan** |

## Ficheros

```
js/retencion/
  flags.js          interruptores; un flag apagado no deja botones muertos
  eventos.js        caja negra local, sin red
  desbloqueos.js    hitos y descubrimiento progresivo
  proxima.js        Tu Próxima Parada
  ics.js            recordatorio por calendario          [diferido]
  mundos-adn.js     ADN declarativo de los 15 mundos
  contratos.js      contratos de ruta
  reto.js           retos por enlace                     [diferido]
  reglatrampa.js    motor Regla contra Trampa            [diferido]

datos/reglatrampa.json    210 tarjetas curadas           [diferido]

tools/
  curar-reglatrampa.mjs   generador del manifiesto
  test-retencion.mjs      30 pruebas unitarias
  size-check.mjs          presupuesto de arranque
```
