import {
  impactoPlanExcepcion,
  rentasDeLocales,
  type Contrato,
  type ExcepcionPrecio,
  type FechaISO,
  type ImpactoPlanExcepcion,
  type Local,
} from "@/domain";

export interface ImpactoExcepcion {
  /** Renta mensual que se deja de cobrar frente al precio de lista. */
  diferenciaMensual: number;
  /** Diferencia acumulada durante todo el plazo de la cotización. */
  diferenciaVigencia: number;
  /** Diferencia de la renta ofrecida contra el mínimo autorizado (negativa si está por debajo). */
  diferenciaVsMinimo: number;
}

export function impactoExcepcion(
  excepcion: Pick<ExcepcionPrecio, "rentaSolicitada" | "precioMinimo">,
  precioLista: number,
  plazoMeses: number,
): ImpactoExcepcion {
  const diferenciaMensual = precioLista - excepcion.rentaSolicitada;
  return {
    diferenciaMensual,
    diferenciaVigencia: diferenciaMensual * plazoMeses,
    diferenciaVsMinimo: excepcion.rentaSolicitada - excepcion.precioMinimo,
  };
}

/** Vistas de la pestaña de excepciones: cada rol atiende la suya. */
export type VistaExcepciones = "POR_AUTORIZAR" | "POR_APLICAR" | "RESUELTAS";

/** Peso de orden: lo que espera a Dirección, luego lo que espera a la PMO, luego lo resuelto. */
const PESO_ESTADO: Record<ExcepcionPrecio["estado"], number> = {
  PENDIENTE: 0,
  AUTORIZADA_DIRECCION: 1,
  APLICADA: 2,
  RECHAZADA: 2,
};

/** Abiertas primero; dentro de cada grupo, el folio más reciente arriba. */
export function ordenarExcepciones(
  excepciones: readonly ExcepcionPrecio[],
): ExcepcionPrecio[] {
  return [...excepciones].sort(
    (a, b) => PESO_ESTADO[a.estado] - PESO_ESTADO[b.estado] || b.id.localeCompare(a.id),
  );
}

/** Excepciones que corresponden a una vista, ordenadas. */
export function excepcionesDeVista(
  excepciones: readonly ExcepcionPrecio[],
  vista: VistaExcepciones,
): ExcepcionPrecio[] {
  const estados: Record<VistaExcepciones, readonly ExcepcionPrecio["estado"][]> = {
    POR_AUTORIZAR: ["PENDIENTE"],
    POR_APLICAR: ["AUTORIZADA_DIRECCION"],
    RESUELTAS: ["APLICADA", "RECHAZADA"],
  };
  return ordenarExcepciones(excepciones.filter((e) => estados[vista].includes(e.estado)));
}

export interface EventoExcepcion {
  id: string;
  titulo: string;
  detalle?: string;
  fecha?: FechaISO;
  tono: "verde" | "naranja" | "coral" | "indigo";
}

/**
 * Línea de tiempo de una excepción: solicitó, autorizó (Dirección), aplicó
 * (PMO) o rechazó, con quién, cuándo y el comentario. La reutilizan el panel
 * de excepciones y la actividad de la cotización.
 */
export function eventosExcepcion(e: ExcepcionPrecio): EventoExcepcion[] {
  const eventos: EventoExcepcion[] = [
    {
      id: `${e.id}-solicitada`,
      titulo: `Excepción de precio solicitada por ${e.solicitadaPor}`,
      detalle: e.motivo,
      fecha: e.solicitadaEn,
      tono: "naranja",
    },
  ];
  if (e.autorizadaPor) {
    eventos.push({
      id: `${e.id}-autorizada`,
      titulo: `Autorizada por ${e.autorizadaPor} (Dirección)`,
      detalle: e.comentarioDireccion,
      fecha: e.autorizadaEn,
      tono: "indigo",
    });
  }
  if (e.aplicadaPor) {
    eventos.push({
      id: `${e.id}-aplicada`,
      titulo: `Aplicada por ${e.aplicadaPor} (PMO)`,
      detalle: e.comentarioPmo,
      fecha: e.aplicadaEn,
      tono: "verde",
    });
  }
  if (e.estado === "RECHAZADA") {
    // Rechaza Dirección si nunca la autorizó; si no, la PMO.
    const porDireccion = e.autorizadaPor === undefined;
    eventos.push({
      id: `${e.id}-rechazada`,
      titulo: `Rechazada por ${e.rechazadaPor ?? "—"} (${porDireccion ? "Dirección" : "PMO"})`,
      detalle: porDireccion ? e.comentarioDireccion : e.comentarioPmo,
      fecha: e.rechazadaEn,
      tono: "coral",
    });
  }
  return eventos;
}

/**
 * Qué pasa con el cumplimiento del plan de ingresos de la plaza si el local
 * de la excepción se renta a la renta solicitada. Los demás locales de la
 * plaza aportan su renta contratada vigente.
 */
export function simularExcepcion(
  excepcion: Pick<ExcepcionPrecio, "rentaSolicitada">,
  local: Pick<Local, "id" | "rentaPlaneada">,
  localesPlaza: readonly Local[],
  contratos: readonly Contrato[],
  metaPct: number,
  plazoMeses: number,
  hoy: FechaISO,
): ImpactoPlanExcepcion {
  const { ocupados } = rentasDeLocales(
    localesPlaza.filter((l) => l.id !== local.id),
    contratos,
    hoy,
  );
  return impactoPlanExcepcion(excepcion, local, ocupados, plazoMeses, metaPct);
}
