# Formato de los datos del Modo de prueba

El Modo de prueba es una **caja negra local**: registra cómo se usa la app para
poder hacer sesiones de prueba con personas reales sin montar analítica remota.

## Garantías, primero

1. **No existe ni una sola llamada de red en `eventos.js`.** Ni `fetch`, ni
   `sendBeacon`, ni `XMLHttpRequest`, ni `WebSocket`, ni una imagen-baliza. Hay
   una prueba automática (`tools/test-retencion.mjs`) que lee el fichero fuente
   y falla si aparece cualquiera de esos patrones.
2. **Apagado por defecto.** `s.pruebas.activo` nace en `false`. Sin activarlo a
   mano en Perfil → Modo de prueba, `registrar()` sale en la primera línea.
3. **Nada se envía nunca solo.** El único camino de salida es que la persona
   pulse "Exportar prueba", que descarga un `.json` a su dispositivo.
4. **Vive aparte del progreso.** Clave `cq-pruebas` en `localStorage`, separada de
   `cq-estado`. Borrar los datos de prueba no toca la partida; exportar la
   partida no arrastra eventos.

## Qué NO se guarda, jamás

Lista negra aplicada **al escribir**, no al leer:

```
nombre · name · telefono · phone · email · correo · texto · text ·
pregunta · enunciado · respuesta · opciones · contacto · ip · ua ·
userAgent · device · huella · adId
```

Además, `limpiarMetadata()` solo deja pasar:

- números,
- booleanos,
- strings de **40 caracteres o menos** (ids y slugs, no frases).

Cualquier otra cosa se descarta en silencio.

**El `questionId` sí se registra.** Es un identificador interno del banco
(`M04-017`). No identifica a ninguna persona y sin él la prueba no serviría de
nada: no se podría saber qué contenido cuesta.

## Estructura de un evento

```json
{
  "eventId": "e-m8x2k1-3f7a9b2c",
  "eventType": "ruletrap_first_attempt",
  "timestamp": "2026-07-27T18:42:11.204Z",
  "sessionId": "s-m8x2jz-1a2b3c4d",
  "appVersion": "cq-v17",
  "route": "mision",
  "worldId": 4,
  "missionId": 0,
  "modeId": "mision",
  "questionId": "M04-017",
  "questionFormat": "regla-trampa",
  "correct": false,
  "responseTimeMs": 4820,
  "metadata": { "id": "precision" }
}
```

Los campos `undefined` se eliminan antes de guardar, así que un evento real suele
traer solo cuatro o cinco.

| Campo | Tipo | Qué es |
|---|---|---|
| `eventId` | string | id único del evento (tiempo + 4 bytes aleatorios) |
| `eventType` | string | ver tabla de abajo |
| `timestamp` | ISO 8601 | momento del evento |
| `sessionId` | string | agrupa los eventos de una misma apertura de la app |
| `appVersion` | string | versión del build (`cq-v17`) |
| `route` | string | pantalla activa |
| `worldId` | number | mundo |
| `missionId` | number | índice de misión dentro del mundo |
| `modeId` | string | modo de juego (`mision`, `boss`, `rush`, `reto`…) |
| `questionId` | string | id interno de pregunta |
| `questionFormat` | string | `normal`, `cruce`, `regla-trampa`, `confianza` |
| `correct` | boolean | si la respuesta fue correcta |
| `responseTimeMs` | number | milisegundos hasta responder |
| `metadata` | object | extras filtrados (ver arriba) |

## Tipos de evento

| `eventType` | Cuándo |
|---|---|
| `app_open` | arranque de la app |
| `session_start` | al encender el Modo de prueba |
| `app_background` / `app_foreground` | la app pasa a segundo plano y vuelve |
| `mode_open` | se abre un modo desde el mapa |
| `mode_unlocked` | un modo se desbloquea por hito |
| `next_session_created` | se prepara una Próxima Parada |
| `cold_start_started` / `cold_start_completed` | se juega y se termina una Próxima Parada |
| `calendar_offered` / `calendar_delivered` | se ofrece y se entrega el `.ics` |
| `confidence_prompted` / `confidence_answered` | chequeo de confianza |
| `ruletrap_shown` | se pinta una tarjeta doble |
| `ruletrap_first_attempt` | el intento que **sí** cuenta |
| `ruletrap_correction_shown` | aparece la corrección guiada |
| `contract_offered` / `contract_accepted` | contrato de ruta |
| `contract_completed` / `contract_failed` | resultado del contrato |
| `challenge_created` / `challenge_opened` | reto creado o abierto por enlace |
| `challenge_started` / `challenge_finished` | reto jugado |
| `challenge_shared` | se comparte el enlace (`metadata.via`) |
| `challenge_link_invalid` | enlace roto (`metadata.causa`) |

## Formato de exportación

```json
{
  "formato": 1,
  "exportadoEn": "2026-07-27T18:50:00.000Z",
  "appVersion": "cq-v17",
  "sesiones": [
    { "sessionId": "s-…", "primerEvento": "…", "ultimoEvento": "…", "eventos": 47 }
  ],
  "eventos": [ /* … */ ]
}
```

Las sesiones se **derivan** de los propios eventos: no hay un registro de sesión
aparte que pudiera guardar algo más.

## Límites

- **2000 eventos** como máximo, en buffer circular: al llegar al tope se tiran
  los más antiguos. Nunca crece sin control ni llena el almacenamiento.
- El volcado a `localStorage` va con *debounce* de 250 ms.
- Si el almacenamiento está lleno, se pierde el registro — **nunca la partida**.

## Cómo se usa en una sesión de prueba

1. La persona (o quien conduce la prueba, delante de ella) enciende Perfil →
   Modo de prueba.
2. Se juega con normalidad.
3. Al terminar, "Exportar prueba" descarga el `.json`.
4. La persona decide si lo comparte. Si no quiere, "Borrar datos de prueba" lo
   elimina y su progreso sigue intacto.

Se le enseña esta pantalla antes de empezar: *"Registra tiempos y eventos de uso
únicamente en este dispositivo. No guarda nombres, mensajes ni textos de
respuesta. Nada se envía automáticamente."*
