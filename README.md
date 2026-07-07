# 🏁 Carnet Quest

**El juego con el que te sacas el teórico del carnet de conducir** (permiso B, DGT España).
El GTA del carné: misiones cortas, bosses y un predictor honesto que te dice cuándo estás listo para aprobar.

> PWA estática, offline-first, sin frameworks ni backend. HTML/CSS/JS vanilla. Todo el progreso vive en el dispositivo.

## Jugar

Sírvelo por HTTP (el Service Worker y los módulos ES no funcionan con `file://`):

```bash
python3 -m http.server 8000
# abre http://localhost:8000
```

### Publicar en GitHub Pages

El juego está en la raíz del repo y usa rutas relativas, así que se publica tal cual. Dos formas:

- **La más simple (1 clic):** Settings → Pages → *Deploy from a branch* → Branch: `main` → `/ (root)` → Save.
- **Automatizada (CI/CD):** Settings → Pages → Source: *GitHub Actions*. El workflow `.github/workflows/pages.yml` ya incluido despliega en cada push a `main`.

Con cualquiera de las dos queda en `https://terulet.github.io/carnet-quest/`. Para un dominio propio, añade un archivo `CNAME` con el dominio y apúntalo en tu DNS.

## Qué incluye

- **856 preguntas originales** estilo DGT, repartidas en **15 mundos**, cada una con explicación del *porqué*, una **mnemotecnia** ("truco") y la **trampa** del examen que se revela al fallar.
- **Verificación normativa adversarial**: los 15 bancos auditados contra el RGCir/BOE (vigente jul-2026: tasas de alcohol, V-16, RD 465/2025 de señales, ITV, puntos…).
- **Mapa-carretera nocturno** (la N-CQ) con tu coche avanzando y desbloqueo por bosses.
- **Motor pedagógico invisible**: repetición espaciada Leitner (5 cajas), mezcla 70/30 de repaso camuflado y **Taller de Errores** (cada fallo es un coche averiado que reparas acertándolo dos días distintos).
- **DGT Tower**: modo examen real (30 preguntas · 30 min · máx 3 fallos), UI sobria, corrección completa.
- **Predictor de Aprobado honesto**: % con topes anti-inflado (precisión + cobertura + simulacros).
- **Retención**: racha con protectores, misiones diarias, contrarreloj semanal y **Álbum de 112 señales** (renderizadas por SVG).
- **Juice**: sonido 100 % procedural (WebAudio, 0 KB de assets), haptics, sellos estampados, confeti, combos.
- **Tarjeta compartible** en imagen para el "me saqué el teórico jugando" (marketing viral).
- **Monetización**: modelo Pase Carnet 49,99 € — paywall tras el boss del Mundo 3 + canje de código local. Conectar Stripe: ver `tools/VENTA.md`.

## Estructura

```
index.html            Shell de la PWA (el juego)
landing.html          Landing de marketing con demo jugable incrustada
exito.html            Página de éxito de la compra (redirección de Stripe)
manifest.webmanifest  PWA
sw.js                 Service Worker (offline-first)
css/                  tokens.css (identidad "Señal Neón") + app.css
js/                   motor: state, data, srs, mission, predictor, audio, juice, signs, sharecard, screens, main
datos/                mundos.json, senales(.expanded).json, strings.es.json, preguntas/mundo-01..15.json
fonts/                Anton + Overpass (self-hosted)
icons/                iconos PWA (generados por código)
tools/                lint del banco, generador de iconos, generador de códigos, guías (CONTENIDO, VENTA)
CLAUDE.md             la "biblia" de diseño del proyecto
ESTADO.md             estado y decisiones
```

## Herramientas

```bash
node tools/lint-preguntas.mjs      # valida el esquema de las 856 preguntas
node tools/gen-codigos.mjs 50      # genera 50 códigos del Pase Carnet
node tools/make-icons.mjs          # regenera los iconos PWA
```

## Nota legal

Carnet Quest es un **preparador independiente** del examen teórico del permiso B. No es la DGT ni tiene relación con ella. El contenido sigue la normativa vigente; ante cualquier duda, consulta la fuente oficial.
