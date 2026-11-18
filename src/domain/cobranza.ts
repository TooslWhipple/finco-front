import { diasEntre, sumarMeses } from "./fechas";
import type { Factura, EstatusCobro, FechaISO } from "./tipos";

export function estatusCobro(factura: Factura, hoy: string): EstatusCobro {
  if (factura.pagadaEl) return "PAGADA";
  return diasEntre(factura.vencimiento, hoy) > 0 ? "VENCIDA" : "VIGENTE";
}

/** Días de atraso (0 si pagada o aún no vence). */
export function diasAtraso(factura: Factura, hoy: string): number {
  if (factura.pagadaEl) return 0;
  return Math.max(0, diasEntre(factura.vencimiento, hoy));
}

export type RangoAntiguedad = "1-30" | "31-60" | "61-90" | "+90";

export interface CuboAntiguedad {
  rango: RangoAntiguedad;
  facturas: number;
  monto: number;
}

export function rangoAntiguedad(dias: number): RangoAntiguedad {
  if (dias <= 30) return "1-30";
  if (dias <= 60) return "31-60";
  if (dias <= 90) return "61-90";
  return "+90";
}

/** Solo las facturas de renta: las que cuentan como factura en contadores y cobrado. */
export function soloRentas(facturas: readonly Factura[]): Factura[] {
  return facturas.filter((f) => f.concepto === "RENTA");
}

/**
 * Las facturas con cada RECARGO tomando el `vencimiento` de su renta de origen
 * (si está en la lista), para que el recargo envejezca con ella en los saldos.
 */
export function conVencimientoDeRenta(facturas: readonly Factura[]): Factura[] {
  const vencimientoPorId = new Map(
    facturas.filter((f) => f.concepto === "RENTA").map((f) => [f.id, f.vencimiento]),
  );
  return facturas.map((f) => {
    if (f.concepto !== "RECARGO" || !f.facturaOrigenId) return f;
    const vencimiento = vencimientoPorId.get(f.facturaOrigenId);
    return vencimiento === undefined ? f : { ...f, vencimiento };
  });
}

/**
 * Agrupa las facturas vencidas por antigüedad del saldo. Siempre devuelve los 4
 * rangos. El conteo es de rentas; el monto suma también sus recargos, que
 * envejecen con el vencimiento de su renta.
 */
export function antiguedadSaldos(facturas: Factura[], hoy: string): CuboAntiguedad[] {
  const cubos: CuboAntiguedad[] = (["1-30", "31-60", "61-90", "+90"] as const).map(
    (rango) => ({
      rango,
      facturas: 0,
      monto: 0,
    }),
  );
  for (const f of conVencimientoDeRenta(facturas)) {
    const dias = diasAtraso(f, hoy);
    if (dias === 0) continue;
    const cubo = cubos.find((c) => c.rango === rangoAntiguedad(dias))!;
    if (f.concepto === "RENTA") cubo.facturas += 1;
    cubo.monto += f.monto;
  }
  return cubos;
}

/**
 * Facturas del corte de `mes` (`YYYY-MM`). La regla se decide sobre las RENTA:
 * - si `mes` es posterior al mes de `hoy`, solo entran las de ese mes;
 * - si no, entran las del mes y las de meses anteriores que sigan vencidas a
 *   `hoy` sin pagar o que se hayan pagado dentro de `mes`.
 * Cada RECARGO entra si y solo si entra su renta de origen.
 */
export function facturasDelCorte(
  facturas: readonly Factura[],
  mes: string,
  hoy: FechaISO,
): Factura[] {
  const futuro = mes > hoy.slice(0, 7);
  const entra = (f: Factura) =>
    f.mes === mes ||
    (!futuro &&
      f.mes < mes &&
      (estatusCobro(f, hoy) === "VENCIDA" || f.pagadaEl?.slice(0, 7) === mes));
  const rentas = new Set(
    facturas.filter((f) => f.concepto === "RENTA" && entra(f)).map((f) => f.id),
  );
  return facturas.filter((f) =>
    f.concepto === "RENTA"
      ? rentas.has(f.id)
      : f.facturaOrigenId !== undefined && rentas.has(f.facturaOrigenId),
  );
}

/** Días de atraso a partir de los cuales la campana destaca a un cliente moroso. */
export const DIAS_MOROSO_DESTACADO = 30;

/** Locatario con al menos una renta vencida sin pagar. */
export interface ClienteMoroso {
  locatarioId: string;
  /** Máximo atraso, en días, entre sus rentas vencidas. */
  dias: number;
  /** Saldo: todas sus rentas y recargos sin pagar, vencidos o no. */
  saldo: number;
  /** Rentas vencidas sin pagar (`Factura.id`), de la más atrasada a la más reciente. */
  facturaIds: string[];
}

/**
 * Todos los clientes morosos, del más atrasado al menos (y, a igual atraso, del
 * saldo mayor al menor). Es moroso quien tiene al menos una renta vencida; los
 * días y las facturas salen solo de esas rentas, y el saldo suma todas sus
 * rentas y recargos sin pagar.
 */
export function clientesMorosos(
  facturas: readonly Factura[],
  hoy: FechaISO,
): ClienteMoroso[] {
  const porLocatario = new Map<string, ClienteMoroso>();
  const vencidas = soloRentas(facturas)
    .map((f) => ({ factura: f, dias: diasAtraso(f, hoy) }))
    .filter(({ dias }) => dias > 0)
    .sort((a, b) => b.dias - a.dias);
  for (const { factura, dias } of vencidas) {
    const moroso = porLocatario.get(factura.locatarioId) ?? {
      locatarioId: factura.locatarioId,
      dias: 0,
      saldo: 0,
      facturaIds: [],
    };
    moroso.dias = Math.max(moroso.dias, dias);
    moroso.facturaIds.push(factura.id);
    porLocatario.set(factura.locatarioId, moroso);
  }
  for (const f of facturas) {
    const moroso = porLocatario.get(f.locatarioId);
    if (moroso && !f.pagadaEl) moroso.saldo += f.monto;
  }
  return [...porLocatario.values()].sort((a, b) => b.dias - a.dias || b.saldo - a.saldo);
}

/** Folio de una factura sin importes: lo que ve quien no tiene permiso de cobranza. */
export interface FolioFactura {
  id: string;
  folio: string;
  /** Mes facturado, `YYYY-MM`. */
  mes: string;
}

/** Meses atrás (además del de `hoy`) en que se buscan las facturas de un local. */
const MESES_FOLIOS_ANTERIORES = 2;

/** Meses (`YYYY-MM`) en que se buscan los folios: el de `hoy` y los dos anteriores, del más reciente al más antiguo. */
export function mesesFoliosFactura(hoy: FechaISO): string[] {
  const primero = `${hoy.slice(0, 7)}-01`;
  return Array.from({ length: MESES_FOLIOS_ANTERIORES + 1 }, (_, i) =>
    sumarMeses(primero, -i).slice(0, 7),
  );
}

/**
 * Folios de las facturas del local con folio y mes dentro de
 * `mesesFoliosFactura(hoy)`, del más reciente al más antiguo. Solo devuelve
 * `id`, `folio` y `mes`: nunca el monto.
 */
export function foliosFacturaDeLocal(
  facturas: readonly Factura[],
  localId: string,
  hoy: FechaISO,
): FolioFactura[] {
  const meses = mesesFoliosFactura(hoy);
  const hasta = meses[0];
  const desde = meses[meses.length - 1];
  return facturas
    .flatMap((f) =>
      f.localId === localId && f.folio && f.mes >= desde && f.mes <= hasta
        ? [{ id: f.id, folio: f.folio, mes: f.mes }]
        : [],
    )
    .sort((a, b) => b.mes.localeCompare(a.mes) || a.folio.localeCompare(b.folio));
}
