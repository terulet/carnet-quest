// CARNET QUEST — interruptores de Retención V1.
// Un flag apagado significa que la función NO se muestra en ninguna parte: nunca
// deja botones muertos. Solo `ruleTrap` puede quedar apagado en producción, y
// únicamente si el manifiesto curado no alcanza el mínimo seguro de contenido.

export const FLAGS = {
  localTestModeUI: true,
  nextRun: true,
  progressiveUnlocks: true,
  worldModifiers: true,
  routeContracts: true,
  linkChallenges: true,
  // Se decide en caliente al cargar el manifiesto: si no hay tarjetas seguras
  // suficientes, el motor queda montado pero invisible (ver reglatrampa.js).
  ruleTrap: true,
};

/** Mínimo de tarjetas inequívocas para activar Regla contra Trampa en producción. */
export const RULETRAP_MINIMO = 60;
