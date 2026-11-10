import { sumarDias } from "./fechas";
import { acumuladoValidado, ETIQUETA_UNIDAD, montoContrato } from "./obra";
import type {
  ContratoObra,
  CorteSemanal,
  EstadoEstimacion,
  EstimacionObra,
  FechaISO,
  Foto,
  PagoObra,
  VolumenCorte,
} from "./tipos";

/** Tolerancia numérica al comparar volúmenes. */
const TOLERANCIA = 1e-9;

const redondear2 = (valor: number): number => Math.round(valor * 100) / 100;

/** Lo que captura el Supervisor: el volumen que el contratista quiere cobrar. */
export interface EntradaEstimacion {
  contratoObraId: string;
  volumenes: readonly VolumenCorte[];
}

export interface ImportesEstimacion {
  importeBruto: number;
  amortizacionAnticipo: number;
  fondoGarantia: number;
  importeNeto: number;
}

/** Las estimaciones rechazadas no comprometen volumen ni anticipo. */
function vivas(
  contratoId: string,
  estimaciones: readonly EstimacionObra[],
): EstimacionObra[] {
  return estimaciones.filter(
    (e) => e.contratoObraId === contratoId && e.estado !== "RECHAZADA",
  );
}

/** Importe bruto: volumen por precio unitario de cada concepto del contrato. */
export function importeBrutoEstimacion(
  contrato: ContratoObra,
  volumenes: readonly VolumenCorte[],
): number {
  const bruto = contrato.conceptos.reduce((suma, c) => {
    const volumen = volumenes.find((v) => v.conceptoId === c.id)?.volumen ?? 0;
    return (
      suma + (Number.isFinite(volumen) && volumen > 0 ? volumen * c.precioUnitario : 0)
    );
  }, 0);
  return redondear2(bruto);
}

/** Anticipo que aún falta amortizar: el anticipo total menos lo ya descontado. */
export function anticipoPendiente(
  contrato: ContratoObra,
  estimaciones: readonly EstimacionObra[],
): number {
  const total = montoContrato(contrato) * contrato.anticipoPct;
  const amortizado = vivas(contrato.id, estimaciones).reduce(
    (suma, e) => suma + e.amortizacionAnticipo,
    0,
  );
  return Math.max(0, redondear2(total - amortizado));
}

/**
 * Desglose de una estimación: del bruto se descuenta la amortización del anticipo
 * (con tope en el anticipo pendiente) y el fondo de garantía; queda el neto.
 */
export function calcularImportes(
  contrato: ContratoObra,
  volumenes: readonly VolumenCorte[],
  previas: readonly EstimacionObra[],
): ImportesEstimacion {
  const importeBruto = importeBrutoEstimacion(contrato, volumenes);
  const amortizacionAnticipo = Math.min(
    redondear2(importeBruto * contrato.anticipoPct),
    anticipoPendiente(contrato, previas),
  );
  const fondoGarantia = redondear2(importeBruto * contrato.fondoGarantiaPct);
  return {
    importeBruto,
    amortizacionAnticipo,
    fondoGarantia,
    importeNeto: redondear2(importeBruto - amortizacionAnticipo - fondoGarantia),
  };
}

/** Volumen por concepto que ya está en estimaciones vivas del contrato. */
export function acumuladoEstimado(
  contratoId: string,
  estimaciones: readonly EstimacionObra[],
): Record<string, number> {
  const acumulado: Record<string, number> = {};
  for (const e of vivas(contratoId, estimaciones)) {
    for (const { conceptoId, volumen } of e.volumenes) {
      acumulado[conceptoId] = (acumulado[conceptoId] ?? 0) + volumen;
    }
  }
  return acumulado;
}

/** Volumen validado en cortes que todavía no se ha estimado, por concepto. */
export function volumenPorEstimar(
  contrato: ContratoObra,
  cortes: readonly CorteSemanal[],
  estimaciones: readonly EstimacionObra[],
): Record<string, number> {
  const validado = acumuladoValidado(contrato.id, cortes);
  const estimado = acumuladoEstimado(contrato.id, estimaciones);
  const disponible: Record<string, number> = {};
  for (const c of contrato.conceptos) {
    disponible[c.id] = Math.max(0, (validado[c.id] ?? 0) - (estimado[c.id] ?? 0));
  }
  return disponible;
}

/** ¿Queda algo validado por estimar en el contrato? */
export function tienePorEstimar(
  contrato: ContratoObra,
  cortes: readonly CorteSemanal[],
  estimaciones: readonly EstimacionObra[],
): boolean {
  return Object.values(volumenPorEstimar(contrato, cortes, estimaciones)).some(
    (v) => v > TOLERANCIA,
  );
}

export interface ErroresEstimacion {
  /** Error por id de concepto, para mostrarlo en su propio campo. */
  volumenes: Record<string, string>;
  general?: string;
}

/** Valida una captura: no se puede estimar más volumen del validado en cortes. */
export function erroresEstimacion(
  contrato: ContratoObra,
  cortes: readonly CorteSemanal[],
  estimaciones: readonly EstimacionObra[],
  entrada: EntradaEstimacion,
): ErroresEstimacion {
  const errores: ErroresEstimacion = { volumenes: {} };
  const disponible = volumenPorEstimar(contrato, cortes, estimaciones);
  let hayVolumen = false;
  for (const concepto of contrato.conceptos) {
    const volumen =
      entrada.volumenes.find((v) => v.conceptoId === concepto.id)?.volumen ?? 0;
    if (!Number.isFinite(volumen) || volumen < 0) {
      errores.volumenes[concepto.id] = "Escribe un volumen de 0 o más.";
      continue;
    }
    if (volumen > TOLERANCIA) hayVolumen = true;
    const restante = disponible[concepto.id] ?? 0;
    if (volumen > restante + TOLERANCIA) {
      errores.volumenes[concepto.id] =
        `Excede lo validado en cortes: quedan ${redondear2(restante)} ${ETIQUETA_UNIDAD[concepto.unidad]} por estimar.`;
    }
  }
  if (!hayVolumen && Object.keys(errores.volumenes).length === 0) {
    errores.general = "Captura el volumen de al menos un concepto.";
  }
  return errores;
}

/** `true` si la captura no tiene ningún error. */
export function estimacionSinErrores(errores: ErroresEstimacion): boolean {
  return errores.general === undefined && Object.keys(errores.volumenes).length === 0;
}

/** Periodo de la siguiente estimación: del día siguiente a la anterior (o del inicio del contrato) a `hoy`. */
export function periodoSiguiente(
  contrato: ContratoObra,
  estimaciones: readonly EstimacionObra[],
  hoy: FechaISO,
): { desde: FechaISO; hasta: FechaISO } {
  const ultimo = estimaciones
    .filter((e) => e.contratoObraId === contrato.id)
    .reduce<FechaISO | null>(
      (max, e) => (max === null || e.periodo.hasta > max ? e.periodo.hasta : max),
      null,
    );
  const desde = ultimo ? sumarDias(ultimo, 1) : contrato.inicioPlan;
  return { desde: desde <= hoy ? desde : hoy, hasta: hoy };
}

/** Registrar y firmar es una sola acción: la estimación nace validada por el Supervisor. */
export function firmarEstimacion(
  id: string,
  contrato: ContratoObra,
  entrada: EntradaEstimacion,
  previas: readonly EstimacionObra[],
  autor: string,
  fecha: FechaISO,
  evidencia: Foto[],
): EstimacionObra {
  const volumenes = entrada.volumenes
    .filter((v) => v.volumen > TOLERANCIA)
    .map(({ conceptoId, volumen }) => ({ conceptoId, volumen }));
  return {
    id,
    contratoObraId: contrato.id,
    numero: previas.filter((e) => e.contratoObraId === contrato.id).length + 1,
    periodo: periodoSiguiente(contrato, previas, fecha),
    volumenes,
    estado: "VALIDADA_SUPERVISOR",
    ...calcularImportes(contrato, volumenes, previas),
    registradaPor: autor,
    registradaEn: fecha,
    validadaPor: autor,
    evidencia,
  };
}

const TRANSICIONES: Readonly<Record<EstadoEstimacion, readonly EstadoEstimacion[]>> = {
  REGISTRADA: ["VALIDADA_SUPERVISOR"],
  VALIDADA_SUPERVISOR: ["AUTORIZADA_PMO", "RECHAZADA"],
  AUTORIZADA_PMO: [],
  RECHAZADA: [],
};

export function puedeTransitarEstimacion(
  origen: EstadoEstimacion,
  destino: EstadoEstimacion,
): boolean {
  return TRANSICIONES[origen].includes(destino);
}

/**
 * Resolución de la PMO sobre una estimación firmada. Rechazar exige motivo; una
 * transición no permitida devuelve la misma estimación (las resueltas son inmutables).
 */
export function resolverEstimacion(
  estimacion: EstimacionObra,
  resolucion: "AUTORIZADA_PMO" | "RECHAZADA",
  autor: string,
  fecha: FechaISO,
  comentario?: string,
): EstimacionObra {
  if (!puedeTransitarEstimacion(estimacion.estado, resolucion)) return estimacion;
  const nota = comentario?.trim();
  if (resolucion === "RECHAZADA" && !nota) return estimacion;
  return {
    ...estimacion,
    estado: resolucion,
    autorizadaPor: autor,
    resueltaEn: fecha,
    ...(nota ? { comentario: nota } : {}),
  };
}

/**
 * Pago que nace al autorizar una estimación. Su monto es el importe **bruto**: el
 * costo real devengado del valor ganado. El anticipo ya se había pagado y el
 * fondo de garantía es dinero retenido, no ahorrado; el neto es solo lo que se
 * transfiere.
 */
export function pagoDeEstimacion(
  estimacion: EstimacionObra,
  contrato: ContratoObra,
  fecha: FechaISO,
): PagoObra {
  return {
    id: `pago-${estimacion.id}`,
    contratoObraId: contrato.id,
    fecha,
    monto: estimacion.importeBruto,
    folioFactura: `EST-${contrato.folio}-${String(estimacion.numero).padStart(2, "0")}`,
  };
}

/** Estimaciones que esperan la autorización de la PMO. */
export function estimacionesPorAutorizar(
  estimaciones: readonly EstimacionObra[],
): EstimacionObra[] {
  return estimaciones.filter((e) => e.estado === "VALIDADA_SUPERVISOR");
}
