import type { Ciudad, Coordenadas } from "@/domain";

/** Hash FNV-1a de 32 bits: estable entre ejecuciones y plataformas. */
function hash(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

const RADIO_MIN = 0.012;
const RADIO_MAX = 0.07;

const redondear = (n: number) => Math.round(n * 1e5) / 1e5;

/**
 * Coordenadas ficticias de una plaza: un desplazamiento estable alrededor de
 * su ciudad, derivado solo del id (no consume el PRNG del seed).
 */
export function coordenadasPlaza(
  ciudad: Pick<Ciudad, "lat" | "lng">,
  plazaId: string,
): Coordenadas {
  const h = hash(plazaId);
  const angulo = ((h & 0xffff) / 0x10000) * 2 * Math.PI;
  const radio = RADIO_MIN + (((h >>> 16) & 0xffff) / 0x10000) * (RADIO_MAX - RADIO_MIN);
  return {
    lat: redondear(ciudad.lat + Math.sin(angulo) * radio),
    lng: redondear(ciudad.lng + Math.cos(angulo) * radio),
  };
}
