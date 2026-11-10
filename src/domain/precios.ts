import { INPC_ANUAL } from "./inpc";
import type {
  CambioPropuesto,
  ConceptoPrecio,
  Local,
  RegistroPrecio,
  ReglaActualizacion,
} from "./tipos";

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
  /** Mínimo autorizado tras aplicar la regla este año. */
  minimo: number;
}

export interface ResultadoRepricing {
  precioBase: number;
  precioFinal: number;
  minimoBase: number;
  minimoFinal: number;
  pasos: PasoRepricing[];
}

/** Último registro del historial de una serie (la lista si el registro no declara concepto). */
export function ultimoRegistroPrecio(
  historial: readonly RegistroPrecio[],
  concepto: ConceptoPrecio,
): RegistroPrecio | undefined {
  return historial
    .filter((r) => (r.concepto ?? "LISTA") === concepto)
    .toSorted((a, b) => a.fecha.localeCompare(b.fecha))
    .at(-1);
}

/**
 * Reprecio de un local al liberarse: parte del último precio de lista del
 * historial y aplica la regla año por año, al precio y al mínimo. El mínimo
 * parte del último registro `MINIMO` del historial; si no lo hay, de
 * `minimoBase` (por omisión, el precio de lista base). Devuelve `null` si no
 * hay historial de partida.
 */
export function repricingAlLiberar(
  historial: RegistroPrecio[],
  regla: ReglaActualizacion,
  años: number[],
  inpcPorAño: Readonly<Record<number, number>> = INPC_ANUAL,
  minimoBase?: number,
): ResultadoRepricing | null {
  const ultimaLista = ultimoRegistroPrecio(historial, "LISTA");
  if (!ultimaLista) return null;
  const base = ultimaLista.precio;
  const minimoInicial =
    ultimoRegistroPrecio(historial, "MINIMO")?.precio ?? minimoBase ?? base;
  const pasos: PasoRepricing[] = [];
  let precio = base;
  let minimo = minimoInicial;
  for (const año of años) {
    const inpc = inpcPorAño[año];
    if (inpc === undefined) throw new Error(`Sin INPC para ${año}`);
    precio = aplicarRegla(precio, regla, inpc);
    minimo = aplicarRegla(minimo, regla, inpc);
    pasos.push({ año, incrementoPct: incrementoPct(regla, inpc), precio, minimo });
  }
  return {
    precioBase: base,
    precioFinal: precio,
    minimoBase: minimoInicial,
    minimoFinal: minimo,
    pasos,
  };
}

/**
 * Propuesta de actualización anual de un local: la regla sube la lista y
 * también el mínimo. El precio propuesto nunca queda por debajo del mínimo
 * propuesto (el piso es `max(listaNueva, minimoNuevo)`).
 */
export function proponerActualizacionAnual(
  local: Pick<Local, "id" | "precioVigente" | "precioMinimo" | "regla">,
  año: number,
  inpcPorAño: Readonly<Record<number, number>> = INPC_ANUAL,
): CambioPropuesto {
  const inpc = inpcPorAño[año];
  if (inpc === undefined) throw new Error(`Sin INPC para ${año}`);
  const calculado = aplicarRegla(local.precioVigente, local.regla, inpc);
  const minimoPropuesto = aplicarRegla(local.precioMinimo, local.regla, inpc);
  const precioPropuesto = Math.max(calculado, minimoPropuesto);
  return {
    localId: local.id,
    año,
    precioActual: local.precioVigente,
    precioPropuesto,
    minimoActual: local.precioMinimo,
    minimoPropuesto,
    variacionPct:
      Math.round((precioPropuesto / local.precioVigente - 1) * 100 * 100) / 100,
    estado: "PENDIENTE",
  };
}

/**
 * Años a repreciar: desde el siguiente al del último precio de lista del
 * historial hasta el de `hasta`. Vacío si no hay historial o ya está al día.
 */
export function añosHastaFecha(
  historial: readonly RegistroPrecio[],
  hasta: string,
): number[] {
  const ultima = ultimoRegistroPrecio(historial, "LISTA");
  if (!ultima) return [];
  const desde = Number(ultima.fecha.slice(0, 4)) + 1;
  const fin = Number(hasta.slice(0, 4));
  return Array.from({ length: Math.max(0, fin - desde + 1) }, (_, i) => desde + i);
}
