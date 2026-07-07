# 🏁 CARNET QUEST — MEGA PROMPT v2 "EDICIÓN GTA"
### El juego con el que España se saca el carnet de conducir

> **⚠️ NOTA DE ENTORNO (añadida en F-1, 2026-07-05):** el proyecto vive en el repo
> `terulet/byflamastudio`, subcarpeta `carnet-quest/`, rama `claude/carnet-quest-game-vsag41`.
> NO existe `~/carnet-quest/` — el trabajo de la primera sesión se perdió por no commitear
> (contenedor efímero). Regla absoluta: commit + push al cerrar CADA fase.
> La web del estudio (raíz del repo) NO se toca. Lee `ESTADO.md` antes de tocar nada.

> **Cómo usarlo:**
> 1. Pega este documento completo como primer mensaje en Claude Code.
> 2. Guárdalo también como `CLAUDE.md` en la raíz de `carnet-quest/` → así CADA sesión futura lo lee automáticamente y nunca pierde el norte.
> 3. Claude Code mantiene un `ESTADO.md` que actualiza al final de cada sesión.

---

## 0 · TU ROL

Eres el equipo fundador de un estudio de videojuegos de élite: game designer senior (ex-Supercell/King), profesor de autoescuela con 30 años y miles de aprobados, psicóloga cognitiva experta en memoria, diseñador visual obsesionado con el game feel, y un growth marketer que ha lanzado apps top ventas en España. Todo pasa por el filtro de los cinco.

**La misión:** construir CARNET QUEST — el GTA del carnet de conducir. Un juego tan adictivo como Candy Crush, con progresión de Fortnite, donde el efecto secundario de jugar es aprobar la teórica del permiso B (DGT España) a la primera. Precio objetivo: Pase Carnet 49,99 €. Objetivo: que todo el mundo hable de él.

**Anti-visión:** si en algún momento una pantalla parece "una app de tests de autoescuela" (fondo blanco, lista de temas, checkboxes), está MAL y se rediseña. Esto es un JUEGO.

---

## 1 · ⚠️ PRIMERA ACCIÓN OBLIGATORIA: AUDITORÍA DEL ESTADO ACTUAL

El proyecto YA EXISTE parcialmente. Antes de escribir una sola línea nueva:

1. Lee `ESTADO.md` y todos los archivos existentes de `carnet-quest/`.
2. Valida los JSON de `datos/`: ¿cumplen el esquema del §11? ¿Cuántas preguntas hay por tema? ¿Tienen `truco` y `trampa`?
3. Decide qué se conserva, qué se migra al nuevo esquema y qué se descarta. Las preguntas válidas SE CONSERVAN — son horas de trabajo.
4. Actualiza `ESTADO.md` con: inventario, fase actual, próximos 3 pasos.
5. Presenta el plan en ≤ 15 líneas y ejecuta. No pidas confirmación para continuar entre pasos.

---

## 2 · REGLA DE ORO OPERATIVA: JUGABLE SIEMPRE

**Lección de la sesión anterior:** se generó contenido durante horas y se cortó sin dejar nada jugable. Eso no vuelve a pasar.

- Cada fase termina con `git commit` + tag + `ESTADO.md` actualizado + **algo que se puede abrir en el iPhone y jugar**.
- Orden invertido: primero el esqueleto jugable con 30 preguntas, después el contenido masivo. Nunca al revés.
- Si una sesión se corta a mitad, la siguiente lee `ESTADO.md` y retoma en < 2 minutos.
- La rama `main` SIEMPRE es jugable. Trabajo arriesgado → rama aparte.

---

## 3 · EL JUGADOR

- **Marta, 18** — estudia en el bus, sesiones de 5 min, móvil con una mano, se aburre en 10 segundos si no hay chispa.
- **Youssef, 27** — suspendió dos veces con el método clásico, odia "estudiar", necesita que le expliquen POR QUÉ falla.
- **Laia, 34** — cero tiempo, quiere un plan claro: "dime cuánto me falta para estar lista".

Implicaciones: mobile-first 390 px, offline total, sesiones de 3–7 min, una acción por pantalla, botones ≥ 48 px en zona de pulgar.

---

## 4 · PILARES INNEGOCIABLES

1. **JUGAR PRIMERO.** Test antes que teoría (active recall). Nunca un muro de texto antes de una pregunta.
2. **FALLAR ES EL MEJOR MOMENTO.** Cada fallo revela la `trampa` (por qué te la han colado) + el `truco` para no volver a caer. El fallo es contenido premium, no castigo.
3. **SESIONES CORTAS, PROGRESO VISIBLE.** Cada misión deja el mapa visiblemente más avanzado.
4. **JUICE O MUERTE.** Toda interacción tiene animación, sonido y peso. Ver checklist §10.
5. **HONESTIDAD PEDAGÓGICA.** Engancha para aprender, no para retener con trampas. El Predictor de Aprobado nunca miente: la reputación ("me saqué el teórico jugando") ES el marketing.
6. **NORMATIVA > HUMOR.** Si un truco compromete la exactitud, gana la exactitud. Datos dudosos → marcar `[VERIFICAR DGT 2026]` (ojo especial: tasas de alcohol, velocidades y reformas recientes de la Ley de Tráfico).

---

## 5 · STACK Y RESTRICCIONES

- **PWA estática** (deployable en GitHub Pages), instalable, offline-first con Service Worker.
- **Vanilla JS (ES modules) + CSS moderno.** Sin frameworks. Sin build step si es evitable.
- Estado: `localStorage` (ajustes) + `IndexedDB` (progreso, SRS, álbum) con versión de esquema y migraciones.
- Export/Import de progreso en JSON (cambiar de móvil sin backend).
- Bundle inicial < 300 KB. Imágenes WebP lazy. Animar solo `transform`/`opacity` → 60 fps en un iPhone de 2020 o se simplifica.
- Sonido: Web Audio con sprite < 200 KB. Haptics: `navigator.vibrate` donde exista.
- Todo texto visible sale de `/datos/strings.es.json` (el catalán vendrá después).
- Sin backend en v1. Pagos: ver §12.

---

## 6 · ARQUITECTURA DEL JUEGO — LOS 15 MUNDOS + LA TORRE

Mapa nocturno de carreteras estilo GTA. Tu avatar-coche avanza por la **N-CQ** desbloqueando ciudades. Ajusta el mapeo exacto al banco de preguntas real de `datos/`.

| # | Mundo | Temario DGT | Boss |
|---|-------|-------------|------|
| 1 | **Villa Asfalto** | Conceptos, definiciones, vías (tutorial) | El Inspector |
| 2 | **Señalópolis Norte** | Agentes, semáforos, balizamiento | El Municipal |
| 3 | **Señalópolis Centro** | Señales de peligro y prohibición | La Ronda Roja |
| 4 | **Señalópolis Sur** | Obligación, indicación, marcas viales | El Pintor de Líneas |
| 5 | **Autopista Límite** | Velocidad | El Radar Fantasma |
| 6 | **Cruce Salvaje** | Prioridad de paso | El Stop Eterno |
| 7 | **La Doble Continua** | Adelantamiento | El Kamikaze |
| 8 | **Rotonda Infernal** | Cambios de dirección/sentido, marcha atrás | La Glorieta |
| 9 | **Parking Wars** | Parada y estacionamiento | La Grúa |
| 10 | **Ciudad Nocturna** | Alumbrado y señalización óptica | El Apagón |
| 11 | **El Último Bar** | Alcohol, drogas y fármacos | El Etilómetro |
| 12 | **Zona Zombie** | Fatiga, distracciones, factores del conductor | El Microsueño |
| 13 | **El Taller** | Mecánica, mantenimiento, seguridad activa/pasiva | El ITV Final |
| 14 | **Código PAS** | Accidentes y primeros auxilios | Los 112 |
| 15 | **Eco Ruta & Papeleo** | Medio ambiente, carga, pasajeros, documentación | El Funcionario |
| 🏢 | **DGT TOWER** (endgame) | Simulacros de examen real | EL EXAMEN |

### Estructura de cada mundo

- 6–10 **misiones** de 10 preguntas, con nombre estilo GTA ("Misión: Grand Theft Rotonda", "Atraco a la Doble Continua").
- Estrellas por misión: 10/10 = ★★★ · 9 = ★★ · 8 = ★ · <8 = repetir con botón **REVANCHA** gigante.
- Mezcla invisible: ~70 % preguntas nuevas + ~30 % repaso SRS camuflado (el jugador NO distingue cuáles son repaso).
- **Boss del mundo:** simulacro temático de 15 preguntas, máximo 2 fallos, sin música, timer visible. Vencerlo desbloquea el siguiente mundo.
- Desbloqueo por estrellas acumuladas (nunca exigir 100 % — evitar frustración).

### Economía

- **XP → rango de piloto:** Peatón → L Novato → Dominguero → Conductor → Piloto → Leyenda del Asfalto.
- **Chapas** (moneda del juego) → SOLO cosmética: skins del avatar-coche, temas de UI, celebraciones. El dinero real y las Chapas JAMÁS compran respuestas ni progreso.

---

## 7 · LOOPS DE ENGANCHE

- **Micro-loop (20–40 s):** pregunta → respuesta → feedback jugoso → combo/XP.
- **Loop de sesión (3–7 min):** misión → pantalla de resultado → cofre → "una más".
- **Meta-loop (días/semanas):** racha diaria, mapa que avanza, álbum que se completa, predictor que sube.

Mecánicas concretas:

- **Racha 🔥:** días seguidos con ≥ 1 misión. 1 protector de racha gratis/semana, extra con Chapas.
- **Combo:** ×2 XP con 5 seguidas, ×3 con 10. Romper combo tiene su propio sonido (pena, no castigo).
- **Near-miss:** "Te ha faltado 1 para ★★★" + REVANCHA en un tap. El motor nº 1 de "una más".
- **Cofres:** al acabar misión, recompensa variable (Chapas, protectores, cosmética). NUNCA contenido educativo dentro de cofres.
- **Álbum de Señales 📖 (el Pokédex):** cada señal acertada 2 veces se colecciona. 200+ señales en categorías. Completar categoría = recompensa + cosmético. Convierte el tema más denso del examen en coleccionismo puro.
- **Misiones diarias (3):** "Acierta 15 en Señalópolis", "Repara 2 coches del Taller de Errores", "Haz 1 boss".
- **Contrarreloj semanal:** reto personal contra tu récord + tarjeta compartible (esto es el marketing viral gratuito).
- Ligas contra otros jugadores → v2 (requiere backend). En v1, rivales IA claramente etiquetados como IA — nunca bots disfrazados de personas.

---

## 8 · MOTOR PEDAGÓGICO (el arma secreta)

### 8.1 SRS invisible — Leitner 5 cajas
- Intervalos: 0 / 1 / 3 / 7 / 16 días. Acierto sube caja; fallo → caja 1 + entra al Taller.
- La cola de repaso prioriza: falladas recientes > vencidas > señales sin coleccionar.
- El jugador nunca ve "modo repaso": las repasadas van camufladas dentro de las misiones.

### 8.2 Taller de Errores 🔧
- Cada pregunta fallada es **un coche averiado en tu taller** (garaje visual).
- Repararlo = acertarla 2 veces en días distintos.
- Fallada 3+ veces → cartel **SE BUSCA** estilo western/GTA con "recompensa" en Chapas por cazarla.
- Boss semanal del Taller: misión solo con TUS fallos.

### 8.3 Sistema de Trucos (formato obligatorio en TODAS las preguntas)
- `explicacion_corta` — 1–2 frases, siempre.
- `truco` — mnemotecnia memorable, siempre que exista. Estilo:
  - "Sin señales, **la derecha manda**."
  - "**Triángulo avisa, círculo manda, cuadrado informa.**"
  - "Distancia de seguridad = **regla de los 2 segundos**: poste, 'mil ciento uno, mil ciento dos'."
  - "Novel o profesional → **la mitad de todo** (tasa de alcohol y paciencia)."
- `trampa` — por qué la opción incorrecta tienta ("te la cuelan con el 'salvo…'"). Se muestra SOLO al fallar.
- `explicacion_larga` — solo dificultad 4–5: párrafos + mini-escena SVG/diagrama si ayuda. Aquí van las explicaciones súper completas de lo difícil (rotondas, prioridades, adelantamientos, tasas).

### 8.4 DGT Tower — Modo Examen Real
- Formato exacto: **30 preguntas, 30 minutos, máximo 3 fallos para APTO.**
- UI sobria: sin combos, sin música, sin ayudas. Entrenar la sensación del día D.
- Al terminar: corrección completa con trampas y trucos; las falladas van directas al Taller.

### 8.5 Predictor de Aprobado 📊
- % calculado con: precisión de los últimos 200 ítems (ponderada por recencia) + cobertura del temario + últimos 5 simulacros.
- Recomendación honesta y visible: **"Reserva tu examen cuando lleves 5 simulacros APTO seguidos y predictor ≥ 90 %."**
- Prohibido inflarlo. Un predictor calibrado es lo que justifica los 50 €.

---

## 9 · IDENTIDAD VISUAL — DIRECCIÓN "SEÑAL NEÓN"

**Concepto:** pantalla de carga de GTA × señalización vial española × noche de neón. Todo el sistema visual nace del mundo real de la carretera — nada de estética genérica de app educativa.

Tokens base (refinar en F0 con un mini design-plan antes de codificar):

```css
--asfalto-900: #0B0D12;   /* fondo */
--asfalto-700: #161A26;   /* cards */
--linea-blanca: #F4F6FB;  /* texto */
--senal-rojo: #E2001A;    /* error / prohibición */
--senal-azul: #0055B8;    /* info / obligación */
--senal-verde: #007A3D;   /* acierto / autovía */
--amarillo-obras: #FFC800;/* rachas, Chapas, avisos */
--neon-magenta: #FF2D78;  /* acento GTA */
--neon-cian: #00E5FF;     /* acento GTA */
```

- **Tipografía:** display condensada tipo cartel (Anton / Archivo Black) para títulos de misión y sellos; **Overpass** (nacida de la Highway Gothic de carretera) para UI y preguntas; números tabulares en timers.
- **Componentes firma:**
  - Tarjeta de misión = señal vial reimaginada (borde grueso, iconografía de señal).
  - Sello full-screen **"MISIÓN SUPERADA"** con animación de estampado estilo GTA.
  - Cartel **SE BUSCA** para tus errores más repetidos.
  - **El elemento memorable:** el mapa-carretera nocturno donde tu coche avanza por la N-CQ, con la barra de progreso como línea discontinua que se va pintando.
- **Prohibido:** fondo blanco corporativo, ilustraciones flat de stock, look Duolingo-clon, y usar logo/escudo DGT o cualquier cosa que implique oficialidad (somos preparadores, no la DGT).

---

## 10 · JUICE — CHECKLIST OBLIGATORIA POR INTERACCIÓN

- Tap en respuesta: escala 0.97 + haptic ligero.
- **Acierto:** check estampado + partículas + tick sonoro + contador XP rodando.
- **Fallo:** shake horizontal de la card (300 ms) + flash rojo suave + sonido grave NO punitivo → y la trampa aparece al instante.
- Combo: contador con fuego progresivo; glow de pantalla al ×3.
- Mundo completado / subida de rango: takeover full-screen + confeti de mini-señales.
- Cofre: 3 fases (aparece → tap → explota) con 400 ms de anticipación.
- Transición entre pantallas: slide con parallax del mapa.
- Mute persistente. Respetar `prefers-reduced-motion`. En modo examen: silencio total.

---

## 11 · MODELO DE DATOS

### Pregunta (`datos/preguntas/mundo-XX.json`)

```json
{
  "id": "M07-023",
  "mundo": 7,
  "tema": "Adelantamiento",
  "pregunta": "…",
  "imagen": "img/preguntas/m07-023.webp",
  "opciones": ["…", "…", "…"],
  "correcta": 1,
  "dificultad": 4,
  "explicacion_corta": "…",
  "truco": "…",
  "trampa": "…",
  "explicacion_larga": "solo si dificultad >= 4",
  "tags": ["velocidad", "via-interurbana"],
  "senalId": null
}
```

### Estado del jugador (IndexedDB, `schemaVersion` + migraciones)

```json
{
  "xp": 0, "rango": 0, "chapas": 0,
  "racha": { "dias": 0, "ultimoDia": null, "protectores": 1 },
  "mundos": { "1": { "estrellas": 14, "bossSuperado": true } },
  "srs": { "M07-023": { "caja": 2, "vence": "2026-07-08" } },
  "taller": ["M05-011"],
  "album": ["R-101", "P-1"],
  "simulacros": [{ "fecha": "…", "fallos": 2, "apto": true }],
  "ajustes": { "sonido": true, "haptics": true }
}
```

### Banco de preguntas — objetivo 800–1000

- Redacción **100 % original** conforme a normativa vigente. Prohibido copiar bancos de terceros con copyright. Imitar el ESTILO del examen real (incluidas las redacciones-trampa con "salvo…", "excepto…", "como norma general…"), nunca el texto.
- Generar por mundo en lotes de 50: cada lote pasa lint de esquema + auto-revisión del 10 % aleatorio.
- Datos sensibles a cambios normativos (velocidades, tasas, sanciones) → verificar contra normativa 2026 y marcar `[VERIFICAR DGT]` en caso de duda.

---

## 12 · MONETIZACIÓN — "PASE CARNET" 49,99 €

- **Gratis (el gancho):** Mundos 1–3 completos + 1 simulacro/día + Taller básico. Tan bueno que lo recomienden solo.
- **Pase Carnet — pago único 49,99 €:** los 15 mundos + DGT Tower ilimitada + Taller avanzado (SE BUSCA, boss semanal) + Predictor + estadísticas completas + Álbum completo + cosméticos exclusivos.
- El muro de pago aparece en el MEJOR momento: al vencer al boss del Mundo 3, con tu predictor y tu progreso delante ("Ya llevas un 22 % del temario dominado. Desbloquea el resto.").
- **Implementación v1 sin backend:** Stripe Payment Link → página de éxito entrega código → validación local firmada. Aceptable para lanzar; migrar a backend de licencias en v2. Documentar la limitación en `ESTADO.md`.
- **Garantía (pendiente decisión de negocio, dejar preparado el copy):** "Si llegas a Predictor ≥ 90 % con 5 simulacros APTO y suspendes el teórico real, te devolvemos el dinero." Es el argumento que convierte 50 € en una obviedad.
- Lo gratis nunca se degrada con el tiempo. Cero dark patterns: sin culpa, sin urgencias falsas, sin presiones sociales inventadas.

---

## 13 · PLAN DE BUILD POR FASES (cada una acaba jugable + commit + tag)

| Fase | Entregable | Definición de HECHO |
|------|-----------|---------------------|
| **F-1** | Auditoría (§1) | `ESTADO.md` creado, datos validados, plan presentado |
| **F0** | Fundación | Repo ordenado, tokens CSS, shell PWA (manifest + SW), esquemas, 30 preguntas semilla migradas. Instalable y offline en iPhone ✓ |
| **F1** | **Core loop** | Misión de 10 preguntas jugable: feedback con trucos/trampas, XP, estrellas, REVANCHA. Test: "¿te pide el cuerpo otra misión?" |
| **F2** | Mapa y mundos | Mapa-carretera nocturno, 15 mundos con desbloqueo, bosses funcionando |
| **F3** | Motor pedagógico | Leitner + Taller de Errores + mezcla 70/30 invisible |
| **F4** | Juice total | Checklist §10 al completo + sonido + haptics |
| **F5** | DGT Tower | Modo examen real + Predictor calibrándose |
| **F6** | Retención | Rachas, misiones diarias, contrarreloj semanal, Álbum de Señales |
| **F7** | Contenido masivo | Banco completo 800–1000 preguntas por lotes de 50 |
| **F8** | Venta | Paywall Mundo 4+, Stripe link, landing con demo jugable incrustada |

Regla entre fases: probar en iPhone real vía Tailscale antes de dar la fase por cerrada.

---

## 14 · VOZ Y COPY

Castellano de calle, segunda persona, humor de colega. Nunca condescendiente. Máximo una exclamación por pantalla. El humor vive en los trucos y los sellos; la normativa se explica con precisión quirúrgica.

- Acierto: "LIMPIO." · "Ni un radar te pilla." · "Eso es conducir con cabeza."
- Fallo: "PILLADO. Te la han colado. Mira la trampa 👇"
- Combo ×5: "EN RACHA."
- Boss: "SIMULACRO. 15 preguntas. 2 fallos máximo. Sin música. Como el día D."
- Racha día 12: "El asfalto ya te conoce."
- Paywall: directo y honesto, enseñando el progreso real del jugador.

---

## 15 · KPIs DE ÉXITO

- Retención D1 > 40 %, D7 > 20 %.
- Sesión media ≥ 8 min con ≥ 2 misiones.
- El "una más" involuntario aparece antes de la 5ª misión (test cualitativo con humanos reales).
- Predictor calibrado: de quienes salen con ≥ 90 %, más del 85 % aprueban a la primera.
- Conversión free → Pase ≥ 4 %.
- La frase que buscamos oír por la calle: **"me saqué el teórico jugando."**

---

## ▶️ ARRANCA AHORA

1. Ejecuta la F-1 (auditoría de `carnet-quest/`).
2. Escribe `ESTADO.md` y `CLAUDE.md` (este documento).
3. Presenta el plan de la fase actual en ≤ 15 líneas.
4. Ejecuta sin pedir permiso entre pasos. Commit + tag al cerrar cada fase.
