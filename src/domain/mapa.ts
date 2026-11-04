import type { Coordenadas } from "./tipos";

/** Punto del mapa: una plaza con su posición. */
export interface PuntoMapa extends Coordenadas {
  id: string;
}

/** Pines cercanos agrupados; con un solo punto es el pin original. */
export interface GrupoMapa<T extends PuntoMapa> extends Coordenadas {
  /** Estable entre zooms para el mismo punto líder. */
  id: string;
  puntos: T[];
}

/** Radio de agrupación en píxeles de pantalla. */
const RADIO_PX = 48;
/** Píxeles que mide el mundo entero (360°) al zoom 0 en teselas de 256 px. */
const PX_MUNDO_ZOOM_0 = 256;

/** Grados que cubre `RADIO_PX` al zoom dado. */
export function radioAgrupacionGrados(zoom: number): number {
  return (RADIO_PX * 360) / (PX_MUNDO_ZOOM_0 * 2 ** zoom);
}

function distancia(a: Coordenadas, b: Coordenadas): number {
  return Math.hypot(a.lat - b.lat, a.lng - b.lng);
}

/**
 * Agrupa los puntos que quedan a menos de `RADIO_PX` unos de otros al zoom
 * dado. Es determinista (recorre los puntos por id) y no depende de librerías
 * de mapa: al acercar, los grupos se separan hasta quedar un pin por punto.
 */
export function agruparPuntos<T extends PuntoMapa>(
  puntos: readonly T[],
  zoom: number,
): GrupoMapa<T>[] {
  const radio = radioAgrupacionGrados(zoom);
  const ordenados = [...puntos].sort((a, b) => a.id.localeCompare(b.id));
  const grupos: GrupoMapa<T>[] = [];
  for (const punto of ordenados) {
    const destino = grupos.find((g) => distancia(g, punto) <= radio);
    if (!destino) {
      grupos.push({ id: punto.id, lat: punto.lat, lng: punto.lng, puntos: [punto] });
      continue;
    }
    destino.puntos.push(punto);
    destino.lat = destino.puntos.reduce((s, p) => s + p.lat, 0) / destino.puntos.length;
    destino.lng = destino.puntos.reduce((s, p) => s + p.lng, 0) / destino.puntos.length;
  }
  return grupos;
}
