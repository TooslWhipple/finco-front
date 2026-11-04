import type { Geometria } from "@/domain";

/** Lienzo (unidades del SVG) de cada planta. */
export const LIENZO = { ancho: 1000, alto: 720 } as const;

const redondear = (n: number) => Math.round(n * 10) / 10;

/** Id de la planta baja de la plaza héroe (la única con contexto vial dibujado). */
export const PLANTA_HEROE_PB_ID = "plz-alborada-pb";

const ANCHO_FILAS = 872;
const ALTO_FILA_A = 110;
const Y_FILA_A = 40;
const Y_FILA_C = 580;
const ALTO_FILA_C = 120;

/** Contexto vial de una planta: bulevares, estacionamiento y ubicación de los locales. */
export interface ContextoVial {
  /** Rótulo sobre la fila superior (con flecha). */
  rotuloSuperior: { texto: string; x: number; y: number };
  /** Rótulo vertical a la derecha de la columna B. */
  rotuloVertical: { texto: string; x: number; y: number };
  estacionamiento: {
    x: number;
    y: number;
    w: number;
    h: number;
    cajones: number;
    filas: number;
    /** Posición vertical de cada fila de cajones y su alto. */
    yFilas: readonly number[];
    altoFila: number;
    yEtiqueta: number;
  };
  /** Ubicación del local según la letra de su código ("A-09" → "A"). */
  ubicacionPorBloque: Readonly<Record<string, string>>;
}

const CAJONES = 152;
const FILAS_CAJONES = 4;

const CONTEXTO_HEROE_PB: ContextoVial = {
  rotuloSuperior: { texto: "BLVD. LAS PALMAS →", x: 6, y: 24 },
  rotuloVertical: { texto: "BLVD. COSTA DORADA", x: 990, y: 40 },
  estacionamiento: {
    x: 0,
    y: 170,
    w: ANCHO_FILAS,
    h: 370,
    cajones: CAJONES,
    filas: FILAS_CAJONES,
    yFilas: [195, 280, 365, 450],
    altoFila: 58,
    yEtiqueta: 351,
  },
  ubicacionPorBloque: {
    A: "Frente a estacionamiento",
    B: "Sobre Blvd. Costa Dorada",
    C: "Frente a estacionamiento",
  },
};

/** Contexto vial de la planta, si tiene layout dibujado a mano. */
export function contextoVialPlanta(plantaId: string): ContextoVial | undefined {
  return plantaId === PLANTA_HEROE_PB_ID ? CONTEXTO_HEROE_PB : undefined;
}

/**
 * Geometría de la planta baja de la plaza héroe: fila superior A (16),
 * columna derecha B (10) y fila inferior C (14, con 3 anclas más anchas).
 */
export function geometriaHeroePB(): Record<string, Geometria> {
  const mapa: Record<string, Geometria> = {};
  const celdaA = ANCHO_FILAS / 16;
  for (let i = 0; i < 16; i++) {
    mapa[`A-${String(i + 1).padStart(2, "0")}`] = {
      x: redondear(i * celdaA + 2),
      y: Y_FILA_A,
      w: redondear(celdaA - 4),
      h: ALTO_FILA_A,
    };
  }
  for (let i = 0; i < 10; i++) {
    mapa[`B-${String(i + 1).padStart(2, "0")}`] = {
      x: 892,
      y: Y_FILA_A + i * 58,
      w: 82,
      h: 52,
    };
  }
  const anchoAncla = 120;
  const anchoC = (ANCHO_FILAS - 3 * anchoAncla) / 11;
  let x = 0;
  for (let i = 0; i < 14; i++) {
    const ancla = i < 3;
    const w = ancla ? anchoAncla : anchoC;
    mapa[`C-${String(i + 1).padStart(2, "0")}`] = {
      x: redondear(x + 2),
      y: Y_FILA_C,
      w: redondear(w - 4),
      h: ALTO_FILA_C,
    };
    x += w;
  }
  return mapa;
}

/** Planta alta de la plaza héroe: 2 filas de 9 locales. */
export function geometriaHeroePA(): Geometria[] {
  const celda = LIENZO.ancho / 9;
  return Array.from({ length: 18 }, (_, i) => ({
    x: redondear((i % 9) * celda + 2),
    y: i < 9 ? 40 : 290,
    w: redondear(celda - 4),
    h: 220,
  }));
}

/** Layout en rejilla para cualquier planta: `n` locales repartidos en filas. */
export function geometriaRejilla(n: number): Geometria[] {
  const columnas = Math.max(1, Math.ceil(Math.sqrt(n * 1.6)));
  const filas = Math.ceil(n / columnas);
  const celdaW = LIENZO.ancho / columnas;
  const celdaH = Math.min(120, LIENZO.alto / filas);
  return Array.from({ length: n }, (_, i) => ({
    x: redondear((i % columnas) * celdaW + 2),
    y: redondear(Math.floor(i / columnas) * celdaH + 4),
    w: redondear(celdaW - 4),
    h: redondear(celdaH - 8),
  }));
}
