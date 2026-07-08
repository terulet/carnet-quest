// CARNET QUEST — pantallas y motor de sesión (mapa, mundo, misión, boss, torre, taller, álbum, perfil, paywall)

import {
  getEstado, guardar, HOY, semanaISO, mundoEstado, estrellasDeMundo,
  registrarRespuesta, tocarRacha, exportarJSON, importarJSON, borrarTodo,
} from './state.js';
import { getSenales, getBanco, getBancoCompleto, t } from './data.js';
import { procesarRespuesta, cochesDelTaller } from './srs.js';
import {
  componerMision, componerBoss, componerExamen, componerTaller,
  estrellasPorAciertos, multiplicadorCombo, darXP, rangoActual, darChapas,
  abrirCofre, guardarEstrellas, RANGO_XP_ACIERTO,
} from './mission.js';
import { calcularPredictor } from './predictor.js';
import { sonido, haptic, setModoExamen } from './audio.js';
import { sello, confeti, xpFlotante, rodarContador, toast, sacudir, glowCombo } from './juice.js';
import { svgSenal } from './signs.js';
import { generarTarjeta, compartirTarjeta } from './sharecard.js';

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
  S = ctx.strings; DOC = ctx.mundos; SEN = await getSenales();
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
      <span class="hud__chip hud__chip--chapas" id="hud-chapas">🔩 0</span>
    </header>
    <main class="screens" id="screens"></main>
    <nav class="nav oculto" id="nav"></nav>`;
  hudEl = $('#hud');
  navEl = $('#nav');
  const cont = $('#screens');
  for (const id of ['onboarding', 'mapa', 'mundo', 'mision', 'resultado', 'torre', 'taller', 'album', 'perfil', 'paywall']) {
    const sc = el(`<section class="screen" data-screen="${id}"></section>`);
    cont.appendChild(sc);
    pantallas[id] = sc;
  }
  navEl.innerHTML = ['mapa', 'taller', 'torre', 'album', 'perfil'].map((id) => {
    const icos = { mapa: '🗺️', taller: '🔧', torre: '🏢', album: '📖', perfil: '🏎️' };
    return `<button class="nav__btn" data-ir="${id}"><span class="ico">${icos[id]}</span>${t(S, 'nav.' + (id === 'perfil' ? 'perfil' : id))}</button>`;
  }).join('');
  navEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-ir]');
    if (b) { sonido.tap(); haptic.ligero(); navegar(b.dataset.ir); }
  });
  // Enlace de desbloqueo: ?codigo=CQ-XXXXX-XXXXX (o ?pase= / ?unlock=) activa el Pase al
  // instante, para dejar que alguien pruebe el juego gratis con todo desbloqueado.
  const desbloqueo = aplicarUnlockPorURL();
  navegar(getEstado().onboarded ? 'mapa' : 'onboarding');
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
  hudEl.classList.toggle('oculto', id === 'onboarding' || (id === 'mision' && params.cfg?.modo === 'examen'));
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

function mundosAccesibles() {
  return DOC.mundos.filter((m) => mundoDesbloqueado(m.n) && !mundoDePago(m.n)).map((m) => m.n);
}

/* ================= ONBOARDING ================= */

RENDERS.onboarding = (sc) => {
  sc.innerHTML = `<div class="onboard">
    <h1>${t(S, 'onboarding.titulo')}</h1>
    <p class="sub">${t(S, 'onboarding.sub')}</p>
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
    navegar('mapa');
  };
};

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
          ${m.n === actualN && desb && !pago ? `<text class="coche-avatar" x="${x - 52}" y="${y + 10}" font-size="28">🚗</text>` : ''}
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
      <button class="card-senal" id="crono-card" style="width:100%;text-align:left;display:flex;gap:12px;align-items:center">
        <span style="font-size:1.8rem">⏱️</span>
        <span style="flex:1"><b>${t(S, 'contrarreloj.titulo')}</b><br>
          <span class="texto-suave">${t(S, 'contrarreloj.record')}: ${s.contrarreloj.semana === semanaISO() ? s.contrarreloj.record : 0}</span></span>
        <span style="font-family:var(--font-display);color:var(--neon-cian)">GO</span>
      </button>
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
  $('[data-torre]', sc).addEventListener('click', () => { sonido.tap(); navegar('torre'); });
  $('#crono-card', sc).onclick = () => empezarContrarreloj();
  // el viaje empieza abajo: Villa Asfalto queda a la vista al entrar
  requestAnimationFrame(() => { sc.scrollTop = Math.max(0, $('.mapa-wrap', sc).offsetHeight - sc.clientHeight + 40); });
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
      const bancoTotal = await getBancoCompleto(mundosAccesibles());
      const preguntas = componerMision(banco, bancoTotal, i);
      if (!preguntas.length) return;
      navegar('mision', { cfg: { modo: 'mision', mundoN: n, misionIdx: i, preguntas, titulo: m.misiones[i] } });
    });
  });
  const bossBtn = $('#boss', sc);
  if (bossBtn) bossBtn.addEventListener('click', () => {
    sonido.tap(); haptic.medio();
    mostrarIntroBoss(m, banco);
  });
};

function mostrarIntroBoss(m, banco) {
  const ov = el(`<div class="modal-overlay"><div class="modal">
    <div style="font-size:3rem">👹</div>
    <h2 style="color:var(--senal-rojo-vivo)">${esc(m.boss.nombre)}</h2>
    <p>${t(S, 'boss.aviso', { n: 15, fallos: 2 })}</p>
    <button class="btn btn--primary" id="boss-go">${t(S, 'boss.empezar')}</button>
    <button class="btn btn--ghost" id="boss-no">${t(S, 'boss.huir')}</button>
  </div></div>`);
  document.body.appendChild(ov);
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
    resultados: [], t0: Date.now(), timerId: null,
    limiteFallos: cfg.limiteFallos ?? Infinity,
    duracion: cfg.modo === 'examen' ? 30 * 60 : cfg.modo === 'crono' ? 90 : null,
  };
  sc.classList.toggle('modo-examen', cfg.modo === 'examen');
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

function pintarPregunta(sc) {
  const q = sesion.preguntas[sesion.idx];
  const n = sesion.preguntas.length;
  const senal = q.senalId ? SEN.senales.find((x) => x.id === q.senalId) : null;
  const esExamen = sesion.modo === 'examen';
  const dashes = n <= 15
    ? `<div class="dashes">${sesion.preguntas.map((_, i) =>
        `<span class="dash ${i < sesion.idx ? (sesion.resultados[i]?.ok ? 'dash--ok' : 'dash--ko') : i === sesion.idx ? 'dash--actual' : ''}"></span>`).join('')}</div>`
    : `<div class="dashes" style="visibility:hidden"></div>`;
  const derecha = esExamen
    ? `<span class="texto-suave" style="font-variant-numeric:tabular-nums">${sesion.idx + 1}/${n}</span><span class="timer-chip">${fmtTiempo(sesion.duracion)}</span>`
    : sesion.modo === 'boss'
      ? `<span class="fallos-vidas">${'❤️'.repeat(Math.max(0, sesion.limiteFallos + 1 - sesion.fallos))}${'🖤'.repeat(Math.min(sesion.fallos, sesion.limiteFallos + 1))}</span><span class="timer-chip">0:00</span>`
      : sesion.modo === 'crono'
        ? `<span class="timer-chip">${fmtTiempo(90)}</span>`
        : `<span class="combo-chip" id="combo">${sesion.combo >= 2 ? '🔥' + sesion.combo : ''}</span>`;
  sc.innerHTML = `
    <div class="mision-top">
      <button class="btn-salir" id="salir">✕</button>
      ${dashes}
      ${derecha}
    </div>
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
  const ov = el(`<div class="modal-overlay"><div class="modal">
    <h2>🚪</h2><p>${t(S, 'mision.abandonar')}</p>
    <button class="btn btn--ghost" id="m-salir">${t(S, 'mision.salir')}</button>
    <button class="btn btn--cian" id="m-seguir">${t(S, 'mision.seguir')}</button>
  </div></div>`);
  document.body.appendChild(ov);
  $('#m-seguir', ov).onclick = () => ov.remove();
  $('#m-salir', ov).onclick = () => {
    ov.remove();
    setModoExamen(false);
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
  const esCrono = sesion.modo === 'crono';
  sesion.resultados.push({ q, elegida: i, ok });
  if (ok) sesion.aciertos++; else sesion.fallos++;

  registrarRespuesta(q.id, ok);
  procesarRespuestaConEventos(q, ok);
  progresarDiaria('aciertos', ok ? 1 : 0);

  // bloquear opciones y marcar
  sc.querySelectorAll('.q-opcion').forEach((b) => {
    const bi = Number(b.dataset.i);
    b.disabled = true;
    if (bi === q.correcta && !esExamen) b.classList.add('q-opcion--ok');
    else if (bi === i && !ok && !esExamen) b.classList.add('q-opcion--ko');
    else if (!esExamen) b.classList.add('q-opcion--apagada');
  });

  // marcar dash
  const dash = sc.querySelectorAll('.dash')[sesion.idx];
  if (dash) { dash.classList.remove('dash--actual'); dash.classList.add(ok ? 'dash--ok' : 'dash--ko'); }

  if (esExamen) { setTimeout(() => avanzar(sc), 220); return; }

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
      xpFlotante(ev.clientX || window.innerWidth / 2, ev.clientY || 300, xp);
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
    sacudir($('#qcard', sc));
    if (sesion.combo >= 5) sonido.comboRoto();
    sesion.combo = 0;
    glowCombo(false);
  }
  actualizarHUD();

  if (esCrono) { setTimeout(() => avanzar(sc), ok ? 350 : 650); return; }

  // feedback jugoso (§8.3): la trampa SOLO al fallar
  const fb = $('#feedback', sc);
  const titulo = ok ? azar(S.feedback.aciertos) : azar(S.feedback.fallos);
  fb.innerHTML = `
    <div class="feedback__titulo ${ok ? 'feedback__titulo--ok' : 'feedback__titulo--ko'}">${titulo}</div>
    ${!ok && q.trampa ? `<div class="feedback__caja feedback__caja--trampa"><b>${t(S, 'mision.trampa')}</b>${esc(q.trampa)}</div>` : ''}
    ${q.truco ? `<div class="feedback__caja feedback__caja--truco"><b>${t(S, 'mision.truco')}</b>${esc(q.truco)}</div>` : ''}
    ${!ok ? `<div class="feedback__caja feedback__caja--info"><b>${t(S, 'mision.porQue')}</b>${esc(q.explicacion_corta)}${q.explicacion_larga ? `<br><br>${esc(q.explicacion_larga)}` : ''}</div>` : ''}
    <button class="btn ${ok ? 'btn--verde' : 'btn--cian'}" id="siguiente">${t(S, 'mision.siguiente')} →</button>`;
  $('#siguiente', fb).onclick = () => { sonido.tap(); avanzar(sc); };
  if (ok && !q.truco) setTimeout(() => { if (sesion && $('#siguiente', sc)) avanzar(sc); }, 1100);
  if (!ok) fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // boss: derrota inmediata al pasarse de fallos
  if (sesion.modo === 'boss' && sesion.fallos > sesion.limiteFallos) {
    setTimeout(() => terminarSesion(), 900);
  }
}

function procesarRespuestaConEventos(q, ok) {
  const ev = procesarRespuesta(q, ok);
  if (sesion?.modo === 'examen') return; // en examen, ni una pista (§8.4)
  if (ev.reparado) {
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
};

async function resultadoMision(sc, d) {
  const stars = estrellasPorAciertos(d.aciertos, d.preguntas.length);
  const nuevas = guardarEstrellas(d.mundoN, d.misionIdx, stars);
  const racha = tocarRacha();
  progresarDiaria('misiones');
  const bonus = 20 + stars * 10;
  const { subida } = darXP(d.xp + bonus, DOC.rangos);
  const superada = stars >= 1;
  const nearMiss = d.aciertos === 9;

  if (superada) await sello(t(S, 'resultado.misionSuperada'), 'ok', '★'.repeat(stars));
  pintar();

  function pintar() {
    sc.innerHTML = `<div class="resultado">
      <h1 class="${superada ? 'ok' : 'ko'}">${superada ? t(S, 'resultado.misionSuperada') : t(S, 'resultado.misionFallida')}</h1>
      <div class="stars-big" id="stars"></div>
      <div class="marcador">${d.aciertos}/${d.preguntas.length} ${t(S, 'resultado.aciertos')} · ${esc(d.titulo || '')}</div>
      ${nearMiss ? `<div class="near-miss">${t(S, 'resultado.nearMiss', { n: 1, estrellas: '★★★' })}</div>` : ''}
      <div class="xp-total">+<span id="xp-roll">0</span> XP</div>
      <div id="zona-cofre">${superada ? `<div class="cofre" id="cofre">🎁</div><div class="cofre-hint">${t(S, 'resultado.cofre')}</div>` : ''}</div>
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
  }
}

async function celebraciones(subida, racha) {
  if (subida) {
    confeti();
    sonido.fanfarria();
    await sello(t(S, 'rango.subida'), 'rango', `${subida.icono} ${subida.nombre}`);
  }
  if (racha?.evento === 'protegida') toast(t(S, 'racha.protegida'));
  const fr = S.racha.frases[String(getEstado().racha.dias)];
  if (racha?.evento === 'sube' && fr) toast(`🔥 ${fr}`, 3200);
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
  const bancoTotal = await getBancoCompleto(mundosAccesibles());
  const coches = cochesDelTaller(bancoTotal);
  const buscados = coches.filter((c) => c.fallos >= 3).slice(0, 3);
  const pase = s.compras.pase;
  sc.innerHTML = `
    <div class="taller-head"><h1>🔧 ${t(S, 'taller.titulo')}</h1>
    <p class="sub">${coches.length ? `${coches.length} ${coches.length === 1 ? 'avería' : 'averías'} pendientes` : ''}</p></div>
    ${coches.length === 0 ? `<div class="taller-vacio"><div class="icono">✨</div>${t(S, 'taller.vacio')}</div>` : `
      ${pase && buscados.length ? buscados.map((c) => `
        <div class="sebusca">
          <h3>${t(S, 'taller.seBusca')}</h3>
          <div class="pregunta-txt">“${esc(c.q.pregunta)}”</div>
          <div class="recompensa">${t(S, 'taller.recompensa', { n: 40 })} · ${t(S, 'taller.fallada', { n: c.fallos })}</div>
        </div>`).join('') : ''}
      ${coches.slice(0, 12).map((c) => `
        <div class="coche-averiado">
          <span class="icono">🚗💥</span>
          <span class="texto">${esc(c.q.pregunta)}</span>
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
    <div class="stats-grid">
      <div class="stat-celda"><div class="num">${pred.listo ? pred.precision + '%' : '—'}</div><div class="lbl">${t(S, 'perfil.precision')}</div></div>
      <div class="stat-celda"><div class="num">${pred.listo ? pred.cobertura + '%' : '—'}</div><div class="lbl">${t(S, 'perfil.cobertura')}</div></div>
      <div class="stat-celda"><div class="num">${s.respuestas.length}</div><div class="lbl">${t(S, 'perfil.respondidas')}</div></div>
      <div class="stat-celda"><div class="num">🔥 ${s.racha.dias} · 🛡️ ${s.racha.protectores}</div><div class="lbl">${t(S, 'perfil.racha')} / ${t(S, 'perfil.protectores')}</div></div>
    </div>
    <h2 class="texto-suave" style="margin-bottom:8px">${t(S, 'perfil.ajustes')}</h2>
    <div class="ajustes">
      <button class="ajuste-row" id="tg-sonido">${t(S, 'perfil.sonido')} <span class="toggle ${s.ajustes.sonido ? 'on' : ''}"></span></button>
      <button class="ajuste-row" id="tg-haptics">${t(S, 'perfil.haptics')} <span class="toggle ${s.ajustes.haptics ? 'on' : ''}"></span></button>
      <button class="ajuste-row" id="exportar">${t(S, 'perfil.exportar')} <span>📤</span></button>
      <button class="ajuste-row" id="importar">${t(S, 'perfil.importar')} <span>📥</span></button>
      <input type="file" id="importar-file" accept=".json,application/json" class="oculto">
      <button class="ajuste-row" id="borrar" style="color:var(--senal-rojo-vivo)">${t(S, 'perfil.borrar')} <span>🗑️</span></button>
    </div>
    <p class="legal">${t(S, 'perfil.avisoLegal')}</p>`;
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
    const ov = el(`<div class="modal-overlay"><div class="modal"><h2>⚠️</h2>
      <p>${t(S, 'perfil.borrarConfirma')}</p>
      <button class="btn btn--ghost" id="b-si">${t(S, 'perfil.borrar')}</button>
      <button class="btn btn--cian" id="b-no">${t(S, 'mision.seguir')}</button></div></div>`);
    document.body.appendChild(ov);
    $('#b-no', ov).onclick = () => ov.remove();
    $('#b-si', ov).onclick = async () => { await borrarTodo(); ov.remove(); navegar('onboarding'); };
  };
};

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
