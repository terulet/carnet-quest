# Plan de examen y Familias de trampa

Dos funciones que cambian qué es Carnet Quest: de "un juego con el que además
apruebas" a "un plan con fecha de caducidad que además se juega".

---

## 1 · El plan de examen

`js/plan.js` · esquema de estado **v3**

En el onboarding —después de haber jugado un cruce, nunca antes— el juego
pregunta cuándo te examinas. Con esa fecha, la cabecera del mapa deja de decir
"racha 4" y pasa a decir:

> **Faltan 11 días** · vas al 75 %
> Hoy toca: 40 preguntas nuevas · 6 del Taller · 1 simulacro

### Las dos reglas que no se tocan

**1. La fecha NO mueve el Predictor.** Ni un punto. Poner fecha, cambiarla o
quitarla no cambia lo que sabes, y el Predictor solo mide lo que sabes. Hay una
prueba unitaria y otra de integración que comparan el porcentaje con fecha
inminente, con fecha lejana y sin fecha: los tres son idénticos.

Lo que la fecha cambia es **qué se te sugiere hacer**, no lo que se te dice que
vales.

**2. Ir retrasado no se castiga.** Se dice. Si el ritmo necesario no es
realista, el juego lo dice en voz alta:

> Con los días que quedan tendrías que ver 428 preguntas nuevas al día. Eso no es
> realista: céntrate en dominar lo que ya has visto y en los simulacros.

Es la misma honestidad de §8.5 aplicada al calendario. Y **no bloquea nada**: el
mapa entero sigue accesible, no se resta XP, no se toca la racha.

### El cálculo

```js
diasUtiles   = max(1, dias)
quedan       = totalBanco - vistas          // sobre los 15 mundos, no los desbloqueados
nuevasPorDia = ceil(quedan / diasUtiles)
ritmo        = ≤40 cómodo · ≤80 apretado · >80 imposible
```

**El plan se calcula sobre el banco COMPLETO**, no sobre los mundos que el
jugador tenga desbloqueados. El examen de la DGT entra entero: decirle "vas
cómodo" contando solo el Mundo 1 sería mentirle. Es el mismo criterio que ya
usaba el Predictor para la cobertura.

Lo que *pide hoy* nunca pasa de 80 preguntas aunque la cuenta salga a 428: un
plan que no cabe en un día no es un plan.

### Cuando la fecha pasa

Se pregunta una vez, sin insistir: **¿aprobaste, suspendiste, lo aplazaste?**
Anotarlo no da XP ni toca el historial — es información, no puntuación. Y es lo
único que puede decir algún día si el Predictor está bien calibrado, que es el
KPI de §15.

"Lo aplacé" limpia la fecha y no toca nada más.

### El paywall

Con fecha puesta, el muro de pago añade una línea:

> Te examinas en 11 días. Los 12 mundos que faltan son justo los que aún no has visto.

**La urgencia aquí es real y la puso el jugador.** No es una cuenta atrás
inventada ni una oferta que caduca: es su examen. Por eso se puede enseñar sin
que sea un dark pattern.

### Detalles de interfaz

- La banda va **pegajosa** arriba del mapa. El mapa arranca abajo (el primer
  mundo a la vista), así que una banda estática no se vería nunca.
- Cerca del examen se marca en amarillo de obras, no en rojo: es información, no
  alarma.
- Poner fecha es saltable ("Todavía no lo sé"), y se puede quitar desde Perfil
  en cualquier momento.

---

## 2 · Familias de trampa

`js/trampas.js` (diferido) · `datos/trampas.json` · `tools/curar-trampas.mjs`

El banco tiene **856 campos `trampa`** escritos a mano explicando por qué tienta
la opción incorrecta. Hasta ahora se leían una vez, al fallar. Clasificados por
**mecanismo**, permiten dos cosas que no hace ninguna app de tests.

### Por qué mecanismo y no tema

El banco ya trae 506 `tags` de tema — velocidad, alcohol, glorieta. No sirven
para esto: saber que fallas en glorietas no te enseña nada que no supieras. Lo
que enseña es *cómo* te la cuelan.

Las 12 familias:

| Familia | Mecanismo |
|---|---|
| Los absolutos | "siempre / nunca" suena categórico y por eso es falso |
| La excepción escondida | sabes la regla, te pillan en el "salvo…" |
| Los números cruzados | una cifra correcta… de otra situación |
| Poder no es deber | permitido contra obligatorio |
| Depende de la vía | urbana / interurbana cambian la respuesta |
| Depende del vehículo | ciclomotor, camión, novel tienen sus reglas |
| Prioridad al revés | quién cede, invertido |
| Parece de sentido común | lo razonable no siempre es lo legal |
| Se parecen demasiado | señales y marcas casi gemelas |
| El orden importa | los pasos correctos, cambiados de orden |
| Se cumple a medias | una condición de las que hacen falta |
| Dos palabras parecidas | calzada / arcén, parada / estacionamiento |

### Cobertura: 574 de 856 (67 %)

El curador aplica reglas ordenadas de más específica a más general, y asigna
**una sola familia** por pregunta. Lo que no dispara ninguna regla con evidencia
clara **se queda sin familia**. No se fuerza.

Ese 67 % es el techo honesto de lo que consiguen reglas deterministas sobre
prosa escrita a mano. Subirlo más exigiría aflojar las reglas, y una pregunta mal
etiquetada envenena el diagnóstico entero — que es justo lo que se vende.

**El tercio restante no entra en el cálculo, y la app lo dice** en la propia
pantalla: *"Solo cuentan los fallos de preguntas con familia identificada: 574 de
las 856 del banco."*

### Tu talón de Aquiles

En Perfil, debajo del Predictor:

> **TU TALÓN DE AQUILES**
> El 41 % de tus fallos son de la misma familia: Los absolutos.
> *Cuando una opción dice "siempre", "nunca" o "en todos los casos", desconfía.*

Con dos salvaguardas:

- **Mínimo 8 fallos clasificados.** Con menos, cualquier porcentaje es ruido y no
  se dice nada.
- **El talón solo se nombra si de verdad destaca** (≥25 % y ≥4 fallos). Si el
  reparto es plano, se dice eso: *"Tus fallos están repartidos. No tienes un punto
  débil claro, que es una buena noticia."* Inventarse un patrón donde no lo hay
  sería exactamente el tipo de mentira que el proyecto no se permite.

Las averías vivas del Taller pesan más que un fallo suelto del historial: son
fallos que además siguen sin arreglarse.

### Caza-trampas

Un modo nuevo en el mapa. Se abre con 5 fallos acumulados.

Te enseña la pregunta **con la respuesta correcta ya marcada**, y tienes que
acertar **por dónde te la habrían colado**: tres familias, una es la real. Al
responder se revela la `trampa` escrita a mano más el consejo de esa familia.

Aprendes el patrón, no la respuesta.

**Caza-trampas NO toca el Predictor, ni el Leitner, ni el Taller, ni da XP.** No
mide conocimiento de normativa: mide lectura de exámenes. Meterlo en el Predictor
lo inflaría con algo que no es lo que te van a preguntar el día D. Cuatro
comprobaciones de integración lo verifican comparando el estado antes y después.

La baraja prioriza lo que has fallado: **los fallados entran siempre**, y el
resto se rellena con lo ya visto. (La primera versión barajaba los mejores
candidatos y cortaba, lo que destruía la prioridad que el nombre promete: un
fallo suelto entraba una de cada tres veces.)

---

## Peso

| | gzip |
|---|---|
| Antes | 109,6 KB |
| Después | 118,0 KB |
| Tope | 300 KB |

`js/plan.js` entra en el arranque (2 KB): la banda del mapa lo necesita en la
primera pantalla. `js/trampas.js` y `datos/trampas.json` son **diferidos** (2,2 +
3,6 KB): solo se descargan al abrir la radiografía o Caza-trampas.

## Limitaciones reales

1. **La cobertura del 67 %** deja 282 preguntas fuera del diagnóstico. Subirla
   pide una pasada humana leyendo las trampas, no más expresiones regulares.
2. **La clasificación no está auditada entera por un humano.** Revisando una
   muestra de 10 al azar, 8 estaban bien y 2 eran discutibles. Esa muestra ya
   sirvió para quitar una regla demasiado suelta —etiquetaba como "se parecen
   demasiado" cualquier pregunta con señal asociada—, pero **nadie ha revisado
   las 574 asignaciones**. Una pasada humana antes de vender sería prudente.
3. **El plan reparte el temario a partes iguales.** No tiene en cuenta que unos
   mundos cuestan más que otros ni la velocidad real del jugador.
4. **La sugerencia "hoy toca" no se comprueba contra lo que realmente hace.** Si
   hace 40 preguntas de otro mundo, el plan no se entera ni se queja — a
   propósito, pero significa que el número es orientativo.
5. **Nada de esto está probado con personas.** El protocolo de
   `RETENTION_HUMAN_TEST_PROTOCOL.md` necesita dos escenarios nuevos.
