import type { Campana, Contrato, Cotizacion, FechaISO, Prospecto } from "./tipos";

/**
 * Atribución comercial de un contrato sin cotización (vendedor que lo cerró y
 * campaña de la que vino). Dato demo: el seed la inventa para los contratos
 * históricos, que no nacieron de una cotización con prospecto.
 */
export interface AtribucionContrato {
  /** `Usuario.id` del vendedor al que se atribuye el contrato. */
  vendedorId: string;
  /** Campaña (`Campana.id`) a la que se atribuye; ausente si no vino de ninguna. */
  campanaId?: string;
}

/** Aviso visible donde se muestra la atribución: los contratos históricos son dato demo. */
export const NOTA_ATRIBUCION_DEMO = "Los contratos históricos se atribuyen con datos demo.";

/** Atribución por `Contrato.id`; solo trae los contratos atribuidos. */
export type AtribucionContratos = Record<string, AtribucionContrato>;

/** Indicadores de una campaña; los cocientes son `null` con divisor 0. */
export interface EstadisticaCampana {
  campanaId: string;
  prospectos: number;
  /** Prospectos de la campaña en etapa GANADO. */
  ganados: number;
  contratos: number;
  /** Contratos entre prospectos, como fracción; `null` sin prospectos. */
  conversion: number | null;
  /** Suma de la renta mensual de los contratos de la campaña. */
  rentaCerrada: number;
  inversion: number;
  costoPorProspecto: number | null;
  costoPorContrato: number | null;
}

/** Id (`cmp-NN`) de la siguiente campaña: continúa tras el mayor `cmp-NN` existente. */
export function siguienteIdCampana(campanas: readonly Pick<Campana, "id">[]): string {
  const mayor = campanas.reduce((max, c) => {
    const numero = Number(c.id.replace(/^cmp-/, ""));
    return Number.isInteger(numero) ? Math.max(max, numero) : max;
  }, 0);
  return `cmp-${String(mayor + 1).padStart(2, "0")}`;
}

/** ¿La campaña corre en `fecha`? (`inicio <= fecha` y, si tiene fin, `fecha <= fin`). */
export function campanaVigente(
  campana: Pick<Campana, "inicio" | "fin">,
  fecha: FechaISO,
): boolean {
  return campana.inicio <= fecha && (campana.fin === undefined || fecha <= campana.fin);
}

function cociente(numerador: number, divisor: number): number | null {
  return divisor === 0 ? null : numerador / divisor;
}

/**
 * Indicadores por campaña, en el orden de `campanas`. Un contrato (de cualquier
 * estado salvo TERMINADO) cuenta para una campaña si nace de una cotización
 * cuyo prospecto es de la campaña; si no tiene cotización (sin `cotizacionId` o
 * con uno ausente de `cotizaciones`, como los históricos del seed) cuenta por
 * `atribucion`. Cada contrato cuenta una sola vez.
 */
export function estadisticaCampanas(
  campanas: readonly Campana[],
  prospectos: readonly Pick<Prospecto, "id" | "etapa" | "campanaId">[],
  cotizaciones: readonly Pick<Cotizacion, "id" | "prospectoId">[],
  contratos: readonly Pick<Contrato, "id" | "estado" | "cotizacionId" | "rentaMensual">[],
  atribucion: Readonly<AtribucionContratos>,
): EstadisticaCampana[] {
  const campanaDeProspecto = new Map<string, string>();
  for (const p of prospectos) {
    if (p.campanaId !== undefined) campanaDeProspecto.set(p.id, p.campanaId);
  }
  const cotizacionPorId = new Map(cotizaciones.map((c) => [c.id, c]));

  const contratosPorCampana = new Map<string, { contratos: number; renta: number }>();
  for (const contrato of contratos) {
    if (contrato.estado === "TERMINADO") continue;
    const cotizacion =
      contrato.cotizacionId === undefined ? undefined : cotizacionPorId.get(contrato.cotizacionId);
    const campanaId =
      cotizacion === undefined
        ? atribucion[contrato.id]?.campanaId
        : cotizacion.prospectoId === undefined
          ? undefined
          : campanaDeProspecto.get(cotizacion.prospectoId);
    if (campanaId === undefined) continue;
    const acumulado = contratosPorCampana.get(campanaId) ?? { contratos: 0, renta: 0 };
    acumulado.contratos += 1;
    acumulado.renta += contrato.rentaMensual;
    contratosPorCampana.set(campanaId, acumulado);
  }

  return campanas.map((campana) => {
    const suyos = prospectos.filter((p) => p.campanaId === campana.id);
    const ganados = suyos.filter((p) => p.etapa === "GANADO").length;
    const { contratos: nContratos, renta } =
      contratosPorCampana.get(campana.id) ?? { contratos: 0, renta: 0 };
    return {
      campanaId: campana.id,
      prospectos: suyos.length,
      ganados,
      contratos: nContratos,
      conversion: cociente(nContratos, suyos.length),
      rentaCerrada: renta,
      inversion: campana.inversion,
      costoPorProspecto: cociente(campana.inversion, suyos.length),
      costoPorContrato: cociente(campana.inversion, nContratos),
    };
  });
}
