// CARNET QUEST — ADN de los mundos.
//
// Los quince mundos eran idénticos por dentro: seis misiones y un boss, quince
// veces. Aquí se declara, en un solo sitio, qué cambia en cada uno. Nada de
// condicionales sueltos repartidos por la app.
//
// Regla de oro: un modificador cambia CÓMO se juega, nunca QUÉ es verdad. No
// altera respuestas, ni explicaciones, ni el Predictor.

/** Modificadores disponibles. `friccion` alta = exige más al jugador. */
export const MODIFICADORES = {
  // Antes de revelar el resultado te pregunta si ibas seguro. Sin castigo:
  // sirve para separar "lo sé" de "he acertado de chiripa".
  confianza: { friccion: 2 },
  // Reserva huecos para averías pendientes del Taller.
  taller: { friccion: 1 },
  // Reserva huecos para el formato Regla contra Trampa.
  reglaTrampa: { friccion: 2 },
  // Mete cruces jugables dentro de la misión.
  cruces: { friccion: 1 },
  // Sube el peso de preguntas con señal (sin convertirlo en Señal Rush).
  senales: { friccion: 0 },
  // Ofrece contrato de ruta al empezar.
  contrato: { friccion: 1 },
};

const MAX_FRICCION_ALTA = 2;   // nunca más de dos modificadores exigentes a la vez

/**
 * Configuración por mundo. Cada entrada declara sus modificadores, cuántos
 * huecos ocupa cada uno y la frase de entrada que da personalidad al mundo.
 * El mapeo sigue el temario real de cada mundo (ver CLAUDE.md §6).
 */
export const ADN = {
  // 1 · Villa Asfalto — tutorial. Limpio a propósito: aquí solo se aprende a jugar.
  1: { mods: {}, lema: null },

  // 2 · Señalópolis Norte — agentes y semáforos. Primera variación reconocible.
  2: { mods: { cruces: 1 }, lema: 'Aquí los cruces empiezan a hablar.' },

  // 3 · Señalópolis Centro — peligro y prohibición. El jugador gratuito ya ha
  // visto suficiente variedad para entender de qué es capaz el juego.
  3: { mods: { senales: 1, confianza: 2 }, lema: 'Aquí importa saber cuándo dudas.' },

  // 4 · Señalópolis Sur — obligación, indicación, marcas viales.
  4: { mods: { senales: 1, reglaTrampa: 1 }, lema: 'Las trampas vienen de frente.' },

  // 5 · Autopista Límite — velocidad. Números que se confunden entre sí.
  5: { mods: { confianza: 2, contrato: 1 }, lema: 'Cifras parecidas, multas distintas.' },

  // 6 · Cruce Salvaje — prioridad de paso. Su casa natural son los cruces.
  6: { mods: { cruces: 2, contrato: 1 }, lema: 'Prepárate para más cruces.' },

  // 7 · La Doble Continua — adelantamiento.
  7: { mods: { reglaTrampa: 2, taller: 1 }, lema: 'En esta zona, el Taller viaja contigo.' },

  // 8 · Rotonda Infernal — cambios de dirección y sentido.
  8: { mods: { cruces: 2, confianza: 2 }, lema: 'Glorietas: quien está dentro, manda.' },

  // 9 · Parking Wars — parada y estacionamiento.
  9: { mods: { reglaTrampa: 1, taller: 1, contrato: 1 }, lema: 'Aparcar mal es más fácil de lo que parece.' },

  // 10 · Ciudad Nocturna — alumbrado.
  10: { mods: { senales: 1, confianza: 2 }, lema: 'De noche, las dudas pesan el doble.' },

  // 11 · El Último Bar — alcohol y drogas. Cifras que hay que saber sin titubear.
  11: { mods: { reglaTrampa: 2, contrato: 1 }, lema: 'Aquí no valen los "creo que".' },

  // 12 · Zona Zombie — fatiga y distracciones.
  12: { mods: { confianza: 2, taller: 1 }, lema: 'El cansancio también se examina.' },

  // 13 · El Taller — mecánica y seguridad.
  13: { mods: { taller: 2, reglaTrampa: 1 }, lema: 'Tus averías vienen contigo.' },

  // 14 · Código PAS — accidentes y primeros auxilios.
  14: { mods: { reglaTrampa: 2, confianza: 2 }, lema: 'Proteger, avisar, socorrer. En ese orden.' },

  // 15 · Eco Ruta & Papeleo — medio ambiente y documentación.
  15: { mods: { senales: 1, reglaTrampa: 1, contrato: 1 }, lema: 'El papeleo también suspende.' },
};

/** Configuración efectiva de un mundo, con tope de fricción aplicado. */
export function adnDe(mundoN) {
  const base = ADN[Number(mundoN)] || { mods: {}, lema: null };
  const mods = { ...base.mods };
  // Tope de seguridad: si una combinación se pasa de exigente, se recorta el
  // modificador más caro. Mejor un mundo con menos sal que una misión imposible.
  let altos = Object.keys(mods).filter((k) => (MODIFICADORES[k]?.friccion || 0) >= 2);
  while (altos.length > MAX_FRICCION_ALTA) {
    delete mods[altos.pop()];
    altos = Object.keys(mods).filter((k) => (MODIFICADORES[k]?.friccion || 0) >= 2);
  }
  return { mods, lema: base.lema };
}

export const tieneMod = (mundoN, mod) => (adnDe(mundoN).mods[mod] || 0) > 0;
export const huecosDe = (mundoN, mod) => adnDe(mundoN).mods[mod] || 0;
