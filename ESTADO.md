# 📋 ESTADO — CARNET QUEST

> Última actualización: 2026-07-27 · Sesión 5

## 🚨 AVISO NORMATIVO PRIORITARIO — RD 518/2026

**Real Decreto 518/2026, de 24 de junio** (BOE núm. 155, 26-06-2026): la mayor reforma del
RGCir en 20 años, "en materia de protección a usuarios vulnerables de la vía". **Publicado
pero AÚN NO VIGENTE: entra en vigor el 1-oct-2026.** Rediseña los arts. 64 y 65 y añade un
Título VI de circulación urbana.

- Impacto en los cruces: **ninguno**. El art. 64 conserva íntegras sus letras a/b/c (incluida
  la del grupo de ciclistas que usa C-011) y el art. 65 se refuerza en la misma dirección que
  C-007. Ningún orden de paso cambia el 1-oct-2026.
- **Acción pendiente del dueño (decisión de producto):** revisar el banco de 856 preguntas
  contra el RD 518/2026 antes del 1-oct-2026 y averiguar desde qué fecha examina la DGT con
  el texto nuevo. `[VERIFICAR DGT 2026]`

## F9 · ¿QUIÉN PASA PRIMERO? — el juego deja de ser un test (2026-07-26)

Mini-juego de cruces jugables: un cruce dibujado a vista de pájaro, tocas los vehículos en su
orden de paso y **los ves cruzar**. Es la respuesta al "no solo pregunta tras pregunta".

- `js/cruce.js` — motor SVG procedural: calzadas y carriles, señales (STOP / ceda / rombo de
  prioridad), semáforos con estados, pasos de peatones, raíles de tranvía, firme sin
  pavimentar, agente con brazo que autoriza, pelotón de ciclistas y vehículo prioritario con
  luces. Animación por bézier cuadrática con rumbo tangente, solo `transform` (60 fps).
- `datos/cruces.json` — **20 puzzles** con explicación, truco, trampa y (dificultad ≥4)
  explicación larga. Incluye **4 glorietas** (C-017…C-020) con anillo, isleta, dientes de ceda
  el paso pintados y vehículos que ya circulan dentro (`dentro: <grados>`).
- Se juegan **como una pregunta más**: mismo id, mismo Leitner, mismo Taller de Errores (un
  cruce fallado es un coche averiado que se repara volviendo a resolverlo) y mismo combo/XP.
  **Nunca** entran en la DGT Tower ni en la contrarreloj (allí manda el formato real).
- Dos vías de entrada: **tanda dedicada** desde el mapa (6 puzzles) y **cruces incrustados**
  a mitad de misión, anunciados en la barra de progreso en magenta para crear anticipación.
- Se abre desde el minuto uno: solo respeta el Pase, no la progresión de mundos.

### Verificación normativa adversarial de los 16 cruces ✅
Un revisor independiente recalculó las 40 maniobras y todas las relaciones de prioridad par a
par, con contraste web de la normativa. Resultado: **los 16 órdenes son correctos y de solución
única** (sin empates a tres ni ciclos). Se aplicaron 12 correcciones de texto/datos:
jerarquía completa de señalización en C-010 (faltaba el balizamiento circunstancial), C-007
reanclado en el art. 65 (citaba un semáforo peatonal inexistente en los datos), C-005 (los
raíles no son "la primera" excepción del art. 57), matiz del art. 68 en C-006/C-014 (con solo
luz azul el prioritario conserva la prioridad), C-008 anclado en el art. 78, señalización
coherente en los cuatro brazos (C-002/003/013/015), terminología oficial "amarillo
intermitente", C-015 movido al mundo 6, y explicación larga en los cuatro puzzles de
dificultad 4. **C-014 se rediseñó** porque clonaba la geometría de C-001.

### Marcas `[VERIFICAR DGT 2026]` nuevas (numeración de artículos, no las reglas)
El proxy bloquea boe.es/dgt.es y WebFetch devuelve 403, así que estas van con dos fuentes
secundarias concordantes pero sin lectura del consolidado: letras exactas del art. 57
(pavimentada = a, raíles = b), numeración del amarillo intermitente tras el RD 465/2025, y
literalidad del art. 133. Las **reglas** están confirmadas; lo dudoso es la cita.

### Verificación normativa adversarial de las 4 glorietas ✅
Segundo revisor independiente, esta vez derivando la geometría del anillo a mano contra el
renderizador. Hallazgo clave del modelo: con la circulación antihoraria, **un vehículo del
anillo se encuentra siempre antes la SALIDA de un ramal que su ENTRADA**, así que quien sale
por el ramal X nunca pisa el punto por el que se entra a X.

- **GRAVE, corregido — C-018 tenía dos soluciones defendibles.** B salía por el este y por
  tanto no llegaba a cruzar nunca la entrada de C: nada obligaba a C a esperar, y `["C","B","A"]`
  era tan defendible como `["B","A","C"]`. Peor aún, el juego pinta la trayectoria completa de
  cada vehículo, así que el jugador *veía* que B no molestaba a C: el que razonaba bien fallaba.
  Arreglado sacando a B por el norte, con lo que cruza las dos entradas y el orden queda forzado.
- C-019: el truco decía "dentro mandas; al salir, no", falso por exceso — al salir sigues siendo
  preferente frente a los coches de las entradas; quien te gana es el peatón. Reescrito.
- C-018: la explicación larga decía que dentro no te detienes nunca, contradiciendo a C-019 en
  el mismo mundo. Corregido, y subido a dificultad 4 (el esquema §8.3 exige larga desde 4).
- C-017: aclarado que la preferencia del anillo **no la da el ceda el paso**, la da la norma.
- C-020: añadida la cita del art. 64 y el matiz de que su valor real es que también son
  preferentes los del grupo que aún NO han entrado.
- Dibujo: el pelotón se trazaba en línea recta sobre el anillo y el tercer ciclista acababa
  fuera de la calzada anular. Ahora la fila sigue la curva.

**Acción pendiente para octubre:** el RD 518/2026 rediseña los arts. 64 y 65, que son
justamente los de C-019 y C-020. Verificado que ambos sobreviven (el art. 64 conserva el
literal "o haya entrado en una glorieta" y el 65 amplía la protección al peatón), pero hay
que releer la letra exacta a partir del 1-oct-2026. `[VERIFICAR DGT 2026-10]`

### Glorietas ✅ (C-017…C-020)
El motor traza dos geometrías con la misma tubería: cruce/T por bézier entre carriles y
glorieta por recta de entrada → arco por el anillo → recta de salida. Todo acaba en una
polilínea, así que dibujo, flecha de intención y animación comparten geometría exacta.
La maniobra se enuncia como en la calle ("toma la segunda salida").

### Pendiente para v1.2 de cruces
Incorporación desde vía de servicio o propiedad colindante (art. 72), acceso a
autopista/autovía (art. 57.d), peatón sin semáforo y glorieta de dos carriles.

## F10 · DOBLE O NADA — el motor del "una más" (2026-07-26)

Escalera de bote: cada acierto engorda el bote (10 → 25 → 45 → 75 → 120 → 180 → 260 → 380
→ 550 → 800 XP) y después de cada uno eliges **SEGUIR** o **PLANTARTE**. Un fallo se lleva el
bote entero, enseña la trampa y manda la pregunta al Taller.

- **Sin dark patterns por diseño**: solo se arriesga el bote que estás construyendo. Es
  imposible acabar con menos XP de la que tenías al empezar, y no se apuesta nada que el
  jugador ya poseyera. No intervienen Chapas ni dinero real (§6, §12).
- Dificultad creciente por escalón (1→5) y dos cruces de "¿Quién pasa primero?" intercalados
  en los escalones 5 y 9: el bote también se juega con las manos.
- Los dos botones tienen el mismo peso visual: seguir no se presenta como la opción "buena".
- Récord de mejor bote cobrado en el mapa.

## F11 · SEÑAL RUSH — el Álbum se convierte en reflejos (2026-07-26)

60 segundos clasificando señales por familia: peligro, prioridad, prohibición, obligación, fin
de prohibición e indicación. Seis botones fijos en rejilla 2×3, en zona de pulgar, con el color
de su familia. Convierte el tema más denso del examen en un juego de reacción.

- **Andamiaje que se retira solo:** cada botón lleva su pista de forma ("triángulo blanco con
  borde rojo"). Al encadenar 5 aciertos las pistas se desvanecen; si rompes el combo, vuelven.
  La caja del botón no cambia de tamaño, así que el layout nunca salta.
- Fallar **cuesta 3 segundos, no puntos**: mantiene el ritmo, castiga sin frustrar, y marca cuál
  era la familia correcta antes de seguir.
- Récord semanal + tarjeta compartible (motor viral del §7/§15).
- **No toca el SRS ni el predictor a propósito**: clasificar por familia no es responder una
  pregunta del banco, y contaminar el predictor con esto lo inflaría. Tampoco colecciona señales
  del Álbum: eso se sigue ganando acertando preguntas de verdad (§8.5, honestidad del predictor).

## F12 · EL GARAJE — las Chapas dejan de ser una moneda muerta (2026-07-26)

**Agujero encontrado en auditoría:** las Chapas se ganaban por cinco vías (diarias, cofres,
SE BUSCA, categorías del Álbum, combos) y **no se gastaban en absolutamente nada**. El HUD las
mostraba, el jugador las acumulaba y no servían para nada. Peor: el paywall de 49,99 € vendía
literalmente "Cosméticos exclusivos para tu coche" y **no existía ni un cosmético en el juego**.
Eso era vender algo que no se entrega.

Cerrado construyendo el Garaje, no recortando la promesa.

- `datos/garaje.json` — 15 artículos en tres familias: **8 coches** (turismo, furgoneta, moto,
  autobús, patrulla, tranvía…), **4 temas** de acento y **3 celebraciones** de confeti.
- Todo es **solo pintura y se dice en la propia pantalla**: "nada de esto te hace acertar más".
  Ni las Chapas ni el dinero real compran progreso ni respuestas (§6).
- Lo comprado **se aplica de verdad**: el coche que avanza por la N-CQ es el que llevas puesto
  (SVG del motor de cruces, no un emoji), el tema repinta el acento de toda la app vía
  `--acento`, y la celebración cambia lo que cae en el confeti.
- Los rojos, verdes y azules de señal **nunca** cambian con el tema: son semánticos.
- 4 artículos marcados `pase` son los "exclusivos" que promete el paywall: se compran con
  Chapas igual, pero requieren el Pase. Ahora esa línea del paywall es verdad.
- Entradas: el chip de Chapas del HUD (tocable) y una tarjeta en el Perfil.
- Precios 60–320 🔩 contra ~100 🔩/día jugando: algo nuevo cada uno a tres días.

## F13 · JUGAR PRIMERO — el arranque deja de ser un muro de texto (2026-07-26)

**Incumplíamos nuestro propio pilar §4.1** ("JUGAR PRIMERO. Nunca un muro de texto antes de una
pregunta"): lo primero que veía alguien al abrir la app era un título, tres reglas explicadas y
un botón. Veinte segundos leyendo justo en los veinte segundos en los que Marta decide si sigue.

Ahora, al abrir por primera vez, **lo primero que hay en pantalla es un cruce jugable** (C-001,
"Sin una señal a la vista"). Sin HUD, sin barra de navegación, sin explicaciones. Solo el cruce,
las tres filas de vehículos y un "Saltar" discreto arriba para quien no quiera (cero dark
patterns: nadie queda secuestrado).

- Medido con Playwright: **primer elemento jugable en pantalla a los ~1,0 s** de abrir.
- Las tres reglas se cuentan **después**, y el titular se adapta a lo que acaba de pasar:
  - Acertó → "LIMPIO. Y eso era una pregunta de examen."
  - Falló → "Te la han colado. Así, exactamente así, es como te la cuelan en el examen."
  Y la regla 2 ("fallar mola: cada fallo te enseña la trampa") aterriza porque acaba de vivirlo.
- El cruce del tutorial **cuenta de verdad**: entra en el Leitner y, si falla, en el Taller. No
  es una demo de mentira.
- Los 11 scripts de QA se actualizaron para atravesar el arranque nuevo.

## Fase actual: F0–F13 hechas salvo el Payment Link de Stripe (lo aporta el dueño)

**EL JUEGO ESTÁ COMPLETO, JUGABLE, VERIFICADO Y CON LANDING DE VENTA.** Los 15 mundos
tienen banco, los **15 bancos han pasado verificación normativa adversarial** con búsqueda web,
el flujo completo (misión → sello → estrellas → cofre → predictor → paywall) está probado con
Playwright sin un solo error de consola, y hay landing con demo jugable incrustada + página de
éxito de Stripe. Abre `carnet-quest/` servido por HTTP o publica la rama en Pages.

- `landing.html` — página de marketing "Señal Neón" con el juego incrustado (demo jugable real).
- `exito.html` — destino de la redirección de Stripe; entrega y explica el código de desbloqueo.
- `tools/VENTA.md` — guía para el dueño: crear el Payment Link, generar códigos, activar la venta.
- **Lo único que falta (del lado del negocio):** pegar el Payment Link real en `STRIPE_URL`
  (`js/screens.js`). Todo lo demás de la venta ya funciona.

## Banco de preguntas (F7) — 856 preguntas · 15/15 mundos · 15/15 verificados ✓

| Mundo | Preguntas | Verificación normativa |
|-------|-----------|------------------------|
| 1 Villa Asfalto | 60 | ✅ (4 correcciones + propagación S-28) |
| 2 Señalópolis Norte | 58 | ✅ (2: semáforo de ciclo RD 465/2025) |
| 3 Señalópolis Centro | 58 | ✅ (1: senalId R-106→R-107) |
| 4 Señalópolis Sur | 58 | ✅ (1: naming S-28) |
| 5 Autopista Límite | 58 | ✅ (3: furgoneta N1, mínima 60) |
| 6 Cruce Salvaje | 58 | ✅ (0: banco impecable) |
| 7 La Doble Continua | 58 | ✅ (1: casi-duplicado 1,5 m) |
| 8 Rotonda Infernal | 56 | ✅ (1: ciclomotor de dos ruedas) |
| 9 Parking Wars | 56 | ✅ (1: línea amarilla discontinua) |
| 10 Ciudad Nocturna | 56 | ✅ (1 marca honesta: alcances) |
| 11 El Último Bar | 56 | ✅ (0 errores; 1 fecha retirada) |
| 12 Zona Zombie | 56 | ✅ (2: truco + campo visual 180°) |
| 13 El Taller | 56 | ✅ (1: mnemotecnia airbag) |
| 14 Código PAS | 56 | ✅ (1 matiz: V-16 en extranjero) |
| 15 Eco Ruta & Papeleo | 56 | ✅ (4: incl. respuesta errónea M15-022) |

### Errores reales cazados en la verificación (los más importantes)
- **M15-022 tenía la respuesta marcada mal** (regla del tercio aplicada a un turismo → 15 %).
- **Señal S-28**: el RD 465/2025 (1-jul-2025) la renombró "zona de estancia y juego" y bajó su
  límite de 20 a 10 km/h. Propagado a los 2 catálogos y a 7 preguntas (3 con la respuesta invertida).
- **Furgoneta N1** circula a 90/80, no 110/90 (M05-005/006).
- **Semáforo de ciclo** (M02-034): desde RD 465/2025 aplica solo a ciclos, no a ciclomotores.
- **Curso parcial de puntos** recupera 4, no 6, desde nov-2024 (M15-049).
- **M03-040**: señal de mercancías con cifra es R-107, no R-106.

### Datos normativos clave (todos contrastados vía web, vigentes jul-2026)
- Tasas de alcohol 0,5/0,25 y 0,3/0,15 (la reforma del 0,2 g/l fue **rechazada** el 18-03-2026).
- V-16 conectada obligatoria desde 01-01-2026 sustituyendo triángulos.
- Móvil en mano 6 puntos; auriculares 3; arrojar objetos 6.
- ITV turismo 4/2/1 años; profundidad neumático 1,6 mm; SRI hasta 135 cm.
- Catálogo de señales por RD 465/2025 (`senales.expanded.json`, 112 señales verificadas).

### 4 marcas `[VERIFICAR DGT 2026]` restantes — TODAS intencionadas y honestas
Son datos correctos pero con reforma anunciada aún sin publicar en BOE, o cifras habituales
en material DGT no confirmables en fuente primaria (el proxy bloquea boe.es/dgt.es):
- M10-016 (alcances exactos cruce 40 m / carretera 100 m)
- M14-014 (validez de la V-16 fuera de España — debate Convenio de Viena)
- M15-013 (criterios de las etiquetas ambientales) · M15-054 (curso obligatorio B→125 cc)

## Qué falta para el 100 % (F8)

- **Payment Link de Stripe real**: sustituir `STRIPE_URL` en `js/screens.js`. Solo lo puede hacer
  el dueño del negocio. El generador de códigos ya existe: `node tools/gen-codigos.mjs 10`.
- **Landing** con demo jugable incrustada (opcional para lanzar; el paywall in-game ya funciona).

## Cómo está construido (F0–F6, todo ✅)

- PWA offline instalable (manifest + SW `cq-v5` precachea los 15 bancos), tokens "Señal Neón",
  fuentes self-hosted, iconos generados por código.
- Core loop con feedback trampa/truco, combos, XP, estrellas, REVANCHA, cofres.
- Mapa-carretera nocturno con progreso pintado en la línea discontinua y desbloqueo por bosses.
- Leitner 5 cajas invisible + mezcla 70/30 + Taller de Errores + SE BUSCA.
- Juice: WebAudio procedural, haptics, sellos, confeti, reduced-motion.
- DGT Tower 30/30/3 con corrección completa + Predictor honesto con topes.
- Retención: rachas con protectores, diarias, contrarreloj semanal, Álbum de 112 señales.
- Paywall tras boss del Mundo 3 + canje de código local (Stripe pendiente).
- **Tarjeta compartible** (`js/sharecard.js`): imagen "Señal Neón" del récord de contrarreloj
  y del APTO de la Torre, compartida como foto (Web Share nivel 2) — el motor viral del §7/§15.

## QA end-to-end (Playwright, Chromium 390×844) — sin bugs
- Misión ganada (sello + 3★ + combo ×3 + cofre) y fallida (REVANCHA + Taller) ✓
- Progresión completa: 3 misiones perfectas → boss vencido → Mundo 2 desbloqueado ✓
- DGT Tower: examen 30/30 → APTO/NO APTO + corrección + consejo honesto ✓
- Canje de código: inválido no activa, válido sí (Pase para siempre) ✓
- Tarjetas compartibles generadas y verificadas visualmente ✓

## F14 · RETENCIÓN V1 (2026-07-27) — `cq-v17`

Ocho funciones nuevas y un esquema de estado v2. Documentación completa en
`docs/RETENTION_V1.md`; el resumen para el jugador está en `CHANGELOG.md`.

- **Tu Próxima Parada** (`js/retencion/proxima.js`) — al terminar una sesión queda preparada
  UNA sesión corta (3 en frío + 5 de ruta + 1 cruce). No caduca, no penaliza, no bloquea nada.
- **Recordatorio por calendario** (`js/retencion/ics.js`, diferido) — `.ics` RFC 5545 con
  `DTSTART` local y deep link `#/next-run`. Sin push fingido.
- **Descubrimiento progresivo** (`js/retencion/desbloqueos.js`) — los cinco modos nacen
  cerrados y se abren por hitos; la condición se dice tal cual y nunca se vuelven a cerrar.
- **ADN de los mundos** (`js/retencion/mundos-adn.js`) — cada mundo declara sus modificadores
  y los anuncia en su franja de entrada. Tope de dos modificadores exigentes por mundo.
- **Contratos de ruta** (`js/retencion/contratos.js`) — 25 🔩 al cumplir; fallar no quita NADA.
- **Chequeo de confianza** — "¿Vas seguro?" antes de revelar, con los dos botones al mismo
  peso visual. No entra en el Predictor.
- **Regla contra Trampa** (`js/retencion/reglatrampa.js` + `datos/reglatrampa.json`, diferido)
  — 210 tarjetas derivadas del par (opción correcta, opción incorrecta) del banco YA
  verificado: no se ha escrito ni una palabra de normativa nueva. El primer intento es el que
  cuenta; la corrección guiada posterior no borra el fallo. Fuera de boss y examen.
- **Retos por enlace** (`js/retencion/reto.js`, diferido) — `#/reto?v=1&mode=…&seed=…`, nada
  más en el enlace. No dan XP ni tocan el Predictor.
- **Modo de prueba** (`js/retencion/eventos.js`) — caja negra local, apagada por defecto, sin
  una sola llamada de red. Formato en `docs/LOCAL_TEST_DATA_FORMAT.md`.

### Tres fallos reales que destaparon las pruebas
- `state.js`: `migrar()` mutaba la plantilla con `Object.assign(base, s)`; un `racha: null`
  guardado acababa en `racha: {}` y la app se caía. Corregido y cubierto con prueba.
- `proxima.js`: la invariante "una sola parada pendiente" no estaba en el código.
- `aplicarADN()`: elegía el hueco de Regla contra Trampa por posición, así que casi nunca
  había tarjeta curada para esa pregunta y el formato no aparecía.

### Segunda pasada (mismo día): lo que faltaba del encargo
Al releer el encargo punto por punto contra el código aparecieron seis huecos reales,
todos cerrados:
- **Catálogo de eventos incompleto**: faltaban `session_end`, `mission_start`,
  `mission_abandon`, `mission_complete`, `question_answer` (con `responseTimeMs`),
  `mode_complete` y `next_session_saved`; y dos tenían nombre propio en vez del del
  catálogo (`rule_trap_answered`, `challenge_completed`).
- **Exportar prueba solo descargaba**: ahora Web Share → Blob → portapapeles, y el
  aviso nombra el canal que ha funcionado de verdad.
- **Los retos solo ofrecían un tipo**: ahora hay selector con los tres (`mix5`,
  `signals`, `crossing`), y solo se enseñan los que de verdad producen contenido.
- **La revancha reenviaba la misma semilla**: era mandar un reto ya visto entero.
  Ahora genera un recorrido nuevo del mismo tipo.
- **Regla contra Trampa podía repetir tarjeta seguida**: anillo de las últimas 12.
- **Los diálogos no gestionaban el foco**: `role="dialog"`, `aria-modal`, ciclo de
  Tab y Escape por la opción neutra (contrato → ruta normal, salir → seguir jugando,
  borrar → no borrar).

### Pruebas
- `npm test` — **35/35** unitarias.
- `npm run qa` — **10/10** scripts de integración en verde (47 comprobaciones en
  `qa-adn`, 35 en `qa-migracion`).
- Offline con Service Worker verificado: mapa, misión y enlace de reto sin red.
- Escenarios §19 cubiertos, incluidos migrar progreso v1, segundo plano y vuelta,
  estado dañado a propósito e importar un export anterior a esta versión.
- `npm run size:check` — **109,6 KB gzip** de carga inicial sobre un tope de 300.

## Limitaciones conocidas / decisiones

- **WebKit no se ha podido ejecutar**: el contenedor solo trae Chromium y no hay red para
  descargarlo. La compatibilidad con Safari está auditada por código, no probada. **Falta una
  pasada en iPhone real antes de vender.** Suelo real de versión: Safari 16.2 (`color-mix()`).
- Pago v1 client-side (código con checksum local, sal en `js/screens.js`): saltable por un
  usuario técnico. Migrar a backend de licencias en v2.
- Señales del Álbum: render SVG procedural aproximado; ilustraciones fieles → v2.
- Preguntas sin imágenes (`imagen: null`) en v1; fotos/escenas → v2.
- Ligas multijugador → v2 (requiere backend).

## Registro de fases

| Fase | Estado | Notas |
|------|--------|-------|
| F-1 Auditoría | ✅ | Trabajo previo perdido; arranque de cero |
| F0 Fundación | ✅ | PWA instalable offline |
| F1 Core loop | ✅ | Probado con Playwright |
| F2 Mapa y mundos | ✅ | |
| F3 Motor pedagógico | ✅ | |
| F4 Juice | ✅ | |
| F5 DGT Tower | ✅ | |
| F6 Retención | ✅ | |
| F7 Contenido masivo | ✅ | 856 preguntas, 15/15 mundos, 15/15 verificados |
| F8 Venta | ✅* | paywall + Pase + landing + éxito + guía; *solo falta el Payment Link de Stripe del dueño |
| F9 Cruces jugables | ✅ | "¿Quién pasa primero?": 20 puzzles (4 glorietas), motor SVG + animación |
| F10 Doble o nada | ✅ | Escalera de bote sin dark patterns: solo arriesgas lo que construyes |
| F11 Señal Rush | ✅ | 60 s clasificando señales; las pistas se retiran con el combo |
| F12 Garaje | ✅ | Sumidero real para las Chapas; el paywall ya no promete lo que no hay |
| F13 Jugar primero | ✅ | El primer contacto es un cruce jugable; las reglas van después |
| F14 Retención V1 | ✅ | Próxima Parada, desbloqueos, ADN de mundos, contratos, confianza, Regla contra Trampa, retos por enlace, modo de prueba |

> Nota: el remoto solo acepta push de la rama designada `claude/carnet-quest-game-vsag41`.
