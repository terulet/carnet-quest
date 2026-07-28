// CARNET QUEST — pantallas y motor de sesión (mapa, mundo, misión, boss, torre, taller, álbum, perfil, paywall)

import {
  getEstado, guardar, HOY, semanaISO, mundoEstado, estrellasDeMundo,
  registrarRespuesta, tocarRacha, exportarJSON, importarJSON, borrarTodo,
} from './state.js';
import { getSenales, getBanco, getBancoCompleto, getCruces, getGaraje, t } from './data.js';
import { svgCruce, animarPaso, reponer, maniobra, desdeTexto, ETIQUETA_TIPO, svgVehiculo, cuerpoVehiculo } from './cruce.js';
import { procesarRespuesta, cochesDelTaller } from './srs.js';
import {
  componerMision, componerBoss, componerExamen, componerTaller,
  estrellasPorAciertos, multiplicadorCombo, darXP, rangoActual, darChapas,
  abrirCofre, guardarEstrellas, RANGO_XP_ACIERTO,
} from './mission.js';
import { calcularPredictor } from './predictor.js';
import { sonido, haptic, setModoExamen } from './audio.js';
import { sello, confeti, setConfeti, xpFlotante, rodarContador, toast, sacudir, glowCombo } from './juice.js';
import { svgSenal } from './signs.js';
import { generarTarjeta, compartirTarjeta } from './sharecard.js';
import { FLAGS } from './retencion/flags.js';
import * as EV from './retencion/eventos.js';
import { revisarDesbloqueos, estaDesbloqueado, progresoDe } from './retencion/desbloqueos.js';
import {
  prepararProxima, guardarProxima, proximaPendiente, proximaLista,
  marcarCompletada, recordarHoraCalendario, materializar,
} from './retencion/proxima.js';
import { adnDe, huecosDe } from './retencion/mundos-adn.js';
import { ofrecerContrato, resolverContrato, PREMIO_CHAPAS } from './retencion/contratos.js';
import {
  diasHasta, fechaExamen, fijarExamen, quitarExamen, anotarResultado,
  examenPendienteDeContar, planDeHoy,
} from './plan.js';

// URL de pago (Stripe Payment Link). ⚠️ Sustituir por el link real antes de vender (ver tools/VENTA.md).
const STRIPE_URL = 'https://buy.stripe.com/REEMPLAZAR_LINK_REAL';
const PRECIO = '49,99 €';
// Mientras no haya link real, el botón de compra no abre una pestaña rota: guía al canje de código.
const stripeListo = () => !STRIPE_URL.includes('REEMPLAZAR');

let S = null;      // strings
let DOC = null;    // mundos.json
let SEN = null;    // señales
let app = null;
let navEl = null;
let hudEl = null;
let pantallas = {};
let actual = null;
let sesion = null; // sesión de juego activa
let paywallMostradoTrasBoss3 = false;
let conBanco = new Set(); // mundos con banco de preguntas disponible
let CRUCES = [];          // puzzles "¿Quién pasa primero?" (cacheados al arrancar)
let GARAJE = null;        // catálogo de cosmética

const VERSION_APP = 'cq-v18';

/** Lee el deep link del hash: '#/next-run' o '#/reto?...'. */
function leerHash() {
  const h = location.hash || '';
  if (h.startsWith('#/next-run')) return 'next-run';
  if (h.startsWith('#/reto')) return 'reto';
  return null;
}
const limpiarHash = () => { try { history.replaceState(null, '', location.pathname + location.search); } catch {} };

const $ = (sel, el = document) => el.querySelector(sel);
const el = (html) => {
  const d = document.createElement('div');
  d.innerHTML = html.trim();
  return d.firstElementChild;
};
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const azar = (arr) => arr[Math.floor(Math.random() * arr.length)];

/* ================= arranque ================= */

export async function iniciarUI(ctx) {
  S = ctx.strings; DOC = ctx.mundos; SEN = await getSenales(); CRUCES = await getCruces(); GARAJE = await getGaraje();
  await Promise.all(DOC.mundos.map(async (m) => {
    const b = await getBanco(m.n);
    if (b.length >= 10) conBanco.add(m.n);
  }));
  app = document.getElementById('app');
  app.innerHTML = `
    <header class="hud oculto" id="hud">
      <span class="hud__chip hud__chip--racha" id="hud-racha">🔥 0</span>
      <span class="hud__chip hud__chip--xp" id="hud-xp">⚡ 0</span>
      <span class="hud__spacer"></span>
      <button class="hud__chip hud__chip--chapas" id="hud-chapas" title="Garaje">🔩 0</button>
    </header>
    <main class="screens" id="screens"></main>
    <nav class="nav oculto" id="nav"></nav>`;
  hudEl = $('#hud');
  navEl = $('#nav');
  const cont = $('#screens');
  for (const id of ['onboarding', 'mapa', 'mundo', 'mision', 'resultado', 'torre', 'taller', 'album', 'perfil', 'paywall', 'rush', 'garaje', 'reto', 'caza']) {
    const sc = el(`<section class="screen" data-screen="${id}"></section>`);
    cont.appendChild(sc);
    pantallas[id] = sc;
  }
  navEl.innerHTML = ['mapa', 'taller', 'torre', 'album', 'perfil'].map((id) => {
    const icos = { mapa: '🗺️', taller: '🔧', torre: '🏢', album: '📖', perfil: '🏎️' };
    return `<button class="nav__btn" data-ir="${id}"><span class="ico">${icos[id]}</span>${t(S, 'nav.' + (id === 'perfil' ? 'perfil' : id))}</button>`;
  }).join('');
  $('#hud-chapas').addEventListener('click', () => { sonido.tap(); haptic.ligero(); navegar('garaje'); });
  navEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ir]');
    if (b) { sonido.tap(); haptic.ligero(); navegar(b.dataset.ir); }
  });
  // Enlace de desbloqueo: ?codigo=CQ-XXXXX-XXXXX (o ?pase= / ?unlock=) activa el Pase al
  // instante, para dejar que alguien pruebe el juego gratis con todo desbloqueado.
  aplicarCosmetica();
  EV.setAppVersion(VERSION_APP);
  EV.nuevaSesion();
  EV.registrar('app_open', { route: 'arranque' });
  revisarDesbloqueos();
  const desbloqueo = aplicarUnlockPorURL();
  // Deep links por hash: funcionan en hosting estático, sin rutas de servidor
  const ruta = leerHash();
  if (!getEstado().onboarded && !ruta) {
    arrancarTutorial();
  } else if (ruta === 'next-run') {
    abrirProximaParada();
  } else if (ruta === 'reto') {
    abrirRetoDesdeHash();
  } else {
    navegar('mapa');
    // si la fecha del examen ya pasó, se pregunta qué tal. Una vez, sin insistir.
    if (examenPendienteDeContar()) setTimeout(() => preguntarPorElExamen(), 700);
  }
  // el jugador puede pegar un enlace con la app ya abierta
  addEventListener('hashchange', () => {
    const r = leerHash();
    if (r === 'next-run') abrirProximaParada();
    else if (r === 'reto') abrirRetoDesdeHash();
  });
  addEventListener('visibilitychange', () => {
    EV.registrar(document.hidden ? 'app_background' : 'app_foreground', { route: actual });
  });
  // `pagehide` es el único cierre que dispara de forma fiable en Safari iOS
  addEventListener('pagehide', () => EV.registrar('session_end', { route: actual }));
  if (desbloqueo === 'ok') {
    if (getEstado().onboarded) { confeti(40); sello(t(S, 'paywall.canjearOk'), 'rango', t(S, 'paywall.desbloqueoLink')); }
    else toast(t(S, 'paywall.desbloqueoLink'));
  } else if (desbloqueo === 'bad') {
    toast(t(S, 'paywall.canjearError'));
  }
}

// Lee un código de la URL y activa el Pase si es válido. Limpia la URL siempre.
function aplicarUnlockPorURL() {
  let codigo = null;
  try {
    const p = new URLSearchParams(location.search);
    codigo = p.get('codigo') || p.get('pase') || p.get('unlock');
  } catch { return null; }
  if (!codigo) return null;
  try { history.replaceState(null, '', location.pathname + location.hash); } catch {}
  const s = getEstado();
  if (s.compras.pase) return null;
  if (validarCodigo(codigo)) {
    s.compras.pase = true;
    s.compras.codigo = codigo.trim().toUpperCase();
    guardar();
    return 'ok';
  }
  return 'bad';
}

const CON_NAV = new Set(['mapa', 'mundo', 'torre', 'taller', 'album', 'perfil']);
const RENDERS = {};

export function navegar(id, params = {}, atras = false) {
  if (sesion?.timerId) { clearInterval(sesion.timerId); sesion.timerId = null; }
  if (actual) pantallas[actual].classList.remove('activa', 'entra', 'entra-atras');
  actual = id;
  const sc = pantallas[id];
  sc.classList.add('activa', atras ? 'entra-atras' : 'entra');
  sc.classList.toggle('screen--sin-nav', !CON_NAV.has(id));
  navEl.classList.toggle('oculto', !CON_NAV.has(id));
  const modoLimpio = params.cfg?.modo === 'examen' || params.cfg?.modo === 'tutorial';
  hudEl.classList.toggle('oculto', id === 'onboarding' || (id === 'mision' && modoLimpio));
  navEl.querySelectorAll('.nav__btn').forEach((b) => b.classList.toggle('activa', b.dataset.ir === id));
  RENDERS[id](sc, params);
  actualizarHUD();
  sc.scrollTop = 0;
}

function actualizarHUD() {
  const s = getEstado();
  $('#hud-racha').textContent = `🔥 ${s.racha.dias}`;
  $('#hud-chapas').textContent = `🔩 ${s.chapas}`;
  $('#hud-xp').textContent = `⚡ ${s.xp}`;
  const taller = Object.keys(s.taller).length;
  const btnTaller = navEl.querySelector('[data-ir="taller"]');
  let badge = btnTaller.querySelector('.badge');
  if (taller > 0) {
    if (!badge) { badge = el('<span class="badge"></span>'); btnTaller.appendChild(badge); }
    badge.textContent = taller > 9 ? '9+' : String(taller);
  } else if (badge) badge.remove();
}

/* ================= mundos accesibles ================= */

const mundoDef = (n) => DOC.mundos.find((m) => m.n === Number(n));

function mundoDesbloqueado(n) {
  if (!conBanco.has(n)) return false; // mundo en obras (banco pendiente)
  // el requisito es vencer al boss del mundo ANTERIOR CON BANCO (los en obras no bloquean)
  for (let p = n - 1; p >= 1; p--) {
    if (conBanco.has(p)) return !!getEstado().mundos[String(p)]?.bossSuperado;
  }
  return true; // es el primer mundo jugable
}
const mundoDePago = (n) => !mundoDef(n).gratis && !getEstado().compras.pase;
const crucesDe = (mundos) => CRUCES.filter((c) => mundos.includes(c.mundo));

function mundosAccesibles() {
  return DOC.mundos.filter((m) => mundoDesbloqueado(m.n) && !mundoDePago(m.n)).map((m) => m.n);
}

/* ================= ONBOARDING ================= */

/** Primer contacto: un cruce jugable antes de una sola línea de texto (§4.1).
 *  Si por lo que sea no hay cruces cargados, cae al onboarding de siempre. */
function arrancarTutorial() {
  const tuto = CRUCES.find((c) => c.id === 'C-001') || CRUCES.find((c) => c.gratis);
  if (!tuto) { navegar('onboarding'); return; }
  navegar('mision', { cfg: { modo: 'tutorial', preguntas: [tuto], titulo: '' } });
}

RENDERS.onboarding = (sc, { ok } = {}) => {
  const jugado = ok !== undefined;
  sc.innerHTML = `<div class="onboard">
    <h1>${t(S, 'onboarding.titulo')}</h1>
    ${jugado
      ? `<p class="onboard__veredicto ${ok ? 'ok' : 'ko'}">${ok ? t(S, 'onboarding.trasAcierto') : t(S, 'onboarding.trasFallo')}</p>
         <p class="sub">${t(S, 'onboarding.trasSub')}</p>`
      : `<p class="sub">${t(S, 'onboarding.sub')}</p>`}
    <ul class="reglas">
      <li><span class="ico">🎮</span>${t(S, 'onboarding.regla1')}</li>
      <li><span class="ico">🪤</span>${t(S, 'onboarding.regla2')}</li>
      <li><span class="ico">📊</span>${t(S, 'onboarding.regla3')}</li>
    </ul>
    <button class="btn btn--primary" id="ob-go">${t(S, 'onboarding.empezar')} 🏁</button>
  </div>`;
  $('#ob-go', sc).onclick = () => {
    getEstado().onboarded = true;
    guardar();
    sonido.acierto(); haptic.ok();
    // la fecha se pide DESPUÉS de haber jugado un cruce (§4.1): primero se juega,
    // después se planifica. Y es saltable — "todavía no lo sé" es una respuesta.
    navegar('mapa');
    pedirFechaExamen({ alCerrar: () => navegar('mapa', {}, true) });
  };
  if (jugado) { sonido.sello(); haptic.celebracion(); }
};

/* ================= FAMILIAS DE TRAMPA ================= */

let TRAMPAS = null;   // módulo diferido: el manifiesto no entra en el arranque

async function modTrampas() {
  if (!TRAMPAS) {
    TRAMPAS = await import('./trampas.js');
    await TRAMPAS.cargarTrampas();
  }
  return TRAMPAS;
}

/** Tarjeta del mapa. Se abre cuando ya hay fallos que analizar. */
function tarjetaCaza(s) {
  const fallos = (s.respuestas || []).filter((r) => !r.ok).length + Object.keys(s.taller || {}).length;
  const abierto = fallos >= 5;
  return `<button class="card-juego ${abierto ? '' : 'card-juego--cerrada'}" id="caza-card">
    <span class="card-juego__ico">${abierto ? '🪤' : '🔒'}</span>
    <span class="card-juego__txt"><b>${t(S, 'trampas.cazaTitulo')}</b><br>
      <span class="texto-suave">${abierto ? esc(t(S, 'trampas.cazaSub')) : esc(t(S, 'trampas.bloqueado'))}</span></span>
    <span class="card-juego__go">${abierto ? 'GO' : ''}</span>
  </button>`;
}

/** Empieza una tanda de Caza-trampas. */
async function empezarCaza() {
  const T = await modTrampas();
  if (!T.hayManifiesto()) { toast(t(S, 'trampas.bloqueado')); return; }
  const s = getEstado();
  const banco = await getBancoCompleto(mundosAccesibles());
  const lista = T.barajaCazaTrampas(banco, s.respuestas, s.taller, 8);
  if (lista.length < 3) { toast(t(S, 'trampas.bloqueado')); return; }
  EV.registrar('caza_started', { metadata: { n: lista.length } });
  navegar('caza', { lista });
}

RENDERS.caza = async (sc, { lista } = {}) => {
  const T = await modTrampas();
  const estado = { i: 0, aciertos: 0, lista: lista || [] };

  const pintar = () => {
    if (estado.i >= estado.lista.length) return resultado();
    const q = estado.lista[estado.i];
    const real = T.familiaDe(q.id);
    const opciones = T.opcionesDeFamilia(real);
    sc.innerHTML = `
      <div class="mision-top">
        <button class="btn-salir" id="salir-caza">✕</button>
        <div class="dashes">${estado.lista.map((_, k) => `<span class="dash ${k < estado.i ? 'dash--ok' : k === estado.i ? 'dash--actual' : ''}"></span>`).join('')}</div>
        <span class="combo-chip">🪤 ${estado.aciertos}</span>
      </div>
      <div class="q-card">
        <div class="q-card__tema">${esc(q.tema)}</div>
        <div class="q-card__texto">${esc(q.pregunta)}</div>
      </div>
      <div class="caza-correcta">
        <span class="caza-correcta__sello">✓ ${t(S, 'trampas.cazaCorrecta')}</span>
        <span>${esc(q.opciones[q.correcta])}</span>
      </div>
      <div class="rt-titulo">${t(S, 'trampas.cazaPregunta')}</div>
      <div id="caza-ops">
        ${opciones.map((f) => {
          const info = T.infoFamilia(f);
          return `<button class="caza-familia" data-f="${f}">
            <b>${esc(info.nombre)}</b>
            <span class="texto-suave">${esc(info.corto)}</span>
          </button>`;
        }).join('')}
      </div>
      <div class="feedback" id="feedback"></div>`;
    $('#salir-caza', sc).onclick = () => { sonido.tap(); navegar('mapa', {}, true); };
    sc.querySelectorAll('.caza-familia').forEach((b) => b.addEventListener('click', () => {
      const ok = b.dataset.f === real;
      sc.querySelectorAll('.caza-familia').forEach((x) => {
        x.disabled = true;
        if (x.dataset.f === real) x.classList.add('caza-familia--ok');
        else if (x === b) x.classList.add('caza-familia--ko');
        else x.classList.add('q-opcion--apagada');
      });
      if (ok) { estado.aciertos++; sonido.acierto(); haptic.ok(); }
      else { sonido.fallo(); haptic.ko(); sacudir($('.q-card', sc)); }
      EV.registrar('caza_answered', { questionId: q.id, correct: ok, questionFormat: 'caza-trampas' });
      const info = T.infoFamilia(real);
      const fb = $('#feedback', sc);
      fb.innerHTML = `
        <div class="feedback__titulo ${ok ? 'feedback__titulo--ok' : 'feedback__titulo--ko'}">${ok ? t(S, 'trampas.cazaAcierto') : t(S, 'trampas.cazaFallo')}</div>
        <div class="feedback__caja feedback__caja--trampa"><b>${t(S, 'mision.trampa')}</b>${esc(q.trampa)}</div>
        <div class="feedback__caja feedback__caja--info"><b>${esc(info.nombre)}</b>${esc(info.consejo)}</div>
        <button class="btn ${ok ? 'btn--verde' : 'btn--cian'}" id="caza-sig">${t(S, 'mision.siguiente')} →</button>`;
      fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      $('#caza-sig', fb).onclick = () => { sonido.tap(); estado.i++; pintar(); };
    }));
    sc.scrollTop = 0;
  };

  const resultado = () => {
    const total = estado.lista.length;
    const pleno = estado.aciertos === total;
    EV.registrar('caza_finished', { metadata: { aciertos: estado.aciertos, total } });
    if (pleno) { sonido.fanfarria(); confeti(24); }
    sc.innerHTML = `<div class="resultado">
      <h1 class="${pleno ? 'ok' : ''}">🪤 ${t(S, 'trampas.cazaTitulo')}</h1>
      <div class="marcador">${t(S, 'trampas.cazaResultado', { n: estado.aciertos, total })}</div>
      <div class="acciones">
        <button class="btn btn--primary" id="caza-otra">${t(S, 'trampas.cazaOtra')}</button>
        <button class="btn btn--ghost" id="caza-radio">${t(S, 'trampas.verRadiografia')}</button>
        <button class="btn btn--ghost" id="caza-mapa">${t(S, 'resultado.alMapa')}</button>
      </div>
      <p class="texto-suave reto-aviso">${t(S, 'trampas.cazaAviso')}</p>
    </div>`;
    $('#caza-otra', sc).onclick = () => { sonido.tap(); empezarCaza(); };
    $('#caza-radio', sc).onclick = () => { sonido.tap(); navegar('perfil'); };
    $('#caza-mapa', sc).onclick = () => { sonido.tap(); navegar('mapa', {}, true); };
  };

  pintar();
};

/** La radiografía, dentro de Perfil. Se rellena en diferido. */
async function pintarRadiografia(sc) {
  const zona = $('#zona-radiografia', sc);
  if (!zona) return;
  const T = await modTrampas();
  const s = getEstado();
  const r = T.radiografia(s.respuestas, s.taller);

  if (!r.listo) {
    zona.innerHTML = r.motivo === 'pocos-datos'
      ? `<p class="texto-suave">${t(S, 'trampas.pocosDatos', { n: r.tiene, min: r.minimo })}</p>`
      : '';
    return;
  }
  const max = r.reparto[0].n || 1;
  zona.innerHTML = `
    ${r.talon
      ? `<div class="talon">
           <div class="talon__kicker">${t(S, 'trampas.talon')}</div>
           <div class="talon__frase">${t(S, 'trampas.talonFrase', { pct: r.talon.pct, familia: esc(r.talon.info.nombre) })}</div>
           <div class="talon__consejo">${esc(r.talon.info.consejo)}</div>
         </div>`
      : `<p class="texto-suave">${t(S, 'trampas.sinTalon')}</p>`}
    <div class="reparto">
      ${r.reparto.slice(0, 6).map((x) => `
        <div class="reparto__fila">
          <span class="reparto__nombre">${esc(x.info.nombre)}</span>
          <span class="reparto__barra"><i style="width:${Math.round(100 * x.n / max)}%"></i></span>
          <span class="reparto__pct">${x.pct} %</span>
        </div>`).join('')}
    </div>
    <p class="legal">${t(S, 'trampas.nota', T.cobertura())}</p>`;
}

/* ================= PLAN DE EXAMEN ================= */

// Total del banco COMPLETO, cacheado. Ojo con esto: el plan se calcula sobre los
// quince mundos, no sobre los que el jugador tenga desbloqueados. El examen de la
// DGT entra entero, así que decirle "vas cómodo" contando solo el Mundo 1 sería
// mentirle. Es el mismo criterio que ya usa el Predictor para la cobertura.
// La banda del mapa se pinta en síncrono y no puede esperar a un await, así que
// se cachea y se repinta cuando llega.
let TOTAL_BANCO = 0;
async function totalBancoExamen() {
  const lista = await getBancoCompleto(DOC.mundos.map((m) => m.n));
  TOTAL_BANCO = lista.length;
  return TOTAL_BANCO;
}

/** Averías pendientes: lo que el Taller tiene esperando. */
const averiasPendientes = () => Object.keys(getEstado().taller || {}).length;

/**
 * La banda de arriba del mapa. Con fecha, deja de decir "racha 4" y pasa a
 * decir cuánto falta, cómo vas y qué toca hoy. Sin fecha, invita a ponerla
 * pero no insiste ni bloquea.
 */
function bandaExamen() {
  const dias = diasHasta(fechaExamen());
  const s = getEstado();

  if (dias === null) {
    return `<button class="banda-examen banda-examen--vacia" id="banda-fecha">
      <span class="banda-examen__ico">🗓️</span>
      <span class="banda-examen__txt"><b>${t(S, 'examen.sinFecha')}</b><br>
        <span class="texto-suave">${t(S, 'examen.sinFechaSub')}</span></span>
      <span class="card-juego__go">+</span>
    </button>`;
  }

  const pred = TOTAL_BANCO ? calcularPredictor(TOTAL_BANCO) : { listo: false };
  const plan = planDeHoy(TOTAL_BANCO || 856, pred, averiasPendientes());
  const cuenta = dias === 0 ? t(S, 'examen.esHoy')
    : dias === 1 ? t(S, 'examen.manana')
    : t(S, 'examen.faltan', { n: dias });
  const estado = pred.listo ? t(S, 'examen.vasAl', { n: pred.pct }) : t(S, 'examen.sinPredictor');

  // qué toca hoy: solo lo que de verdad hay pendiente, sin inventar tareas
  const trozos = [];
  if (plan.nuevasHoy > 0) trozos.push(t(S, 'examen.hoyPreguntas', { n: plan.nuevasHoy }));
  if (plan.averiasHoy > 0) trozos.push(t(S, 'examen.hoyAverias', { n: plan.averiasHoy }));
  if (plan.simulacrosQueFaltan > 0 && (s.simulacros || []).length < 5) trozos.push(t(S, 'examen.hoySimulacro'));
  const toca = trozos.length ? `${t(S, 'examen.hoyToca')}: ${trozos.join(' · ')}` : t(S, 'examen.hoyNada');

  const urgente = dias <= 3;
  return `<button class="banda-examen ${urgente ? 'banda-examen--cerca' : ''}" id="banda-fecha">
    <span class="banda-examen__cuenta">${cuenta}</span>
    <span class="banda-examen__estado">${estado}</span>
    <span class="banda-examen__toca">${esc(toca)}</span>
    ${plan.ritmo === 'imposible' ? `<span class="banda-examen__aviso">${esc(t(S, 'examen.ritmoImposible', { n: plan.nuevasPorDia }))}</span>` : ''}
  </button>`;
}

/** Pantalla de poner o cambiar la fecha. Saltable siempre, sin culpa. */
function pedirFechaExamen({ alCerrar } = {}) {
  const hoy = HOY();
  const maxima = (() => { const d = new Date(`${hoy}T00:00:00`); d.setDate(d.getDate() + 365); return d.toISOString().slice(0, 10); })();
  const actual = fechaExamen();
  const ov = el(`<div class="modal-overlay"><div class="modal" role="dialog" aria-modal="true">
    <div class="contrato-kicker">${t(S, 'examen.titulo')}</div>
    <p class="texto-suave">${t(S, 'examen.sub')}</p>
    <input type="date" id="ex-fecha" class="ex-fecha" value="${actual || ''}" min="${hoy}" max="${maxima}">
    <button class="btn btn--primary" id="ex-ok">${t(S, 'examen.poner')}</button>
    ${actual ? `<button class="btn btn--ghost" id="ex-quitar">${t(S, 'examen.quitar')}</button>` : ''}
    <button class="btn btn--ghost" id="ex-luego">${t(S, 'examen.luego')}</button>
  </div></div>`);
  document.body.appendChild(ov);
  const cerrar = () => { ov.remove(); alCerrar?.(); };
  atraparFoco(ov, cerrar);   // Escape = "todavía no lo sé", la opción neutra
  $('#ex-luego', ov).onclick = () => { sonido.tap(); cerrar(); };
  $('#ex-quitar', ov)?.addEventListener('click', () => {
    sonido.tap();
    quitarExamen();
    EV.registrar('exam_date_cleared');
    toast(t(S, 'examen.quitada'));
    cerrar();
  });
  $('#ex-ok', ov).onclick = () => {
    const v = $('#ex-fecha', ov).value;
    if (!fijarExamen(v)) { toast(t(S, 'examen.invalida'), 3400); return; }
    sonido.acierto(); haptic.ok();
    const d = diasHasta(v);
    EV.registrar('exam_date_set', { metadata: { dias: d } });
    toast(t(S, 'examen.puesta', { n: d }), 3400);
    cerrar();
  };
}

/** Pasó la fecha: se pregunta qué tal, sin puntuar nada. */
function preguntarPorElExamen() {
  const ov = el(`<div class="modal-overlay"><div class="modal" role="dialog" aria-modal="true">
    <div style="font-size:2.6rem">🗓️</div>
    <div class="contrato-kicker">${t(S, 'examen.pasado')}</div>
    <p class="texto-suave">${t(S, 'examen.pasadoSub')}</p>
    <button class="btn btn--verde" id="ex-apto">${t(S, 'examen.apto')}</button>
    <button class="btn btn--ghost" id="ex-noapto">${t(S, 'examen.noApto')}</button>
    <button class="btn btn--ghost" id="ex-aplaz">${t(S, 'examen.aplazado')}</button>
  </div></div>`);
  document.body.appendChild(ov);
  const responder = async (r) => {
    ov.remove();
    anotarResultado(r);
    EV.registrar('exam_result_reported', { metadata: { resultado: r } });
    if (r === 'apto') {
      sonido.fanfarria(); haptic.celebracion(); confeti(50);
      await sello(t(S, 'examen.graciasApto'), 'ok', '🎉');
    } else {
      toast(t(S, r === 'no-apto' ? 'examen.graciasNoApto' : 'examen.graciasAplazado'), 4200);
    }
    navegar('mapa', {}, true);
  };
  atraparFoco(ov, () => { ov.remove(); });   // Escape: ya se preguntará otro día
  $('#ex-apto', ov).onclick = () => responder('apto');
  $('#ex-noapto', ov).onclick = () => responder('no-apto');
  $('#ex-aplaz', ov).onclick = () => responder('aplazado');
}

/* ================= MAPA ================= */

function generarDiarias() {
  const s = getEstado();
  if (s.diarias.fecha === HOY()) return;
  const lista = [
    { tipo: 'aciertos', n: 15, prog: 0, premio: 20 },
    { tipo: 'misiones', n: 2, prog: 0, premio: 20 },
  ];
  if (Object.keys(s.taller).length > 0) lista.push({ tipo: 'reparar', n: 1, prog: 0, premio: 25 });
  else lista.push({ tipo: 'combo', n: 8, prog: 0, premio: 25 });
  lista.forEach((d) => { d.hecha = false; });
  s.diarias = { fecha: HOY(), lista };
  guardar();
}

function textoDiaria(d) {
  const mapa = { aciertos: 'diarias.tipos.aciertos', misiones: 'diarias.tipos.misiones', reparar: 'diarias.tipos.reparar', boss: 'diarias.tipos.boss', combo: 'diarias.tipos.combo' };
  return t(S, mapa[d.tipo], { n: d.n, mundo: '' });
}

function progresarDiaria(tipo, inc = 1) {
  const s = getEstado();
  if (s.diarias.fecha !== HOY()) return;
  for (const d of s.diarias.lista) {
    if (d.tipo !== tipo || d.hecha) continue;
    d.prog = Math.min(d.n, d.prog + inc);
    if (d.prog >= d.n) {
      d.hecha = true;
      darChapas(d.premio);
      toast(`✅ ${textoDiaria(d)} · +${d.premio} 🔩`);
      haptic.celebracion();
    }
  }
  guardar();
}

RENDERS.mapa = (sc) => {
  generarDiarias();
  const s = getEstado();
  const W = 340, paso = 96, margen = 90;
  const nodos = DOC.mundos.map((m, i) => ({
    m, x: [80, 240, 110, 255, 85, 245, 130, 260, 90, 235, 115, 255, 95, 245, 170][i],
    y: margen + (DOC.mundos.length - 1 - i) * paso + 60,
  }));
  const torreY = margen - 20;
  const torreX = 170;
  let d = `M ${nodos[0].x} ${nodos[0].y + 40}`;
  nodos.forEach((n, i) => {
    if (i === 0) { d += ` L ${n.x} ${n.y}`; return; }
    const prev = nodos[i - 1];
    const my = (prev.y + n.y) / 2;
    d += ` C ${prev.x} ${my}, ${n.x} ${my}, ${n.x} ${n.y}`;
  });
  d += ` C ${nodos.at(-1).x} ${(nodos.at(-1).y + torreY) / 2}, ${torreX} ${(nodos.at(-1).y + torreY) / 2}, ${torreX} ${torreY + 30}`;

  // mundo actual = primero no completado y accesible
  let actualN = 1;
  for (const m of DOC.mundos) {
    if (mundoDesbloqueado(m.n)) actualN = m.n;
    if (!s.mundos[String(m.n)]?.bossSuperado) break;
  }
  const fracProgreso = Math.min(1, (DOC.mundos.findIndex((m) => m.n === actualN) + 0.5) / (DOC.mundos.length + 1));
  const alto = margen + DOC.mundos.length * paso + 80;
  const clipY = alto - fracProgreso * alto;

  sc.innerHTML = `
    ${bandaExamen()}
    <div class="mapa-titulo"><span class="via">N-CQ</span><h1>${t(S, 'mapa.titulo')}</h1></div>
    <div class="mapa-wrap">
    <svg class="mapa-svg" viewBox="0 0 ${W} ${alto}" xmlns="http://www.w3.org/2000/svg">
      <defs><clipPath id="clip-prog"><rect x="0" y="${clipY}" width="${W}" height="${alto - clipY}"/></clipPath></defs>
      <path d="${d}" fill="none" stroke="#161A26" stroke-width="46" stroke-linecap="round"/>
      <path d="${d}" fill="none" stroke="#00E5FF" stroke-width="48" stroke-linecap="round" opacity="0.08"/>
      <path d="${d}" fill="none" stroke="#2A3145" stroke-width="4" stroke-dasharray="14 16" stroke-linecap="round"/>
      <path d="${d}" fill="none" stroke="#FFC800" stroke-width="4" stroke-dasharray="14 16" stroke-linecap="round" clip-path="url(#clip-prog)"/>
      <g class="nodo ${s.compras.pase || true ? '' : ''}" data-torre="1" style="cursor:pointer">
        <circle class="nodo__circulo" cx="${torreX}" cy="${torreY}" r="34"/>
        <text class="nodo__icono" x="${torreX}" y="${torreY + 9}" text-anchor="middle" font-size="30">🏢</text>
        <text class="nodo__nombre" x="${torreX}" y="${torreY - 44}" text-anchor="middle">DGT TOWER</text>
      </g>
      ${nodos.map(({ m, x, y }) => {
        const desb = mundoDesbloqueado(m.n);
        const obras = !conBanco.has(m.n);
        const pago = mundoDePago(m.n);
        const est = estrellasDeMundo(m.n);
        const done = s.mundos[String(m.n)]?.bossSuperado;
        const cls = done ? 'nodo--completo' : !desb ? 'nodo--bloqueado' : pago ? 'nodo--pase' : m.n === actualN ? 'nodo--activo' : '';
        return `<g class="nodo ${cls}" data-mundo="${m.n}">
          <circle class="nodo__circulo" cx="${x}" cy="${y}" r="30"/>
          <text class="nodo__icono" x="${x}" y="${y + 9}" text-anchor="middle" font-size="26">${obras ? '🚧' : !desb ? '🔒' : pago ? '🔒' : m.icono}</text>
          <text class="nodo__nombre" x="${x}" y="${y + 52}" text-anchor="middle">${esc(m.nombre)}</text>
          ${desb && !pago ? `<text class="nodo__stars" x="${x}" y="${y + 68}" text-anchor="middle">★ ${est}/18</text>` : ''}
          ${m.n === actualN && desb && !pago
            ? `<g class="coche-avatar" transform="translate(${x - 50} ${y}) scale(.62)">${cuerpoVehiculo(cocheActual())}</g>`
            : ''}
        </g>`;
      }).join('')}
    </svg>
    </div>
    <div class="diarias">
      <h2>${t(S, 'diarias.titulo')}</h2>
      ${s.diarias.lista.map((dd) => `
        <div class="diaria ${dd.hecha ? 'diaria--hecha' : ''}">
          <span class="diaria__check">${dd.hecha ? '✅' : '⬜'}</span>
          <span class="diaria__texto">${textoDiaria(dd)} <span class="texto-suave">(${dd.prog}/${dd.n})</span></span>
          <span class="diaria__premio">+${dd.premio} 🔩</span>
        </div>`).join('')}
      <div class="sep"></div>
      ${tarjetaProxima()}
      ${tarjetasDeModo(s)}
      ${tarjetaCaza(s)}
      ${tarjetaReto()}
    </div>`;

  sc.querySelectorAll('.nodo[data-mundo]').forEach((g) => {
    g.addEventListener('click', () => {
      const n = Number(g.dataset.mundo);
      sonido.tap(); haptic.ligero();
      if (!conBanco.has(n)) { toast('🚧 Mundo en obras: banco de preguntas en camino'); return; }
      if (!mundoDesbloqueado(n)) { toast(t(S, 'mapa.bloqueado')); return; }
      if (mundoDePago(n)) { navegar('paywall'); return; }
      navegar('mundo', { n });
    });
  });
  $('[data-torre]', sc).addEventListener('click', () => {
    sonido.tap();
    if (!estaDesbloqueado('torre')) { toast(textoCondicion('torre')); return; }
    EV.registrar('mode_open', { modeId: 'torre', route: 'mapa' });
    navegar('torre');
  });
  const ACCIONES = {
    cruces: () => empezarCruces(),
    rush: () => { sonido.tap(); haptic.medio(); navegar('rush'); },
    bote: () => empezarBote(),
    crono: () => empezarContrarreloj(),
  };
  sc.querySelectorAll('[data-modo]').forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.modo;
    if (!estaDesbloqueado(id)) {
      // la condición se dice tal cual: ni "próximamente" ni cuentas atrás
      sonido.tap(); haptic.ligero();
      toast(textoCondicion(id));
      return;
    }
    EV.registrar('mode_open', { modeId: id, route: 'mapa' });
    ACCIONES[id]?.();
  }));
  $('#proxima-card', sc)?.addEventListener('click', () => abrirProximaParada());
  $('#reto-card', sc)?.addEventListener('click', () => { sonido.tap(); haptic.ligero(); crearReto(); });
  $('#caza-card', sc)?.addEventListener('click', () => {
    sonido.tap(); haptic.ligero();
    if ($('#caza-card', sc).classList.contains('card-juego--cerrada')) { toast(t(S, 'trampas.bloqueado')); return; }
    empezarCaza();
  });
  $('#banda-fecha', sc)?.addEventListener('click', () => {
    sonido.tap(); haptic.ligero();
    pedirFechaExamen({ alCerrar: () => navegar('mapa', {}, true) });
  });
  // el total del banco se calcula una vez; si aún no estaba, se repinta la banda
  if (!TOTAL_BANCO && fechaExamen()) {
    totalBancoExamen().then(() => { if (actual === 'mapa') navegar('mapa', {}, true); });
  }
  // El viaje empieza abajo: el primer mundo queda a la vista al entrar, despejado
  // del nav. Hay que contar el offsetTop del mapa (el título va antes) o el nombre
  // del mundo acaba pisado por la barra inferior.
  requestAnimationFrame(() => {
    const wrap = $('.mapa-wrap', sc);
    const nav = (navEl?.offsetHeight || 76) + 24;
    // la banda de examen va pegajosa arriba: hay que descontar su alto o el
    // nombre del primer mundo queda debajo de ella
    const banda = $('.banda-examen', sc)?.offsetHeight || 0;
    sc.scrollTop = Math.max(0, wrap.offsetTop + wrap.offsetHeight - sc.clientHeight + nav + banda);
  });
};

/* ================= MUNDO ================= */

RENDERS.mundo = async (sc, { n }) => {
  const m = mundoDef(n);
  const banco = await getBanco(n);
  const est = mundoEstado(n);
  const total = estrellasDeMundo(n);
  const bossOk = est.bossSuperado;
  const bossDisponible = total >= m.estrellasBoss;
  sc.innerHTML = `
    <div class="mision-top"><button class="btn-salir" id="volver">←</button></div>
    <div class="mundo-head">
      <div class="icono">${m.icono}</div>
      <h1 style="color:${m.color}">${esc(m.nombre)}</h1>
      <div class="lema">“${esc(m.lema)}”</div>
      <div class="progreso-mundo">★ ${total}/18 · ${esc(m.temario)}</div>
    </div>
    ${franjaADN(n)}
    ${banco.length === 0 ? `<p class="centrado texto-suave">Este mundo está en obras 🚧 (banco de preguntas en camino)</p>` : `
    <h2 class="texto-suave" style="margin-bottom:12px">${t(S, 'mundo.elegirMision')}</h2>
    ${m.misiones.map((nombre, i) => {
      const stars = est.estrellas[i] || 0;
      const desb = i === 0 || (est.estrellas[i - 1] || 0) >= 1;
      const cls = stars > 0 ? 'mision-card--hecha' : desb ? 'mision-card--activa' : 'mision-card--bloqueada';
      return `<button class="mision-card ${cls}" data-mision="${i}">
        <span class="mision-card__num">${i + 1}</span>
        <span class="mision-card__nombre">${esc(nombre)}</span>
        <span class="mision-card__stars">${'★'.repeat(stars)}${'<span style="color:var(--asfalto-500)">★</span>'.repeat(3 - stars)}</span>
      </button>`;
    }).join('')}
    <button class="boss-card ${bossOk ? 'boss-card--superado' : bossDisponible ? '' : 'boss-card--bloqueado'}" id="boss">
      <span class="icono">${bossOk ? '🏆' : '👹'}</span>
      <span style="flex:1">
        <h3>${esc(m.boss.nombre)} ${bossOk ? '· ' + t(S, 'mundo.superado') : ''}</h3>
        <span class="sub">${bossDisponible || bossOk ? esc(m.boss.intro) : t(S, 'mundo.bossBloqueado', { n: m.estrellasBoss })}</span>
      </span>
    </button>`}`;
  $('#volver', sc).onclick = () => { sonido.tap(); navegar('mapa', {}, true); };
  sc.querySelectorAll('[data-mision]').forEach((b) => {
    b.addEventListener('click', async () => {
      sonido.tap(); haptic.ligero();
      const i = Number(b.dataset.mision);
      const accesibles = mundosAccesibles();
      const bancoQ = await getBancoCompleto(accesibles);
      const cruces = crucesDe(accesibles);
      // el repaso camuflado también puede caer en forma de cruce ya fallado (§8.1)
      let preguntas = componerMision(banco, bancoQ.concat(cruces), i);
      if (!preguntas.length) return;
      if (adnDe(n).mods.reglaTrampa) await prepararReglaTrampa();
      preguntas = aplicarADN(preguntas, n, i, cruces, banco);
      lanzarMision({ modo: 'mision', mundoN: n, misionIdx: i, preguntas, titulo: m.misiones[i] });
    });
  });
  const bossBtn = $('#boss', sc);
  if (bossBtn) bossBtn.addEventListener('click', () => {
    sonido.tap(); haptic.medio();
    mostrarIntroBoss(m, banco);
  });
};

function mostrarIntroBoss(m, banco) {
  const ov = el(`<div class="modal-overlay"><div class="modal" role="dialog" aria-modal="true">
    <div style="font-size:3rem">👹</div>
    <h2 style="color:var(--senal-rojo-vivo)">${esc(m.boss.nombre)}</h2>
    <p>${t(S, 'boss.aviso', { n: 15, fallos: 2 })}</p>
    <button class="btn btn--primary" id="boss-go">${t(S, 'boss.empezar')}</button>
    <button class="btn btn--ghost" id="boss-no">${t(S, 'boss.huir')}</button>
  </div></div>`);
  document.body.appendChild(ov);
  atraparFoco(ov, () => ov.remove());
  $('#boss-no', ov).onclick = () => ov.remove();
  $('#boss-go', ov).onclick = () => {
    ov.remove();
    const preguntas = componerBoss(banco, 15);
    navegar('mision', { cfg: { modo: 'boss', mundoN: m.n, preguntas, limiteFallos: 2, titulo: m.boss.nombre } });
  };
}

/* ================= MOTOR DE SESIÓN (misión/boss/examen/taller/crono) ================= */

RENDERS.mision = (sc, { cfg }) => {
  setModoExamen(cfg.modo === 'examen');
  sesion = {
    ...cfg,
    idx: 0, aciertos: 0, fallos: 0, combo: 0, maxCombo: 0, xp: 0,
    reparadas: 0, fallosSenal: 0,
    resultados: [], t0: Date.now(), timerId: null,
    bote: 0, boteAntes: 0, escalon: 0, cobrado: 0, plantado: false,
    limiteFallos: cfg.limiteFallos ?? Infinity,
    duracion: cfg.modo === 'examen' ? 30 * 60 : cfg.modo === 'crono' ? 90 : null,
    nFrio: cfg.nFrio || 0,
  };
  sc.classList.toggle('modo-examen', cfg.modo === 'examen');
  EV.registrar('mission_start', {
    route: 'mision', modeId: cfg.modo, worldId: cfg.mundoN, missionId: cfg.misionIdx,
    metadata: { n: cfg.preguntas.length, contrato: cfg.contrato?.id },
  });
  pintarPregunta(sc);
  if (sesion.duracion != null || cfg.modo === 'boss') {
    sesion.timerId = setInterval(() => tickTimer(sc), 1000);
  }
};

function tickTimer(sc) {
  if (!sesion) return;
  const trans = Math.floor((Date.now() - sesion.t0) / 1000);
  const chip = $('.timer-chip', sc);
  if (!chip) return;
  if (sesion.duracion == null) { // boss: cuenta hacia arriba
    chip.textContent = fmtTiempo(trans);
    return;
  }
  const resta = sesion.duracion - trans;
  chip.textContent = fmtTiempo(Math.max(0, resta));
  chip.classList.toggle('timer-chip--rojo', resta <= 60);
  if (resta <= 10 && resta > 0 && sesion.modo === 'crono') sonido.tictac();
  if (resta <= 0) {
    clearInterval(sesion.timerId);
    terminarSesion();
  }
}

const fmtTiempo = (seg) => `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, '0')}`;

/** Barra superior común a preguntas y cruces: salir + progreso + combo/timer/vidas. */
function barraTop() {
  const n = sesion.preguntas.length;
  const esExamen = sesion.modo === 'examen';
  const dashes = n <= 15
    ? `<div class="dashes">${sesion.preguntas.map((_, i) =>
        `<span class="dash ${(sesion.modo !== 'cruce' && sesion.preguntas[i].tipo === 'cruce') ? 'dash--cruce' : ''} ${i < sesion.idx ? (sesion.resultados[i]?.ok ? 'dash--ok' : 'dash--ko') : i === sesion.idx ? 'dash--actual' : ''}"></span>`).join('')}</div>`
    : `<div class="dashes" style="visibility:hidden"></div>`;
  const derecha = esExamen
    ? `<span class="texto-suave" style="font-variant-numeric:tabular-nums">${sesion.idx + 1}/${n}</span><span class="timer-chip">${fmtTiempo(sesion.duracion)}</span>`
    : sesion.modo === 'boss'
      ? `<span class="fallos-vidas">${'❤️'.repeat(Math.max(0, sesion.limiteFallos + 1 - sesion.fallos))}${'🖤'.repeat(Math.min(sesion.fallos, sesion.limiteFallos + 1))}</span><span class="timer-chip">0:00</span>`
      : sesion.modo === 'crono'
        ? `<span class="timer-chip">${fmtTiempo(90)}</span>`
      : sesion.modo === 'bote'
        ? `<span class="bote-chip" id="bote-chip">🏆 ${sesion.bote}</span>`
        : `<span class="combo-chip" id="combo">${sesion.combo >= 2 ? '🔥' + sesion.combo : ''}</span>`;
  if (sesion.modo === 'tutorial') {
    return `<div class="mision-top mision-top--tutorial">
      <span class="dashes" style="visibility:hidden"></span>
      <button class="btn-saltar" id="salir">${t(S, 'onboarding.saltar')}</button>
    </div>`;
  }
  return `<div class="mision-top">
      <button class="btn-salir" id="salir">✕</button>
      ${dashes}
      ${derecha}
    </div>`;
}

/** En la Próxima Parada, un rótulo marca dónde acaba el arranque en frío. */
function rotuloFase() {
  if (sesion.modo !== 'proxima') return '';
  const enFrio = sesion.idx < sesion.nFrio;
  const primero = sesion.idx === 0 || sesion.idx === sesion.nFrio;
  if (!primero) return '';
  return `<div class="fase-rotulo">
    <b>${enFrio ? t(S, 'proxima.frioTitulo') : t(S, 'proxima.rutaTitulo')}</b>
    ${enFrio ? `<span>${t(S, 'proxima.frioSub')}</span>` : ''}
  </div>`;
}

function pintarPregunta(sc) {
  const q = sesion.preguntas[sesion.idx];
  sesion.tPregunta = Date.now();   // para medir el tiempo de respuesta real
  if (q.tipo === 'cruce') return pintarCruce(sc, q);
  if (q._reglaTrampa && FLAGS.ruleTrap && sesion.modo !== 'examen' && sesion.modo !== 'boss') {
    const tar = tarjetaReglaTrampa(q.id);
    if (tar) return pintarReglaTrampa(sc, q, tar);
  }
  const senal = q.senalId ? SEN.senales.find((x) => x.id === q.senalId) : null;
  const esExamen = sesion.modo === 'examen';
  sc.innerHTML = `
    ${barraTop()}
    ${rotuloFase()}
    <div class="q-card" id="qcard">
      <div class="q-card__tema">${esc(q.tema)}${esExamen ? '' : ` · P${sesion.idx + 1}`}</div>
      <div class="q-card__texto">${esc(q.pregunta)}</div>
      ${senal ? `<div class="senal-mini">${svgSenal(senal)}</div>` : ''}
    </div>
    <div id="opciones">
      ${q.opciones.map((op, i) => `
        <button class="q-opcion" data-i="${i}">
          <span class="q-opcion__letra">${'ABCD'[i]}</span>
          <span>${esc(op)}</span>
        </button>`).join('')}
    </div>
    <div class="feedback" id="feedback"></div>`;
  $('#salir', sc).onclick = () => confirmarSalida();
  sc.querySelectorAll('.q-opcion').forEach((b) => b.addEventListener('click', (ev) => responder(sc, q, Number(b.dataset.i), ev)));
  sc.scrollTop = 0;
}

function confirmarSalida() {
  if (sesion?.modo === 'tutorial') {
    sesion = null;
    navegar('onboarding');
    return;
  }
  const ov = el(`<div class="modal-overlay"><div class="modal" role="dialog" aria-modal="true">
    <h2>🚪</h2><p>${t(S, 'mision.abandonar')}</p>
    <button class="btn btn--ghost" id="m-salir">${t(S, 'mision.salir')}</button>
    <button class="btn btn--cian" id="m-seguir">${t(S, 'mision.seguir')}</button>
  </div></div>`);
  document.body.appendChild(ov);
  // Escape = seguir jugando: nunca abandona la misión por un golpe de teclado
  atraparFoco(ov, () => ov.remove());
  $('#m-seguir', ov).onclick = () => ov.remove();
  $('#m-salir', ov).onclick = () => {
    ov.remove();
    setModoExamen(false);
    EV.registrar('mission_abandon', {
      route: 'mision', modeId: sesion.modo, worldId: sesion.mundoN, missionId: sesion.misionIdx,
      metadata: { en: sesion.idx, de: sesion.preguntas.length },
    });
    if (sesion?.timerId) clearInterval(sesion.timerId);
    const vuelta = sesion.modo === 'examen' ? 'torre' : sesion.modo === 'taller' ? 'taller' : sesion.mundoN ? 'mundo' : 'mapa';
    const params = vuelta === 'mundo' ? { n: sesion.mundoN } : {};
    sesion = null;
    navegar(vuelta, params, true);
  };
}

function responder(sc, q, i, ev) {
  if (!sesion) return;
  const ok = i === q.correcta;
  const esExamen = sesion.modo === 'examen';

  // Chequeo de confianza: se pregunta ANTES de revelar nada. Después de ver el
  // resultado la respuesta ya no vale: todo el mundo "lo sabía".
  if (q._confianza && !esExamen && sesion.modo !== 'crono') {
    sc.querySelectorAll('.q-opcion').forEach((b) => {
      b.disabled = true;
      if (Number(b.dataset.i) !== i) b.classList.add('q-opcion--apagada');
    });
    pedirConfianza(sc, (seguro) => revelar(sc, q, i, ev, ok, seguro));
    return;
  }
  revelar(sc, q, i, ev, ok, null);
}

/** Revela el resultado y puntúa. `seguro` es null si no se preguntó. */
function revelar(sc, q, i, ev, ok, seguro) {
  if (!sesion) return;
  const esExamen = sesion.modo === 'examen';
  sesion.resultados.push({ q, elegida: i, ok });

  // bloquear opciones y marcar
  sc.querySelectorAll('.q-opcion').forEach((b) => {
    const bi = Number(b.dataset.i);
    b.disabled = true;
    b.classList.remove('q-opcion--apagada');
    if (bi === q.correcta && !esExamen) b.classList.add('q-opcion--ok');
    else if (bi === i && !ok && !esExamen) b.classList.add('q-opcion--ko');
    else if (!esExamen) b.classList.add('q-opcion--apagada');
  });

  contabilizar(sc, q, ok, ev);
  if (seguro !== null) {
    EV.registrar('confidence_answered', {
      questionId: q.id, correct: ok, questionFormat: 'confianza',
      metadata: { seguro },
    });
  }
  if (esExamen) { setTimeout(() => avanzar(sc), 220); return; }
  if (sesion.modo === 'crono') { setTimeout(() => avanzar(sc), ok ? 350 : 650); return; }
  mostrarFeedback(sc, q, ok, seguro);
}

/** "¿Vas seguro?" — dos botones, mismo peso visual. Ninguno penaliza. */
function pedirConfianza(sc, cb) {
  const fb = $('#feedback', sc);
  if (!fb) return cb(null);
  EV.registrar('confidence_prompted', { questionId: sesion.preguntas[sesion.idx]?.id });
  fb.innerHTML = `<div class="confianza">
    <b class="confianza__pregunta">${t(S, 'confianza.pregunta')}</b>
    <div class="confianza__botones">
      <button class="btn btn--ghost" id="conf-si">${t(S, 'confianza.seguro')}</button>
      <button class="btn btn--ghost" id="conf-no">${t(S, 'confianza.dudo')}</button>
    </div>
  </div>`;
  fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  const elegir = (v) => { sonido.tap(); haptic.ligero(); fb.innerHTML = ''; cb(v); };
  $('#conf-si', fb).onclick = () => elegir(true);
  $('#conf-no', fb).onclick = () => elegir(false);
}

/* ============ REGLA CONTRA TRAMPA ============ */

let RT = null;   // manifiesto cargado en diferido; null = aún no se ha pedido

/** Carga diferida: solo si algún mundo la pide de verdad. */
async function prepararReglaTrampa() {
  if (RT !== null || !FLAGS.ruleTrap) return;
  try {
    RT = await import('./retencion/reglatrampa.js');
    await RT.cargarReglaTrampa();
  } catch { RT = { estaDisponible: () => false, tarjetaDe: () => null }; }
}

const tarjetaReglaTrampa = (id) => (RT && RT.estaDisponible() ? RT.tarjetaDe(id) : null);

// Anillo de las últimas tarjetas usadas: §14 pide no repetir una inmediatamente.
// Vive en memoria a propósito — al reabrir la app da igual haberla visto ayer.
const RT_RECIENTES = [];
const RT_MEMORIA = 12;
function anotarReglaTrampa(id) {
  RT_RECIENTES.push(id);
  if (RT_RECIENTES.length > RT_MEMORIA) RT_RECIENTES.shift();
}

/**
 * Dos tarjetas: una regla y una trampa. El PRIMER intento es el que cuenta
 * (§8.5). La pregunta de cuatro opciones que viene después es corrección
 * guiada: no vuelve a puntuar ni borra el fallo.
 */
function pintarReglaTrampa(sc, q, tar) {
  const izq = tar.reglaIzquierda ? tar.ruleText : tar.trapText;
  const der = tar.reglaIzquierda ? tar.trapText : tar.ruleText;
  EV.registrar('ruletrap_shown', { questionId: q.id, questionFormat: 'regla-trampa' });
  sc.innerHTML = `
    ${barraTop()}
    ${rotuloFase()}
    <div class="q-card q-card--rt" id="qcard">
      <div class="q-card__tema">${esc(q.tema)}</div>
      <div class="q-card__texto rt-contexto">${esc(tar.contexto)}</div>
    </div>
    <div class="rt-titulo">${t(S, 'reglaTrampa.titulo')}</div>
    <div class="rt-cartas" id="rt-cartas">
      <button class="rt-carta" data-lado="izq"><span class="rt-carta__marca">1</span><span>${esc(izq)}</span></button>
      <button class="rt-carta" data-lado="der"><span class="rt-carta__marca">2</span><span>${esc(der)}</span></button>
    </div>
    <div class="feedback" id="feedback"></div>`;
  $('#salir', sc).onclick = () => confirmarSalida();
  sc.querySelectorAll('.rt-carta').forEach((b) => b.addEventListener('click', (ev) => {
    const esRegla = (b.dataset.lado === 'izq') === !!tar.reglaIzquierda;
    resolverReglaTrampa(sc, q, tar, b, esRegla, ev);
  }));
  sc.scrollTop = 0;
}

function resolverReglaTrampa(sc, q, tar, boton, ok, ev) {
  sesion.resultados.push({ q, elegida: ok ? q.correcta : -1, ok });
  sc.querySelectorAll('.rt-carta').forEach((b) => {
    b.disabled = true;
    const esRegla = (b.dataset.lado === 'izq') === !!tar.reglaIzquierda;
    b.classList.add(esRegla ? 'rt-carta--regla' : 'rt-carta--trampa');
  });
  boton.classList.add('rt-carta--elegida');
  contabilizar(sc, q, ok, ev);
  // `rule_trap_answered` es el nombre del catálogo; el sufijo deja claro en los
  // datos que este es el intento evaluado y no la corrección posterior
  EV.registrar('rule_trap_answered', {
    questionId: q.id, correct: ok, questionFormat: 'regla-trampa',
    metadata: { intento: 'primero', evaluado: true },
  });
  const fb = $('#feedback', sc);
  fb.innerHTML = `
    <div class="feedback__titulo ${ok ? 'feedback__titulo--ok' : 'feedback__titulo--ko'}">${ok ? t(S, 'reglaTrampa.correcto') : t(S, 'reglaTrampa.fallo')}</div>
    ${q.truco ? `<div class="feedback__caja feedback__caja--truco"><b>${t(S, 'mision.truco')}</b>${esc(q.truco)}</div>` : ''}
    <button class="btn ${ok ? 'btn--verde' : 'btn--cian'}" id="rt-seguir">${t(S, 'mision.siguiente')} →</button>`;
  fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  $('#rt-seguir', fb).onclick = () => { sonido.tap(); correccionGuiada(sc, q); };
}

/** Corrección guiada: la pregunta entera. NO puntúa, NO borra el fallo. */
function correccionGuiada(sc, q) {
  EV.registrar('ruletrap_correction_shown', { questionId: q.id });
  sc.innerHTML = `
    ${barraTop()}
    <div class="q-card q-card--correccion" id="qcard">
      <div class="q-card__tema">${t(S, 'reglaTrampa.correccion')}</div>
      <div class="q-card__texto">${esc(q.pregunta)}</div>
    </div>
    <div id="opciones">
      ${q.opciones.map((op, i) => `
        <button class="q-opcion" data-i="${i}">
          <span class="q-opcion__letra">${'ABCD'[i]}</span>
          <span>${esc(op)}</span>
        </button>`).join('')}
    </div>
    <div class="feedback" id="feedback"></div>`;
  $('#salir', sc).onclick = () => confirmarSalida();
  sc.querySelectorAll('.q-opcion').forEach((b) => b.addEventListener('click', () => {
    const i = Number(b.dataset.i);
    const ok = i === q.correcta;
    sc.querySelectorAll('.q-opcion').forEach((x) => {
      const xi = Number(x.dataset.i);
      x.disabled = true;
      if (xi === q.correcta) x.classList.add('q-opcion--ok');
      else if (xi === i) x.classList.add('q-opcion--ko');
      else x.classList.add('q-opcion--apagada');
    });
    sonido.tap();
    const fb = $('#feedback', sc);
    fb.innerHTML = `
      <div class="feedback__caja feedback__caja--info"><b>${t(S, 'mision.porQue')}</b>${esc(q.explicacion_corta)}</div>
      ${!ok && q.trampa ? `<div class="feedback__caja feedback__caja--trampa"><b>${t(S, 'mision.trampa')}</b>${esc(q.trampa)}</div>` : ''}
      <button class="btn btn--cian" id="siguiente">${t(S, 'mision.siguiente')} →</button>`;
    fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    $('#siguiente', fb).onclick = () => { sonido.tap(); avanzar(sc); };
  }));
  sc.scrollTop = 0;
}

/** Puntuación común a preguntas y cruces: SRS, combo, XP, sonido, HUD. */
function contabilizar(sc, q, ok, ev = {}) {
  const esExamen = sesion.modo === 'examen';
  const esCrono = sesion.modo === 'crono';
  if (ok) sesion.aciertos++; else sesion.fallos++;
  if (!ok && q.senalId) sesion.fallosSenal++;

  EV.registrar('question_answer', {
    route: 'mision', modeId: sesion.modo, worldId: sesion.mundoN, missionId: sesion.misionIdx,
    questionId: q.id, correct: ok,
    questionFormat: q.tipo === 'cruce' ? 'cruce' : q._reglaTrampa ? 'regla-trampa' : q._confianza ? 'confianza' : 'normal',
    responseTimeMs: sesion.tPregunta ? Date.now() - sesion.tPregunta : undefined,
  });

  // Un reto no toca el progreso ni el Predictor: es un pique, no una medición.
  if (sesion.modo !== 'reto') {
    registrarRespuesta(q.id, ok);
    procesarRespuestaConEventos(q, ok);
    progresarDiaria('aciertos', ok ? 1 : 0);
  }

  // marcar dash
  const dash = sc.querySelectorAll('.dash')[sesion.idx];
  if (dash) { dash.classList.remove('dash--actual'); dash.classList.add(ok ? 'dash--ok' : 'dash--ko'); }

  if (esExamen) return;

  if (ok) {
    sonido.acierto(); haptic.ok();
    // combo y XP
    sesion.combo++;
    sesion.maxCombo = Math.max(sesion.maxCombo, sesion.combo);
    progresarDiaria('combo', 0); // combo se evalúa por valor, no incremento
    const s = getEstado();
    if (s.diarias.fecha === HOY()) {
      for (const dd of s.diarias.lista) if (dd.tipo === 'combo' && !dd.hecha && sesion.combo >= dd.n) { dd.prog = dd.n; dd.hecha = true; darChapas(dd.premio); toast(`✅ ${textoDiaria(dd)} · +${dd.premio} 🔩`); }
    }
    const mult = multiplicadorCombo(sesion.combo);
    const xp = RANGO_XP_ACIERTO * mult;
    sesion.xp += xp;
    if (!esCrono) {
      // en el bote la XP suelta no cuenta: lo que manda es el panel del bote
      if (sesion.modo !== 'bote') xpFlotante(ev.clientX || window.innerWidth / 2, ev.clientY || 300, xp);
      if (sesion.combo === 5 || sesion.combo === 10) {
        sonido.comboSube(mult);
        toast(`${t(S, 'mision.enRacha')} ×${mult} XP`);
      }
      glowCombo(mult >= 3);
      const comboEl = $('#combo', sc);
      if (comboEl) {
        comboEl.textContent = sesion.combo >= 2 ? `🔥${sesion.combo}` : '';
        comboEl.classList.add('sube');
        setTimeout(() => comboEl.classList.remove('sube'), 250);
      }
    }
  } else {
    sonido.fallo(); haptic.ko();
    const diana = $('#qcard', sc) || $('.cruce-escena', sc);
    if (diana) sacudir(diana);
    if (sesion.combo >= 5) sonido.comboRoto();
    sesion.combo = 0;
    glowCombo(false);
  }
  actualizarHUD();
}

/** Feedback jugoso (§8.3): la trampa SOLO al fallar. */
function mostrarFeedback(sc, q, ok, seguro = null) {
  const fb = $('#feedback', sc);
  if (!fb) return;
  if (sesion.modo === 'bote') return feedbackBote(sc, q, ok, fb);
  if (sesion.modo === 'tutorial') {
    fb.innerHTML = `
      ${q.truco ? `<div class="feedback__caja feedback__caja--truco"><b>${t(S, 'mision.truco')}</b>${esc(q.truco)}</div>` : ''}
      ${!ok ? `<div class="feedback__caja feedback__caja--trampa"><b>${t(S, 'mision.trampa')}</b>${esc(q.trampa)}</div>` : ''}
      <button class="btn btn--primary" id="tuto-seguir">${t(S, 'mision.siguiente')} →</button>`;
    $('#tuto-seguir', fb).onclick = () => {
      sonido.tap(); haptic.medio();
      sesion = null;
      navegar('onboarding', { ok });
    };
    fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }
  const titulo = ok ? azar(S.feedback.aciertos) : azar(S.feedback.fallos);
  // el chequeo de confianza solo habla cuando dice algo útil: dudabas y acertaste,
  // o ibas seguro y caíste. Ni felicita de más ni riñe.
  const nota = seguro === false && ok ? t(S, 'confianza.loSabias')
    : seguro === true && !ok ? t(S, 'confianza.ojo') : '';
  // "ibas seguro y caíste" es el momento pedagógico más valioso de la app:
  // ahí la trampa se marca y se lee antes que nada.
  const trampaEstrella = seguro === true && !ok && !!q.trampa;
  fb.innerHTML = `
    <div class="feedback__titulo ${ok ? 'feedback__titulo--ok' : 'feedback__titulo--ko'}">${titulo}</div>
    ${nota ? `<div class="confianza-nota">${nota}</div>` : ''}
    ${!ok && q.trampa ? `<div class="feedback__caja feedback__caja--trampa ${trampaEstrella ? 'feedback__caja--protagonista' : ''}"><b>${t(S, 'mision.trampa')}</b>${esc(q.trampa)}</div>` : ''}
    ${q.truco ? `<div class="feedback__caja feedback__caja--truco"><b>${t(S, 'mision.truco')}</b>${esc(q.truco)}</div>` : ''}
    ${!ok ? `<div class="feedback__caja feedback__caja--info"><b>${t(S, 'mision.porQue')}</b>${esc(q.explicacion_corta)}${q.explicacion_larga ? `<br><br>${esc(q.explicacion_larga)}` : ''}</div>` : ''}
    <button class="btn ${ok ? 'btn--verde' : 'btn--cian'}" id="siguiente">${t(S, 'mision.siguiente')} →</button>`;
  $('#siguiente', fb).onclick = () => { sonido.tap(); avanzar(sc); };
  if (ok && !q.truco && !nota) setTimeout(() => { if (sesion && $('#siguiente', sc)) avanzar(sc); }, 1100);
  if (!ok) fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // boss: derrota inmediata al pasarse de fallos
  if (sesion.modo === 'boss' && sesion.fallos > sesion.limiteFallos) {
    setTimeout(() => terminarSesion(), 900);
  }
}

/**
 * Accesibilidad de diálogos (§17): el foco entra, se queda dentro mientras el
 * modal está abierto, y Escape siempre saca. Sin esto, con teclado o VoiceOver
 * se puede tabular "por detrás" del modal y quedarse atrapado sin salida.
 *
 * @param {HTMLElement} ov  el .modal-overlay
 * @param {Function} cerrar qué hacer al pulsar Escape (normalmente la opción neutra)
 */
function atraparFoco(ov, cerrar) {
  const previo = document.activeElement;
  const foco = () => [...ov.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
    .filter((e) => !e.disabled && e.offsetParent !== null);
  foco()[0]?.focus();
  const alPulsar = (e) => {
    if (e.key === 'Escape' && cerrar) { e.preventDefault(); cerrar(); return; }
    if (e.key !== 'Tab') return;
    const f = foco();
    if (!f.length) return;
    const primero = f[0], ultimo = f[f.length - 1];
    if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
    else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
  };
  ov.addEventListener('keydown', alPulsar);
  // al quitarse el modal se devuelve el foco a donde estaba
  new MutationObserver((_, obs) => {
    if (!ov.isConnected) { obs.disconnect(); previo?.focus?.(); }
  }).observe(document.body, { childList: true });
}

/* ================= RETOS POR ENLACE ================= */

let RETOMOD = null;   // módulo diferido: no entra en el arranque

async function modReto() {
  if (!RETOMOD) RETOMOD = await import('./retencion/reto.js');
  return RETOMOD;
}

/** Tarjeta del mapa. Los retos son contenido gratis: no se bloquean nunca. */
function tarjetaReto() {
  if (!FLAGS.linkChallenges) return '';
  return `<button class="card-juego" id="reto-card">
    <span class="card-juego__ico">🤝</span>
    <span class="card-juego__txt"><b>${t(S, 'reto.nuevo')}</b><br>
      <span class="texto-suave">${esc(t(S, 'reto.sub'))}</span></span>
    <span class="card-juego__go">GO</span>
  </button>`;
}

/** Contenido del reto: solo mundos gratuitos, para que lo pueda abrir cualquiera. */
const mundosGratis = () => DOC.mundos.filter((m) => m.gratis).map((m) => m.n);
const crucesGratis = () => CRUCES.filter((c) => c.gratis || mundosGratis().includes(c.mundo));

/** Elegir el tipo de reto. Solo se ofrecen los que hoy tienen contenido gratis. */
async function crearReto() {
  const R = await modReto();
  const banco = await getBancoCompleto(mundosGratis());
  const cruces = crucesGratis();
  // se comprueba de verdad: un modo sin contenido no se enseña, no se enseña roto
  const posibles = Object.keys(R.MODOS).filter((m) => (R.componerReto(m, 1, banco, cruces) || []).length);
  if (!posibles.length) { toast(t(S, 'reto.invalido'), 3600); return; }
  if (posibles.length === 1) return lanzarRetoNuevo(posibles[0]);

  const ov = el(`<div class="modal-overlay"><div class="modal" role="dialog" aria-modal="true" aria-label="${esc(t(S, 'reto.elegir'))}">
    <div class="contrato-kicker">${t(S, 'reto.elegir')}</div>
    ${posibles.map((m, i) => `<button class="btn ${i === 0 ? 'btn--cian' : 'btn--ghost'}" data-modo-reto="${m}">${t(S, `reto.modo_${m}`)}</button>`).join('')}
    <button class="btn btn--ghost" id="reto-cancelar">${t(S, 'mision.salir')}</button>
  </div></div>`);
  document.body.appendChild(ov);
  atraparFoco(ov, () => ov.remove());
  ov.querySelectorAll('[data-modo-reto]').forEach((b) => b.addEventListener('click', () => {
    sonido.tap(); haptic.medio();
    ov.remove();
    lanzarRetoNuevo(b.dataset.modoReto);
  }));
  $('#reto-cancelar', ov).onclick = () => { sonido.tap(); ov.remove(); };
}

async function lanzarRetoNuevo(modo) {
  const R = await modReto();
  const semilla = R.nuevaSemilla();
  EV.registrar('challenge_created', { modeId: modo, metadata: { semilla } });
  navegar('reto', { modo, semilla, propio: true });
}

/** Abre el reto que venía en el enlace. Un enlace roto no rompe la app. */
async function abrirRetoDesdeHash() {
  const R = await modReto();
  const leido = R.leerHashReto();
  limpiarHash();
  if (!leido || leido.error) {
    navegar('mapa');
    toast(t(S, 'reto.invalido'), 3600);
    EV.registrar('challenge_link_invalid', { metadata: { causa: leido?.error || 'nada' } });
    return;
  }
  EV.registrar('challenge_opened', { modeId: leido.modo, metadata: { semilla: leido.semilla } });
  navegar('reto', { modo: leido.modo, semilla: leido.semilla });
}

RENDERS.reto = async (sc, { modo, semilla, propio } = {}) => {
  const R = await modReto();
  sc.innerHTML = `<div class="resultado"><p class="texto-suave">…</p></div>`;
  const banco = await getBancoCompleto(mundosGratis());
  const lista = R.componerReto(modo, semilla, banco, crucesGratis());
  if (!lista || !lista.length) { navegar('mapa'); toast(t(S, 'reto.invalido'), 3600); return; }
  const enlace = R.urlReto(modo, semilla);
  sc.innerHTML = `<div class="mision-top"><button class="btn-salir" id="volver">←</button></div>
  <div class="resultado reto-intro">
    <h1>🤝 ${t(S, 'reto.titulo')}</h1>
    <div class="marcador">${R.MODOS[modo]?.etiqueta || ''}</div>
    <p class="texto-suave" style="max-width:320px">${t(S, 'reto.sub')}</p>
    <div class="acciones">
      <button class="btn btn--primary" id="reto-go">${t(S, 'reto.empezar')}</button>
      ${propio ? `<button class="btn btn--ghost" id="reto-share">${t(S, 'reto.compartir')}</button>` : ''}
      <button class="btn btn--ghost" id="reto-mapa">${t(S, 'resultado.alMapa')}</button>
    </div>
    <p class="texto-suave reto-aviso">${t(S, 'reto.aviso')}</p>
  </div>`;
  $('#volver', sc).onclick = () => { sonido.tap(); navegar('mapa', {}, true); };
  $('#reto-mapa', sc).onclick = () => { sonido.tap(); navegar('mapa', {}, true); };
  $('#reto-share', sc)?.addEventListener('click', () => compartirEnlaceReto(enlace, t(S, 'reto.texto')));
  $('#reto-go', sc).onclick = () => {
    sonido.tap(); haptic.medio();
    EV.registrar('challenge_started', { modeId: modo, metadata: { semilla } });
    navegar('mision', { cfg: { modo: 'reto', retoModo: modo, semilla, preguntas: lista, titulo: t(S, 'reto.titulo') } });
  };
};

/** Web Share si existe; si no, portapapeles. Nunca deja al jugador sin salida. */
async function compartirEnlaceReto(enlace, texto) {
  sonido.tap();
  const carga = `${texto}\n${enlace}`;
  if (navigator.share) {
    try { await navigator.share({ text: carga }); EV.registrar('challenge_shared', { metadata: { via: 'share' } }); return; }
    catch { /* cancelado: se cae al portapapeles */ }
  }
  try { await navigator.clipboard.writeText(carga); toast(t(S, 'reto.copiado'), 3200); EV.registrar('challenge_shared', { metadata: { via: 'clipboard' } }); }
  catch { toast(enlace, 6000); }
}

/** Resultado del reto. No toca progreso, ni racha, ni Predictor: solo el pique. */
async function resultadoReto(sc, d) {
  const total = d.preguntas.length;
  const pleno = d.aciertos === total;
  const R = await modReto();
  EV.registrar('challenge_completed', { modeId: d.retoModo, metadata: { aciertos: d.aciertos, total } });
  if (pleno) { sonido.fanfarria(); confeti(26); }
  sc.innerHTML = `<div class="resultado">
    <h1 class="${pleno ? 'ok' : ''}">🤝 ${t(S, 'reto.titulo')}</h1>
    <div class="marcador">${t(S, 'reto.resultado', { n: d.aciertos, total })}</div>
    <div class="acciones">
      <button class="btn btn--primary" id="r-revancha">${t(S, 'reto.revancha')}</button>
      <button class="btn btn--ghost" id="r-nuevo">${t(S, 'reto.nuevo')}</button>
      <button class="btn btn--ghost" id="r-mapa">${t(S, 'resultado.alMapa')}</button>
    </div>
    <p class="texto-suave reto-aviso">${t(S, 'reto.aviso')}</p>
  </div>`;
  // Revancha = recorrido NUEVO del mismo tipo. Reenviar la misma semilla sería
  // mandarle a la otra persona un reto que ya has visto entero.
  $('#r-revancha', sc).onclick = () => {
    const semilla = R.nuevaSemilla();
    EV.registrar('challenge_created', { modeId: d.retoModo, metadata: { semilla, revancha: true } });
    compartirEnlaceReto(R.urlReto(d.retoModo, semilla), t(S, 'reto.textoResultado', { n: d.aciertos, total }));
  };
  $('#r-nuevo', sc).onclick = () => { sonido.tap(); crearReto(); };
  $('#r-mapa', sc).onclick = () => { sonido.tap(); navegar('mapa', {}, true); };
}

/* ============ ADN DE LOS MUNDOS ============ */

/** Aviso de ruta: qué tiene de distinto este mundo. Se anuncia, no se esconde. */
function franjaADN(mundoN) {
  if (!FLAGS.worldModifiers) return '';
  const { mods, lema } = adnDe(mundoN);
  const claves = Object.keys(mods).filter((k) => mods[k] > 0);
  if (!claves.length || !lema) return '';
  const chips = claves.map((k) => `<span class="adn-chip">${t(S, `adn.mods.${k}`)}</span>`).join('');
  return `<div class="adn-franja">
    <div class="adn-lema">${esc(lema)}</div>
    <div class="adn-chips">${chips}</div>
  </div>`;
}

/**
 * Aplica los modificadores declarados para el mundo. Nunca rompe la misión:
 * si falta contenido compatible, el hueco se queda como pregunta normal.
 * Jamás mete duplicados.
 */
function aplicarADN(lista, mundoN, misionIdx, cruces, banco) {
  if (!FLAGS.worldModifiers) return conCruces(lista, cruces.filter((c) => c.mundo === mundoN), misionIdx);
  const { mods } = adnDe(mundoN);
  const s = getEstado();
  let out = lista.slice();
  const ids = new Set(out.map((q) => q.id));

  // Taller: reserva huecos para averías pendientes de este mundo
  const nTaller = mods.taller || 0;
  if (nTaller) {
    const averias = banco.filter((q) => s.taller[q.id] && !ids.has(q.id)).slice(0, nTaller);
    for (const av of averias) {
      // sustituye la pregunta menos urgente (la más vista) para no alargar la misión
      const iSust = out.map((q, i) => ({ i, v: s.vistas[q.id] || 0 }))
        .sort((a, b) => b.v - a.v)[0]?.i;
      if (iSust == null) break;
      ids.delete(out[iSust].id);
      out[iSust] = av;
      ids.add(av.id);
    }
  }

  // Señales: sube el peso de preguntas con señal, sin convertirlo en Señal Rush
  if (mods.senales) {
    const conSenal = banco.filter((q) => q.senalId && !ids.has(q.id));
    const cuantas = Math.min(2, conSenal.length);
    for (let k = 0; k < cuantas; k++) {
      const iSust = out.findIndex((q) => !q.senalId && q.tipo !== 'cruce');
      if (iSust < 0) break;
      ids.delete(out[iSust].id);
      out[iSust] = conSenal[k];
      ids.add(conSenal[k].id);
    }
  }

  // Cruces: los del propio mundo, con el mismo mezclador de siempre
  const nCruces = mods.cruces || 0;
  if (nCruces) out = conCruces(out, cruces.filter((c) => c.mundo === mundoN), misionIdx);

  // Regla contra Trampa: se marcan huecos; el motor decide en caliente si hay
  // tarjeta segura para esa pregunta, y si no, se juega como pregunta normal
  const nRT = mods.reglaTrampa || 0;
  if (nRT && FLAGS.ruleTrap) {
    // Solo valen preguntas con tarjeta curada. Nunca la primera ni la segunda:
    // la misión arranca en formato normal y el cambio de ritmo llega después.
    const conTarjeta = out
      .map((q, i) => ({ q, i }))
      .filter((x) => x.i >= 2 && x.q.tipo !== 'cruce' && !x.q._confianza && tarjetaReglaTrampa(x.q.id));
    // las vistas hace poco van al final: solo se repiten si no queda otra
    const frescas = conTarjeta.filter((x) => !RT_RECIENTES.includes(x.q.id));
    const ordenadas = frescas.length >= nRT ? frescas : frescas.concat(conTarjeta.filter((x) => RT_RECIENTES.includes(x.q.id)));
    const elegidas = ordenadas.filter((_, k) => k % 2 === 0).slice(0, nRT);
    for (const c of elegidas) { out[c.i] = { ...c.q, _reglaTrampa: true }; anotarReglaTrampa(c.q.id); }

    // Si el sorteo no ha traído ninguna con tarjeta, se cambia la pregunta más
    // vista por una que sí la tenga: el mundo prometió este formato en su franja.
    let faltan = nRT - elegidas.length;
    if (faltan > 0) {
      const repuesto = banco.filter((q) => !ids.has(q.id) && tarjetaReglaTrampa(q.id))
        .sort((a, b) => RT_RECIENTES.includes(a.id) - RT_RECIENTES.includes(b.id));
      for (const q of repuesto) {
        if (faltan <= 0) break;
        const iSust = out.map((x, i) => ({ i, v: s.vistas[x.id] || 0 }))
          .filter((x) => x.i >= 2 && out[x.i].tipo !== 'cruce' && !out[x.i]._reglaTrampa && !out[x.i]._confianza)
          .sort((a, b) => b.v - a.v)[0]?.i;
        if (iSust == null) break;
        ids.delete(out[iSust].id);
        out[iSust] = { ...q, _reglaTrampa: true };
        ids.add(q.id);
        anotarReglaTrampa(q.id);
        faltan--;
      }
    }
  }

  // Confianza: marca preguntas donde se preguntará "¿seguro?" antes de revelar
  const nConf = mods.confianza || 0;
  if (nConf) {
    const idxs = out.map((q, i) => i).filter((i) => out[i].tipo !== 'cruce' && !out[i]._reglaTrampa);
    for (let k = 0; k < Math.min(nConf, idxs.length); k++) {
      const i = idxs[Math.floor((k + 1) * idxs.length / (nConf + 1))];
      if (i != null && out[i]) out[i] = { ...out[i], _confianza: true };
    }
  }
  return out;
}

/** Lanza la misión: ofrece contrato antes si el mundo lo declara. */
function lanzarMision(cfg) {
  const { mods } = adnDe(cfg.mundoN);
  if (!FLAGS.routeContracts || !mods.contrato) { navegar('mision', { cfg }); return; }
  const contrato = ofrecerContrato(cfg.preguntas, getEstado().contratos?.ultimo);
  if (!contrato) { navegar('mision', { cfg }); return; }
  mostrarContrato(cfg, contrato);
}

/** Ruta normal o contrato. La normal es la opción por defecto y se ve igual de válida. */
function mostrarContrato(cfg, contrato) {
  EV.registrar('contract_offered', { worldId: cfg.mundoN, metadata: { id: contrato.id } });
  const ov = el(`<div class="modal-overlay"><div class="modal" role="dialog" aria-modal="true">
    <div class="contrato-kicker">${t(S, 'contrato.titulo')}</div>
    <p class="contrato-texto">${esc(contrato.texto)}</p>
    <p class="contrato-premio">${t(S, 'contrato.premio', { n: PREMIO_CHAPAS })}</p>
    <p class="texto-suave contrato-nota">${t(S, 'contrato.sinPerder')}</p>
    <button class="btn btn--cian" id="c-si">${t(S, 'contrato.aceptar')}</button>
    <button class="btn btn--ghost" id="c-no">${t(S, 'contrato.normal')}</button>
  </div></div>`);
  document.body.appendChild(ov);
  const ir = (con) => {
    ov.remove();
    if (con) {
      const s = getEstado();
      s.contratos.ultimo = contrato.id;
      guardar();
      EV.registrar('contract_accepted', { worldId: cfg.mundoN, metadata: { id: contrato.id } });
    }
    navegar('mision', { cfg: { ...cfg, contrato: con ? contrato : null } });
  };
  $('#c-si', ov).onclick = () => { sonido.tap(); haptic.medio(); ir(true); };
  $('#c-no', ov).onclick = () => { sonido.tap(); ir(false); };
  // Escape = ruta normal, que es la opción por defecto y no compromete a nada
  atraparFoco(ov, () => ir(false));
}

/** Resultado de la Próxima Parada. Sin estrellas ni cofres: es una ruta corta. */
async function resultadoProxima(sc, d) {
  marcarCompletada();
  EV.registrar('cold_start_completed', { metadata: { aciertos: d.aciertos, total: d.preguntas.length } });
  const racha = tocarRacha();
  const { subida } = darXP(d.xp + 25, DOC.rangos);
  const pleno = d.fallos === 0;
  if (pleno) { sonido.fanfarria(); confeti(28); }
  await sello(t(S, 'proxima.hecha'), pleno ? 'ok' : 'rango', `${d.aciertos}/${d.preguntas.length}`);
  sc.innerHTML = `<div class="resultado">
    <h1 class="${pleno ? 'ok' : ''}">${t(S, 'proxima.hecha')}</h1>
    <div style="font-size:3rem">📍</div>
    <div class="marcador">${d.aciertos}/${d.preguntas.length} ${t(S, 'resultado.aciertos')}</div>
    <div class="xp-total">+<span id="xp-roll">0</span> XP</div>
    <p class="texto-suave" style="max-width:320px">${t(S, 'proxima.hechaSub')}</p>
    <div class="acciones">
      <button class="btn btn--primary" id="mapa-btn">${t(S, 'resultado.alMapa')}</button>
    </div>
  </div>`;
  rodarContador($('#xp-roll', sc), 0, d.xp + 25, 700);
  $('#mapa-btn', sc).onclick = () => { sonido.tap(); navegar('mapa', {}, true); };
  celebraciones(subida, racha);
}

/* ============ RETENCIÓN — tarjetas del mapa y Próxima Parada ============ */

/** Texto literal de la condición que falta. Nunca "próximamente". */
function textoCondicion(id) {
  const base = t(S, 'desbloqueo.condicion.' + id);
  const p = progresoDe(id);
  return p ? `${base} (${t(S, 'desbloqueo.progreso', p)})` : base;
}

const MODOS_MAPA = [
  { id: 'cruces', ico: '🚦', titulo: 'cruce.titulo', sub: 'cruce.sub' },
  { id: 'rush', ico: '⚡', titulo: 'rush.titulo', sub: 'rush.sub' },
  { id: 'bote', ico: '🏆', titulo: 'bote.titulo', sub: 'bote.sub' },
  { id: 'crono', ico: '⏱️', titulo: 'contrarreloj.titulo', sub: 'contrarreloj.sub' },
];

/** Récord/estado propio de cada modo, para la línea secundaria. */
function colaDeModo(id, s) {
  if (id === 'cruces') {
    const faltan = CRUCES.length - crucesJugables().length;
    return faltan > 0 ? ` · ${t(S, 'cruce.bloqueado', { n: faltan })}` : '';
  }
  if (id === 'rush') return s.rush?.semana === semanaISO() && s.rush.record ? ` · ${t(S, 'rush.record')}: ${s.rush.record}` : '';
  if (id === 'bote') return s.bote?.record ? ` · ${t(S, 'bote.record')}: ${s.bote.record} XP` : '';
  if (id === 'crono') return ` · ${t(S, 'contrarreloj.record')}: ${s.contrarreloj.semana === semanaISO() ? s.contrarreloj.record : 0}`;
  return '';
}

function tarjetasDeModo(s) {
  return MODOS_MAPA.map(({ id, ico, titulo, sub }) => {
    const abierto = !FLAGS.progressiveUnlocks || estaDesbloqueado(id);
    return `<button class="card-juego ${abierto ? '' : 'card-juego--cerrada'}" data-modo="${id}">
      <span class="card-juego__ico">${abierto ? ico : '🔒'}</span>
      <span class="card-juego__txt"><b>${t(S, titulo)}</b><br>
        <span class="texto-suave">${abierto ? esc(t(S, sub)) + colaDeModo(id, s) : esc(textoCondicion(id))}</span></span>
      <span class="card-juego__go">${abierto ? 'GO' : ''}</span>
    </button>`;
  }).join('');
}

/** La parada preparada, arriba del todo: es lo primero que debe ver al volver. */
function tarjetaProxima() {
  if (!FLAGS.nextRun) return '';
  const np = proximaPendiente();
  if (!np) return '';
  const lista = proximaLista(np);
  const nFrio = (np.coldCheckQuestionIds || []).length;
  const nRuta = (np.routeQuestionIds || []).length;
  const cruce = np.puzzleId ? t(S, 'proxima.conCruce') : '';
  return `<button class="card-juego card-juego--proxima ${lista ? 'card-juego--lista' : ''}" id="proxima-card">
    <span class="card-juego__ico">${lista ? '📍' : '🌙'}</span>
    <span class="card-juego__txt"><b>${lista ? t(S, 'proxima.listaTitulo') : t(S, 'proxima.preparadaTitulo')}</b><br>
      <span class="texto-suave">${lista
        ? t(S, 'proxima.listaSub', { frio: nFrio, ruta: nRuta, cruce })
        : t(S, 'proxima.preparadaSub')}</span></span>
    <span class="card-juego__go">${lista ? 'GO' : '·'}</span>
  </button>`;
}

/** Celebra los modos recién abiertos, sin secuestrar al jugador. */
async function celebrarDesbloqueos(nuevos) {
  for (const id of nuevos) {
    EV.registrar('mode_unlocked', { modeId: id });
    sonido.fanfarria(); haptic.celebracion();
    await sello(t(S, 'desbloqueo.nuevo'), 'rango', t(S, MODOS_MAPA.find((m) => m.id === id)?.titulo || 'rush.titulo'));
  }
}

/* ---- Tu Próxima Parada: preparar, abrir, jugar ---- */

/** Tras una sesión con sustancia, deja lista la siguiente. */
async function generarProximaParada(origenId) {
  if (!FLAGS.nextRun) return null;
  const accesibles = mundosAccesibles();
  const banco = await getBancoCompleto(accesibles);
  // los cruces de la parada siguen el criterio del modo dedicado (respetan el
  // Pase, no la progresión), para que casi siempre haya uno y no caiga al fallback
  const np = prepararProxima(banco, crucesJugables(), origenId);
  if (np) {
    guardarProxima(np);
    EV.registrar('next_session_created', { metadata: { frio: np.coldCheckQuestionIds.length, ruta: np.routeQuestionIds.length } });
    return np;
  }
  // ya había una esperando: se enseña esa, no se le pisa la que tenía apuntada
  return proximaPendiente();
}

async function abrirProximaParada() {
  limpiarHash();
  const np = proximaPendiente();
  if (!np) { navegar('mapa'); toast(t(S, 'proxima.noHay')); return; }
  const accesibles = mundosAccesibles();
  const banco = await getBancoCompleto(accesibles);
  const { lista, nFrio } = materializar(np, banco, crucesJugables());
  if (!lista.length) { navegar('mapa'); toast(t(S, 'proxima.yaHecha')); return; }
  EV.registrar('cold_start_started', { metadata: { n: lista.length } });
  navegar('mision', {
    cfg: { modo: 'proxima', preguntas: lista, nFrio, titulo: t(S, 'proxima.titulo') },
  });
}

/** Tarjeta de fin de sesión: qué te espera y cuándo. Guardar es opcional. */
function pintarTarjetaProxima(sc, np) {
  if (!np) return;
  const zona = $('#zona-proxima', sc);
  if (!zona) return;
  const nFrio = np.coldCheckQuestionIds.length;
  const nRuta = np.routeQuestionIds.length;
  const min = Math.max(4, Math.round(np.estimatedSeconds / 60));
  zona.innerHTML = `
    <div class="proxima-card">
      <div class="proxima-card__kicker">${t(S, 'proxima.titulo')}</div>
      <div class="proxima-card__min">${t(S, 'proxima.min', { n: min })}</div>
      <div class="proxima-card__desglose">${t(S, 'proxima.composicion', {
        frio: nFrio, ruta: nRuta, cruce: np.puzzleId ? t(S, 'proxima.conCruce') : '',
      })}</div>
      <div class="proxima-card__acciones">
        <button class="btn btn--cian" id="np-guardar">${t(S, 'proxima.guardar')}</button>
        <button class="btn btn--ghost" id="np-seguir">${t(S, 'proxima.seguir')}</button>
      </div>
    </div>`;
  // "Seguir jugando" NO destruye la parada: sigue guardada para cuando vuelva
  $('#np-seguir', zona).onclick = () => { sonido.tap(); zona.innerHTML = ''; };
  $('#np-guardar', zona).onclick = () => {
    sonido.acierto(); haptic.ok();
    EV.registrar('next_session_saved');
    ofrecerCalendario(zona, np);
  };
}

/** Paso opcional: hora + .ics. Sin recordatorio es una salida de primera clase. */
function ofrecerCalendario(zona, np) {
  const hora = getEstado().prefs?.horaRecordatorio || '19:30';
  zona.innerHTML = `
    <div class="proxima-card">
      <div class="proxima-card__kicker">${t(S, 'proxima.guardada')}</div>
      <label class="proxima-card__hora">${t(S, 'proxima.hora')}
        <input type="time" id="np-hora" value="${hora}" step="300">
      </label>
      <div class="proxima-card__acciones">
        <button class="btn btn--cian" id="np-ics">${t(S, 'proxima.calendario')}</button>
        <button class="btn btn--ghost" id="np-nada">${t(S, 'proxima.sinRecordatorio')}</button>
      </div>
    </div>`;
  EV.registrar('calendar_offered', { metadata: { hora } });
  $('#np-nada', zona).onclick = () => { sonido.tap(); zona.innerHTML = ''; };
  $('#np-ics', zona).onclick = async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    const elegida = $('#np-hora', zona).value || hora;
    recordarHoraCalendario(elegida);
    try {
      // módulo diferido: el exportador no viaja en el arranque
      const { generarICS, entregarICS } = await import('./retencion/ics.js');
      const texto = generarICS({
        fecha: np.readyLocalDate,
        hora: elegida,
        url: `${location.origin}${location.pathname}#/next-run`,
        minutos: 15,
        uid: `${np.id}@carnet-quest`,
      });
      const via = await entregarICS(texto);
      EV.registrar('calendar_delivered', { metadata: { via, hora: elegida } });
      // se dice lo que ha pasado de verdad: compartido ≠ descargado
      toast(via === 'compartido' ? t(S, 'proxima.icsHecho') : t(S, 'proxima.icsDescargado'), 3600);
      zona.innerHTML = '';
    } catch (err) {
      if (err?.name !== 'AbortError') toast(t(S, 'proxima.icsDescargado'));
      btn.disabled = false;
    }
  };
}

/* ============ GARAJE — el sumidero de las Chapas ============ */

const cocheActual = () => GARAJE.coches.find((c) => c.id === getEstado().garaje.coche) || GARAJE.coches[0];

/** Aplica lo equipado: color de acento, confeti y (por rebote) el coche del mapa. */
function aplicarCosmetica() {
  const g = getEstado().garaje;
  const tema = GARAJE.temas.find((x) => x.id === g.tema) || GARAJE.temas[0];
  document.documentElement.style.setProperty('--acento', tema.acento);
  const cel = GARAJE.celebraciones.find((x) => x.id === g.celebracion);
  if (cel) setConfeti(cel.glifos);
}

const seccionesGaraje = () => ([
  { clave: 'coches', campo: 'coche', titulo: t(S, 'garaje.coches'), lista: GARAJE.coches },
  { clave: 'temas', campo: 'tema', titulo: t(S, 'garaje.temas'), lista: GARAJE.temas },
  { clave: 'celebraciones', campo: 'celebracion', titulo: t(S, 'garaje.celebraciones'), lista: GARAJE.celebraciones },
]);

function vistaPrevia(seccion, item) {
  if (seccion === 'coches') return `<div class="garaje-prev">${svgVehiculo(item, 58)}</div>`;
  if (seccion === 'temas') {
    return `<div class="garaje-prev"><span class="garaje-swatch" style="background:${item.acento};box-shadow:0 0 16px ${item.acento}"></span></div>`;
  }
  return `<div class="garaje-prev garaje-prev--glifos">${item.glifos.slice(0, 4).map((g) => `<span>${g}</span>`).join('')}</div>`;
}

RENDERS.garaje = (sc) => {
  const s = getEstado();
  sc.innerHTML = `
    <div class="mision-top"><button class="btn-salir" id="volver">←</button>
      <span class="garaje-chapas">🔩 <b id="garaje-chapas">${s.chapas}</b></span></div>
    <div class="taller-head">
      <h1>🔧 ${t(S, 'garaje.titulo')}</h1>
      <p class="sub">${t(S, 'garaje.sub')}</p>
    </div>
    ${seccionesGaraje().map(({ clave, campo, titulo, lista }) => `
      <h2 class="garaje-h2">${titulo}</h2>
      <div class="garaje-grid">
        ${lista.map((item) => {
          const tengo = s.garaje.comprados.includes(item.id);
          const puesto = s.garaje[campo] === item.id;
          const bloqueadoPase = item.pase && !s.compras.pase;
          return `<div class="garaje-card ${puesto ? 'garaje-card--puesta' : ''} ${bloqueadoPase && !tengo ? 'garaje-card--pase' : ''}">
            ${vistaPrevia(clave, item)}
            <b class="garaje-card__nombre">${esc(item.nombre)}</b>
            <span class="garaje-card__desc">${esc(item.desc)}</span>
            ${puesto
              ? `<span class="garaje-card__estado">${t(S, 'garaje.equipado')}</span>`
              : tengo
                ? `<button class="btn btn--cian garaje-card__btn" data-poner="${campo}:${item.id}">${t(S, 'garaje.equipar')}</button>`
                : bloqueadoPase
                  ? `<span class="garaje-card__pase">🔒 ${t(S, 'garaje.soloPase')}</span>`
                  : `<button class="btn ${s.chapas >= item.precio ? 'btn--verde' : 'btn--ghost'} garaje-card__btn"
                       data-comprar="${campo}:${item.id}:${item.precio}">${t(S, 'garaje.comprar', { n: item.precio })}</button>`}
          </div>`;
        }).join('')}
      </div>`).join('')}`;

  $('#volver', sc).onclick = () => { sonido.tap(); navegar('perfil', {}, true); };

  sc.querySelectorAll('[data-poner]').forEach((b) => b.addEventListener('click', () => {
    const [campo, id] = b.dataset.poner.split(':');
    getEstado().garaje[campo] = id;
    guardar();
    sonido.acierto(); haptic.ok();
    aplicarCosmetica();
    navegar('garaje');
  }));

  sc.querySelectorAll('[data-comprar]').forEach((b) => b.addEventListener('click', () => {
    const [campo, id, precioTxt] = b.dataset.comprar.split(':');
    const precio = Number(precioTxt);
    const est = getEstado();
    if (est.chapas < precio) {
      sonido.fallo(); haptic.ko();
      toast(t(S, 'garaje.sinChapas', { n: precio - est.chapas }));
      return;
    }
    const seccion = seccionesGaraje().find((x) => x.campo === campo);
    const item = seccion.lista.find((x) => x.id === id);
    est.chapas -= precio;
    est.garaje.comprados.push(id);
    est.garaje[campo] = id;
    guardar();
    sonido.cofre(); haptic.celebracion();
    aplicarCosmetica();
    confeti(18);
    toast(t(S, 'garaje.comprado', { nombre: item.nombre }));
    actualizarHUD();
    navegar('garaje');
  }));
};

/* ============ SEÑAL RUSH — 60 s clasificando señales ============ */

const RUSH_FAMILIAS = ['peligro', 'prioridad', 'prohibicion', 'obligacion', 'fin', 'indicacion'];
const RUSH_SEG = 60;
const RUSH_PENALIZA = 3;   // segundos que cuesta cada fallo

RENDERS.rush = (sc) => {
  const s = getEstado();
  const semana = semanaISO();
  const record = s.rush.semana === semana ? s.rush.record : 0;
  const baraja = SEN.senales
    .filter((x) => RUSH_FAMILIAS.includes(x.categoria))
    .sort(() => Math.random() - 0.5);

  const rush = {
    i: 0, aciertos: 0, combo: 0, maxCombo: 0,
    fin: Date.now() + RUSH_SEG * 1000,
    bloqueado: false, timer: null, baraja,
  };

  sc.innerHTML = `
    <div class="mision-top">
      <button class="btn-salir" id="salir">✕</button>
      <span class="rush-marcador"><b id="rush-n">0</b> <span id="rush-combo" class="rush-combo"></span></span>
      <span class="timer-chip" id="rush-timer">${fmtTiempo(RUSH_SEG)}</span>
    </div>
    <div class="rush" id="rush-wrap">
      <div class="rush__barra"><i id="rush-barra"></i></div>
      <div class="rush__senal" id="rush-senal"></div>
      <div class="rush__grid" id="rush-grid">
        ${RUSH_FAMILIAS.map((f) => `
          <button class="rush-btn rush-btn--${f}" data-f="${f}">
            <b>${t(S, 'rush.familias.' + f)}</b>
            <span>${t(S, 'rush.pistas.' + f)}</span>
          </button>`).join('')}
      </div>
      <p class="rush__truco">${t(S, 'rush.truco')}</p>
    </div>`;

  const $senal = $('#rush-senal', sc);
  const $n = $('#rush-n', sc);
  const $combo = $('#rush-combo', sc);
  const $timer = $('#rush-timer', sc);
  const $barra = $('#rush-barra', sc);
  const $wrap = $('#rush-wrap', sc);

  const pintar = () => {
    const señal = rush.baraja[rush.i % rush.baraja.length];
    rush.actual = señal;
    $senal.innerHTML = svgSenal(señal, 'senal-svg rush-svg');
    $senal.classList.remove('rush__senal--entra');
    void $senal.offsetWidth;   // reinicia la animación de entrada
    $senal.classList.add('rush__senal--entra');
  };

  const tick = () => {
    const resta = Math.max(0, Math.ceil((rush.fin - Date.now()) / 1000));
    $timer.textContent = fmtTiempo(resta);
    $timer.classList.toggle('timer-chip--rojo', resta <= 10);
    $barra.style.transform = `scaleX(${Math.max(0, (rush.fin - Date.now()) / (RUSH_SEG * 1000))})`;
    if (resta <= 5 && resta > 0) sonido.tictac();
    if (rush.fin - Date.now() <= 0) terminar();
  };

  const responder = (fam, btn) => {
    if (rush.bloqueado || !rush.actual) return;
    const ok = fam === rush.actual.categoria;
    if (ok) {
      rush.aciertos++;
      rush.combo++;
      rush.maxCombo = Math.max(rush.maxCombo, rush.combo);
      sonido.acierto(); haptic.ligero();
      $n.textContent = String(rush.aciertos);
      $n.classList.add('sube');
      setTimeout(() => $n.classList.remove('sube'), 200);
      $combo.textContent = rush.combo >= 3 ? `🔥${rush.combo}` : '';
      $wrap.classList.toggle('rush--sin-pistas', rush.combo >= 5);
      if (rush.combo === 5 || rush.combo === 10 || rush.combo === 20) sonido.comboSube(rush.combo / 5 + 1);
      btn.classList.add('rush-btn--ok');
      setTimeout(() => btn.classList.remove('rush-btn--ok'), 180);
      rush.i++;
      pintar();
    } else {
      // fallar cuesta tiempo, no puntos: mantiene el ritmo y enseña el acierto
      rush.combo = 0;
      $combo.textContent = '';
      $wrap.classList.remove('rush--sin-pistas');
      rush.fin -= RUSH_PENALIZA * 1000;
      sonido.fallo(); haptic.ko();
      sacudir($senal);
      btn.classList.add('rush-btn--ko');
      const correcto = sc.querySelector(`.rush-btn[data-f="${rush.actual.categoria}"]`);
      correcto?.classList.add('rush-btn--senala');
      rush.bloqueado = true;
      setTimeout(() => {
        btn.classList.remove('rush-btn--ko');
        correcto?.classList.remove('rush-btn--senala');
        rush.bloqueado = false;
        if (rush.timer) { rush.i++; pintar(); }
      }, 620);
    }
    tick();
  };

  async function terminar() {
    clearInterval(rush.timer);
    rush.timer = null;
    sonido.derrota();
    const nuevo = rush.aciertos > record;
    const est = getEstado();
    if (est.rush.semana !== semana || rush.aciertos > est.rush.record) {
      est.rush = { semana, record: Math.max(rush.aciertos, est.rush.semana === semana ? est.rush.record : 0) };
    }
    const racha = tocarRacha();
    const { subida } = darXP(rush.aciertos * 4, DOC.rangos);
    guardar();
    if (nuevo) { confeti(30); await sello(t(S, 'rush.nuevoRecord'), 'rango', `${rush.aciertos} ${t(S, 'rush.aciertos')}`); }

    sc.innerHTML = `<div class="resultado">
      <h1 class="${nuevo ? 'ok' : ''}">${nuevo ? t(S, 'rush.nuevoRecord') : t(S, 'rush.seAcabo')}</h1>
      <div class="rush-final">${rush.aciertos}</div>
      <div class="marcador">${t(S, 'rush.aciertos')} · ${t(S, 'rush.combo')} ×${rush.maxCombo}</div>
      <div class="xp-total">+<span id="xp-roll">0</span> XP</div>
      <div class="texto-suave">${t(S, 'rush.record')}: ${getEstado().rush.record}</div>
      <div class="acciones">
        <button class="btn btn--verde" id="compartir">${t(S, 'rush.compartir')} 📤</button>
        <button class="btn btn--primary" id="otra">${t(S, 'rush.otra')}</button>
        <button class="btn btn--ghost" id="mapa-btn">${t(S, 'resultado.alMapa')}</button>
      </div>
    </div>`;
    rodarContador($('#xp-roll', sc), 0, rush.aciertos * 4, 700);
    $('#otra', sc).onclick = () => { sonido.tap(); navegar('rush'); };
    $('#mapa-btn', sc).onclick = () => { sonido.tap(); navegar('mapa', {}, true); };
    $('#compartir', sc).onclick = async (e) => {
      const btn = e.currentTarget; btn.disabled = true;
      try {
        const blob = await generarTarjeta({
          tipo: 'rush', valor: String(rush.aciertos), titulo: t(S, 'rush.titulo'),
          sub: `${t(S, 'rush.aciertos')} en 60 segundos`, reto: '¿Me lo superas?',
        });
        await compartirTarjeta(blob, t(S, 'rush.compartirTexto', { n: rush.aciertos }));
      } catch { toast('No se ha podido generar la tarjeta'); }
      btn.disabled = false;
    };
    celebraciones(subida, racha);
  }

  $('#salir', sc).onclick = () => {
    clearInterval(rush.timer); rush.timer = null;
    sonido.tap(); navegar('mapa', {}, true);
  };
  $('#rush-grid', sc).addEventListener('click', (e) => {
    const b = e.target.closest('.rush-btn');
    if (b) responder(b.dataset.f, b);
  });
  pintar();
  tick();
  rush.timer = setInterval(tick, 250);
};

/* ============ DOBLE O NADA — la escalera del bote ============ */

// Escalera de XP por escalón. Solo se arriesga el bote que estás construyendo:
// nunca puedes acabar con menos XP de la que tenías al empezar (§12, cero dark patterns).
const ESCALERA = [10, 25, 45, 75, 120, 180, 260, 380, 550, 800];

function feedbackBote(sc, q, ok, fb) {
  const chip = $('#bote-chip', sc);
  if (ok) {
    sesion.escalon = Math.min(ESCALERA.length, sesion.escalon + 1);
    sesion.bote = ESCALERA[sesion.escalon - 1];
    if (chip) {
      chip.textContent = `🏆 ${sesion.bote}`;
      chip.classList.add('sube');
      setTimeout(() => chip.classList.remove('sube'), 250);
    }
  } else {
    sesion.bote = 0;
  }
  const ultimo = sesion.escalon >= ESCALERA.length;
  const siguiente = ultimo ? null : ESCALERA[sesion.escalon];
  const titulo = ok ? azar(S.feedback.aciertos) : azar(S.feedback.fallos);

  fb.innerHTML = `
    <div class="feedback__titulo ${ok ? 'feedback__titulo--ok' : 'feedback__titulo--ko'}">${titulo}</div>
    <div class="bote-panel ${ok ? '' : 'bote-panel--roto'}">
      <div class="bote-panel__valor">${ok ? sesion.bote : t(S, 'bote.perdido')}</div>
      <div class="bote-panel__sub">${ok
        ? `XP ${t(S, 'bote.enElBote')} · ${t(S, 'bote.escalon', { n: sesion.escalon, total: ESCALERA.length })}`
        : t(S, 'bote.perdidoSub', { n: sesion.boteAntes })}</div>
    </div>
    ${!ok && q.trampa ? `<div class="feedback__caja feedback__caja--trampa"><b>${t(S, 'mision.trampa')}</b>${esc(q.trampa)}</div>` : ''}
    ${q.truco ? `<div class="feedback__caja feedback__caja--truco"><b>${t(S, 'mision.truco')}</b>${esc(q.truco)}</div>` : ''}
    ${!ok ? `<div class="feedback__caja feedback__caja--info"><b>${t(S, 'mision.porQue')}</b>${esc(q.explicacion_corta)}${q.explicacion_larga ? `<br><br>${esc(q.explicacion_larga)}` : ''}</div>` : ''}
    ${ok && !ultimo ? `<button class="btn btn--cian" id="seguir">${t(S, 'bote.seguir', { n: siguiente })}</button>` : ''}
    ${ok ? `<button class="btn btn--verde" id="plantarse">${ultimo ? t(S, 'bote.cobrado', { n: sesion.bote }) : t(S, 'bote.plantarse', { n: sesion.bote })}</button>` : ''}
    ${!ok ? `<button class="btn btn--ghost" id="cerrar-bote">${t(S, 'bote.verResultado')} →</button>` : ''}`;

  $('#seguir', fb)?.addEventListener('click', () => { sonido.tap(); haptic.medio(); avanzar(sc); });
  $('#plantarse', fb)?.addEventListener('click', () => {
    sonido.cofre(); haptic.celebracion();
    sesion.cobrado = sesion.bote;
    sesion.plantado = true;
    terminarSesion();
  });
  $('#cerrar-bote', fb)?.addEventListener('click', () => { sonido.tap(); terminarSesion(); });
  if (!ok) fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  sesion.boteAntes = sesion.bote;
}

async function empezarBote() {
  sonido.tap(); haptic.medio();
  const accesibles = mundosAccesibles();
  const banco = await getBancoCompleto(accesibles);
  if (banco.length < ESCALERA.length) { toast(t(S, 'bote.sinBanco')); return; }
  const cruces = crucesDe(accesibles);
  // dificultad creciente: el bote sube y la pregunta aprieta
  const porDif = (d) => banco.filter((q) => (q.dificultad || 3) === d);
  const usados = new Set();
  const tirar = (lista) => {
    const libres = lista.filter((q) => !usados.has(q.id));
    const pool = libres.length ? libres : lista;
    const q = pool[Math.floor(Math.random() * pool.length)];
    if (q) usados.add(q.id);
    return q;
  };
  const preguntas = [];
  for (let i = 0; i < ESCALERA.length; i++) {
    const dif = Math.min(5, 1 + Math.floor(i / 2));
    // un cruce a mitad y otro al final: el bote también se juega con las manos
    if ((i === 4 || i === 8) && cruces.length) {
      const c = tirar(cruces);
      if (c) { preguntas.push(c); continue; }
    }
    preguntas.push(tirar(porDif(dif).length ? porDif(dif) : banco));
  }
  navegar('mision', { cfg: { modo: 'bote', preguntas: preguntas.filter(Boolean), titulo: t(S, 'bote.titulo') } });
}

async function resultadoBote(sc, d) {
  const cobrado = d.cobrado || 0;
  const pleno = d.plantado && d.escalon >= ESCALERA.length;
  const racha = tocarRacha();
  const { subida } = darXP(cobrado, DOC.rangos);
  const s = getEstado();
  if (cobrado > (s.bote?.record || 0)) s.bote = { record: cobrado };
  guardar();
  if (pleno) { sonido.fanfarria(); confeti(36); await sello(t(S, 'bote.pleno'), 'ok', `${cobrado} XP`); }
  else if (cobrado) { sonido.estrella(1); }
  else sonido.derrota();

  sc.innerHTML = `<div class="resultado">
    <h1 class="${cobrado ? 'ok' : 'ko'}">${pleno ? t(S, 'bote.pleno') : cobrado ? t(S, 'bote.plantado') : t(S, 'bote.perdido')}</h1>
    <div style="font-size:3rem">${cobrado ? '🏆' : '💥'}</div>
    <div class="marcador">${t(S, 'bote.escalon', { n: d.escalon, total: ESCALERA.length })}</div>
    <div class="xp-total">+<span id="xp-roll">0</span> XP</div>
    <div class="texto-suave" style="max-width:300px">${t(S, 'bote.record')}: ${s.bote.record} XP</div>
    <div class="acciones">
      <button class="btn btn--primary" id="otra">${t(S, 'bote.otra')}</button>
      <button class="btn btn--ghost" id="mapa-btn">${t(S, 'resultado.alMapa')}</button>
    </div>
  </div>`;
  rodarContador($('#xp-roll', sc), 0, cobrado, 800);
  $('#otra', sc).onclick = () => empezarBote();
  $('#mapa-btn', sc).onclick = () => { sonido.tap(); navegar('mapa', {}, true); };
  celebraciones(subida, racha);
}

/* ============ ¿QUIÉN PASA PRIMERO? — puzzle de prioridad jugable ============ */

function pintarCruce(sc, q) {
  const veh = q.vehiculos;
  const avisos = [];
  if (q.agente?.texto) avisos.push(`👮 ${q.agente.texto}`);
  for (const v of veh) if (v.nota) avisos.push(`${v.k} · ${v.nota}`);

  sc.innerHTML = `
    ${barraTop()}
    ${rotuloFase()}
    <div class="cruce">
      <div class="cruce__cab">
        <span class="cruce__kicker">¿QUIÉN PASA PRIMERO?</span>
        <h2 class="cruce__titulo">${esc(q.titulo || q.tema)}</h2>
      </div>
      <div class="cruce-escena" id="escena">${svgCruce(q)}</div>
      ${avisos.length ? `<div class="cruce__avisos">${avisos.map((a) => `<span>${esc(a)}</span>`).join('')}</div>` : ''}
      <div class="cruce__orden" id="slots">
        ${veh.map((_, i) => `<span class="cruce-slot" data-i="${i}"><i>${i + 1}º</i></span>`).join('<span class="cruce-slot__sep">→</span>')}
      </div>
      <p class="cruce__ayuda" id="ayuda">${t(S, 'cruce.instruccion')}</p>
      <div class="cruce__lista" id="lista">
        ${veh.map((v) => `
          <button class="cruce-fila" data-k="${v.k}" style="--c:${v.color || '#8FA0BE'}">
            <span class="cruce-fila__k">${v.k}</span>
            <span class="cruce-fila__txt"><b>${esc(ETIQUETA_TIPO[v.tipo] || 'Vehículo')}${v.tu ? ' · TÚ' : ''}</b><br>
              <span class="texto-suave">${esc(desdeTexto(v, q))} y ${esc(maniobra(v, q))}</span></span>
            <span class="cruce-fila__n"></span>
          </button>`).join('')}
      </div>
      <button class="btn btn--ghost cruce__deshacer oculto" id="deshacer">↩ ${t(S, 'cruce.deshacer')}</button>
    </div>
    <div class="feedback" id="feedback"></div>`;

  const svg = $('#escena svg', sc);
  const seleccion = [];
  let bloqueado = false;

  const pintar = () => {
    sc.querySelectorAll('.cruce-slot').forEach((s, i) => {
      const k = seleccion[i];
      const v = k ? veh.find((x) => x.k === k) : null;
      s.classList.toggle('cruce-slot--lleno', !!k);
      s.innerHTML = k ? `<b>${k}</b>` : `<i>${i + 1}º</i>`;
      if (v) s.style.setProperty('--c', v.color || '#8FA0BE');
    });
    for (const v of veh) {
      const pos = seleccion.indexOf(v.k);
      const fila = sc.querySelector(`.cruce-fila[data-k="${v.k}"]`);
      fila.classList.toggle('cruce-fila--elegida', pos >= 0);
      fila.querySelector('.cruce-fila__n').textContent = pos >= 0 ? `${pos + 1}º` : '';
      const g = svg.querySelector(`.cq-veh[data-k="${v.k}"]`);
      g.style.color = v.color || '#8FA0BE';
      g.classList.toggle('cq-veh--elegido', pos >= 0);
      g.querySelector('.cq-veh__letra').textContent = pos >= 0 ? String(pos + 1) : v.k;
    }
    $('#deshacer', sc).classList.toggle('oculto', seleccion.length === 0 || bloqueado);
  };

  const elegir = (k) => {
    if (bloqueado || !k || seleccion.includes(k)) return;
    seleccion.push(k);
    sonido.tap(); haptic.ligero();
    pintar();
    if (seleccion.length === veh.length) { bloqueado = true; setTimeout(resolver, 420); }
  };

  async function resolver() {
    if (!sesion) return;
    const ok = seleccion.join('|') === q.orden.join('|');
    sesion.resultados.push({ q, elegida: seleccion.join('-'), ok });
    const caja = $('#escena', sc).getBoundingClientRect();
    contabilizar(sc, q, ok, { clientX: caja.left + caja.width / 2, clientY: caja.top + 70 });

    const ayuda = $('#ayuda', sc);
    ayuda.className = `cruce__ayuda cruce__ayuda--${ok ? 'ok' : 'ko'}`;
    ayuda.textContent = ok
      ? t(S, 'cruce.correcto')
      : t(S, 'cruce.incorrecto', { orden: q.orden.join(' → ') });
    if (!ok) {
      seleccion.length = 0;
      seleccion.push(...q.orden);
      $('#slots', sc).classList.add('cruce__orden--solucion');
      pintar();
    }
    $('#deshacer', sc).classList.add('oculto');
    sc.querySelectorAll('.cruce-fila').forEach((f) => { f.disabled = true; });

    await animarPaso(svg, q, q.orden, { alPasar: () => sonido.tap() });
    if (!sesion) return;
    if (sesion.modo === 'examen' || sesion.modo === 'crono') { avanzar(sc); return; }
    mostrarFeedback(sc, q, ok);
    $('#feedback', sc).scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  sc.querySelectorAll('.cruce-fila').forEach((f) => f.addEventListener('click', () => elegir(f.dataset.k)));
  svg.querySelectorAll('.cq-veh').forEach((g) => g.addEventListener('click', () => elegir(g.dataset.k)));
  $('#deshacer', sc).onclick = () => {
    if (bloqueado || !seleccion.length) return;
    seleccion.pop(); sonido.tap(); haptic.ligero(); pintar();
  };
  $('#salir', sc).onclick = () => confirmarSalida();
  pintar();
  sc.scrollTop = 0;
}

/** Inserta un puzzle de cruce en mitad de la misión: rompe el "pregunta tras pregunta". */
function conCruces(lista, cruces, misionIdx) {
  const ya = new Set(lista.map((x) => x.id));
  const libres = cruces.filter((c) => !ya.has(c.id));
  if (!libres.length) return lista;
  const salida = lista.slice();
  const pos = Math.min(salida.length, 3 + (misionIdx % 3));
  salida.splice(pos, 0, libres[misionIdx % libres.length]);
  if (libres.length >= 4 && lista.length >= 8) {
    const segundo = libres[(misionIdx + 2) % libres.length];
    if (segundo.id !== salida[pos].id) salida.splice(Math.min(salida.length, pos + 5), 0, segundo);
  }
  return salida;
}

/** Cruces jugables en el modo dedicado: no esperan a la progresión de mundos,
 *  solo respetan el Pase. Los marcados `gratis` son la muestra del modo. */
const crucesJugables = () => CRUCES.filter((c) => c.gratis || !mundoDePago(c.mundo));

/** Modo dedicado: una tanda de puzzles de prioridad, sin preguntas de texto. */
async function empezarCruces() {
  sonido.tap(); haptic.medio();
  const lista = crucesJugables();
  if (lista.length < 3) { toast(t(S, 'cruce.sinPuzzles')); return; }
  const s = getEstado();
  const orden = lista.slice().sort((a, b) => {
    const va = s.vistas[a.id] || 0, vb = s.vistas[b.id] || 0;
    return va - vb || a.dificultad - b.dificultad;
  });
  const tanda = orden.slice(0, Math.min(6, orden.length)).sort((a, b) => a.dificultad - b.dificultad);
  navegar('mision', { cfg: { modo: 'cruce', preguntas: tanda, titulo: t(S, 'cruce.titulo') } });
}

function procesarRespuestaConEventos(q, ok) {
  const ev = procesarRespuesta(q, ok);
  if (sesion?.modo === 'examen') return; // en examen, ni una pista (§8.4)
  if (ev.reparado) {
    if (sesion) sesion.reparadas++;
    progresarDiaria('reparar');
    const extra = ev.recompensaSeBusca || 0;
    if (extra) { darChapas(extra); toast(`🔧 ${t(S, 'taller.reparado')} · +${extra} 🔩 (SE BUSCA)`); }
    else toast(`🔧 ${t(S, 'taller.reparado')}`);
  }
  if (ev.senalColeccionada) {
    const señal = SEN.senales.find((x) => x.id === ev.senalColeccionada);
    if (señal) toast(`📖 ${t(S, 'album.completada')}: ${señal.id} ${señal.nombre}`);
    comprobarCategoriasAlbum();
  }
}

function avanzar(sc) {
  if (!sesion) return;
  sesion.idx++;
  if (sesion.idx >= sesion.preguntas.length || (sesion.modo === 'boss' && sesion.fallos > sesion.limiteFallos)) {
    terminarSesion();
  } else {
    pintarPregunta(sc);
  }
}

function terminarSesion() {
  if (!sesion) return;
  if (sesion.timerId) clearInterval(sesion.timerId);
  glowCombo(false);
  setModoExamen(false);
  const seg = Math.floor((Date.now() - sesion.t0) / 1000);
  const datos = { ...sesion, segundos: seg };
  // "mission_complete" para la ruta principal; "mode_complete" para lo demás
  EV.registrar(sesion.modo === 'mision' ? 'mission_complete' : 'mode_complete', {
    route: 'mision', modeId: sesion.modo, worldId: sesion.mundoN, missionId: sesion.misionIdx,
    metadata: { aciertos: sesion.aciertos, fallos: sesion.fallos, segundos: seg },
  });
  sesion = null;
  navegar('resultado', { datos });
}

/* ================= RESULTADO ================= */

RENDERS.resultado = async (sc, { datos }) => {
  const s = getEstado();
  const n = datos.resultados.length;
  const total = datos.preguntas.length;

  if (datos.modo === 'mision') return resultadoMision(sc, datos);
  if (datos.modo === 'boss') return resultadoBoss(sc, datos);
  if (datos.modo === 'examen') return resultadoExamen(sc, datos);
  if (datos.modo === 'taller') return resultadoTaller(sc, datos);
  if (datos.modo === 'crono') return resultadoCrono(sc, datos);
  if (datos.modo === 'cruce') return resultadoCruces(sc, datos);
  if (datos.modo === 'bote') return resultadoBote(sc, datos);
  if (datos.modo === 'proxima') return resultadoProxima(sc, datos);
  if (datos.modo === 'reto') return resultadoReto(sc, datos);
};

async function resultadoCruces(sc, d) {
  const total = d.preguntas.length;
  const pleno = d.aciertos === total;
  const racha = tocarRacha();
  const bonus = pleno ? 60 : d.aciertos * 5;
  const { subida } = darXP(d.xp + bonus, DOC.rangos);
  const s = getEstado();
  if (d.aciertos > (s.cruces?.record || 0)) s.cruces = { record: d.aciertos };
  guardar();
  if (pleno) { sonido.fanfarria(); confeti(30); await sello(t(S, 'cruce.pleno'), 'ok', '🚦'); }
  sc.innerHTML = `<div class="resultado">
    <h1 class="${pleno ? 'ok' : ''}">${t(S, 'cruce.titulo')}</h1>
    <div style="font-size:3rem">🚦</div>
    <div class="marcador">${d.aciertos}/${total} ${t(S, 'cruce.resueltos')}</div>
    <div class="xp-total">+<span id="xp-roll">0</span> XP</div>
    <div class="acciones">
      <button class="btn btn--primary" id="otra">${t(S, 'cruce.otraTanda')}</button>
      <button class="btn btn--ghost" id="mapa-btn">${t(S, 'resultado.alMapa')}</button>
    </div>
  </div>`;
  rodarContador($('#xp-roll', sc), 0, d.xp + bonus, 800);
  $('#otra', sc).onclick = () => empezarCruces();
  $('#mapa-btn', sc).onclick = () => { sonido.tap(); navegar('mapa', {}, true); };
  celebraciones(subida, racha);
}

async function resultadoMision(sc, d) {
  const stars = estrellasPorAciertos(d.aciertos, d.preguntas.length);
  const nuevas = guardarEstrellas(d.mundoN, d.misionIdx, stars);
  const racha = tocarRacha();
  progresarDiaria('misiones');
  const bonus = 20 + stars * 10;
  const { subida } = darXP(d.xp + bonus, DOC.rangos);
  const superada = stars >= 1;
  const nearMiss = d.aciertos === 9;

  // Contrato: solo puede sumar. Fallarlo no toca estrellas, XP, racha ni Predictor.
  const cto = resolverContrato(d.contrato, {
    fallos: d.fallos, maxCombo: d.maxCombo,
    reparadas: d.reparadas || 0, fallosSenal: d.fallosSenal || 0,
  }, d._contratoResuelto === true);
  d._contratoResuelto = true;
  if (cto.hubo) {
    EV.registrar(cto.logrado ? 'contract_completed' : 'contract_failed', {
      worldId: d.mundoN, metadata: { id: d.contrato.id },
    });
  }

  if (superada) await sello(t(S, 'resultado.misionSuperada'), 'ok', '★'.repeat(stars));
  pintar();

  function pintar() {
    sc.innerHTML = `<div class="resultado">
      <h1 class="${superada ? 'ok' : 'ko'}">${superada ? t(S, 'resultado.misionSuperada') : t(S, 'resultado.misionFallida')}</h1>
      <div class="stars-big" id="stars"></div>
      <div class="marcador">${d.aciertos}/${d.preguntas.length} ${t(S, 'resultado.aciertos')} · ${esc(d.titulo || '')}</div>
      ${nearMiss ? `<div class="near-miss">${t(S, 'resultado.nearMiss', { n: 1, estrellas: '★★★' })}</div>` : ''}
      ${cto.hubo ? `<div class="contrato-cierre ${cto.logrado ? 'contrato-cierre--ok' : ''}">
        ${cto.logrado ? `${t(S, 'contrato.logrado')} · +${PREMIO_CHAPAS} 🔩` : t(S, 'contrato.fallado')}
      </div>` : ''}
      <div class="xp-total">+<span id="xp-roll">0</span> XP</div>
      <div id="zona-cofre">${superada ? `<div class="cofre" id="cofre">🎁</div><div class="cofre-hint">${t(S, 'resultado.cofre')}</div>` : ''}</div>
      <div id="zona-proxima"></div>
      <div class="acciones">
        ${stars < 3 ? `<button class="btn btn--revancha" id="revancha">${t(S, 'resultado.revancha')}</button>` : ''}
        <button class="btn ${stars === 3 ? 'btn--primary' : 'btn--ghost'}" id="otra">${t(S, 'resultado.otraMision')}</button>
        <button class="btn btn--ghost" id="mapa-btn">${t(S, 'resultado.alMapa')}</button>
      </div>
    </div>`;
    // estrellas con pop secuencial + sonido
    const cont = $('#stars', sc);
    [0, 1, 2].forEach((i) => {
      const sp = el(`<span class="${i < stars ? '' : 'off'}">★</span>`);
      cont.appendChild(sp);
      if (i < stars) setTimeout(() => { sp.classList.add('pop'); sonido.estrella(i); haptic.ligero(); }, 300 + i * 320);
    });
    rodarContador($('#xp-roll', sc), 0, d.xp + bonus, 800);
    const cofre = $('#cofre', sc);
    if (cofre) cofre.onclick = () => {
      const premio = abrirCofre(stars);
      sonido.cofre(); haptic.celebracion();
      cofre.classList.add('cofre--abierto');
      setTimeout(() => {
        $('#zona-cofre', sc).innerHTML = `<div class="cofre-premio">${premio.tipo === 'chapas' ? t(S, 'resultado.cofreChapas', { n: premio.n }) : '🛡️ ' + t(S, 'resultado.cofreProtector')}</div>`;
        actualizarHUD();
      }, 450);
    };
    $('#revancha', sc)?.addEventListener('click', () => {
      sonido.tap(); haptic.medio();
      navegar('mision', { cfg: { modo: 'mision', mundoN: d.mundoN, misionIdx: d.misionIdx, preguntas: d.preguntas, titulo: d.titulo } });
    });
    $('#otra', sc).onclick = () => { sonido.tap(); navegar('mundo', { n: d.mundoN }, true); };
    $('#mapa-btn', sc).onclick = () => { sonido.tap(); navegar('mapa', {}, true); };
    celebraciones(subida, racha);
    // sesión con sustancia terminada → deja lista la próxima parada
    generarProximaParada(EV.sesionActual()).then((np) => pintarTarjetaProxima(sc, np));
  }
}

async function celebraciones(subida, racha) {
  const nuevos = FLAGS.progressiveUnlocks ? revisarDesbloqueos() : [];
  if (subida) {
    confeti();
    sonido.fanfarria();
    await sello(t(S, 'rango.subida'), 'rango', `${subida.icono} ${subida.nombre}`);
  }
  if (racha?.evento === 'protegida') toast(t(S, 'racha.protegida'));
  const fr = S.racha.frases[String(getEstado().racha.dias)];
  if (racha?.evento === 'sube' && fr) toast(`🔥 ${fr}`, 3200);
  if (nuevos.length) await celebrarDesbloqueos(nuevos);
  actualizarHUD();
}

async function resultadoBoss(sc, d) {
  const m = mundoDef(d.mundoN);
  const victoria = d.fallos <= d.limiteFallos && d.resultados.length === d.preguntas.length;
  const racha = tocarRacha();
  let desbloqueo = null;
  if (victoria) {
    const est = mundoEstado(d.mundoN);
    const primeraVez = !est.bossSuperado;
    est.bossSuperado = true;
    guardar();
    progresarDiaria('boss');
    darXP(100, DOC.rangos);
    const sig = mundoDef(d.mundoN + 1);
    if (primeraVez && sig) desbloqueo = sig;
    sonido.fanfarria(); haptic.celebracion(); confeti(34);
    await sello(t(S, 'boss.victoria'), 'ok', esc(m.boss.nombre));
  } else {
    sonido.derrota();
    await sello(t(S, 'boss.derrota'), 'ko');
  }
  sc.innerHTML = `<div class="resultado">
    <h1 class="${victoria ? 'ok' : 'ko'}">${victoria ? t(S, 'boss.victoria') : t(S, 'boss.derrota')}</h1>
    <div style="font-size:3rem">${victoria ? '🏆' : '👹'}</div>
    <div class="marcador">${d.aciertos}/${d.preguntas.length} · ${esc(m.boss.nombre)}</div>
    ${!victoria ? `<p class="texto-suave" style="max-width:300px">${t(S, 'boss.derrotaSub')}</p>` : ''}
    ${desbloqueo ? `<div class="near-miss">${t(S, 'boss.desbloqueado', { mundo: desbloqueo.nombre })} ${desbloqueo.icono}</div>` : ''}
    <div class="acciones">
      ${!victoria ? `<button class="btn btn--revancha" id="revancha">${t(S, 'resultado.revancha')}</button>` : ''}
      <button class="btn ${victoria ? 'btn--primary' : 'btn--ghost'}" id="mapa-btn">${t(S, 'resultado.alMapa')}</button>
    </div>
  </div>`;
  $('#revancha', sc)?.addEventListener('click', async () => {
    const banco = await getBanco(d.mundoN);
    navegar('mision', { cfg: { modo: 'boss', mundoN: d.mundoN, preguntas: componerBoss(banco, 15), limiteFallos: 2, titulo: m.boss.nombre } });
  });
  $('#mapa-btn', sc).onclick = () => {
    sonido.tap();
    // el MEJOR momento del paywall: tras vencer al boss del mundo 3 (§12)
    if (victoria && d.mundoN === 3 && !getEstado().compras.pase && !paywallMostradoTrasBoss3) {
      paywallMostradoTrasBoss3 = true;
      navegar('paywall');
    } else navegar('mapa', {}, true);
  };
  celebraciones(null, racha);
}

async function resultadoExamen(sc, d) {
  const s = getEstado();
  const apto = d.fallos <= 3;
  s.simulacros.push({ fecha: HOY(), fallos: d.fallos, apto, segundos: d.segundos });
  if (s.simulacros.length > 50) s.simulacros.splice(0, s.simulacros.length - 50);
  guardar();
  const racha = tocarRacha();
  darXP(apto ? 150 : 40, DOC.rangos);
  if (apto) { sonido.fanfarria(); confeti(); } else sonido.derrota();
  sc.innerHTML = `<div class="resultado">
    <div class="examen-resultado-chip" style="color:${apto ? 'var(--senal-verde-vivo)' : 'var(--senal-rojo-vivo)'}">${apto ? t(S, 'torre.apto') : t(S, 'torre.noApto')}</div>
    <div class="marcador">${d.fallos} ${t(S, 'torre.fallos')} · ${t(S, 'torre.tiempo')}: ${fmtTiempo(d.segundos)}</div>
    <p class="texto-suave" style="max-width:320px">${t(S, 'torre.consejo')}</p>
    <div class="acciones">
      ${apto ? `<button class="btn btn--verde" id="compartir-apto">${t(S, 'torre.compartirApto')} 📤</button>` : ''}
      <button class="btn btn--cian" id="ver-correccion">${t(S, 'torre.correccion')}</button>
      <button class="btn btn--ghost" id="volver-torre">${t(S, 'resultado.alMapa')}</button>
    </div>
    <div id="correccion" class="oculto" style="width:100%;text-align:left"></div>
  </div>`;
  $('#volver-torre', sc).onclick = () => { sonido.tap(); navegar('torre', {}, true); };
  $('#compartir-apto', sc)?.addEventListener('click', async (e) => {
    const btn = e.currentTarget; btn.disabled = true;
    const texto = t(S, 'torre.compartirAptoTexto', { fallos: d.fallos });
    try {
      const blob = await generarTarjeta({
        tipo: 'apto', valor: 'APTO', titulo: 'Simulacro DGT Tower',
        sub: `${d.fallos} fallos · ${fmtTiempo(d.segundos)}`, reto: 'Voy a por el carnet. ¿Y tú?',
      });
      const r = await compartirTarjeta(blob, texto);
      if (r === 'descargada') toast('Tarjeta guardada 📸 · texto copiado');
    } catch { try { await navigator.clipboard.writeText(texto); toast('Copiado 📋'); } catch {} }
    btn.disabled = false;
  });
  $('#ver-correccion', sc).onclick = () => {
    const cont = $('#correccion', sc);
    cont.classList.remove('oculto');
    cont.innerHTML = d.resultados.map(({ q, elegida, ok }) => `
      <div class="correccion-item ${ok ? '' : 'correccion-item--ko'}">
        <b>${ok ? '✅' : '❌'} ${esc(q.pregunta)}</b>
        <div class="peq">✔ ${esc(q.opciones[q.correcta])}</div>
        ${!ok ? `<div class="peq">✘ Tu respuesta: ${esc(q.opciones[elegida])}</div>` : ''}
        ${!ok && q.trampa ? `<div class="peq">🪤 ${esc(q.trampa)}</div>` : ''}
        ${q.truco ? `<div class="peq">💡 ${esc(q.truco)}</div>` : ''}
      </div>`).join('');
    $('#ver-correccion', sc).classList.add('oculto');
  };
  celebraciones(null, racha);
}

async function resultadoTaller(sc, d) {
  const racha = tocarRacha();
  darXP(d.xp, DOC.rangos);
  await sello(d.fallos === 0 ? 'TALLER LIMPIO' : 'SESIÓN DE TALLER', d.fallos === 0 ? 'ok' : 'rango');
  sc.innerHTML = `<div class="resultado">
    <h1 class="${d.fallos <= 2 ? 'ok' : 'ko'}">🔧 ${d.aciertos}/${d.preguntas.length}</h1>
    <div class="marcador">Reparaciones en marcha: acierta cada avería 2 días distintos</div>
    <div class="xp-total">+${d.xp} XP</div>
    <div class="acciones">
      <button class="btn btn--cian" id="volver-taller">${t(S, 'nav.taller')}</button>
      <button class="btn btn--ghost" id="mapa-btn">${t(S, 'resultado.alMapa')}</button>
    </div>
  </div>`;
  $('#volver-taller', sc).onclick = () => navegar('taller', {}, true);
  $('#mapa-btn', sc).onclick = () => navegar('mapa', {}, true);
  celebraciones(null, racha);
}

async function resultadoCrono(sc, d) {
  const s = getEstado();
  const semana = semanaISO();
  if (s.contrarreloj.semana !== semana) { s.contrarreloj.semana = semana; s.contrarreloj.record = 0; }
  const nuevoRecord = d.aciertos > s.contrarreloj.record;
  if (nuevoRecord) s.contrarreloj.record = d.aciertos;
  guardar();
  const racha = tocarRacha();
  darXP(d.xp, DOC.rangos);
  if (nuevoRecord && d.aciertos > 0) { confeti(); sonido.fanfarria(); await sello(t(S, 'contrarreloj.nuevoRecord'), 'rango', `${d.aciertos} ✓`); }
  sc.innerHTML = `<div class="resultado">
    <h1>⏱️ ${d.aciertos} ${t(S, 'resultado.aciertos')}</h1>
    ${nuevoRecord ? `<div class="near-miss">${t(S, 'contrarreloj.nuevoRecord')}</div>` : `<div class="marcador">${t(S, 'contrarreloj.record')}: ${s.contrarreloj.record}</div>`}
    <div class="xp-total">+${d.xp} XP</div>
    <div class="acciones">
      <button class="btn btn--cian" id="compartir">${t(S, 'contrarreloj.compartir')} 📤</button>
      <button class="btn btn--revancha" id="otra-vez">${t(S, 'resultado.revancha')}</button>
      <button class="btn btn--ghost" id="mapa-btn">${t(S, 'resultado.alMapa')}</button>
    </div>
  </div>`;
  $('#compartir', sc).onclick = async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    const texto = t(S, 'contrarreloj.compartirTexto', { n: d.aciertos });
    try {
      const blob = await generarTarjeta({
        tipo: 'crono', valor: d.aciertos, titulo: t(S, 'contrarreloj.titulo'),
        sub: 'preguntas en 90 segundos', reto: '¿Me lo superas?',
      });
      const r = await compartirTarjeta(blob, texto);
      if (r === 'descargada') toast('Tarjeta guardada 📸 · texto copiado');
    } catch { try { await navigator.clipboard.writeText(texto); toast('Copiado 📋'); } catch {} }
    btn.disabled = false;
  };
  $('#otra-vez', sc).onclick = () => empezarContrarreloj();
  $('#mapa-btn', sc).onclick = () => navegar('mapa', {}, true);
  celebraciones(null, racha);
}

async function empezarContrarreloj() {
  sonido.tap(); haptic.medio();
  const bancoTotal = await getBancoCompleto(mundosAccesibles());
  if (bancoTotal.length < 10) { toast('Aún no hay banco suficiente'); return; }
  const preguntas = componerExamen(bancoTotal, 60);
  navegar('mision', { cfg: { modo: 'crono', preguntas, titulo: 'Contrarreloj' } });
}

/* ================= TORRE ================= */

RENDERS.torre = async (sc) => {
  const s = getEstado();
  const puedeGratis = s.compras.pase || s.simulacroHoy !== HOY();
  sc.innerHTML = `
    <div class="torre-head">
      <div class="icono">🏢</div>
      <h1>${t(S, 'torre.titulo')}</h1>
      <p class="sub">${t(S, 'torre.sub')}</p>
    </div>
    <button class="btn btn--primary" id="subir" ${puedeGratis ? '' : 'disabled'}>${t(S, 'torre.empezar')}</button>
    ${!puedeGratis ? `<p class="centrado texto-suave" style="margin-top:12px">${t(S, 'torre.limiteGratis')}</p>
      <button class="btn btn--ghost" id="ir-pase">${t(S, 'paywall.titulo')}</button>` : ''}
    ${s.simulacros.length ? `
    <div class="historial-sim">
      <h2 class="texto-suave">${t(S, 'torre.historial')}</h2>
      ${s.simulacros.slice(-8).reverse().map((x) => `
        <div class="sim-row">
          <span>${x.fecha}</span>
          <span>${x.fallos} ${t(S, 'torre.fallos')} · ${fmtTiempo(x.segundos)}</span>
          <span class="${x.apto ? 'apto' : 'noapto'}">${x.apto ? t(S, 'torre.apto') : t(S, 'torre.noApto')}</span>
        </div>`).join('')}
    </div>` : ''}`;
  $('#subir', sc)?.addEventListener('click', async () => {
    const bancoTotal = await getBancoCompleto(mundosAccesibles());
    if (bancoTotal.length < 30) { toast('Aún no hay banco suficiente para un simulacro'); return; }
    if (!s.compras.pase) { s.simulacroHoy = HOY(); guardar(); }
    sonido.tap(); haptic.medio();
    navegar('mision', { cfg: { modo: 'examen', preguntas: componerExamen(bancoTotal, 30), limiteFallos: Infinity, titulo: 'Simulacro' } });
  });
  $('#ir-pase', sc)?.addEventListener('click', () => navegar('paywall'));
};

/* ================= TALLER ================= */

RENDERS.taller = async (sc) => {
  const s = getEstado();
  const accesibles = mundosAccesibles();
  const bancoQ = await getBancoCompleto(accesibles);
      const cruces = crucesDe(accesibles);
  // un cruce fallado también es un coche averiado: se repara volviendo a resolverlo
  const coches = cochesDelTaller(bancoQ.concat(cruces));
  const buscados = coches.filter((c) => c.fallos >= 3).slice(0, 3);
  const pase = s.compras.pase;
  sc.innerHTML = `
    <div class="taller-head"><h1>🔧 ${t(S, 'taller.titulo')}</h1>
    <p class="sub">${coches.length ? `${coches.length} ${coches.length === 1 ? 'avería' : 'averías'} pendientes` : ''}</p></div>
    ${coches.length === 0 ? `<div class="taller-vacio"><div class="icono">✨</div>${t(S, 'taller.vacio')}</div>` : `
      ${pase && buscados.length ? buscados.map((c) => `
        <div class="sebusca">
          <h3>${t(S, 'taller.seBusca')}</h3>
          <div class="pregunta-txt">“${esc(c.q.titulo || c.q.pregunta)}”</div>
          <div class="recompensa">${t(S, 'taller.recompensa', { n: 40 })} · ${t(S, 'taller.fallada', { n: c.fallos })}</div>
        </div>`).join('') : ''}
      ${coches.slice(0, 12).map((c) => `
        <div class="coche-averiado">
          <span class="icono">${c.q.tipo === 'cruce' ? '🚦💥' : '🚗💥'}</span>
          <span class="texto">${esc(c.q.titulo || c.q.pregunta)}</span>
          <span class="estado">${c.reparaciones >= 2 ? `<span class="ok">${t(S, 'taller.reparado')}</span>` : t(S, 'taller.reparar', { n: c.reparaciones })}</span>
        </div>`).join('')}
      <button class="btn btn--cian" id="reparar-btn">${t(S, 'taller.sesionReparacion')} 🔧</button>
      ${pase ? `<button class="btn btn--primary" id="boss-taller" style="margin-top:12px">${t(S, 'taller.bossSemanal')}<br><small style="font-family:var(--font-ui);font-size:.65rem">${t(S, 'taller.bossSemanalSub')}</small></button>` : ''}
    `}`;
  $('#reparar-btn', sc)?.addEventListener('click', () => {
    sonido.tap(); haptic.medio();
    navegar('mision', { cfg: { modo: 'taller', preguntas: componerTaller(coches, 10), titulo: t(S, 'taller.sesionReparacion') } });
  });
  $('#boss-taller', sc)?.addEventListener('click', () => {
    sonido.tap(); haptic.medio();
    navegar('mision', { cfg: { modo: 'taller', preguntas: componerTaller(coches, Math.min(15, coches.length)), titulo: t(S, 'taller.bossSemanal') } });
  });
};

/* ================= ÁLBUM ================= */

function comprobarCategoriasAlbum() {
  const s = getEstado();
  for (const cat of SEN.categorias) {
    const deCat = SEN.senales.filter((x) => x.categoria === cat.id);
    if (!deCat.length || s.albumCategorias.includes(cat.id)) continue;
    if (deCat.every((x) => (s.album[x.id] || 0) >= 2)) {
      s.albumCategorias.push(cat.id);
      darChapas(cat.recompensaChapas);
      confeti();
      sello(t(S, 'album.categoriaCompleta'), 'rango', `${cat.icono} ${cat.nombre} · +${cat.recompensaChapas} 🔩`);
    }
  }
  guardar();
}

RENDERS.album = (sc) => {
  const s = getEstado();
  sc.innerHTML = `
    <div class="album-head"><h1>📖 ${t(S, 'album.titulo')}</h1><p class="sub">${t(S, 'album.sub')}</p></div>
    ${SEN.categorias.map((cat) => {
      const deCat = SEN.senales.filter((x) => x.categoria === cat.id);
      if (!deCat.length) return '';
      const tengo = deCat.filter((x) => (s.album[x.id] || 0) >= 2).length;
      return `<div class="album-cat">
        <div class="album-cat__head"><h2>${cat.icono} ${esc(cat.nombre)}</h2>
        <span class="prog ${tengo === deCat.length ? 'completa' : ''}">${t(S, 'album.progreso', { n: tengo, total: deCat.length })}</span></div>
        <div class="album-grid">
          ${deCat.map((x) => {
            const tiene = (s.album[x.id] || 0) >= 2;
            return `<div class="album-celda ${tiene ? '' : 'album-celda--pendiente'}" title="${esc(x.nombre)}">
              ${svgSenal(x)}<div class="cod">${tiene ? x.id : t(S, 'album.porCoger')}</div>
            </div>`;
          }).join('')}
        </div>
      </div>`;
    }).join('')}`;
};

/* ================= PERFIL ================= */

RENDERS.perfil = async (sc) => {
  const s = getEstado();
  const rango = rangoActual(DOC.rangos, s.xp);
  const bancoTotal = await getBancoCompleto(DOC.mundos.map((m) => m.n));
  const pred = calcularPredictor(bancoTotal.length || 900);
  const pctBarra = rango.siguiente ? Math.round(100 * (s.xp - rango.xp) / (rango.siguiente.xp - rango.xp)) : 100;
  const r = 70, circ = Math.PI * r;
  sc.innerHTML = `
    <h1>🏎️ ${t(S, 'perfil.titulo')}</h1>
    <div class="perfil-rango">
      <div class="icono">${rango.icono}</div>
      <div style="flex:1">
        <div class="nombre">${esc(rango.nombre)}</div>
        <div class="xp-barra"><div style="width:${pctBarra}%"></div></div>
        <div class="xp-num">${s.xp} XP${rango.siguiente ? ` · ${t(S, 'rango.eres')} ${rango.siguiente.nombre} a los ${rango.siguiente.xp}` : ' · rango máximo'}</div>
      </div>
    </div>
    <div class="predictor">
      <h2>📊 ${t(S, 'perfil.predictor')}</h2>
      ${pred.listo ? `
        <div class="gauge">
          <svg viewBox="0 0 160 90">
            <path d="M 10 85 A ${r} ${r} 0 0 1 150 85" fill="none" stroke="var(--asfalto-600)" stroke-width="12" stroke-linecap="round"/>
            <path d="M 10 85 A ${r} ${r} 0 0 1 150 85" fill="none" stroke="${pred.pct >= 90 ? 'var(--senal-verde-vivo)' : pred.pct >= 70 ? 'var(--amarillo-obras)' : 'var(--neon-magenta)'}"
              stroke-width="12" stroke-linecap="round" stroke-dasharray="${(pred.pct / 100) * circ} ${circ}"/>
          </svg>
          <div class="num" style="padding-top:26px">${pred.pct}%</div>
        </div>
        <div class="consejo">${t(S, 'torre.consejo')}<br>${t(S, 'perfil.predictorSub')}</div>`
      : `<div class="consejo">${t(S, 'perfil.predictorPocosDatos')}<br><b>${pred.hechas}/${pred.minimo}</b></div>`}
    </div>
    <h2 class="texto-suave" style="margin:20px 0 8px">🪤 ${t(S, 'trampas.titulo')}</h2>
    <p class="texto-suave" style="margin-bottom:10px">${t(S, 'trampas.sub')}</p>
    <div id="zona-radiografia"></div>
    <div class="stats-grid">
      <div class="stat-celda"><div class="num">${pred.listo ? pred.precision + '%' : '—'}</div><div class="lbl">${t(S, 'perfil.precision')}</div></div>
      <div class="stat-celda"><div class="num">${pred.listo ? pred.cobertura + '%' : '—'}</div><div class="lbl">${t(S, 'perfil.cobertura')}</div></div>
      <div class="stat-celda"><div class="num">${s.respuestas.length}</div><div class="lbl">${t(S, 'perfil.respondidas')}</div></div>
      <div class="stat-celda"><div class="num">🔥 ${s.racha.dias} · 🛡️ ${s.racha.protectores}</div><div class="lbl">${t(S, 'perfil.racha')} / ${t(S, 'perfil.protectores')}</div></div>
    </div>
    <button class="card-juego" id="ir-garaje">
      <span class="card-juego__ico">🔧</span>
      <span class="card-juego__txt"><b>${t(S, 'garaje.titulo')}</b><br>
        <span class="texto-suave">${t(S, 'garaje.chapas')}: ${s.chapas} 🔩</span></span>
      <span class="card-juego__go">GO</span>
    </button>
    <h2 class="texto-suave" style="margin-bottom:8px">${t(S, 'perfil.ajustes')}</h2>
    <div class="ajustes">
      <button class="ajuste-row" id="ajuste-fecha">${fechaExamen() ? t(S, 'examen.cambiar') : t(S, 'examen.poner')} <span>🗓️</span></button>
      <button class="ajuste-row" id="tg-sonido">${t(S, 'perfil.sonido')} <span class="toggle ${s.ajustes.sonido ? 'on' : ''}"></span></button>
      <button class="ajuste-row" id="tg-haptics">${t(S, 'perfil.haptics')} <span class="toggle ${s.ajustes.haptics ? 'on' : ''}"></span></button>
      <button class="ajuste-row" id="exportar">${t(S, 'perfil.exportar')} <span>📤</span></button>
      <button class="ajuste-row" id="importar">${t(S, 'perfil.importar')} <span>📥</span></button>
      <input type="file" id="importar-file" accept=".json,application/json" class="oculto">
      <button class="ajuste-row" id="borrar" style="color:var(--senal-rojo-vivo)">${t(S, 'perfil.borrar')} <span>🗑️</span></button>
    </div>
    ${bloquePruebas(s)}
    <p class="legal">${t(S, 'perfil.avisoLegal')}</p>`;
  $('#ir-garaje', sc).onclick = () => { sonido.tap(); haptic.ligero(); navegar('garaje'); };
  $('#ajuste-fecha', sc).onclick = () => {
    sonido.tap();
    pedirFechaExamen({ alCerrar: () => RENDERS.perfil(sc) });
  };
  $('#tg-sonido', sc).onclick = () => { s.ajustes.sonido = !s.ajustes.sonido; guardar(); sonido.tap(); RENDERS.perfil(sc); };
  $('#tg-haptics', sc).onclick = () => { s.ajustes.haptics = !s.ajustes.haptics; guardar(); haptic.medio(); RENDERS.perfil(sc); };
  $('#exportar', sc).onclick = () => {
    const blob = new Blob([exportarJSON()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `carnet-quest-progreso-${HOY()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  $('#importar', sc).onclick = () => $('#importar-file', sc).click();
  $('#importar-file', sc).onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try { importarJSON(await f.text()); toast(t(S, 'perfil.importado')); RENDERS.perfil(sc); actualizarHUD(); }
    catch { toast(t(S, 'perfil.importarError')); }
  };
  $('#borrar', sc).onclick = () => {
    const ov = el(`<div class="modal-overlay"><div class="modal" role="dialog" aria-modal="true"><h2>⚠️</h2>
      <p>${t(S, 'perfil.borrarConfirma')}</p>
      <button class="btn btn--ghost" id="b-si">${t(S, 'perfil.borrar')}</button>
      <button class="btn btn--cian" id="b-no">${t(S, 'mision.seguir')}</button></div></div>`);
    document.body.appendChild(ov);
    atraparFoco(ov, () => ov.remove());   // Escape = NO borrar
    $('#b-no', ov).onclick = () => ov.remove();
    $('#b-si', ov).onclick = async () => { await borrarTodo(); ov.remove(); navegar('onboarding'); };
  };
  engancharPruebas(sc);
  pintarRadiografia(sc);
};

/* ---- Modo de prueba: caja negra local, apagada por defecto ---- */

function bloquePruebas(s) {
  if (!FLAGS.localTestModeUI) return '';
  const on = s.pruebas?.activo === true;
  return `<h2 class="texto-suave" style="margin:20px 0 8px">${t(S, 'pruebas.titulo')}</h2>
    <div class="ajustes">
      <button class="ajuste-row" id="tg-pruebas">${t(S, 'pruebas.titulo')} <span class="toggle ${on ? 'on' : ''}"></span></button>
      ${on ? `<button class="ajuste-row" id="pruebas-exportar">${t(S, 'pruebas.exportar')} <span>📤</span></button>
      <button class="ajuste-row" id="pruebas-borrar">${t(S, 'pruebas.borrar')} <span>🗑️</span></button>` : ''}
    </div>
    <p class="legal">${t(S, 'pruebas.explica')}${on ? ` · ${t(S, 'pruebas.eventos', { n: EV.contarEventos() })}` : ''}</p>`;
}

function engancharPruebas(sc) {
  const tg = $('#tg-pruebas', sc);
  if (!tg) return;
  tg.onclick = () => {
    sonido.tap();
    EV.activar(getEstado().pruebas?.activo !== true);
    RENDERS.perfil(sc);
  };
  $('#pruebas-exportar', sc)?.addEventListener('click', async (e) => {
    const btn = e.currentTarget;
    btn.disabled = true;
    try {
      const via = await EV.entregarExportacion(`carnet-quest-prueba-${HOY()}.json`);
      // se nombra lo que ha pasado de verdad, no lo que nos gustaría
      toast(t(S, `pruebas.exportado_${via}`), 3600);
    } catch (err) {
      if (err?.name !== 'AbortError') toast(t(S, 'pruebas.exportado_imposible'), 3600);
    }
    btn.disabled = false;
  });
  $('#pruebas-borrar', sc)?.addEventListener('click', () => {
    const ov = el(`<div class="modal-overlay"><div class="modal" role="dialog" aria-modal="true"><h2>🗑️</h2>
      <p>${t(S, 'pruebas.borrarConfirma')}</p>
      <button class="btn btn--ghost" id="p-si">${t(S, 'pruebas.borrar')}</button>
      <button class="btn btn--cian" id="p-no">${t(S, 'mision.seguir')}</button></div></div>`);
    document.body.appendChild(ov);
    atraparFoco(ov, () => ov.remove());   // Escape = NO borrar
    $('#p-no', ov).onclick = () => ov.remove();
    $('#p-si', ov).onclick = () => { EV.borrarEventos(); ov.remove(); toast(t(S, 'pruebas.borrado')); RENDERS.perfil(sc); };
  });
}

/* ================= PAYWALL ================= */

function validarCodigo(codigo) {
  const m = String(codigo).trim().toUpperCase().match(/^CQ-([A-Z0-9]{5})-([A-Z0-9]{5})$/);
  if (!m) return false;
  let h = 5381;
  const base = `CQ|${m[1]}|asfalto-neon-2026`;
  for (let i = 0; i < base.length; i++) h = ((h * 33) ^ base.charCodeAt(i)) >>> 0;
  const esperado = h.toString(36).toUpperCase().padStart(5, '0').slice(-5);
  return m[2] === esperado;
}

RENDERS.paywall = async (sc) => {
  const s = getEstado();
  const bancoTotal = await getBancoCompleto(DOC.mundos.map((m) => m.n));
  const vistas = Object.keys(s.vistas).length;
  const pct = bancoTotal.length ? Math.max(1, Math.round(100 * vistas / bancoTotal.length)) : 1;
  sc.innerHTML = `<div class="paywall">
    <div class="mision-top"><button class="btn-salir" id="cerrar">✕</button></div>
    <h1>${t(S, 'paywall.titulo')}</h1>
    <div class="precio">${t(S, 'paywall.precio')}</div>
    <div class="gancho">${t(S, 'paywall.gancho', { pct })}</div>
    ${(() => {
      // La urgencia aquí es REAL y la puso el jugador: es su fecha, no una
      // cuenta atrás inventada. Por eso se puede enseñar sin remordimiento.
      const d = diasHasta(fechaExamen());
      if (d === null || d < 0) return '';
      return `<div class="gancho gancho--fecha">${d === 0 ? t(S, 'paywall.conFechaHoy') : t(S, 'paywall.conFecha', { n: d })}</div>`;
    })()}
    <ul class="beneficios">${S.paywall.beneficios.map((b) => `<li>${esc(b)}</li>`).join('')}</ul>
    <button class="btn btn--primary" id="comprar">${t(S, 'paywall.comprar')} · ${PRECIO}</button>
    <button class="btn btn--ghost" id="canjear">${t(S, 'paywall.canjear')}</button>
    <div id="zona-codigo" class="oculto">
      <div class="sep"></div>
      <input id="codigo" placeholder="CQ-XXXXX-XXXXX" autocomplete="off" spellcheck="false">
      <button class="btn btn--cian" id="activar">${t(S, 'paywall.canjearTitulo')}</button>
    </div>
    <button class="btn btn--ghost" id="luego" style="border:none;background:none">${t(S, 'paywall.luego')}</button>
    <p class="honesto">${t(S, 'paywall.honesto')}</p>
  </div>`;
  $('#cerrar', sc).onclick = $('#luego', sc).onclick = () => { sonido.tap(); navegar('mapa', {}, true); };
  $('#comprar', sc).onclick = () => {
    sonido.tap();
    if (stripeListo()) {
      window.open(STRIPE_URL, '_blank');
      $('#zona-codigo', sc).classList.remove('oculto');
    } else {
      // aún sin pasarela: abre el canje y avisa (nunca una pestaña rota)
      $('#zona-codigo', sc).classList.remove('oculto');
      $('#codigo', sc).focus();
      toast(t(S, 'paywall.sinPasarela'), 3600);
    }
  };
  $('#canjear', sc).onclick = () => { sonido.tap(); $('#zona-codigo', sc).classList.toggle('oculto'); };
  $('#activar', sc).onclick = () => {
    const v = $('#codigo', sc).value;
    if (validarCodigo(v)) {
      s.compras.pase = true;
      s.compras.codigo = v.trim().toUpperCase();
      guardar();
      confeti(40); sonido.fanfarria(); haptic.celebracion();
      sello(t(S, 'paywall.canjearOk'), 'rango').then(() => navegar('mapa'));
    } else {
      toast(t(S, 'paywall.canjearError'));
      haptic.ko();
    }
  };
};
