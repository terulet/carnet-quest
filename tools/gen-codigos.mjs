#!/usr/bin/env node
// Genera códigos del Pase Carnet (formato CQ-XXXXX-XXXXX) válidos para
// validarCodigo() de js/screens.js (checksum djb2 con sal 'asfalto-neon-2026').
// Uso: node tools/gen-codigos.mjs [cantidad]
// ⚠️ v1 sin backend: el código se valida en el cliente. Entregar 1 código por
// compra desde la página de éxito de Stripe. Migrar a licencias de servidor en v2.
import { randomBytes } from 'node:crypto';

const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // sin caracteres ambiguos

function checksum(parte) {
  let h = 5381;
  const base = `CQ|${parte}|asfalto-neon-2026`;
  for (let i = 0; i < base.length; i++) h = ((h * 33) ^ base.charCodeAt(i)) >>> 0;
  return h.toString(36).toUpperCase().padStart(5, '0').slice(-5);
}

const n = parseInt(process.argv[2] ?? '10', 10);
for (let i = 0; i < n; i++) {
  const bytes = randomBytes(5);
  const parte = [...bytes].map((b) => ALFABETO[b % ALFABETO.length]).join('');
  console.log(`CQ-${parte}-${checksum(parte)}`);
}
