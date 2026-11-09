import type {
  Estatus,
  EventoTimeline,
  PuntoLineas,
  SerieLineas,
  TonoKpi,
  TonoSerie,
} from "@/components/shared";
import {
  ahorroNegociacion,
  compararAdjudicadoContraBase,
  compararContraBase,
  mejorPropuestaPorRonda,
  montoEnRonda,
  proveedoresActivos,
  tasaRespuesta,
  type ComparacionBase,
  type EstadoLicitacion,
  type Licitacion,
  type ProveedorObra,
  type TasaRespuesta,
} from "@/domain";
import { formatFecha, formatMoneda, formatPorcentaje } from "@/lib/format";

/** Etiqueta del estado de una licitación y el estatus de `StatusChip` que le da el color. */
export const ESTADO_LICITACION: Readonly<
  Record<EstadoLicitacion, { etiqueta: string; estatus: Estatus }>
> = {
  EN_CURSO: { etiqueta: "En curso", estatus: "EN_CURSO" },
  ADJUDICADA: { etiqueta: "Adjudicada", estatus: "ADJUDICADA" },
};

export function nombreProveedor(
  proveedores: readonly ProveedorObra[],
  id: string,
): string {
  return proveedores.find((p) => p.id === id)?.nombre ?? id;
}

// --- lista ---------------------------------------------------------------

export interface FilaLicitacion {
  licitacion: Licitacion;
  respuesta: TasaRespuesta;
  ganador?: string;
  adjudicado?: number;
  ahorro?: number;
}

export function filasLicitaciones(
  licitaciones: readonly Licitacion[],
  proveedores: readonly ProveedorObra[],
): FilaLicitacion[] {
  return licitaciones.map((licitacion) => ({
    licitacion,
    respuesta: tasaRespuesta(licitacion),
    ganador: licitacion.ganadorId
      ? nombreProveedor(proveedores, licitacion.ganadorId)
      : undefined,
    adjudicado: licitacion.montoAdjudicado,
    ahorro: ahorroNegociacion(licitacion),
  }));
}

// --- detalle -------------------------------------------------------------

/** Qué se muestra en la celda de un proveedor en una ronda. */
export type CeldaRonda =
  | { tipo: "MONTO"; monto: number; esMejor: boolean }
  | { tipo: "SIN_RESPUESTA" }
  | { tipo: "DESCARTADO"; motivo: string }
  | { tipo: "FUERA" };

export interface FilaProveedor {
  proveedor: ProveedorObra;
  celdas: CeldaRonda[];
  esGanador: boolean;
}

/** Proveedores invitados × rondas, para la tabla del detalle. */
export function matrizProveedores(
  licitacion: Licitacion,
  proveedores: readonly ProveedorObra[],
): FilaProveedor[] {
  const mejores = mejorPropuestaPorRonda(licitacion);
  return licitacion.invitados.map((id) => {
    const descarte = licitacion.descartados.find((d) => d.proveedorId === id);
    const celdas = licitacion.rondas.map((ronda): CeldaRonda => {
      const propuesta = ronda.propuestas.find((p) => p.proveedorId === id);
      if (propuesta?.respondio && propuesta.monto !== undefined) {
        const mejor = mejores.find((m) => m.ronda === ronda.numero);
        return {
          tipo: "MONTO",
          monto: propuesta.monto,
          esMejor: mejor?.proveedorId === id,
        };
      }
      if (propuesta) return { tipo: "SIN_RESPUESTA" };
      if (descarte && descarte.ronda < ronda.numero) {
        return { tipo: "DESCARTADO", motivo: descarte.motivo };
      }
      return { tipo: "FUERA" };
    });
    return {
      proveedor: proveedores.find((p) => p.id === id) ?? {
        id,
        nombre: id,
        especialidades: [],
      },
      celdas,
      esGanador: licitacion.ganadorId === id,
    };
  });
}

const TONOS_PERDEDORES: readonly TonoSerie[] = ["primario", "naranja", "indigo", "coral"];

export interface DatosGrafica {
  datos: PuntoLineas[];
  series: SerieLineas[];
}

/** Evolución de cada proveedor que presentó propuesta, ronda por ronda. */
export function datosGraficaRondas(
  licitacion: Licitacion,
  proveedores: readonly ProveedorObra[],
): DatosGrafica {
  const ids = licitacion.invitados.filter((id) =>
    licitacion.rondas.some((r) => montoEnRonda(r, id) !== undefined),
  );
  const datos = licitacion.rondas.map((ronda) => {
    const punto: Record<string, string | number | null> = {
      ronda: `Ronda ${ronda.numero}`,
    };
    for (const id of ids) punto[id] = montoEnRonda(ronda, id) ?? null;
    return punto;
  });
  let siguienteTono = 0;
  const series = ids.map((id): SerieLineas => {
    const tono: TonoSerie =
      id === licitacion.ganadorId
        ? "verde"
        : TONOS_PERDEDORES[siguienteTono++ % TONOS_PERDEDORES.length];
    return { clave: id, etiqueta: nombreProveedor(proveedores, id), tono };
  });
  return { datos, series };
}

export interface ResumenLicitacion {
  respuesta: TasaRespuesta;
  /** Ahorro en negociación (adjudicada) o mejora de la mejor oferta entre la primera y la última ronda. */
  ahorro?: number;
  /** Monto de referencia contra el base: lo adjudicado o la mejor propuesta vigente. */
  montoReferencia?: number;
  contraBase?: ComparacionBase;
}

export function resumenLicitacion(licitacion: Licitacion): ResumenLicitacion {
  const mejores = mejorPropuestaPorRonda(licitacion);
  const primera = mejores[0];
  const ultima = mejores[mejores.length - 1];
  const montoReferencia = licitacion.montoAdjudicado ?? ultima?.monto;
  const ahorro =
    ahorroNegociacion(licitacion) ??
    (primera && ultima && licitacion.estado === "EN_CURSO"
      ? primera.monto - ultima.monto
      : undefined);
  return {
    respuesta: tasaRespuesta(licitacion),
    ahorro,
    montoReferencia,
    contraBase:
      compararAdjudicadoContraBase(licitacion) ??
      (montoReferencia === undefined
        ? undefined
        : compararContraBase(montoReferencia, licitacion.presupuestoBase)),
  };
}

/** Texto y tono de la diferencia contra el base: por debajo es a favor de compras. */
export function descripcionContraBase(comparacion: ComparacionBase): {
  texto: string;
  tono: TonoKpi;
} {
  const monto = formatMoneda(Math.abs(comparacion.diferencia));
  const pct = formatPorcentaje(Math.abs(comparacion.fraccion));
  if (comparacion.diferencia === 0)
    return { texto: "Igual al presupuesto base", tono: "neutro" };
  return comparacion.diferencia < 0
    ? { texto: `${monto} (${pct}) por debajo del base`, tono: "positivo" }
    : { texto: `${monto} (${pct}) por encima del base`, tono: "peligro" };
}

/** Del primer sobre a la adjudicación: rondas, descartes y decisión, en orden. */
export function eventosDecision(
  licitacion: Licitacion,
  proveedores: readonly ProveedorObra[],
): EventoTimeline[] {
  const eventos: EventoTimeline[] = [];
  const mejores = mejorPropuestaPorRonda(licitacion);
  for (const ronda of licitacion.rondas) {
    const mejor = mejores.find((m) => m.ronda === ronda.numero);
    const respondieron = ronda.propuestas.filter((p) => p.respondio).length;
    eventos.push({
      id: `ronda-${ronda.numero}`,
      titulo: `Ronda ${ronda.numero}: ${respondieron} de ${ronda.propuestas.length} respondieron`,
      detalle: mejor
        ? `Mejor propuesta: ${nombreProveedor(proveedores, mejor.proveedorId)}, ${formatMoneda(mejor.monto)}`
        : undefined,
      fecha: formatFecha(ronda.fecha),
      tono: "primario",
    });
    for (const d of licitacion.descartados.filter((x) => x.ronda === ronda.numero)) {
      eventos.push({
        id: `descarte-${d.proveedorId}`,
        titulo: `Descartado: ${nombreProveedor(proveedores, d.proveedorId)}`,
        detalle: d.motivo,
        tono: "coral",
      });
    }
  }
  if (licitacion.estado === "ADJUDICADA" && licitacion.ganadorId) {
    eventos.push({
      id: "adjudicacion",
      titulo: `Adjudicada a ${nombreProveedor(proveedores, licitacion.ganadorId)}${
        licitacion.montoAdjudicado !== undefined
          ? ` por ${formatMoneda(licitacion.montoAdjudicado)}`
          : ""
      }`,
      detalle: licitacion.motivoSeleccion,
      fecha: [
        licitacion.adjudicadaPor ? `Por ${licitacion.adjudicadaPor}` : null,
        licitacion.adjudicadaEn ? formatFecha(licitacion.adjudicadaEn) : null,
      ]
        .filter(Boolean)
        .join(" · "),
      tono: "verde",
    });
  }
  return eventos;
}

/** Participantes de la siguiente ronda o candidatos a ganar, con su última propuesta. */
export function candidatosAGanar(
  licitacion: Licitacion,
  proveedores: readonly ProveedorObra[],
): { id: string; nombre: string; monto: number }[] {
  const ultima = licitacion.rondas[licitacion.rondas.length - 1];
  if (!ultima) return [];
  return proveedoresActivos(licitacion).flatMap((id) => {
    const monto = montoEnRonda(ultima, id);
    return monto === undefined
      ? []
      : [{ id, nombre: nombreProveedor(proveedores, id), monto }];
  });
}
