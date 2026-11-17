import {
  avisosDelDia,
  carteraVencida,
  conVencimientoDeRenta,
  diaDeFacturacion,
  diasAtraso,
  diasEntre,
  estatusCobro,
  montoCobrado,
  porcentajeCobrado,
  soloRentas,
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

/**
 * Cartera vencida a una fecha pasada: sin pagar a esa fecha y ya vencida
 * entonces. Un recargo cuenta solo si ya se había cargado a esa fecha, y
 * envejece con el vencimiento de su renta.
 */
export function carteraVencidaAl(facturas: Factura[], fecha: FechaISO): number {
  const cargadas = facturas.filter(
    (f) => f.concepto === "RENTA" || f.vencimiento <= fecha,
  );
  return conVencimientoDeRenta(cargadas)
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
  // Los contadores y el cobrado son de rentas; los recargos solo suman a los saldos.
  const rentas = soloRentas(facturas);
  const delMes = rentas.filter((f) => f.mes === mes);
  const vencidas = rentas.filter((f) => estatusCobro(f, hoy) === "VENCIDA");
  const conAtraso = new Set(vencidas.map((f) => f.locatarioId));
  const masDe60 = new Set(
    vencidas.filter((f) => diasAtraso(f, hoy) > 60).map((f) => f.locatarioId),
  );
  return {
    facturado: delMes.reduce((s, f) => s + f.monto, 0),
    facturasDelMes: delMes.length,
    cobrado: montoCobrado(delMes),
    porcentajeCobrado: porcentajeCobrado(delMes),
    carteraVencida: carteraVencida(facturas, hoy),
    carteraVencidaMesAnterior: carteraVencidaAl(facturas, cierreMesAnterior(mes)),
    locatariosConAtraso: conAtraso.size,
    locatariosMasDe60: masDe60.size,
    facturasVencidas: vencidas.length,
    porVencer: rentas.filter((f) => estatusCobro(f, hoy) === "VIGENTE").length,
  };
}

/**
 * Saldos que no están vencidos (pagados o vigentes): el cubo "Al corriente".
 * Los recargos envejecen con el vencimiento de su renta.
 */
export function montoAlCorriente(facturas: Factura[], hoy: string): number {
  return conVencimientoDeRenta(facturas)
    .filter((f) => estatusCobro(f, hoy) !== "VENCIDA")
    .reduce((s, f) => s + f.monto, 0);
}

export interface AvisosAutomaticos {
  total: number;
  whatsapp: number;
  correo: number;
}

/**
 * Avisos automáticos que salen hoy (las reglas viven en `avisosDelDia`): a las
 * facturas sin pagar que vencen en 3 días o hoy, o que llevan 5, 15 o 30 días de
 * atraso. Tres de cada cuatro van por WhatsApp y el resto por correo.
 */
export function avisosAutomaticosHoy(
  facturas: Factura[],
  hoy: string,
): AvisosAutomaticos {
  const avisos = avisosDelDia(facturas, hoy);
  const correo = avisos.filter((a) => a.canal === "CORREO").length;
  return { total: avisos.length, whatsapp: avisos.length - correo, correo };
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

/** Cuántas rentas hay por estatus (para las pills de filtro); los recargos no cuentan. */
export function conteoPorEstatus(
  facturas: Factura[],
  hoy: string,
): Record<FiltroEstatus, number> {
  const rentas = soloRentas(facturas);
  const conteo: Record<FiltroEstatus, number> = {
    TODAS: rentas.length,
    PAGADA: 0,
    VIGENTE: 0,
    VENCIDA: 0,
  };
  for (const f of rentas) conteo[estatusCobro(f, hoy)] += 1;
  return conteo;
}

/**
 * Lista plana filtrada por estatus y plaza. El filtro se decide sobre las
 * rentas; cada recargo se queda si y solo si se queda su renta.
 */
export function filtrarFacturas(
  facturas: Factura[],
  hoy: string,
  estatus: FiltroEstatus,
  plazaPorLocal: ReadonlyMap<string, string>,
  plazaId: string | null,
): Factura[] {
  const quedan = new Set(
    soloRentas(facturas)
      .filter(
        (f) =>
          (estatus === "TODAS" || estatusCobro(f, hoy) === estatus) &&
          (plazaId === null || plazaPorLocal.get(f.localId) === plazaId),
      )
      .map((f) => f.id),
  );
  return facturas.filter((f) =>
    f.concepto === "RENTA"
      ? quedan.has(f.id)
      : f.facturaOrigenId !== undefined && quedan.has(f.facturaOrigenId),
  );
}

/** Fila de la tabla de cuentas: una renta con sus recargos anidados. */
export interface FilaCuenta {
  renta: Factura;
  /** Recargos de la renta, del primero al último cargo. */
  recargos: Factura[];
}

/**
 * Agrupa la lista plana en filas por renta, con sus recargos anidados en orden
 * de cargo. La tabla filtra, cuenta y pagina sobre estas filas; un recargo cuya
 * renta no está en la lista se descarta.
 */
export function agruparRecargos(facturas: readonly Factura[]): FilaCuenta[] {
  const recargosPorRenta = new Map<string, Factura[]>();
  for (const f of facturas) {
    if (f.concepto !== "RECARGO" || !f.facturaOrigenId) continue;
    const lista = recargosPorRenta.get(f.facturaOrigenId) ?? [];
    lista.push(f);
    recargosPorRenta.set(f.facturaOrigenId, lista);
  }
  return soloRentas(facturas).map((renta) => ({
    renta,
    recargos: (recargosPorRenta.get(renta.id) ?? []).sort((a, b) =>
      a.vencimiento.localeCompare(b.vencimiento),
    ),
  }));
}

export type NivelAtraso = "leve" | "medio" | "grave";

/** Escalón del chip de atraso: hasta 30 días, hasta 60 y más de 60. */
export function nivelAtraso(dias: number): NivelAtraso {
  if (dias <= 30) return "leve";
  if (dias <= 60) return "medio";
  return "grave";
}

/** Rentas vencidas sin aviso enviado; los recargos no llevan aviso propio. */
export function pendientesDeAviso(
  facturas: Factura[],
  hoy: string,
  avisados: readonly string[],
): Factura[] {
  const ya = new Set(avisados);
  return soloRentas(facturas).filter(
    (f) => estatusCobro(f, hoy) === "VENCIDA" && !ya.has(f.id),
  );
}
