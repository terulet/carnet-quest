# 📋 ESTADO — CARNET QUEST

> Última actualización: 2026-07-06 · Sesión 3

## Fase actual: F0–F8 hechas salvo el Payment Link de Stripe (lo aporta el dueño)

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

## Limitaciones conocidas / decisiones

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

> Nota: el remoto solo acepta push de la rama designada `claude/carnet-quest-game-vsag41`.
