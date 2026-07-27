# Changelog

Formato: lo que cambia para el jugador primero; lo interno, después.

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
  recorrido. El enlace lleva versión, modo y semilla; nada más. Los retos no dan
  XP ni tocan el Predictor.
- **Modo de prueba** en Perfil. Caja negra local para sesiones con personas:
  apagada por defecto, sin una sola llamada de red, con exportar y borrar.

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
  aparecía. Ahora elige entre las preguntas que sí la tienen.

### Interno

- Esquema de almacenamiento **v1 → v2** con migración no destructiva que deduce
  los desbloqueos del progreso existente, siempre a favor del jugador
  ([`docs/STORAGE_MIGRATIONS.md`](docs/STORAGE_MIGRATIONS.md)).
- Service Worker `cq-v17`: precachea también los módulos diferidos y el
  manifiesto de Regla contra Trampa, para que el juego esté completo sin red.
- `tools/test-retencion.mjs` — 30 pruebas unitarias en Node puro.
- `tools/size-check.mjs` — presupuesto de arranque con criterio de medida
  documentado ([`docs/SIZE_BUDGET.md`](docs/SIZE_BUDGET.md)). Actual: **106,5 KB
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
