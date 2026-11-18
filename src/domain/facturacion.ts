import type { Ejecucion } from "./avisos";
import { diasAtraso } from "./cobranza";
import { sumarDias, sumarMeses } from "./fechas";
import { redondearCentavos } from "./numeros";
import type {
  ComplementoPago,
  Contrato,
  Cotizacion,
  Factura,
  FechaISO,
  Locatario,
  ProgramacionEmision,
  Prospecto,
  ReglaRecargo,
} from "./tipos";

/** Programación de la emisión con la que arranca la demo: el día 1 a las 07:00 por WhatsApp. */
export const PROGRAMACION_EMISION_INICIAL: ProgramacionEmision = {
  activa: true,
  dia: 1,
  hora: "07:00",
  canal: "WHATSAPP",
};

/** Regla de recargo con la que arranca la demo: 2 % de la renta tras 5 días de gracia. */
export const REGLA_RECARGO_INICIAL: ReglaRecargo = { porcentaje: 0.02, diasGracia: 5 };

/** Días entre un recargo y el siguiente de la misma renta. */
export const DIAS_ENTRE_RECARGOS = 30;

/** Último día del mes en que se puede programar la emisión o vencer una factura. */
export const DIA_MAXIMO_FACTURACION = 28;

/** Día del mes en que se factura el contrato (aniversario, tope 28). */
export function diaDeFacturacion(contrato: Contrato): number {
  return Math.min(Number(contrato.inicio.slice(8, 10)), DIA_MAXIMO_FACTURACION);
}

/** Mes (`YYYY-MM`) siguiente al de la fecha. */
export function mesSiguiente(fecha: FechaISO): string {
  return sumarMeses(`${fecha.slice(0, 7)}-01`, 1).slice(0, 7);
}

/** Último día del mes `YYYY-MM`. */
function finDeMes(mes: string): FechaISO {
  return sumarDias(sumarMeses(`${mes}-01`, 1), -1);
}

const PATRON_FOLIO = /^A-(\d+)$/;

/** Número del folio `A-NNNN` más alto entre las facturas (0 si no hay). */
function folioMaximo(facturas: readonly Factura[]): number {
  let maximo = 0;
  for (const f of facturas) {
    const coincide = f.folio ? PATRON_FOLIO.exec(f.folio) : null;
    if (coincide) maximo = Math.max(maximo, Number(coincide[1]));
  }
  return maximo;
}

function folioA(numero: number): string {
  return `A-${String(numero).padStart(4, "0")}`;
}

/** Id estable de la factura de renta emitida para un local y un mes. */
export function idFacturaEmitida(localId: string, mes: string): string {
  return `fac-em-${localId}-${mes}`;
}

/**
 * Facturas de renta que faltan por emitir en `mes` (`YYYY-MM`). Entran los
 * contratos `VIGENTE` cuyo periodo traslapa el mes; si un local tiene dos, gana
 * el de `inicio` más reciente. No repite la llave `localId` + `mes` + RENTA de
 * las `existentes`, y los folios siguen al `A-NNNN` más alto de ellas.
 */
export function facturasAEmitir(
  contratos: readonly Contrato[],
  existentes: readonly Factura[],
  mes: string,
): Factura[] {
  const inicioMes = `${mes}-01`;
  const finMes = finDeMes(mes);
  const porLocal = new Map<string, Contrato>();
  for (const c of contratos) {
    if (c.estado !== "VIGENTE" || c.inicio > finMes || c.fin < inicioMes) continue;
    const actual = porLocal.get(c.localId);
    if (!actual || c.inicio > actual.inicio) porLocal.set(c.localId, c);
  }
  const yaEmitidas = new Set(
    existentes
      .filter((f) => f.concepto === "RENTA" && f.mes === mes)
      .map((f) => f.localId),
  );
  let folio = folioMaximo(existentes);
  const emitidas: Factura[] = [];
  for (const c of porLocal.values()) {
    if (yaEmitidas.has(c.localId)) continue;
    folio += 1;
    emitidas.push({
      id: idFacturaEmitida(c.localId, mes),
      localId: c.localId,
      locatarioId: c.locatarioId,
      mes,
      monto: c.rentaMensual,
      vencimiento: `${mes}-${String(diaDeFacturacion(c)).padStart(2, "0")}`,
      folio: folioA(folio),
      concepto: "RENTA",
      origen: "EMISION",
    });
  }
  return emitidas;
}

/** Id estable del k-ésimo recargo (desde 1) de una renta. */
export function idRecargo(facturaOrigenId: string, k: number): string {
  return `rec-${facturaOrigenId}-${k}`;
}

/** Día de atraso en que cae el k-ésimo recargo (desde 1): `gracia + 1 + 30·(k−1)`. */
export function diaDeRecargo(regla: ReglaRecargo, k: number): number {
  return regla.diasGracia + 1 + DIAS_ENTRE_RECARGOS * (k - 1);
}

/** Monto de un recargo: el porcentaje de la renta, a centavos. */
export function montoRecargo(renta: Factura, regla: ReglaRecargo): number {
  return redondearCentavos(renta.monto * regla.porcentaje);
}

/**
 * Recargos que ya debieron cargarse a `hoy` y aún no existen entre las
 * `facturas`. Solo las rentas vencidas sin pagar generan recargo (nunca un
 * recargo de un recargo); la base es siempre el monto de la renta.
 */
export function recargosPendientes(
  facturas: readonly Factura[],
  regla: ReglaRecargo,
  hoy: FechaISO,
): Factura[] {
  const existentes = new Set(facturas.map((f) => f.id));
  const nuevos: Factura[] = [];
  for (const renta of facturas) {
    if (renta.concepto !== "RENTA") continue;
    const atraso = diasAtraso(renta, hoy);
    for (let k = 1; diaDeRecargo(regla, k) <= atraso; k++) {
      const id = idRecargo(renta.id, k);
      if (existentes.has(id)) continue;
      nuevos.push({
        id,
        localId: renta.localId,
        locatarioId: renta.locatarioId,
        mes: renta.mes,
        monto: montoRecargo(renta, regla),
        vencimiento: sumarDias(renta.vencimiento, diaDeRecargo(regla, k)),
        concepto: "RECARGO",
        origen: "EMISION",
        facturaOrigenId: renta.id,
      });
    }
  }
  return nuevos;
}

/**
 * Une el corte de la semilla con las facturas emitidas y los recargos de la
 * demo, y aplica los pagos: la renta pagada toma `pagadaEl` (la fecha del
 * último complemento) y sus `complementos`, y sus recargos quedan liquidados
 * con ella. Una emitida que ya viene en el corte no se repite.
 */
export function mezclarFacturas(
  corteSemilla: readonly Factura[],
  emitidas: readonly Factura[],
  recargos: readonly Factura[],
  pagos: Readonly<Record<string, readonly ComplementoPago[]>>,
): Factura[] {
  const ids = new Set(corteSemilla.map((f) => f.id));
  const todas = [
    ...corteSemilla,
    ...emitidas.filter((f) => !ids.has(f.id)),
    ...recargos.filter((f) => !ids.has(f.id)),
  ];
  const fechaDePago = (facturaId: string): FechaISO | undefined =>
    pagos[facturaId]?.at(-1)?.fecha;
  const pagadaPorId = new Map<string, FechaISO>();
  const conPagos = todas.map((f) => {
    if (f.concepto !== "RENTA") return f;
    const complementos = pagos[f.id];
    const pagada = f.pagadaEl ?? fechaDePago(f.id);
    if (pagada) pagadaPorId.set(f.id, pagada);
    return complementos?.length && !f.pagadaEl
      ? { ...f, pagadaEl: pagada, complementos: [...complementos] }
      : f;
  });
  return conPagos.map((f) => {
    if (f.concepto !== "RECARGO" || f.pagadaEl || !f.facturaOrigenId) return f;
    const pagada = pagadaPorId.get(f.facturaOrigenId) ?? fechaDePago(f.facturaOrigenId);
    return pagada ? { ...f, pagadaEl: pagada } : f;
  });
}

/** Recargos de una renta entre las facturas dadas. */
export function recargosDe(renta: Factura, facturas: readonly Factura[]): Factura[] {
  return facturas.filter(
    (f) => f.concepto === "RECARGO" && f.facturaOrigenId === renta.id,
  );
}

/**
 * Complemento del pago total de una renta: liquida la renta y sus recargos
 * sin pagar, con folio `CP-<folio>`.
 */
export function complementoDePago(
  renta: Factura,
  facturas: readonly Factura[],
  fecha: FechaISO,
): ComplementoPago {
  const recargos = recargosDe(renta, facturas).filter((r) => !r.pagadaEl);
  return {
    id: `cp-${renta.id}`,
    fecha,
    monto: renta.monto + recargos.reduce((s, r) => s + r.monto, 0),
    folio: `CP-${renta.folio ?? renta.id}`,
  };
}

/**
 * Siguiente emisión programada estrictamente posterior a `ahora`; `null` si la
 * programación está apagada.
 */
export function proximaEmision(
  programacion: ProgramacionEmision,
  ahora: Ejecucion,
): Ejecucion | null {
  if (!programacion.activa) return null;
  const dia = String(programacion.dia).padStart(2, "0");
  const esteMes = `${ahora.fecha.slice(0, 7)}-${dia}`;
  const yaPaso =
    esteMes < ahora.fecha || (esteMes === ahora.fecha && programacion.hora <= ahora.hora);
  const fecha = yaPaso ? `${mesSiguiente(ahora.fecha)}-${dia}` : esteMes;
  return { fecha, hora: programacion.hora };
}

/** Catálogos donde se busca el nombre de quien paga una factura. */
export interface FuentesLocatario {
  locatarios: readonly Locatario[];
  prospectos: readonly Prospecto[];
  cotizaciones: readonly Cotizacion[];
}

/**
 * Nombre del locatario de una factura o un contrato. Los contratos firmados en
 * la demo llevan como `locatarioId` el id del prospecto o de la cotización, así
 * que se busca en ese orden; si no aparece en ningún lado, se devuelve el id.
 */
export function nombreLocatario(locatarioId: string, fuentes: FuentesLocatario): string {
  const locatario = fuentes.locatarios.find((l) => l.id === locatarioId);
  if (locatario) return locatario.nombre;
  const prospecto = fuentes.prospectos.find((p) => p.id === locatarioId);
  if (prospecto) return prospecto.nombre;
  const cotizacion = fuentes.cotizaciones.find((c) => c.id === locatarioId);
  if (cotizacion) return cotizacion.prospecto.nombre;
  return locatarioId;
}
