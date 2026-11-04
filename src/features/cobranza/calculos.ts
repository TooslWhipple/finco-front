import {
  carteraVencida,
  diasAtraso,
  diasEntre,
  estatusCobro,
  porcentajeCobrado,
  sumarDias,
  type Contrato,
  type EstatusCobro,
  type Factura,
  type FechaISO,
} from "@/domain";

export type FiltroEstatus = "TODAS" | EstatusCobro;

export const DIAS_ANIVERSARIO = 7;

export interface KpisCobranza {
  /** Monto facturado en el mes del corte. */
  facturado: number;
  /** Facturas (CFDI) emitidas en el mes del corte. */
  facturasDelMes: number;
  /** Monto cobrado de lo facturado en el mes. */
  cobrado: number;
  /** Fracción cobrada del mes (0-1). */
  porcentajeCobrado: number;
  /** Cartera vencida del corte (incluye la arrastrada de meses previos). */
  carteraVencida: number;
  /** Cartera que ya estaba vencida al cierre del mes anterior. */
  carteraVencidaMesAnterior: number;
  /** Locatarios con al menos una factura vencida. */
  locatariosConAtraso: number;
  /** De ellos, los que tienen una factura con más de 60 días de atraso. */
  locatariosMasDe60: number;
  facturasVencidas: number;
  /** Facturas vigentes aún sin pagar. */
  porVencer: number;
}

/** Meta de cobrado al día que la guía muestra junto al porcentaje. */
export const META_COBRADO = 0.95;

/** Cartera vencida a una fecha pasada: sin pagar a esa fecha y ya vencida entonces. */
export function carteraVencidaAl(facturas: Factura[], fecha: FechaISO): number {
  return facturas
    .filter(
      (f) => diasEntre(f.vencimiento, fecha) > 0 && (!f.pagadaEl || f.pagadaEl > fecha),
    )
    .reduce((s, f) => s + f.monto, 0);
}

/** Último día del mes anterior al corte (`YYYY-MM`). */
export function cierreMesAnterior(mes: string): FechaISO {
  return sumarDias(`${mes}-01`, -1);
}

export function kpisCobranza(
  facturas: Factura[],
  mes: string,
  hoy: string,
): KpisCobranza {
  const delMes = facturas.filter((f) => f.mes === mes);
  const vencidas = facturas.filter((f) => estatusCobro(f, hoy) === "VENCIDA");
  const conAtraso = new Set(vencidas.map((f) => f.locatarioId));
  const masDe60 = new Set(
    vencidas.filter((f) => diasAtraso(f, hoy) > 60).map((f) => f.locatarioId),
  );
  return {
    facturado: delMes.reduce((s, f) => s + f.monto, 0),
    facturasDelMes: delMes.length,
    cobrado: delMes.filter((f) => f.pagadaEl).reduce((s, f) => s + f.monto, 0),
    porcentajeCobrado: porcentajeCobrado(delMes),
    carteraVencida: carteraVencida(facturas, hoy),
    carteraVencidaMesAnterior: carteraVencidaAl(facturas, cierreMesAnterior(mes)),
    locatariosConAtraso: conAtraso.size,
    locatariosMasDe60: masDe60.size,
    facturasVencidas: vencidas.length,
    porVencer: facturas.filter((f) => estatusCobro(f, hoy) === "VIGENTE").length,
  };
}

/** Facturas que no están vencidas (pagadas o vigentes): el cubo "Al corriente". */
export function montoAlCorriente(facturas: Factura[], hoy: string): number {
  return facturas
    .filter((f) => estatusCobro(f, hoy) !== "VENCIDA")
    .reduce((s, f) => s + f.monto, 0);
}

/** Días de atraso en que salen avisos automáticos; además: 3 días antes y el día de pago. */
export const DIAS_AVISO_ATRASO = [5, 15, 30] as const;

export interface AvisosAutomaticos {
  total: number;
  whatsapp: number;
  correo: number;
}

/**
 * Avisos automáticos que salen hoy: a las facturas sin pagar que vencen en 3 días
 * o hoy, o que llevan 5, 15 o 30 días de atraso. Tres de cada cuatro van por
 * WhatsApp y el resto por correo.
 */
export function avisosAutomaticosHoy(
  facturas: Factura[],
  hoy: string,
): AvisosAutomaticos {
  const total = facturas.filter((f) => {
    if (f.pagadaEl) return false;
    const faltan = diasEntre(hoy, f.vencimiento);
    const atraso = diasAtraso(f, hoy);
    return (
      faltan === 3 ||
      faltan === 0 ||
      (DIAS_AVISO_ATRASO as readonly number[]).includes(atraso)
    );
  }).length;
  const correo = Math.floor(total / 4);
  return { total, whatsapp: total - correo, correo };
}

const DIA_MAXIMO_FACTURACION = 28;

/** Día del mes en que se factura el contrato (aniversario, tope 28). */
export function diaDeFacturacion(contrato: Contrato): number {
  return Math.min(Number(contrato.inicio.slice(8, 10)), DIA_MAXIMO_FACTURACION);
}

/** Día de aniversario por local, con el contrato vigente a `hoy` (o el más reciente). */
export function diasAniversarioPorLocal(
  contratos: Contrato[],
  hoy: FechaISO,
): Map<string, number> {
  const elegido = new Map<string, Contrato>();
  for (const c of contratos) {
    const actual = elegido.get(c.localId);
    const vigente = c.inicio <= hoy && c.fin >= hoy;
    const actualVigente =
      actual !== undefined && actual.inicio <= hoy && actual.fin >= hoy;
    if (
      !actual ||
      (vigente && !actualVigente) ||
      (vigente === actualVigente && c.inicio > actual.inicio)
    ) {
      elegido.set(c.localId, c);
    }
  }
  return new Map([...elegido].map(([id, c]) => [id, diaDeFacturacion(c)]));
}

export interface FacturasDelDia {
  fecha: FechaISO;
  /** Contratos vigentes que facturan ese día por aniversario. */
  facturas: number;
}

/** Cuántas facturas salen por aniversario cada uno de los próximos `dias` días (hoy incluido). */
export function facturasPorDia(
  contratos: Contrato[],
  hoy: FechaISO,
  dias: number = DIAS_ANIVERSARIO,
): FacturasDelDia[] {
  return Array.from({ length: dias }, (_, i) => {
    const fecha = sumarDias(hoy, i);
    const dia = Number(fecha.slice(8, 10));
    return {
      fecha,
      facturas: contratos.filter(
        (c) => c.inicio <= fecha && c.fin >= fecha && diaDeFacturacion(c) === dia,
      ).length,
    };
  });
}

/** Cuántas facturas hay por estatus (para las pills de filtro). */
export function conteoPorEstatus(
  facturas: Factura[],
  hoy: string,
): Record<FiltroEstatus, number> {
  const conteo: Record<FiltroEstatus, number> = {
    TODAS: facturas.length,
    PAGADA: 0,
    VIGENTE: 0,
    VENCIDA: 0,
  };
  for (const f of facturas) conteo[estatusCobro(f, hoy)] += 1;
  return conteo;
}

export function filtrarFacturas(
  facturas: Factura[],
  hoy: string,
  estatus: FiltroEstatus,
  plazaPorLocal: ReadonlyMap<string, string>,
  plazaId: string | null,
): Factura[] {
  return facturas.filter(
    (f) =>
      (estatus === "TODAS" || estatusCobro(f, hoy) === estatus) &&
      (plazaId === null || plazaPorLocal.get(f.localId) === plazaId),
  );
}

export type NivelAtraso = "leve" | "medio" | "grave";

/** Escalón del chip de atraso: hasta 30 días, hasta 60 y más de 60. */
export function nivelAtraso(dias: number): NivelAtraso {
  if (dias <= 30) return "leve";
  if (dias <= 60) return "medio";
  return "grave";
}

/** Facturas vencidas sin aviso enviado. */
export function pendientesDeAviso(
  facturas: Factura[],
  hoy: string,
  avisados: readonly string[],
): Factura[] {
  const ya = new Set(avisados);
  return facturas.filter((f) => estatusCobro(f, hoy) === "VENCIDA" && !ya.has(f.id));
}
