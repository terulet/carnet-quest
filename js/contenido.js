/* ============================================================
   contenido.js — Los 15 MUNDOS: metadatos, píldoras de teoría (microlearning,
   máx ~150 palabras, una idea por pantalla) y la sección "⚠️ LAS TRAMPAS DEL EXAMEN".
   Redactado por el copywriter + profesor + experto en microlearning.
   ============================================================ */
window.MUNDOS = [
  {
    num: 1, emoji: '🛣️', nombre: 'Conceptos básicos y la vía', color: '#5b8cff',
    lema: 'Antes de conducir, entiende el terreno de juego.',
    pildoras: [
      { titulo: 'Las partes de la vía', texto: 'La <b>calzada</b> es por donde van los coches. El <b>arcén</b> es la franja lateral (para emergencias, peatones o ciclistas, no para adelantar alegremente). El <b>carril</b> es cada banda de la calzada con anchura para una fila de coches. La <b>acera</b> es de los peatones: el coche no pinta nada ahí.' },
      { titulo: 'Poblado, urbana e interurbana', texto: 'Una <b>vía urbana</b> está dentro de poblado (ciudad/pueblo). Una <b>vía interurbana</b> va entre poblados. La <b>travesía</b> es el tramo de carretera que cruza un pueblo con casas a los lados. ¿Por qué importa? Porque los <b>límites de velocidad</b> cambian según dónde estés.' },
      { titulo: 'Autopista vs autovía', texto: 'Ambas tienen calzadas separadas y varios carriles. La <b>autopista</b> es más exigente en su diseño y no permite ciertos vehículos lentos; la <b>autovía</b> es algo más flexible. Para el permiso B, en ambas el límite del turismo es <b>120 km/h</b>.' }
    ],
    trampas: [
      'Confundir "parada" con "estacionamiento": parar es ≤2 min sin dejar el coche; estacionar es más tiempo o abandonarlo.',
      'El arcén NO es un carril para adelantar ni para ir más rápido.',
      '"Poblado" no es solo ciudad: un pueblo pequeño también lo es, y ahí manda el límite urbano.',
      'Vía "interurbana" incluye las travesías: ojo, ahí el límite baja a 50.',
      'La acera y la zona peatonal nunca son para el coche, ni "un momentito".'
    ]
  },
  {
    num: 2, emoji: '👮', nombre: 'Señales I: agentes y semáforos', color: '#ff6b6b',
    lema: 'Cuando hay lío, ¿a quién hago caso?',
    pildoras: [
      { titulo: 'El orden de mando', texto: 'Si varias señales se contradicen, este es el orden de prioridad, de más a menos: <b>1) Agente</b> de tráfico → <b>2) Semáforo</b> → <b>3) Señal vertical</b> → <b>4) Marca vial</b>. El agente manda sobre todo, incluso sobre un semáforo en verde. <b>Mnemotecnia: "A-S-V-M"</b> (Agente, Semáforo, Vertical, Marca).' },
      { titulo: 'El agente', texto: 'Brazo <b>levantado verticalmente</b> = atención, va a cambiar (como un ámbar). Brazo(s) <b>horizontal(es)</b> = STOP para quien lo tenga de frente o espalda. Si te muestra el <b>costado</b>, puedes pasar. De noche, un <b>farol rojo balanceándose</b> hacia ti significa: detente.' },
      { titulo: 'El semáforo', texto: '<b>Rojo</b>: detente. <b>Ámbar fijo</b>: detente si puedes hacerlo con seguridad (no acelerar para "colarte"). <b>Verde</b>: pasa si la salida está libre. <b>Ámbar intermitente</b>: precaución, puedes pasar. Un semáforo <b>apagado o intermitente</b> equivale a no existir: manda la señal vertical o la norma general.' }
    ],
    trampas: [
      'Ámbar fijo NO significa "acelera": significa detente si puedes con seguridad.',
      'El agente manda incluso sobre un semáforo en verde.',
      'Verde no da derecho a invadir un cruce si la salida está colapsada.',
      'Un semáforo en ámbar intermitente = precaución, NO obliga a parar.',
      'Semáforo de un solo color ámbar intermitente sobre un paso: ceder a los peatones.'
    ]
  },
  {
    num: 3, emoji: '🚸', nombre: 'Señales II: verticales', color: '#ffa94d',
    lema: 'Triángulo avisa, círculo ordena, cuadrado informa.',
    pildoras: [
      { titulo: 'La forma lo dice todo', texto: '<b>Triángulo</b> con borde rojo = <b>peligro</b> (avisa de algo). <b>Círculo</b> con borde rojo = <b>prohibición</b> o restricción. <b>Círculo azul</b> = <b>obligación</b> (tienes que hacerlo). <b>Cuadrado/rectángulo azul</b> = <b>indicación</b> (te informa). Aprende la forma y ya sabes el "tono" de la señal.' },
      { titulo: 'Peligro vs prohibición', texto: 'La de <b>peligro</b> (triángulo) no te prohíbe nada: te dice "ojo, viene una curva / niños / un badén". La de <b>prohibición</b> (círculo rojo) sí te limita: velocidad máxima, no adelantar, no entrar, no estacionar. Confundirlas es un clásico del examen.' },
      { titulo: 'Fin de la prohibición', texto: 'Las restricciones se acaban: por una señal de <b>fin</b> (con banda diagonal), por una intersección, o por otra señal que la contradiga. Una velocidad máxima no dura para siempre; ojo a dónde termina.' }
    ],
    trampas: [
      'Triángulo = peligro (avisa), NO prohíbe. Círculo rojo = prohíbe.',
      'La señal de velocidad máxima es una recomendación… ¡FALSO! Es obligatoria (la recomendada es cuadrada azul).',
      'Prohibido "parar y estacionar" (aspa) es más estricto que prohibido "estacionar" (una barra).',
      'La entrada prohibida (círculo rojo con barra blanca) va SOLO en tu sentido: puede haber doble sentido.',
      'Una señal de obligación (azul) desaparece en la siguiente intersección salvo que se repita.'
    ]
  },
  {
    num: 4, emoji: '🛑', nombre: 'Señales III: marcas viales', color: '#ffd23f',
    lema: 'Lo que está pintado en el suelo también manda.',
    pildoras: [
      { titulo: 'Continua vs discontinua', texto: '<b>Línea continua</b>: no se puede pisar ni traspasar (prohibido adelantar o cambiar de carril cruzándola). <b>Línea discontinua</b>: se puede cruzar con precaución si es seguro. Si hay una continua y una discontinua juntas, <b>manda la que tienes más cerca</b>, la de tu lado.' },
      { titulo: 'Marcas transversales', texto: 'La <b>línea de detención</b> (banda blanca ancha) es para el STOP y el semáforo: paras antes de ella. La <b>línea de ceda el paso</b> son triángulos ("dientes de tiburón") pintados: cede sin necesidad de parar del todo. El <b>paso de peatones</b> (cebra) es suyo: prioridad peatón.' },
      { titulo: 'El color importa', texto: 'Marca <b>blanca</b> = norma general. Marca <b>amarilla</b> = restricción de parada/estacionamiento o señalización de obras (manda sobre la blanca). Una línea amarilla en <b>zigzag</b> reserva ese espacio (por ejemplo, para el bus).' }
    ],
    trampas: [
      'Con una línea continua y una discontinua juntas, manda la de TU lado.',
      'La marca amarilla anula temporalmente a la blanca (obras): hazle caso a la amarilla.',
      'Pisar una línea continua está prohibido AUNQUE no adelantes.',
      'Los "dientes de tiburón" (triángulos en el suelo) = ceda el paso, aunque no haya señal vertical.',
      'Una línea de borde continua no impide entrar/salir a una propiedad si es la única forma.'
    ]
  },
  {
    num: 5, emoji: '⏱️', nombre: 'Velocidad', color: '#4ecdc4',
    lema: 'La cifra correcta salva vidas (y aprueba exámenes).',
    pildoras: [
      { titulo: 'En ciudad: 20 / 30 / 50', texto: 'Desde 2021 en vía urbana: <b>20 km/h</b> en calles de plataforma única (acera y calzada al mismo nivel), <b>30 km/h</b> en calles de un solo carril por sentido, y <b>50 km/h</b> en vías de dos o más carriles por sentido. La mayoría de calles de ciudad son de 30.' },
      { titulo: 'Fuera de ciudad', texto: 'Turismo en <b>carretera convencional</b> (la de un carril por sentido, típica): <b>90 km/h</b>. En <b>autovía y autopista</b>: <b>120 km/h</b>. En <b>travesía</b> (carretera que cruza un pueblo): <b>50 km/h</b>. Estos son los máximos; siempre puedes ir más despacio si conviene.' },
      { titulo: 'Adecuar y frenar', texto: 'El límite es un tope, no una obligación: con lluvia, niebla o mucha carga hay que <b>bajar</b>. Y recuerda: la <b>distancia de frenado</b> crece con el cuadrado de la velocidad. Al doble de velocidad, frenar cuesta <b>cuatro veces</b> más espacio. Por eso importa tanto.' }
    ],
    trampas: [
      'Ya NO existe el margen de +20 km/h para adelantar en convencional (se eliminó en 2022).',
      '30 vs 50 en ciudad: depende de los carriles por sentido, no del "parece grande".',
      'La velocidad recomendada (cuadrada azul) se puede superar; la máxima (círculo rojo) NO.',
      'También hay velocidad MÍNIMA: no puedes ir tan lento que entorpezcas (regla: la mitad del máximo genérico).',
      'En un adelantamiento no puedes superar el límite "para tardar menos".'
    ]
  },
  {
    num: 6, emoji: '📏', nombre: 'Distancias de seguridad', color: '#a78bfa',
    lema: 'El hueco que dejas es el tiempo que tienes para reaccionar.',
    pildoras: [
      { titulo: 'La regla de los 3 segundos', texto: 'Fíjate cuándo el coche de delante pasa por un punto fijo (una señal, una sombra). Cuenta "mil uno, mil dos, mil tres". Si llegas a ese punto antes de terminar, <b>vas demasiado cerca</b>. Con lluvia o mala visibilidad, <b>duplica</b> a 6 segundos. Sencillo y funciona a cualquier velocidad.' },
      { titulo: 'Distancia lateral', texto: 'Al adelantar a un <b>ciclista o peatón</b> fuera de poblado debes dejar al menos <b>1,5 metros</b> de separación lateral, y puedes ocupar parte del carril contrario o pisar una línea continua si es seguro para hacerlo. Su vida vale más que tu prisa.' },
      { titulo: 'Deja hueco', texto: 'Debes circular dejando una separación que permita a otro vehículo <b>intercalarse</b> con seguridad al adelantarte. Y nunca tan pegado que, si el de delante frena de golpe, no puedas evitar el choque. Ir pegado no te hace llegar antes: solo aumenta el riesgo.' }
    ],
    trampas: [
      'La distancia de seguridad NO es un número fijo de metros: depende de la velocidad (regla de los 3 s).',
      'Con lluvia, la distancia se DUPLICA.',
      'Al adelantar a un ciclista fuera de poblado: mínimo 1,5 m, y puedes invadir el contrario.',
      'Debes dejar sitio para que otro se intercale al adelantarte.',
      'Ir muy pegado (tailgating) es sancionable aunque no choques.'
    ]
  },
  {
    num: 7, emoji: '↔️', nombre: 'Adelantamientos', color: '#f783ac',
    lema: 'Adelantar bien es un arte: rápido, seguro y de vuelta a tu sitio.',
    pildoras: [
      { titulo: 'Dónde está prohibido', texto: 'No se adelanta en: <b>cambios de rasante</b> sin visibilidad, <b>curvas</b> de visibilidad reducida, <b>túneles y pasos a nivel</b> (salvo que haya carriles de sobra), y en <b>intersecciones</b> y sus proximidades. La idea común: donde no ves lo que viene, no adelantas.' },
      { titulo: 'Cómo se hace', texto: '1) Comprueba que nadie te adelanta ya. 2) <b>Señaliza</b> (intermitente izquierdo). 3) Desplázate a la izquierda con decisión. 4) Rebasa dejando espacio lateral. 5) Vuelve a tu carril <b>sin obligar al adelantado a frenar</b> bruscamente. Señaliza también al volver.' },
      { titulo: 'Cuando te adelantan a ti', texto: 'Si te adelantan, <b>ceñíte a la derecha</b> y, sobre todo, <b>NO aceleres</b>. Poner difícil un adelantamiento es peligroso y sancionable. Facilítalo: es más seguro para todos y termina antes.' }
    ],
    trampas: [
      'Se puede adelantar por la DERECHA cuando el de delante va a girar a la izquierda y lo ha señalizado.',
      'En túnel se puede adelantar SOLO si hay carriles suficientes en tu sentido.',
      'Cuando te adelantan, no acelerar: es la trampa estrella.',
      'Adelantar a un ciclista permite pisar línea continua e invadir el contrario si es seguro.',
      'Un vehículo que se dispone a girar a la izquierda no se adelanta por la izquierda.'
    ]
  },
  {
    num: 8, emoji: '🔄', nombre: 'Prioridad de paso', color: '#69db7c',
    lema: 'En cada cruce, alguien pasa primero. Que tengas claro quién.',
    pildoras: [
      { titulo: 'Sin señales: la derecha', texto: 'En un cruce <b>sin señales ni semáforos ni agente</b>, tiene prioridad quien viene por tu <b>derecha</b>. Regla básica y muy preguntada. Pero ojo, hay excepciones importantes (siguiente píldora).' },
      { titulo: 'Las rotondas', texto: 'En una glorieta tiene prioridad <b>quien ya circula por dentro</b>. Tú, al <b>entrar</b>, cedes el paso. Circula por el carril exterior si vas a salir pronto; usa los interiores para dar más de media vuelta y sal con antelación señalizando a la derecha.' },
      { titulo: 'Excepciones a la derecha', texto: 'La prioridad por la derecha NO se aplica cuando: sales de una <b>propiedad</b> o camino de tierra (cedes tú), te cruzas un <b>tranvía/raíles</b> (pasa el tren), o viene un <b>vehículo de emergencia</b> en servicio. También cede quien va por vía sin pavimentar frente a una pavimentada.' }
    ],
    trampas: [
      'La prioridad por la derecha NO vale si sales de un garaje o camino de tierra: cedes tú.',
      'En la rotonda manda quien está DENTRO, no quien entra.',
      'El tranvía/tren tiene prioridad siempre, venga por donde venga.',
      'En una pendiente estrecha donde no se cruzan dos coches, tiene prioridad el que SUBE.',
      'Ceder el paso no siempre es pararse: es no obligar al otro a frenar o desviarse.'
    ]
  },
  {
    num: 9, emoji: '🅿️', nombre: 'Maniobras', color: '#4dabf7',
    lema: 'Incorporarte, girar y aparcar sin sustos ni multas.',
    pildoras: [
      { titulo: 'Incorporación y giros', texto: 'Al <b>incorporarte</b> a la circulación (salir de un aparcamiento, un garaje) <b>cedes el paso</b> a los que ya circulan. Para <b>girar</b>, señaliza con antelación, colócate (a la derecha para girar a la derecha, ceñido al centro para la izquierda) y comprueba ángulos muertos y peatones.' },
      { titulo: 'Marcha atrás', texto: 'La marcha atrás es una <b>maniobra complementaria</b>: solo para aparcar o salir de un sitio, recorriendo <b>el menor trayecto posible</b>. Está <b>prohibida en autovía y autopista</b> (y nunca para recorrer una calle entera hacia atrás). Extrema la precaución con peatones detrás.' },
      { titulo: 'Parar y estacionar', texto: 'No se puede parar ni estacionar en: intersecciones, pasos de peatones, carriles bici, curvas y cambios de rasante sin visibilidad, sobre la acera, en doble fila, ni donde se obstaculice a otros. La <b>parada</b> es breve (≤2 min sin dejar el coche); el <b>estacionamiento</b>, más.' }
    ],
    trampas: [
      'Marcha atrás prohibida en autovía/autopista, incluso si te has pasado la salida.',
      'Parada = ≤2 min sin abandonar el vehículo; estacionamiento = más tiempo o dejarlo.',
      'Al incorporarte SIEMPRE cedes, aunque vengas de la derecha.',
      'Estacionar en un carril bici o sobre la acera es sancionable aunque "sea un momento".',
      'Para girar a la izquierda te ciñes al centro/eje, no te quedas a la derecha.'
    ]
  },
  {
    num: 10, emoji: '💡', nombre: 'Alumbrado y meteorología', color: '#ffe066',
    lema: 'Ver y ser visto: la luz correcta en el momento correcto.',
    pildoras: [
      { titulo: 'Cortas vs largas', texto: 'Luz de <b>cruce (cortas)</b>: de noche en vía iluminada, en <b>túneles</b>, y con niebla o lluvia intensa. Luz de <b>carretera (largas)</b>: fuera de poblado, de noche, en vías sin iluminación y <b>sin cruzarte</b> con otros vehículos. Al cruzarte o seguir a alguien de cerca, baja a cortas para no deslumbrar.' },
      { titulo: 'Antiniebla', texto: 'La <b>antiniebla delantera</b> ayuda con niebla, lluvia o nieve intensas. La <b>antiniebla trasera</b> es muy potente y deslumbra: úsala <b>solo</b> con niebla densa o nieve, y apágala en cuanto mejore la visibilidad para no molestar al de detrás.' },
      { titulo: 'Meteorología adversa', texto: 'Lluvia: cuidado con el <b>aquaplaning</b> (el coche "flota"); levanta el pie sin frenar de golpe. Niebla: cortas + antiniebla, muy despacio. Viento fuerte: sujeta el volante, ojo al adelantar camiones. En todos los casos: <b>más distancia y menos velocidad</b>.' }
    ],
    trampas: [
      'La antiniebla trasera SOLO con niebla densa o nieve: si no, deslumbra y multa.',
      'En túnel iluminado también hay que encender las luces (cortas), no solo de noche.',
      'Largas fuera de poblado, pero SIEMPRE bajar a cortas al cruzarte o seguir a otro.',
      'Ante deslumbramiento: reduce y fíjate en la línea de la derecha, no mires la luz.',
      'Con niebla NO se ponen largas: rebotan y ves peor. Se ponen cortas.'
    ]
  },
  {
    num: 11, emoji: '🚫🍺', nombre: 'Alcohol, drogas y factor humano', color: '#ff8787',
    lema: 'Al volante, cero excusas: 0,25 no es "casi nada".',
    pildoras: [
      { titulo: 'Las tasas', texto: 'Tasa máxima general: <b>0,25 mg/l</b> en aire espirado (0,5 g/l en sangre). Para <b>noveles</b> (menos de 2 años) y <b>profesionales</b>: <b>0,15 mg/l</b> (0,3 g/l). A partir de <b>0,60 mg/l</b> es <b>delito penal</b>. Con drogas la tolerancia es <b>cero</b>: dan positivo con una prueba salival.' },
      { titulo: 'Qué te hace el alcohol', texto: 'El alcohol da una <b>falsa sensación de seguridad</b>: te crees mejor conductor cuando eres peor. Aumenta el <b>tiempo de reacción</b>, reduce el campo visual, adormece y quita reflejos. No hay truco ni café que lo elimine rápido: solo el <b>tiempo</b> lo baja.' },
      { titulo: 'Sueño y distracciones', texto: 'El <b>sueño</b> no se combate con la ventanilla ni la música: la única solución es <b>parar y descansar</b>. Para cada 2 horas aprox. Usar el <b>móvil en la mano</b> conduciendo son <b>6 puntos</b>: es de las mayores causas de accidente. Nada de mensajes al volante.' }
    ],
    trampas: [
      '0,25 (general) vs 0,15 (novel/profesional): la cifra baja para noveles.',
      'Las drogas son tolerancia CERO, no hay tasa "permitida".',
      'El café/ducha/ventanilla NO bajan el alcohol: solo el tiempo.',
      'El sueño solo se cura durmiendo: ningún truco funciona.',
      'Móvil en la mano = 6 puntos, aunque estés parado en un semáforo.'
    ]
  },
  {
    num: 12, emoji: '🔒', nombre: 'Seguridad de los ocupantes', color: '#38d9a9',
    lema: 'El cinturón no es opcional. Nunca.',
    pildoras: [
      { titulo: 'Cinturón siempre', texto: 'El cinturón es obligatorio en <b>todas las plazas</b>, delante y detrás, en ciudad y carretera. Salva más vidas que ningún otro elemento. En embarazadas, la banda inferior va <b>por debajo</b> del abdomen, sobre las caderas. Sin cinturón, en un choque a 50 km/h sales despedido como desde un tercer piso.' },
      { titulo: 'Sillita infantil (SRI)', texto: 'Los menores de <b>135 cm</b> de estatura deben usar un <b>sistema de retención infantil</b> adecuado a su talla y peso. Como norma general van en los <b>asientos traseros</b>. Si una sillita va <b>a contramarcha</b> en el asiento del copiloto, hay que <b>desactivar el airbag</b> frontal: si salta, puede ser mortal para el bebé.' },
      { titulo: 'Activa vs pasiva', texto: 'Seguridad <b>activa</b> = evita el accidente (frenos ABS, control de estabilidad ESP, neumáticos, luces). Seguridad <b>pasiva</b> = reduce daños si ocurre (cinturón, airbag, reposacabezas, carrocería deformable). El airbag <b>complementa</b> al cinturón, no lo sustituye: sin cinturón, el airbag puede hacerte daño.' }
    ],
    trampas: [
      'El límite para la sillita es la ESTATURA (135 cm), no una edad concreta.',
      'Sillita a contramarcha delante ⇒ hay que DESACTIVAR el airbag.',
      'El airbag NO sustituye al cinturón: lo complementa.',
      'ABS y ESP son seguridad ACTIVA; cinturón y airbag, PASIVA.',
      'El cinturón es obligatorio también en las plazas traseras.'
    ]
  },
  {
    num: 13, emoji: '📄', nombre: 'Documentación y permiso por puntos', color: '#748ffc',
    lema: 'Papeles en regla y puntos en la cuenta.',
    pildoras: [
      { titulo: 'El saldo de puntos', texto: 'Un conductor con experiencia parte de <b>12 puntos</b>. El <b>novel</b> (o quien recupera el permiso tras perderlo) empieza con <b>8</b>. Si no te sancionan, subes hasta un máximo de <b>15</b>. Si pierdes <b>todos</b> los puntos, no puedes conducir y debes hacer un <b>curso de sensibilización</b> para recuperar el permiso.' },
      { titulo: 'Qué autoriza el permiso B', texto: 'Con el permiso B puedes conducir turismos de hasta <b>3.500 kg</b> de masa máxima y hasta <b>9 plazas</b> (incluido el conductor). Puedes arrastrar un <b>remolque ligero</b> (hasta 750 kg). Para más peso o más plazas, hacen falta otros permisos.' },
      { titulo: 'ITV y seguro', texto: 'Un turismo pasa su <b>primera ITV a los 4 años</b>; luego, <b>cada 2 años</b> hasta los 10; a partir de los 10 años, <b>cada año</b>. El <b>seguro</b> de responsabilidad civil es obligatorio: circular sin él es una infracción grave. Lleva siempre permiso de conducir, de circulación y ficha técnica.' }
    ],
    trampas: [
      '12 puntos general vs 8 el novel: no son 12 para todos.',
      'ITV turismo: 4 años la primera, luego cada 2 hasta los 10, después ANUAL.',
      'El permiso B llega hasta 3.500 kg y 9 plazas, no "cualquier coche grande".',
      'Perder todos los puntos ⇒ curso + examen, no se recupera solo con el tiempo.',
      'Remolque con el B: hasta 750 kg (ligero); más peso requiere B+E u otro.'
    ]
  },
  {
    num: 14, emoji: '🔧', nombre: 'Mecánica y medio ambiente', color: '#63e6be',
    lema: 'Un coche cuidado contamina menos y no te deja tirado.',
    pildoras: [
      { titulo: 'Neumáticos y frenos', texto: 'La profundidad mínima legal del dibujo del neumático es <b>1,6 mm</b>. Con menos, agarra mal (sobre todo en mojado) y no pasa la ITV. Revisa la <b>presión</b> en frío. Los frenos <b>ABS</b> evitan que las ruedas se bloqueen al frenar fuerte: pisa a fondo y mantén, el coche sigue dirigible.' },
      { titulo: 'Los testigos del cuadro', texto: 'Luz <b>roja</b> en el salpicadero = problema serio, <b>detente</b> cuanto antes (aceite, freno, temperatura, batería según el símbolo). Luz <b>ámbar/amarilla</b> = aviso, revisa pronto pero puedes seguir con precaución. Aprender los colores te evita averías graves.' },
      { titulo: 'Conducción eficiente', texto: 'Para gastar y contaminar menos: cambia a marchas <b>largas</b> pronto, circula a <b>revoluciones bajas</b>, anticipa y usa el freno motor, evita acelerones y no calientes el motor parado. Menos combustible = menos emisiones = más dinero en tu bolsillo.' }
    ],
    trampas: [
      'Profundidad mínima del neumático: 1,6 mm (no 2 ni 3).',
      'Con ABS se frena pisando a FONDO y sin soltar; no "bombeando".',
      'Testigo ROJO = para; ÁMBAR = revisa pronto pero puedes seguir.',
      'Calentar el motor parado gasta y contamina: mejor arrancar y circular suave.',
      'Marchas largas y pocas revoluciones = conducción eficiente (no lo contrario).'
    ]
  },
  {
    num: 15, emoji: '🚑', nombre: 'Accidentes y usuarios vulnerables', color: '#ff922b',
    lema: 'Ante un accidente: Protege, Avisa, Socorre. En ese orden.',
    pildoras: [
      { titulo: 'La conducta PAS', texto: '<b>P</b>roteger: señaliza el lugar (luces de emergencia, chaleco, baliza V16) para que no haya un segundo accidente. <b>A</b>visar: llama al <b>112</b> y da datos claros. <b>S</b>ocorrer: atiende a los heridos sin moverlos, salvo peligro inminente. Es el orden correcto: primero seguridad, luego ayuda.' },
      { titulo: 'Primeros auxilios básicos', texto: 'No <b>muevas</b> a un herido salvo que corra peligro (fuego, tráfico). No le quites el <b>casco</b> a un motorista salvo que no respire. Si está inconsciente pero respira, <b>posición lateral de seguridad</b>. Una hemorragia fuerte: presiona directamente sobre la herida. Y mantén la calma: tu cabeza fría ayuda.' },
      { titulo: 'Ciclistas, peatones y patinetes', texto: 'Da prioridad a los <b>peatones</b> en los pasos y a los <b>ciclistas</b> en sus carriles y al girar. Los <b>VMP (patinetes)</b> no pueden ir por la acera, ni por vías interurbanas, travesías o autovías; su conductor también responde por <b>alcohol</b>. Son los usuarios más frágiles: protégelos.' }
    ],
    trampas: [
      'PAS: primero Proteger, luego Avisar, luego Socorrer (no al revés).',
      'No quitar el casco a un motorista… salvo que NO respire.',
      'No mover a un herido salvo peligro real (fuego, más tráfico).',
      'El patinete (VMP) NO puede circular por la acera ni por autovía.',
      'Al conductor de patinete también se le aplica la tasa de alcohol.'
    ]
  }
];
