# 🚗 Carnet Quest

**El videojuego para aprobar la teórica del carnet de coche (DGT, permiso B) en 21 días** jugando 15–20 minutos al día.

PWA offline-first, sin frameworks, sin backend. HTML/CSS/JS vanilla. Todo el progreso se guarda en el propio dispositivo.

## Qué incluye

- **600 preguntas originales** estilo DGT (40 por cada uno de los 15 temas), con explicación del *porqué* y mnemotecnias. ~40 % son "preguntas trampa".
- **Motor de repetición espaciada** (SM-2/Leitner): lo que fallas vuelve a las 24 h, 72 h y 7 días; lo que dominas se espacia.
- **15 mundos** (mapa estilo Duolingo) con niveles, píldoras de teoría, sección "⚠️ Las trampas del examen" y un **BOSS** por mundo.
- **Modos**: Misión diaria, Repaso inteligente, Simulacro completo (30 preguntas / 30 min / máx 3 fallos), **Modo Examen Real** (interfaz sobria), Contrarreloj de señales, Duelo de trampas y Muerte súbita.
- **Radar de debilidades** (verde/ámbar/rojo por tema) que dirige el estudio.
- **Gamificación**: XP y niveles, rachas diarias con comodín, logros, cofres y "juice" (confeti, sonidos, vibración).
- **Plan de 21 días** que se adapta a tu ritmo.
- **Señales de tráfico dibujadas en SVG** (sin imágenes con copyright).
- **Exportar/Importar** todo el progreso en JSON.

## Estructura

```
carnet-quest/
├── index.html            ← App shell
├── manifest.webmanifest  ← PWA
├── sw.js                 ← Service worker (offline)
├── css/style.css
├── js/                   ← Motor modular (comentado)
│   ├── contenido.js      · píldoras de teoría + trampas de los 15 mundos
│   ├── senales.js        · biblioteca de señales SVG
│   ├── store.js          · persistencia local + export/import
│   ├── banco.js          · carga de preguntas
│   ├── motor-repaso.js   · repetición espaciada
│   ├── radar.js          · dominio por tema
│   ├── mezclador.js      · cerebro adaptativo (interleaving)
│   ├── gamification.js   · XP, rachas, logros, cofres
│   ├── juice.js          · confeti, sonido, vibración
│   └── app.js            · router + pantallas + quiz
├── datos/tema-01.json … tema-15.json   ← banco de preguntas (editable sin tocar código)
└── icons/
```

Para **añadir o corregir preguntas**, edita el JSON del tema correspondiente en `datos/` — no hace falta tocar el código.

## 🚀 Despliegue en GitHub Pages (5 pasos)

1. Sube la carpeta `carnet-quest/` al repositorio (ya incluida en esta rama).
2. En GitHub: **Settings → Pages → Build and deployment → Source: "Deploy from a branch"**, rama `main`, carpeta `/ (root)`.
3. Espera 1–2 min: el juego estará en `https://<usuario>.github.io/<repo>/carnet-quest/` (o `https://lagelateriaderoses.com/carnet-quest/`).
4. Ábrelo en el móvil y pulsa **"Añadir a pantalla de inicio"** para instalarlo como app.
5. Funciona **sin conexión** tras la primera carga. ¡A estudiar!

> Nota: debe servirse por HTTP(S), no abriendo el archivo con `file://` (el service worker y `fetch` de los JSON lo requieren). En local: `python3 -m http.server` dentro de `carnet-quest/`.
