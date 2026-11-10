import type { Estatus, TonoChip } from "@/components/shared";
import {
  calcularImportes,
  volumenPorEstimar,
  type ConceptoObra,
  type ContratoObra,
  type CorteSemanal,
  type EstadoEstimacion,
  type EstimacionObra,
  type FechaISO,
} from "@/domain";

/** Etiqueta del estado de una estimación y el estatus de `StatusChip` que le da el color. */
export const ESTADO_ESTIMACION: Readonly<
  Record<EstadoEstimacion, { etiqueta: string; estatus: Estatus }>
> = {
  REGISTRADA: { etiqueta: "Registrada", estatus: "BORRADOR" },
  VALIDADA_SUPERVISOR: { etiqueta: "Por autorizar", estatus: "PENDIENTE" },
  AUTORIZADA_PMO: { etiqueta: "Autorizada", estatus: "APROBADO" },
  RECHAZADA: { etiqueta: "Rechazada", estatus: "RECHAZADA" },
};

export type FiltroEstimaciones = "TODAS" | "POR_AUTORIZAR" | "AUTORIZADAS" | "RECHAZADAS";

const ESTADOS_DEL_FILTRO: Readonly<
  Record<FiltroEstimaciones, readonly EstadoEstimacion[] | null>
> = {
  TODAS: null,
  POR_AUTORIZAR: ["REGISTRADA", "VALIDADA_SUPERVISOR"],
  AUTORIZADAS: ["AUTORIZADA_PMO"],
  RECHAZADAS: ["RECHAZADA"],
};

export const OPCIONES_FILTRO_ESTIMACIONES: readonly {
  valor: FiltroEstimaciones;
  etiqueta: string;
}[] = [
  { valor: "TODAS", etiqueta: "Todas" },
  { valor: "POR_AUTORIZAR", etiqueta: "Por autorizar" },
  { valor: "AUTORIZADAS", etiqueta: "Autorizadas" },
  { valor: "RECHAZADAS", etiqueta: "Rechazadas" },
];

export function filtrarEstimaciones(
  estimaciones: readonly EstimacionObra[],
  filtro: FiltroEstimaciones,
): EstimacionObra[] {
  const estados = ESTADOS_DEL_FILTRO[filtro];
  return estados
    ? estimaciones.filter((e) => estados.includes(e.estado))
    : [...estimaciones];
}

export interface FilaEstimacion {
  estimacion: EstimacionObra;
  contrato: ContratoObra;
}

/** Filas de la tabla, de la más reciente a la más antigua. */
export function filasEstimaciones(
  estimaciones: readonly EstimacionObra[],
  contratos: readonly ContratoObra[],
): FilaEstimacion[] {
  return estimaciones
    .flatMap((estimacion) => {
      const contrato = contratos.find((c) => c.id === estimacion.contratoObraId);
      return contrato ? [{ estimacion, contrato }] : [];
    })
    .toSorted(
      (a, b) =>
        b.estimacion.registradaEn.localeCompare(a.estimacion.registradaEn) ||
        b.estimacion.id.localeCompare(a.estimacion.id),
    );
}

export interface FilaVolumenEstimacion {
  concepto: ConceptoObra;
  volumen: number;
  importe: number;
}

/** Volúmenes de la estimación con su importe (volumen × precio unitario). */
export function volumenesDeEstimacion(
  estimacion: EstimacionObra,
  contrato: ContratoObra,
): FilaVolumenEstimacion[] {
  return contrato.conceptos.flatMap((concepto) => {
    const volumen =
      estimacion.volumenes.find((v) => v.conceptoId === concepto.id)?.volumen ?? 0;
    return volumen > 0
      ? [{ concepto, volumen, importe: volumen * concepto.precioUnitario }]
      : [];
  });
}

/** Contratos con volumen validado en cortes que todavía no se ha estimado. */
export function contratosEstimables(
  contratos: readonly ContratoObra[],
  cortes: readonly CorteSemanal[],
  estimaciones: readonly EstimacionObra[],
): ContratoObra[] {
  return contratos.filter((c) =>
    Object.values(volumenPorEstimar(c, cortes, estimaciones)).some((v) => v > 1e-9),
  );
}

export interface FilaCapturaEstimacion {
  concepto: ConceptoObra;
  /** Volumen validado en cortes que aún no está en ninguna estimación viva. */
  porEstimar: number;
}

export interface ResumenCapturaEstimacion {
  filas: FilaCapturaEstimacion[];
  importes: ReturnType<typeof calcularImportes>;
}

/** Tabla de captura de una estimación y su desglose en vivo, con lo que se lleva tecleado. */
export function resumenCapturaEstimacion(
  contrato: ContratoObra,
  cortes: readonly CorteSemanal[],
  estimaciones: readonly EstimacionObra[],
  volumenes: readonly { conceptoId: string; volumen: number }[],
): ResumenCapturaEstimacion {
  const disponible = volumenPorEstimar(contrato, cortes, estimaciones);
  return {
    filas: contrato.conceptos.map((concepto) => ({
      concepto,
      porEstimar: disponible[concepto.id] ?? 0,
    })),
    importes: calcularImportes(contrato, volumenes, estimaciones),
  };
}

export interface EventoEstimacion {
  id: string;
  titulo: string;
  detalle?: string;
  fecha: FechaISO;
  tono: TonoChip;
}

/** Trazabilidad: el Supervisor registró y firmó; luego la PMO autorizó o rechazó. */
export function eventosDeEstimacion(estimacion: EstimacionObra): EventoEstimacion[] {
  const eventos: EventoEstimacion[] = [
    {
      id: "firma",
      titulo: `${estimacion.validadaPor ?? estimacion.registradaPor} registró y firmó`,
      fecha: estimacion.registradaEn,
      tono: "primario",
    },
  ];
  if (estimacion.resueltaEn && estimacion.autorizadaPor) {
    const autorizada = estimacion.estado === "AUTORIZADA_PMO";
    eventos.push({
      id: "resolucion",
      titulo: `${estimacion.autorizadaPor} ${autorizada ? "autorizó el pago" : "rechazó"}`,
      detalle: estimacion.comentario,
      fecha: estimacion.resueltaEn,
      tono: autorizada ? "verde" : "coral",
    });
  }
  return eventos;
}
