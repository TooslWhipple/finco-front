import {
  diasEntre,
  estadoVisibleContrato,
  type Contrato,
  type EstadoVisibleContrato,
} from "@/domain";

export const TODOS = "TODOS";

/** Ventanas de vencimiento del filtro; `VENCIDOS` son los que ya pasaron su fin. */
export const VENCIMIENTOS = [
  { valor: "VENCIDOS", etiqueta: "Ya vencidos" },
  { valor: "90", etiqueta: "Vencen en 90 días" },
  { valor: "180", etiqueta: "Vencen en 180 días" },
] as const;

export interface FiltroContratos {
  plazaId: string;
  estado: string;
  vencimiento: string;
}

export const FILTRO_INICIAL: FiltroContratos = {
  plazaId: TODOS,
  estado: TODOS,
  vencimiento: TODOS,
};

export interface KpisContratos {
  vigentes: number;
  porVencer: number;
  enFirma: number;
  /** Renta mensual de los contratos que hoy rigen (vigentes, por vencer y vencidos sin renovar). */
  rentaMensual: number;
}

function cumpleVencimiento(contrato: Contrato, vencimiento: string, hoy: string) {
  if (vencimiento === TODOS) return true;
  if (contrato.estado !== "VIGENTE") return false;
  const dias = diasEntre(hoy, contrato.fin);
  return vencimiento === "VENCIDOS" ? dias < 0 : dias >= 0 && dias <= Number(vencimiento);
}

/** Contratos que coinciden con los filtros; la plaza se resuelve por el local del contrato. */
export function filtrarContratos(
  contratos: readonly Contrato[],
  filtro: FiltroContratos,
  plazaDeLocal: ReadonlyMap<string, string>,
  hoy: string,
): Contrato[] {
  return contratos.filter(
    (c) =>
      (filtro.estado === TODOS || estadoVisibleContrato(c, hoy) === filtro.estado) &&
      (filtro.plazaId === TODOS || plazaDeLocal.get(c.localId) === filtro.plazaId) &&
      cumpleVencimiento(c, filtro.vencimiento, hoy),
  );
}

export function kpisContratos(
  contratos: readonly Contrato[],
  hoy: string,
): KpisContratos {
  const estados = contratos.map((c) => estadoVisibleContrato(c, hoy));
  const cuenta = (e: EstadoVisibleContrato) => estados.filter((x) => x === e).length;
  return {
    vigentes: cuenta("VIGENTE") + cuenta("POR_VENCER"),
    porVencer: cuenta("POR_VENCER"),
    enFirma: cuenta("EN_FIRMA"),
    rentaMensual: contratos
      .filter((c) => c.estado === "VIGENTE")
      .reduce((suma, c) => suma + c.rentaMensual, 0),
  };
}

/** Días para el fin del contrato; negativo si ya venció. */
export function diasParaVencer(contrato: Contrato, hoy: string): number {
  return diasEntre(hoy, contrato.fin);
}
