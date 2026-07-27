# Protocolo de prueba con personas — Retención V1

Sirve para saber si la capa de retención **funciona de verdad** o solo funciona
en las pruebas automáticas. Lo segundo ya está comprobado; lo primero solo lo
pueden decir personas.

Duración: 25–35 minutos por persona. Mínimo recomendado: **5 personas**, y al
menos una que se esté sacando el carnet de verdad ahora mismo.

---

## Antes de empezar

**Preparación (5 min, sin la persona delante):**

1. Un móvil con la app instalada como PWA, o Safari/Chrome con la URL abierta.
2. Progreso **borrado** (Perfil → Borrar todo) salvo en el escenario H2.
3. Perfil → **Modo de prueba** encendido.
4. Cronómetro aparte. No mires el teléfono de la persona mientras juega.

**Lo que se le dice, literalmente:**

> "Esto es un juego para sacarse el teórico. Quiero ver cómo lo usarías tú, no si
> lo haces bien. No hay respuestas correctas sobre la app: si algo te confunde, es
> culpa nuestra. Piensa en voz alta si puedes. Puedes parar cuando quieras."

**Lo que hay que decir sobre el registro, antes de tocar nada:**

> "El móvil está guardando tiempos y qué pantallas tocas, solo aquí, en este
> aparato. No guarda tu nombre, ni lo que digas, ni el texto de nada. No se envía
> a ningún sitio. Al terminar te enseño el archivo y decides tú si me lo quedo o
> lo borramos."

Si dice que no: se apaga el Modo de prueba y se hace la sesión tomando notas a
mano. La sesión sigue valiendo.

**Lo que NO se hace:** ayudar, explicar un botón antes de que lo busque, decir
"eso está ahí abajo". Si se atasca 60 segundos, se anota y **entonces** se ayuda.

---

## H1 · Primer contacto (persona nueva) — 10 min

**Objetivo:** ¿el juego se explica solo y engancha antes de pedir nada?

1. Se le da el móvil en la pantalla de arranque. Cronómetro en marcha.
2. Se le deja hasta que termine dos misiones o hasta los 10 minutos.

**Qué medir:**

| Medida | Cómo |
|---|---|
| Segundos hasta el primer toque | cronómetro |
| Segundos hasta la primera pregunta respondida | cronómetro |
| ¿Ha dicho en algún momento "otra"? | sí / no + minuto |
| ¿Ha mirado la tarjeta de Próxima Parada al terminar? | observación |
| Modos que ha intentado abrir estando cerrados | observación |

**Preguntas al terminar (no antes):**

- "Sin mirar: ¿qué hace este juego?"
- "¿Qué te ha parecido que había que hacer al principio?"
- "¿Has visto algo que no pudieras tocar? ¿Qué te pareció?"
- "¿Volverías mañana? ¿Por qué?"

**Señales de alarma:** más de 3 segundos hasta el primer toque · dice "una app de
tests" · no menciona nunca los cruces · le molesta que haya modos cerrados en vez
de darle curiosidad.

---

## H2 · La vuelta al día siguiente — 8 min

**Objetivo:** ¿la Próxima Parada cumple lo que promete?

**Preparación:** hay que simular el día siguiente. Con el móvil en la mano de
quien conduce la prueba, y **antes** de dársela:

1. Que la persona termine una sesión y guarde su parada (H1 sirve).
2. Cerrar la app.
3. En la consola del navegador (o con el móvil conectado), poner
   `readyLocalDate` en una fecha pasada — el script `qa-proxima.mjs` hace
   exactamente esto y sirve de guía.
4. Devolver el móvil: "Imagina que es mañana y abres la app."

**Qué medir:**

- ¿Encuentra sola la tarjeta "Tu próxima parada está lista"? Segundos hasta
  pulsarla.
- ¿Entiende qué es el "ARRANQUE EN FRÍO" cuando aparece el rótulo?
- ¿Le parece bien la duración anunciada ("4 min") comparada con lo que tarda de
  verdad? Anotar los dos números.

**Preguntas:**

- "¿Qué esperabas que fuera esto?"
- "¿Te ha parecido corto, largo o justo?"
- "¿Te habrías puesto un recordatorio en el calendario? ¿Por qué sí o por qué no?"

**Señal de alarma:** no ve la tarjeta · cree que es un castigo por no haber
jugado · la duración anunciada se queda corta más de un 50 %.

---

## H3 · Formatos nuevos — 8 min

**Objetivo:** ¿Regla contra Trampa y el chequeo de confianza se entienden sin
explicación, y son justos?

**Preparación:** estado con el Pase activo y los bosses de los mundos 1–4
superados, para poder entrar en los Mundos 3, 4 y 5 (ver `qa-adn.mjs`).

1. "Entra en Señalópolis Sur y haz la primera misión."
2. Observar sin intervenir cuando aparezcan la tarjeta doble y el "¿Vas seguro?".

**Qué medir:**

| Momento | Qué observar |
|---|---|
| Franja de ADN al entrar al mundo | ¿la lee? ¿la ignora? |
| Primera tarjeta doble | segundos de duda, si busca las cuatro opciones |
| Tras fallar la tarjeta doble | ¿entiende que ya ha contado? |
| Corrección guiada | ¿cree que le están dando otra oportunidad? |
| "¿Vas seguro?" | ¿duda al elegir? ¿toca siempre "Seguro"? |

**Preguntas:**

- "Cuando salieron las dos tarjetas, ¿qué te pidieron que hicieras?"
- "Después salió la pregunta entera. ¿Para qué crees que era?"
- **La que más importa:** *"¿El fallo de las dos tarjetas te contó o no?"* — la
  respuesta correcta es **sí**, y si la persona cree que no, el copy está mal y
  hay que arreglarlo.
- "¿Te molestó que te preguntara si ibas seguro?"

**Señal de alarma:** cree que la corrección guiada borra el fallo · siente el
"¿Vas seguro?" como un examen dentro del examen · elige "Seguro" siempre para
quitárselo de encima.

---

## H4 · Contrato de ruta — 4 min

**Objetivo:** ¿se entiende que fallarlo no cuesta nada?

1. Entrar en Autopista Límite (Mundo 5), misión 1.
2. Cuando salga el contrato, **no decir nada**.

**Preguntas antes de que elija:**

- "¿Qué pasa si lo aceptas y no lo cumples?" — la respuesta correcta es **nada**.

**Preguntas después:**

- "¿Perdiste algo por no cumplirlo?"
- "¿Volverías a aceptar uno?"

**Señal de alarma:** cree que fallarlo quita estrellas o chapas · le da miedo
aceptarlo · el copy de fallo le suena a regañina.

---

## H5 · Reto por enlace — 5 min

**Objetivo:** ¿es una cosa que compartiría de verdad?

1. "Crea un reto para alguien." — saldrá un selector con tres tipos (5 preguntas,
   6 señales, 1 cruce). **No le digas cuál elegir**: cuál escoge sin ayuda es un
   dato en sí mismo.
2. Que lo comparta consigo mismo (a sus notas, o al chat que quiera).
3. Abrir el enlace en **otro** móvil o en una ventana privada, y jugarlo delante
   de ella.
4. Al terminar, pulsar "Responder con revancha" y comprobar con ella que el
   recorrido nuevo **no** es el que acaba de jugar.

**Qué medir:**

- ¿Se da cuenta de que el otro móvil recibe **exactamente** las mismas preguntas?
- ¿A quién dice que se lo mandaría? Anotar la persona concreta, no "a un amigo".
- ¿Qué tipo de reto eligió y por qué?

**Preguntas:**

- "¿Se lo mandarías a alguien de verdad? ¿A quién?"
- "¿Qué pasa con tu progreso al jugar un reto?" — la respuesta correcta es
  **nada**, y está escrito en pantalla.
- "¿Qué crees que sabe de ti la persona que abre tu enlace?" — la respuesta
  correcta es **nada**.

**Señal de alarma:** cree que el enlace lleva su nombre o su puntuación · no ve
para qué sirve · dice que lo mandaría "a un grupo" sin nombrar a nadie (eso suele
significar que no lo mandaría).

---

## Al terminar la sesión

1. Perfil → Modo de prueba → **Exportar prueba**. El aviso dirá si se ha
   compartido, descargado o copiado — es lo que ha pasado de verdad. Enseñarle el
   archivo abierto.
2. "Esto es todo lo que se ha guardado. ¿Te parece bien que me lo quede?"
3. Si dice que no: **Borrar datos de prueba** delante de ella.
4. Pregunta final, siempre la misma: **"¿Se lo recomendarías a alguien que se
   esté sacando el carnet? ¿Con qué frase?"** — la frase que use es más útil que
   cualquier métrica.

---

## Qué se hace con los resultados

**Regla de corte:** si 2 de 5 personas fallan el mismo punto, es un problema del
producto, no de la persona. Se arregla antes de la siguiente tanda.

**Los tres que bloquean el lanzamiento** (si fallan, no se vende):

1. Alguien cree que la corrección guiada de Regla contra Trampa borra el fallo.
   Eso rompe la honestidad pedagógica, que es lo que justifica los 49,99 €.
2. Alguien cree que fallar un contrato le quita algo.
3. Alguien cree que su enlace de reto lleva datos suyos.

**Los que se anotan pero no bloquean:** que no encuentre la Próxima Parada, que
los modos cerrados le frustren, que la duración anunciada no cuadre.

## Lo que estas pruebas NO responden

- **Retención real a 7 días.** Eso pide un seguimiento largo, no una sesión de 30
  minutos. Lo único que se puede medir aquí es la *intención* declarada, que
  miente.
- **Si el Predictor está calibrado.** Eso solo lo dirá gente que se examine de
  verdad. Hasta entonces, el Predictor se enseña con su aviso y punto.
- **Conversión al Pase.** El paywall no se toca en estas sesiones: meterlo
  contamina todo lo demás.
