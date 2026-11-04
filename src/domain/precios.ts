import { INPC_ANUAL } from "./inpc";
import type { CambioPropuesto, Local, RegistroPrecio, ReglaActualizacion } from "./tipos";

/** Porcentaje de incremento que la regla produce para un INPC dado. */
export function incrementoPct(regla: ReglaActualizacion, inpc: number): number {
  switch (regla.tipo) {
    case "INPC":
      return inpc;
    case "INPC_PTS":
      return inpc + (regla.puntos ?? 0);
    case "VALOR_FIJO":
      return regla.porcentajeFijo ?? 0;
  }
}

/** Aplica la regla a un precio para un año con el INPC indicado; redondea a peso. */
export function aplicarRegla(
  precio: number,
  regla: ReglaActualizacion,
  inpc: number,
): number {
  return Math.round(precio * (1 + incrementoPct(regla, inpc) / 100));
}

export interface PasoRepricing {
  año: number;
  incrementoPct: number;
  precio: number;
}

export interface ResultadoRepricing {
  precioBase: number;
  precioFinal: number;
  pasos: PasoRepricing[];
}

/**
 * Reprecio de un local al liberarse: parte del último precio del historial y
 * aplica la regla año por año. Devuelve `null` si no hay historial de partida.
 */
export function repricingAlLiberar(
  historial: RegistroPrecio[],
  regla: ReglaActualizacion,
  años: number[],
  inpcPorAño: Readonly<Record<number, number>> = INPC_ANUAL,
): ResultadoRepricing | null {
  if (historial.length === 0) return null;
  const base = [...historial]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .at(-1)!.precio;
  const pasos: PasoRepricing[] = [];
  let precio = base;
  for (const año of años) {
    const inpc = inpcPorAño[año];
    if (inpc === undefined) throw new Error(`Sin INPC para ${año}`);
    precio = aplicarRegla(precio, regla, inpc);
    pasos.push({ año, incrementoPct: incrementoPct(regla, inpc), precio });
  }
  return { precioBase: base, precioFinal: precio, pasos };
}

/**
 * Propuesta de actualización anual de un local. Nunca propone por debajo del
 * precio mínimo autorizado.
 */
export function proponerActualizacionAnual(
  local: Pick<Local, "id" | "precioVigente" | "precioMinimo" | "regla">,
  año: number,
  inpcPorAño: Readonly<Record<number, number>> = INPC_ANUAL,
): CambioPropuesto {
  const inpc = inpcPorAño[año];
  if (inpc === undefined) throw new Error(`Sin INPC para ${año}`);
  const calculado = aplicarRegla(local.precioVigente, local.regla, inpc);
  const precioPropuesto = Math.max(calculado, local.precioMinimo);
  return {
    localId: local.id,
    año,
    precioActual: local.precioVigente,
    precioPropuesto,
    variacionPct:
      Math.round((precioPropuesto / local.precioVigente - 1) * 100 * 100) / 100,
    estado: "PENDIENTE",
  };
}
