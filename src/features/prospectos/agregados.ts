import { prospectoActivo, type EtapaProspecto, type Prospecto } from "@/domain";

export const TODOS = "TODOS";

export interface FiltroProspectos {
  plazaId: string;
  origen: string;
  etapa: string;
  /** Local de interés (llega de la ficha del local con `?local=`). */
  localId: string;
}

export const FILTRO_INICIAL: FiltroProspectos = {
  plazaId: TODOS,
  origen: TODOS,
  etapa: TODOS,
  localId: TODOS,
};

/**
 * KPIs del embudo, todos por etapa para que avanzar o cerrar un prospecto se
 * refleje en ellos: contactar baja "sin contactar", la visita sube "por
 * cotizar", cotizar mueve "en cotización" y ganar o perder mueve "activos" y
 * la tasa de cierre.
 */
export interface KpisProspectos {
  /** Aún sin ganar ni perder. */
  activos: number;
  /** En `NUEVO`: registrados y todavía sin primer contacto. */
  sinContactar: number;
  /** En `COTIZADO`: con cotización enviada, pendientes de cierre. */
  enCotizacion: number;
  /** En `VISITA`: ya visitaron el local y lo siguiente es cotizarles. */
  porCotizar: number;
  /** Ganados entre los ya cerrados (ganados + perdidos); `null` si aún no cierra ninguno. */
  tasaCierre: number | null;
}

/** Prospectos que coinciden con los filtros; la plaza se resuelve por los locales de interés. */
export function filtrarProspectos(
  prospectos: readonly Prospecto[],
  filtro: FiltroProspectos,
  plazaDeLocal: ReadonlyMap<string, string>,
): Prospecto[] {
  return prospectos.filter(
    (p) =>
      (filtro.etapa === TODOS || p.etapa === filtro.etapa) &&
      (filtro.origen === TODOS || p.origen === filtro.origen) &&
      (filtro.localId === TODOS || p.localIds.includes(filtro.localId)) &&
      (filtro.plazaId === TODOS ||
        p.localIds.some((id) => plazaDeLocal.get(id) === filtro.plazaId)),
  );
}

export function kpisProspectos(prospectos: readonly Prospecto[]): KpisProspectos {
  const enEtapa = (etapa: EtapaProspecto) =>
    prospectos.filter((p) => p.etapa === etapa).length;
  const ganados = enEtapa("GANADO");
  const perdidos = enEtapa("PERDIDO");
  return {
    activos: prospectos.filter(prospectoActivo).length,
    sinContactar: enEtapa("NUEVO"),
    enCotizacion: enEtapa("COTIZADO"),
    porCotizar: enEtapa("VISITA"),
    tasaCierre: ganados + perdidos === 0 ? null : ganados / (ganados + perdidos),
  };
}

/** Prospectos de una etapa, de los más recientes a los más antiguos. */
export function prospectosDeEtapa(
  prospectos: readonly Prospecto[],
  etapa: EtapaProspecto,
): Prospecto[] {
  return prospectos
    .filter((p) => p.etapa === etapa)
    .sort((a, b) => b.creadoEl.localeCompare(a.creadoEl) || a.id.localeCompare(b.id));
}
