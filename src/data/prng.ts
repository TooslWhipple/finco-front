/** PRNG determinista (mulberry32): misma semilla, misma secuencia. */
export interface Prng {
  /** Número en [0, 1). */
  siguiente(): number;
  /** Entero en [min, max] (ambos inclusive). */
  entero(min: number, max: number): number;
  /** `true` con probabilidad `p`. */
  prob(p: number): boolean;
  elegir<T>(items: readonly T[]): T;
  /** Copia barajada (Fisher-Yates). */
  barajar<T>(items: readonly T[]): T[];
}

export function crearPrng(semilla: number): Prng {
  let estado = semilla >>> 0;
  const siguiente = (): number => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const entero = (min: number, max: number) =>
    min + Math.floor(siguiente() * (max - min + 1));
  return {
    siguiente,
    entero,
    prob: (p) => siguiente() < p,
    elegir: (items) => items[entero(0, items.length - 1)],
    barajar: (items) => {
      const copia = [...items];
      for (let i = copia.length - 1; i > 0; i--) {
        const j = entero(0, i);
        [copia[i], copia[j]] = [copia[j], copia[i]];
      }
      return copia;
    },
  };
}
