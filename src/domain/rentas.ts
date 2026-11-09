import { diasEntre } from "./fechas";
import type { Contrato, ExcepcionPrecio, FechaISO, Local } from "./tipos";

/** Meta de cumplimiento del plan de ingresos por defecto, en %. */
export const META_CUMPLIMIENTO_DEFECTO = 98;

/** Rango de la renta contratada frente al mínimo autorizado del local. */
export type RangoRenta = "BAJO_MINIMO" | "EN_MINIMO" | "HASTA_5" | "HASTA_10" | "MAS_10";

/** Orden de presentación de los rangos, del peor al mejor. */
export const RANGOS_RENTA: readonly RangoRenta[] = [
  "BAJO_MINIMO",
  "EN_MINIMO",
  "HASTA_5",
  "HASTA_10",
  "MAS_10",
];

export interface RentaVsMinimo {
  /** Renta menos mínimo, en pesos (negativa si está bajo el mínimo). */
  diferencia: number;
  /** Diferencia como % del mínimo. */
  diferenciaPct: number;
  rango: RangoRenta;
}

/** Compara la renta contratada contra el mínimo vigente del local. */
export function rentaVsMinimo(renta: number, minimo: number): RentaVsMinimo {
  const diferencia = renta - minimo;
  const diferenciaPct = minimo > 0 ? (diferencia / minimo) * 100 : 0;
  const rango: RangoRenta =
    diferencia < 0
      ? "BAJO_MINIMO"
      : diferencia === 0
        ? "EN_MINIMO"
        : diferenciaPct < 5
          ? "HASTA_5"
          : diferenciaPct < 10
            ? "HASTA_10"
            : "MAS_10";
  return { diferencia, diferenciaPct, rango };
}

export interface RentaOcupada {
  /** Renta contratada vigente. */
  renta: number;
  /** Renta del modelo financiero de la PMO. */
  rentaPlaneada: number;
}

export interface RentaDisponible {
  precioVigente: number;
  rentaPlaneada: number;
}

export interface CumplimientoPlan {
  planeada: number;
  contratada: number;
  /** Σ renta contratada / Σ renta planeada de los ocupados, en %. */
  cumplimientoPct: number;
  /** Lo mismo sumando los disponibles a precio de lista, en %. */
  potencialPct: number;
}

function porcentaje(parte: number, total: number): number {
  return total > 0 ? (parte / total) * 100 : 0;
}

/** Cumplimiento del plan de ingresos de una plaza y su potencial con los disponibles. */
export function cumplimientoPlan(
  ocupados: readonly RentaOcupada[],
  disponibles: readonly RentaDisponible[] = [],
): CumplimientoPlan {
  const contratada = ocupados.reduce((s, o) => s + o.renta, 0);
  const planeada = ocupados.reduce((s, o) => s + o.rentaPlaneada, 0);
  const listaLibre = disponibles.reduce((s, d) => s + d.precioVigente, 0);
  const planeadaLibre = disponibles.reduce((s, d) => s + d.rentaPlaneada, 0);
  return {
    planeada,
    contratada,
    cumplimientoPct: porcentaje(contratada, planeada),
    potencialPct: porcentaje(contratada + listaLibre, planeada + planeadaLibre),
  };
}

export interface RentasDeLocales {
  ocupados: RentaOcupada[];
  disponibles: RentaDisponible[];
}

/**
 * Separa los locales de una plaza en ocupados (con la renta de su contrato
 * vigente) y disponibles (a precio de lista), listos para `cumplimientoPlan`.
 * Un ocupado sin contrato vigente no cuenta.
 */
export function rentasDeLocales(
  locales: readonly Pick<Local, "id" | "estatus" | "precioVigente" | "rentaPlaneada">[],
  contratos: readonly Pick<Contrato, "localId" | "fin" | "rentaMensual">[],
  hoy: FechaISO,
): RentasDeLocales {
  const rentaPorLocal = new Map<string, number>();
  for (const c of contratos) {
    if (diasEntre(hoy, c.fin) >= 0) rentaPorLocal.set(c.localId, c.rentaMensual);
  }
  const resultado: RentasDeLocales = { ocupados: [], disponibles: [] };
  for (const l of locales) {
    if (l.estatus === "OCUPADO") {
      const renta = rentaPorLocal.get(l.id);
      if (renta !== undefined) {
        resultado.ocupados.push({ renta, rentaPlaneada: l.rentaPlaneada });
      }
    } else if (l.estatus === "DISPONIBLE" || l.estatus === "EN_COTIZACION") {
      resultado.disponibles.push({
        precioVigente: l.precioVigente,
        rentaPlaneada: l.rentaPlaneada,
      });
    }
  }
  return resultado;
}

export interface ImpactoPlanExcepcion {
  cumplimientoActualPct: number;
  cumplimientoNuevoPct: number;
  /** Renta planeada menos renta ofrecida, por mes. */
  impactoMensual: number;
  /** Impacto mensual durante el plazo del contrato. */
  impactoVida: number;
  /** `true` si con la excepción la plaza queda por debajo de su meta. */
  bajoMeta: boolean;
}

/**
 * Simula qué pasa con el cumplimiento del plan de la plaza si el local se
 * renta a la renta de la excepción. `ocupados` son los locales ya rentados.
 */
export function impactoPlanExcepcion(
  excepcion: Pick<ExcepcionPrecio, "rentaSolicitada">,
  local: Pick<RentaDisponible, "rentaPlaneada">,
  ocupados: readonly RentaOcupada[],
  plazoMeses: number,
  metaPct: number,
): ImpactoPlanExcepcion {
  const actual = cumplimientoPlan(ocupados);
  const nuevo = cumplimientoPlan([
    ...ocupados,
    { renta: excepcion.rentaSolicitada, rentaPlaneada: local.rentaPlaneada },
  ]);
  const impactoMensual = local.rentaPlaneada - excepcion.rentaSolicitada;
  return {
    cumplimientoActualPct: actual.cumplimientoPct,
    cumplimientoNuevoPct: nuevo.cumplimientoPct,
    impactoMensual,
    impactoVida: impactoMensual * plazoMeses,
    bajoMeta: nuevo.cumplimientoPct < metaPct,
  };
}
