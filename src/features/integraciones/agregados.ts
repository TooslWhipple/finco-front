import type { EventoSync, IdIntegracion } from "@/domain";

export type FiltroIntegracion = IdIntegracion | "TODAS";

/** Log filtrado por integración, del evento más reciente al más antiguo. */
export function eventosRecientes(
  eventos: readonly EventoSync[],
  filtro: FiltroIntegracion,
): EventoSync[] {
  return eventos
    .filter((e) => filtro === "TODAS" || e.integracionId === filtro)
    .toSorted((a, b) => b.fecha.localeCompare(a.fecha));
}

/** Registros del último sync de una integración (0 si nunca se sincronizó). */
export function registrosUltimoSync(
  eventos: readonly EventoSync[],
  id: IdIntegracion,
): number {
  return eventosRecientes(eventos, id)[0]?.registros ?? 0;
}
