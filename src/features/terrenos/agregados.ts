import { semaforoTerreno } from "@/domain";
import type { EtapaTerreno, FechaISO, SemaforoTerreno, Terreno } from "@/domain";

export const TODOS = "TODOS";

export interface FiltroTerrenos {
  /** Id de ciudad, o `TODOS`. */
  ciudadId: string;
  semaforo: typeof TODOS | SemaforoTerreno;
}

export const FILTRO_INICIAL: FiltroTerrenos = { ciudadId: TODOS, semaforo: TODOS };

export interface KpisTerrenos {
  /** Proyectos que aún no abren. */
  activos: number;
  /** m² de predio de los proyectos activos. */
  m2EnDesarrollo: number;
  localesProyectados: number;
  enRiesgo: number;
}

export function kpisTerrenos(terrenos: readonly Terreno[], hoy: FechaISO): KpisTerrenos {
  const activos = terrenos.filter((t) => t.etapa !== "ABIERTO");
  return {
    activos: activos.length,
    m2EnDesarrollo: activos.reduce((s, t) => s + t.areaM2, 0),
    localesProyectados: activos.reduce((s, t) => s + t.localesProyectados, 0),
    enRiesgo: activos.filter((t) => semaforoTerreno(t, hoy) === "ROJO").length,
  };
}

export function filtrarTerrenos(
  terrenos: readonly Terreno[],
  filtro: FiltroTerrenos,
  hoy: FechaISO,
): Terreno[] {
  return terrenos.filter(
    (t) =>
      (filtro.ciudadId === TODOS || t.ciudadId === filtro.ciudadId) &&
      (filtro.semaforo === TODOS || semaforoTerreno(t, hoy) === filtro.semaforo),
  );
}

export function terrenosDeEtapa(
  terrenos: readonly Terreno[],
  etapa: EtapaTerreno,
): Terreno[] {
  return terrenos.filter((t) => t.etapa === etapa);
}
