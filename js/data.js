// CARNET QUEST — carga de datos estáticos con caché en memoria

const cache = new Map();

async function json(ruta) {
  if (cache.has(ruta)) return cache.get(ruta);
  const p = fetch(ruta).then((r) => {
    if (!r.ok) throw new Error(`${ruta}: ${r.status}`);
    return r.json();
  });
  cache.set(ruta, p);
  try { return await p; }
  catch (e) { cache.delete(ruta); throw e; }
}

export const getStrings = () => json('datos/strings.es.json');
export const getMundos = () => json('datos/mundos.json');

let senalesDoc = null;
export async function getSenales() {
  if (senalesDoc) return senalesDoc;
  // usa el catálogo ampliado si existe; si no, el base
  try { senalesDoc = await json('datos/senales.expanded.json'); }
  catch { senalesDoc = await json('datos/senales.json'); }
  return senalesDoc;
}

const bancos = new Map();
export async function getBanco(mundoN) {
  const n = String(mundoN).padStart(2, '0');
  if (bancos.has(n)) return bancos.get(n);
  let banco = [];
  try { banco = await json(`datos/preguntas/mundo-${n}.json`); }
  catch { banco = []; } // mundo aún sin banco: se muestra como "próximamente"
  bancos.set(n, banco);
  return banco;
}

export async function getBancoCompleto(mundosDisponibles) {
  const listas = await Promise.all(mundosDisponibles.map((n) => getBanco(n)));
  return listas.flat();
}

export function preguntaPorId(id) {
  for (const banco of bancos.values()) {
    const q = banco.find((p) => p.id === id);
    if (q) return q;
  }
  return null;
}

// t(strings, 'a.b.c', {n: 3}) — acceso con puntos + interpolación {var}
export function t(obj, ruta, vars) {
  let v = ruta.split('.').reduce((o, k) => (o ? o[k] : undefined), obj);
  if (typeof v !== 'string') return v ?? ruta;
  if (vars) for (const [k, val] of Object.entries(vars)) v = v.replaceAll(`{${k}}`, String(val));
  return v;
}
