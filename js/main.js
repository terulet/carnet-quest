// CARNET QUEST — arranque: carga datos + estado, registra SW, inicia UI

import { cargarEstado } from './state.js';
import { getStrings, getMundos } from './data.js';
import { armarAudio } from './audio.js';
import { iniciarUI } from './screens.js';

async function arrancar() {
  const loaderTxt = document.getElementById('loader-txt');
  try {
    armarAudio();
    const [strings, mundos] = await Promise.all([getStrings(), getMundos(), cargarEstado()]);
    await iniciarUI({ strings, mundos });
    document.getElementById('loader').classList.add('fuera');
    setTimeout(() => document.getElementById('loader').remove(), 500);
  } catch (e) {
    loaderTxt.textContent = 'Error arrancando: ' + e.message;
    console.error(e);
  }
}

// Service Worker (offline-first). Solo en https o localhost.
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

arrancar();
