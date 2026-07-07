# 💳 F8 — Cómo conectar la venta (Stripe) · guía para el dueño

El juego ya trae toda la venta montada MENOS el link de pago real, que solo puedes crear tú
desde tu cuenta de Stripe. Aquí están los 4 pasos para activarlo.

## 1. Genera los códigos de desbloqueo

Cada código vale un Pase Carnet. Se validan en el propio juego (checksum local, sin backend).

```bash
node tools/gen-codigos.mjs 50   # imprime 50 códigos CQ-XXXXX-XXXXX válidos
```

Guarda esa lista. Cada vez que vendas, entregas UNO (y lo tachas para no repetirlo).

> ⚠️ Limitación conocida de v1: la validación es client-side, así que un usuario técnico
> podría fabricar un código si descubre la sal (`asfalto-neon-2026` en `js/screens.js`,
> función `validarCodigo`). Es aceptable para lanzar; en v2 se migra a un backend de licencias.
> Si quieres endurecerlo ya, cambia la sal por una tuya en `js/screens.js` **y** en
> `tools/gen-codigos.mjs` (deben coincidir) antes de generar los códigos.

## 2. Crea el Payment Link en Stripe

1. Stripe → **Payment Links** → producto "Pase Carnet", precio **49,99 €**, pago único.
2. En "After payment" → **Redirect** a: `https://byflamastudio.com/carnet-quest/exito.html`
3. (Opcional avanzado) Si configuras el link para pasar el código en la URL
   (`exito.html?code=CQ-XXXXX-XXXXX`), la página de éxito lo mostrará automáticamente.
   Sin eso, el flujo estándar es entregar el código por email tras el pago.

## 3. Pega el link en el juego

En `js/screens.js`, arriba del todo:

```js
const STRIPE_URL = 'https://buy.stripe.com/TU_LINK_REAL';
```

Sustituye el placeholder por tu Payment Link. Sube el cambio y listo: el botón
"DESBLOQUEAR TODO" del paywall abrirá tu página de pago.

## 4. Entrega del código

- **Recomendado v1:** configura el email de confirmación de Stripe para que incluya un código
  de tu lista (o envíalo tú a mano tras cada compra). El comprador lo pega en el juego.
- La página `exito.html` explica al comprador cómo canjearlo y enlaza de vuelta al juego.

## Cómo canjea el jugador (ya implementado)

1. En el juego, el paywall aparece solo tras vencer al boss del Mundo 3 (el mejor momento),
   o desde cualquier mundo de pago, o con el botón "Ya tengo un código".
2. Pega `CQ-XXXXX-XXXXX` → se valida en local → se activa el Pase para siempre en ese dispositivo.
3. El progreso y el Pase se pueden llevar a otro móvil con Exportar/Importar progreso (Perfil).

## Copy de la garantía (pendiente de tu decisión de negocio)

> "Si llegas a Predictor ≥ 90 % con 5 simulacros APTO y suspendes el teórico real, te
> devolvemos el dinero."

Está puesto en la landing y en `exito.html`. Si NO quieres ofrecer la garantía, quítalo de
ambos sitios (busca "garantia" / "devolvemos el dinero").
