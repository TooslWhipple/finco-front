import { diasEntre, sumarMeses } from "./fechas";
import { DIAS_POR_VENCER } from "./kpis";
import type { Contrato, Cotizacion, FechaISO } from "./tipos";

export type VigenciaContrato = "VIGENTE" | "POR_VENCER" | "VENCIDO";

/**
 * Vigencia derivada de un contrato en `VIGENTE`: por vencer si termina en los
 * próximos 90 días y vencido si ya pasó su fin. `null` si el contrato aún no
 * rige (borrador, en firma) o ya terminó.
 */
export function estadoVigenciaContrato(
  contrato: Contrato,
  hoy: FechaISO,
): VigenciaContrato | null {
  if (contrato.estado !== "VIGENTE") return null;
  const dias = diasEntre(hoy, contrato.fin);
  if (dias < 0) return "VENCIDO";
  return dias <= DIAS_POR_VENCER ? "POR_VENCER" : "VIGENTE";
}

/** Estado que ve el usuario: el del ciclo de vida o, si ya rige, su vigencia derivada. */
export type EstadoVisibleContrato =
  "BORRADOR" | "EN_FIRMA" | "TERMINADO" | VigenciaContrato;

export const ESTADOS_VISIBLES_CONTRATO: readonly EstadoVisibleContrato[] = [
  "BORRADOR",
  "EN_FIRMA",
  "VIGENTE",
  "POR_VENCER",
  "VENCIDO",
  "TERMINADO",
];

export function estadoVisibleContrato(
  contrato: Contrato,
  hoy: FechaISO,
): EstadoVisibleContrato {
  if (contrato.estado === "VIGENTE") return estadoVigenciaContrato(contrato, hoy)!;
  return contrato.estado;
}

/** Folio del contrato que nace de la cotización: COT-2026-0418 → CTR-2026-0418. */
export function folioContrato(folioCotizacion: string): string {
  return folioCotizacion.replace(/^COT-/, "CTR-");
}

/** Id del contrato que nace de una cotización. */
export function idContratoDeCotizacion(cotizacionId: string): string {
  return `ctr-${cotizacionId}`;
}

/**
 * Contrato en `BORRADOR` que nace de una cotización al generarlo. El locatario
 * es el prospecto registrado (o la propia cotización si se capturó a mano):
 * hasta firmar no existe como locatario del catálogo.
 */
export function contratoDesdeCotizacion(cotizacion: Cotizacion): Contrato {
  const folio = folioContrato(cotizacion.id);
  const inicio = cotizacion.inicioContrato ?? cotizacion.emitidaEl;
  return {
    id: idContratoDeCotizacion(cotizacion.id),
    localId: cotizacion.localId,
    locatarioId: cotizacion.prospectoId ?? cotizacion.id,
    inicio,
    fin: sumarMeses(inicio, cotizacion.plazoMeses),
    rentaMensual: cotizacion.rentaMensual,
    estado: "BORRADOR",
    folio,
    cotizacionId: cotizacion.id,
  };
}
