import type { FechaISO } from "./tipos";

/** "Hoy" fijo de la demo: martes 3 de noviembre de 2026. */
export const DEMO_TODAY: FechaISO = "2026-11-03";

const MS_DIA = 86_400_000;

function aUtc(fecha: FechaISO): number {
  const [a, m, d] = fecha.split("-").map(Number);
  return Date.UTC(a, m - 1, d);
}

/** Días naturales de `desde` a `hasta` (negativo si `hasta` es anterior). */
export function diasEntre(desde: FechaISO, hasta: FechaISO): number {
  return Math.round((aUtc(hasta) - aUtc(desde)) / MS_DIA);
}

function deUtc(ms: number): FechaISO {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Suma `dias` días naturales (admite negativos). */
export function sumarDias(fecha: FechaISO, dias: number): FechaISO {
  return deUtc(aUtc(fecha) + dias * MS_DIA);
}

/** Suma `meses` meses conservando el día (se recorta al último día del mes destino). */
export function sumarMeses(fecha: FechaISO, meses: number): FechaISO {
  const [a, m, d] = fecha.split("-").map(Number);
  const indice = a * 12 + (m - 1) + meses;
  const año = Math.floor(indice / 12);
  const mes = indice % 12;
  const ultimoDia = new Date(Date.UTC(año, mes + 1, 0)).getUTCDate();
  return deUtc(Date.UTC(año, mes, Math.min(d, ultimoDia)));
}
