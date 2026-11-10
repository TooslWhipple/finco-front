import {
  añosHastaFecha,
  DEMO_TODAY,
  mismoIncremento,
  ultimoRegistroPrecio,
  type FechaISO,
  type Local,
  type ReglaActualizacion,
  type RegistroPrecio,
  type TipoRegla,
} from "@/domain";
import type { TonoChip } from "@/components/shared";
import type { EntradaBitacora } from "@/store/reducers";

export interface MargenPrecio {
  /** Lista menos mínimo, en pesos. */
  monto: number;
  /** Margen sobre el mínimo (fracción 0-1). */
  fraccion: number;
  /** Margen sobre el precio de lista (fracción 0-1): lo que Ventas puede negociar. */
  fraccionSobreLista: number;
}

export function margenSobreMinimo(
  local: Pick<Local, "precioVigente" | "precioMinimo">,
): MargenPrecio {
  const monto = local.precioVigente - local.precioMinimo;
  return {
    monto,
    fraccion: local.precioMinimo === 0 ? 0 : monto / local.precioMinimo,
    fraccionSobreLista: local.precioVigente === 0 ? 0 : monto / local.precioVigente,
  };
}

/** Fondo típico de un local (m); con él el frente sale del área: 62 m² → 5.2 m. */
const FONDO_TIPICO_M = 12;

export function frenteLocalM(areaM2: number): number {
  return Math.round((areaM2 / FONDO_TIPICO_M) * 10) / 10;
}

const unDecimal = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

/** Porcentaje en puntos con un decimal ("7.8%"), como lo muestra la guía. */
export function formatPuntosUnDecimal(valor: number): string {
  return `${unDecimal.format(valor)}%`;
}

/** Fecha de la última edición del mínimo autorizado hecha en la demo, o `null` si no hay. */
export function fechaUltimaEdicionMinimo(
  bitacora: readonly EntradaBitacora[],
): FechaISO | null {
  const ediciones = bitacora.filter((b) => b.titulo.startsWith("Mínimo autorizado"));
  return ediciones.at(-1)?.fecha ?? null;
}

/** Valida el nuevo mínimo autorizado; devuelve el error o `null` si es válido. */
export function validarMinimo(valor: number, precioVigente: number): string | null {
  if (!Number.isFinite(valor) || !Number.isInteger(valor) || valor <= 0) {
    return "Captura un monto entero mayor a cero.";
  }
  if (valor > precioVigente) {
    return "El mínimo no puede superar el precio de lista.";
  }
  return null;
}

/** Año del último precio registrado (base del repricing), o `null` sin historial. */
export function añoBaseRepricing(historial: readonly RegistroPrecio[]): number | null {
  const ultimo = ultimoRegistroPrecio(historial, "LISTA");
  return ultimo ? Number(ultimo.fecha.slice(0, 4)) : null;
}

/** Años a repreciar: desde el siguiente al último precio del historial hasta el de `hoy`. */
export function añosRepricing(
  historial: readonly RegistroPrecio[],
  hoy: FechaISO = DEMO_TODAY,
): number[] {
  return añosHastaFecha(historial, hoy);
}

export function reglasIguales(a: ReglaActualizacion, b: ReglaActualizacion): boolean {
  return mismoIncremento(a, b) && a.cuando === b.cuando;
}

/** Regla con solo los parámetros que su tipo usa; al cambiar de tipo fija valores iniciales. */
export function reglaConTipo(
  regla: ReglaActualizacion,
  tipo: TipoRegla,
): ReglaActualizacion {
  const { cuando, modo } = regla;
  switch (tipo) {
    case "INPC":
      return { tipo, cuando, modo };
    case "INPC_PTS":
      return { tipo, puntos: regla.puntos ?? 1, cuando, modo };
    case "VALOR_FIJO":
      return { tipo, porcentajeFijo: regla.porcentajeFijo ?? 4, cuando, modo };
  }
}

export interface EntradaHistorial {
  id: string;
  titulo: string;
  detalle: string;
  fecha: FechaISO;
  tono: TonoChip;
}

/** Historial de cambios del local: precios registrados y ediciones hechas en la demo, lo más reciente primero. */
export function construirHistorial(
  historial: readonly RegistroPrecio[],
  bitacora: readonly EntradaBitacora[],
  formatearMonto: (monto: number) => string,
): EntradaHistorial[] {
  const precios: EntradaHistorial[] = [...historial]
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((r, i) => ({
      id: `precio-${i}`,
      titulo: `${r.concepto === "MINIMO" ? "Mínimo autorizado registrado" : "Precio registrado"}: ${formatearMonto(r.precio)}`,
      detalle: r.motivo,
      fecha: r.fecha,
      tono: "primario",
    }));
  const ediciones: EntradaHistorial[] = bitacora.map((b, i) => ({
    id: `bitacora-${i}`,
    titulo: b.titulo,
    detalle: `${b.detalle} · ${b.autor}`,
    fecha: b.fecha,
    tono: "naranja",
  }));
  // Orden estable: a igual fecha, lo agregado después queda arriba.
  return [...precios, ...ediciones]
    .map((e, orden) => ({ e, orden }))
    .sort((a, b) => b.e.fecha.localeCompare(a.e.fecha) || b.orden - a.orden)
    .map(({ e }) => e);
}
