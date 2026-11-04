import type { ExcepcionPrecio } from "@/domain";

export interface ImpactoExcepcion {
  /** Renta mensual que se deja de cobrar frente al precio de lista. */
  diferenciaMensual: number;
  /** Diferencia acumulada durante todo el plazo de la cotización. */
  diferenciaVigencia: number;
  /** Diferencia de la renta ofrecida contra el mínimo autorizado (negativa si está por debajo). */
  diferenciaVsMinimo: number;
}

export function impactoExcepcion(
  excepcion: Pick<ExcepcionPrecio, "rentaSolicitada" | "precioMinimo">,
  precioLista: number,
  plazoMeses: number,
): ImpactoExcepcion {
  const diferenciaMensual = precioLista - excepcion.rentaSolicitada;
  return {
    diferenciaMensual,
    diferenciaVigencia: diferenciaMensual * plazoMeses,
    diferenciaVsMinimo: excepcion.rentaSolicitada - excepcion.precioMinimo,
  };
}

/** Pendientes primero; dentro de cada grupo, el folio más reciente arriba. */
export function ordenarExcepciones(
  excepciones: readonly ExcepcionPrecio[],
): ExcepcionPrecio[] {
  const peso = (e: ExcepcionPrecio) => (e.estado === "PENDIENTE" ? 0 : 1);
  return [...excepciones].sort((a, b) => peso(a) - peso(b) || b.id.localeCompare(a.id));
}
