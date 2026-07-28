# Changelog

Formato: lo que cambia para el jugador primero; lo interno, después.

## [Plan de examen y Familias de trampa] — 2026-07-28 · `cq-v18`

Documentación completa en [`docs/PLAN_Y_TRAMPAS.md`](docs/PLAN_Y_TRAMPAS.md).

### Nuevo

- **La fecha del examen como eje de la app.** En el onboarding —después de haber
  jugado un cruce, nunca antes— el juego pregunta cuándo te examinas. La cabecera
  del mapa deja de decir "racha 4" y dice *"Faltan 11 días · vas al 75 % · hoy
  toca: 40 preguntas nuevas, 6 del Taller, 1 simulacro"*.
  - La fecha **no mueve el Predictor** ni un punto: cambia lo que se te sugiere
    hacer, no lo que se te dice que vales.
  - Ir retrasado **no castiga**. Si el ritmo no es realista, se dice en voz alta
    en vez de fingir que llegas.
  - Es opcional, saltable y se puede quitar cuando quieras.
  - El plan se calcula sobre los 15 mundos, no sobre los desbloqueados: el examen
    de la DGT entra entero.
- **Al pasar la fecha se pregunta qué tal fue.** Una vez, sin insistir. Anotarlo
  no da XP ni toca el historial: es información, no puntuación.
- **Radiografía de la trampa.** Los 856 campos `trampa` del banco, clasificados
  por mecanismo en 12 familias. En Perfil: *"El 41 % de tus fallos son de la misma
  familia: Los absolutos"*, con su consejo. Si el reparto es plano lo dice, en vez
  de inventarse un patrón.
- **Caza-trampas.** Modo nuevo: la respuesta correcta ya marcada, y tú aciertas
  por dónde te la habrían colado. Aprendes el patrón, no la respuesta. **No toca
  el Predictor, ni el Leitner, ni el Taller, ni da XP** — entrena a leer
  exámenes, no normativa.

### Arreglado

- `barajaCazaTrampas()` barajaba los mejores candidatos y cortaba, lo que
  destruía la prioridad que su nombre promete: una pregunta fallada entraba una
  de cada tres veces. Ahora los fallados entran siempre.
- La nota de cobertura de la radiografía daba el número de fallos del jugador
  donde decía "del banco". Ahora da la cobertura real del manifiesto.

### Interno

- Esquema **v2 → v3**: rama `examen`, migración que solo añade.
- `tools/curar-trampas.mjs` — clasificador determinista, **574 de 856 (67 %)**.
  Lo que no dispara una regla con evidencia clara se queda sin familia y no entra
  en el diagnóstico.
- `tools/serve.mjs`, `js/plan.js`, `js/trampas.js`, `tools/qa/qa-examen.mjs`,
  `tools/qa/qa-trampas.mjs`.
- Service Worker `cq-v18`.
- 55 pruebas unitarias · 12 scripts de integración.
- Carga inicial **118,0 KB gzip** sobre un tope de 300.

## [Retención V1] — 2026-07-27 · `cq-v17`

Documentación completa en [`docs/RETENTION_V1.md`](docs/RETENTION_V1.md).

### Nuevo

- **Tu Próxima Parada.** Al terminar una sesión, el juego deja preparada una
  sesión corta y concreta (3 recuerdos en frío + 5 de ruta + 1 cruce) y te dice
  cuántos minutos son. Solo puede haber una, no caduca y no penaliza.
- **Recordatorio por calendario.** Deep link `#/next-run` en un `.ics` que se
  añade a la agenda del propio jugador, a la hora que él elija. Sin push, sin
  notificaciones fingidas.
- **Descubrimiento progresivo.** Los cinco modos del mapa nacen cerrados y se
  abren por hitos reales. La condición se dice tal cual, con progreso incluido, y
  una vez abierto un modo no se vuelve a cerrar nunca.
- **ADN de los mundos.** Cada mundo declara qué tiene de distinto y lo anuncia en
  su franja de entrada: más señales, cruces jugables, tus averías del Taller,
  chequeo de confianza, Regla contra Trampa, contratos.
- **Contratos de ruta.** Tensión opcional antes de la misión. Cumplirlo paga
  25 🔩; fallarlo **no quita absolutamente nada**.
- **Chequeo de confianza.** "¿Vas seguro?" antes de revelar el resultado. Sin
  premio ni castigo: solo comenta cuando dice algo útil.
- **Regla contra Trampa.** Formato binario: dos tarjetas, una regla real y una
  trampa. 210 tarjetas curadas del banco ya verificado. El primer intento es el
  que cuenta; la pregunta de cuatro opciones posterior es corrección guiada y no
  borra el fallo. No se usa en boss ni en examen.
- **Retos por enlace.** Dos personas, el mismo enlace, exactamente el mismo
  recorrido, en tres formatos: 5 preguntas, 6 señales o 1 cruce. El enlace lleva
  versión, modo y semilla; nada más. Los retos no dan XP ni tocan el Predictor, y
  la revancha genera un recorrido nuevo en vez de reenviar el ya jugado.
- **Modo de prueba** en Perfil. Caja negra local para sesiones con personas:
  apagada por defecto, sin una sola llamada de red, con exportar y borrar. La
  exportación usa Web Share, descarga o portapapeles según lo que admita el
  navegador, y dice cuál de los tres ha funcionado.

### Arreglado

- `state.js`: `migrar()` mutaba la plantilla de estado inicial con
  `Object.assign(base, s)`, así que un estado guardado con `racha: null` acababa
  con `racha: {}` y la app se caía al leer `racha.dias`. Ahora se copia, se
  valida el tipo de cada rama y se reponen mapas y arrays dañados.
- `proxima.js`: la invariante "solo puede haber una parada pendiente" estaba en
  el comentario pero no en el código; una sesión nueva pisaba la parada que el
  jugador podía tener apuntada en el calendario. Ahora la respetan
  `prepararProxima()` y `guardarProxima()`.
- `aplicarADN()`: reservaba el hueco de Regla contra Trampa por posición y luego
  comprobaba si esa pregunta tenía tarjeta curada, así que el formato casi nunca
  aparecía. Ahora elige entre las preguntas que sí la tienen, y no repite una
  tarjeta recién vista.
- Los diálogos no gestionaban el foco: con teclado o VoiceOver se podía tabular
  "por detrás" del modal y quedarse sin salida. Ahora todos atrapan el foco, se
  cierran con Escape **por la opción neutra** y lo devuelven al salir.

### Interno

- Esquema de almacenamiento **v1 → v2** con migración no destructiva que deduce
  los desbloqueos del progreso existente, siempre a favor del jugador
  ([`docs/STORAGE_MIGRATIONS.md`](docs/STORAGE_MIGRATIONS.md)).
- Service Worker `cq-v17`: precachea también los módulos diferidos y el
  manifiesto de Regla contra Trampa, para que el juego esté completo sin red.
- `tools/test-retencion.mjs` — 35 pruebas unitarias en Node puro.
- `tools/qa/` — 10 scripts de integración con navegador y un runner (`npm run qa`).
- `package.json` con `serve`, `size:check`, `test`, `qa` y `check`. La aplicación
  **no** depende de nada de eso en tiempo de ejecución: sigue siendo JS puro sin
  build.
- `tools/serve.mjs` — servidor estático de desarrollo en Node, sin dependencias.
  El script `serve` llamaba a `python3 -m http.server`, que en Windows no existe:
  ninguno de los comandos del proyecto arrancaba allí. Ahora todos son `node`.
- `tools/size-check.mjs` — presupuesto de arranque con criterio de medida
  documentado ([`docs/SIZE_BUDGET.md`](docs/SIZE_BUDGET.md)). Actual: **109,6 KB
  gzip** sobre un tope de 300.
- `tools/curar-reglatrampa.mjs` — generador del manifiesto a partir del banco ya
  verificado, sin escribir texto normativo nuevo.
- Protocolo de prueba con personas en
  [`docs/RETENTION_HUMAN_TEST_PROTOCOL.md`](docs/RETENTION_HUMAN_TEST_PROTOCOL.md).

### Sin cambios, a propósito

Ni una moneda nueva, ni vidas, ni una segunda racha. Ninguna función de esta
entrega toca el contenido normativo, las respuestas correctas ni las
explicaciones verificadas, y ninguna puede mover el Predictor por otra vía que no
sea conocimiento real medido.
