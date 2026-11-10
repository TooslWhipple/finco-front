import {
  DEMO_TODAY,
  consumoPresupuesto,
  type Mantenimiento,
  type Plaza,
  type PresupuestoMantenimiento,
} from "@/domain";
import { PLAZA_HEROE_ID } from "./heroe";
import { crearPrng } from "./prng";

const SEMILLA_PRESUPUESTOS = 6203;

/**
 * Presupuesto anual de Plaza Alborada: con lo ya comprometido queda en ~90 %, así
 * que el trabajo pendiente de autorización (`mantenimientosHeroe`) lo rebasa.
 */
export const PRESUPUESTO_HEROE = 400_000;

const REDONDEO = 10_000;
const PRESUPUESTO_MINIMO = 100_000;

function redondearArriba(valor: number): number {
  return Math.ceil(valor / REDONDEO) * REDONDEO;
}

/**
 * Un presupuesto del año de la demo por cada plaza con mantenimientos. Las demás
 * plazas lo fijan holgado sobre su consumo (y una de cada cinco queda en alerta),
 * de modo que solo Alborada tiene un sobregiro.
 */
export function crearPresupuestosMantenimiento(
  plazas: readonly Plaza[],
  mantenimientos: readonly Mantenimiento[],
): PresupuestoMantenimiento[] {
  const rng = crearPrng(SEMILLA_PRESUPUESTOS);
  const año = Number(DEMO_TODAY.slice(0, 4));
  const conTrabajos = new Set(mantenimientos.map((m) => m.plazaId));
  return plazas
    .filter((p) => conTrabajos.has(p.id))
    .map((plaza, i) => {
      if (plaza.id === PLAZA_HEROE_ID)
        return { plazaId: plaza.id, año, monto: PRESUPUESTO_HEROE };
      const consumo = consumoPresupuesto(plaza.id, año, mantenimientos);
      const factor = i % 5 === 0 ? 1.12 : 1.3 + rng.siguiente() * 0.6;
      return {
        plazaId: plaza.id,
        año,
        monto: Math.max(PRESUPUESTO_MINIMO, redondearArriba(consumo * factor)),
      };
    });
}
