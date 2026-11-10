import { INPC_ANUAL } from "./inpc";
import { añosHastaFecha, repricingAlLiberar, type ResultadoRepricing } from "./precios";
import type {
  Contrato,
  FechaISO,
  Local,
  ReglaActualizacion,
  RegistroPrecio,
} from "./tipos";

/** Prefijo del motivo de los registros de historial que deja una liberación. */
export const MOTIVO_REPRICING_LIBERAR = "Repricing al liberar";

/** Incremento de la regla sin su calendario: "INPC + 2 pts". */
export function textoReglaCorto(regla: ReglaActualizacion): string {
  switch (regla.tipo) {
    case "INPC":
      return "INPC";
    case "INPC_PTS": {
      const pts = regla.puntos ?? 0;
      return `INPC + ${pts} pt${pts === 1 ? "" : "s"}`;
    }
    case "VALOR_FIJO":
      return `valor fijo ${regla.porcentajeFijo ?? 0}%`;
  }
}

/** Qué cambia al liberar un local: terminación del contrato y repricing por los años transcurridos. */
export interface Liberacion {
  contratoId: string;
  localId: string;
  fecha: FechaISO;
  motivo: string;
  /** Años aplicados (vacío si el último precio ya es del año de la liberación). */
  años: number[];
  /** Texto de la regla aplicada, p. ej. "INPC + 2 pts". */
  textoRegla: string;
  precioAnterior: number;
  minimoAnterior: number;
  precioNuevo: number;
  minimoNuevo: number;
  /** Registros que se agregan al historial del local (LISTA y MINIMO); vacío si nada cambia. */
  registros: RegistroPrecio[];
}

export type ResultadoLiberacion =
  { ok: true; liberacion: Liberacion } | { ok: false; error: string };

/**
 * Vista previa y cálculo de la liberación. Reutiliza `repricingAlLiberar`: es el
 * mismo cálculo de la tabla de repricing y de la bandeja anual, con otro disparador.
 * El precio nuevo nunca queda bajo el mínimo nuevo. Un año sin INPC se devuelve como
 * error controlado, no como excepción.
 */
export function liberarLocal(
  local: Local,
  contrato: Contrato,
  fecha: FechaISO,
  motivo: string,
  inpcPorAño: Readonly<Record<number, number>> = INPC_ANUAL,
): ResultadoLiberacion {
  if (contrato.localId !== local.id) {
    return { ok: false, error: "El contrato no corresponde a este local." };
  }
  if (contrato.estado !== "VIGENTE") {
    return { ok: false, error: "Solo se libera un local con contrato vigente." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha < contrato.inicio) {
    return {
      ok: false,
      error: "La fecha de terminación debe ser posterior al inicio del contrato.",
    };
  }
  if (motivo.trim() === "") {
    return { ok: false, error: "Captura el motivo de la terminación." };
  }

  const años = añosHastaFecha(local.historial, fecha);
  let resultado: ResultadoRepricing | null = null;
  try {
    resultado = repricingAlLiberar(
      local.historial,
      local.regla,
      años,
      inpcPorAño,
      local.precioMinimo,
    );
  } catch (e) {
    return {
      ok: false,
      error:
        e instanceof Error
          ? `${e.message}: no se puede calcular el repricing.`
          : "No se puede calcular el repricing.",
    };
  }

  const textoRegla = textoReglaCorto(local.regla);
  const repricing = resultado !== null && resultado.pasos.length > 0 ? resultado : null;
  const aplica = repricing !== null;
  const minimoNuevo = repricing ? repricing.minimoFinal : local.precioMinimo;
  const precioNuevo = repricing
    ? Math.max(repricing.precioFinal, minimoNuevo)
    : local.precioVigente;
  const origen = `${MOTIVO_REPRICING_LIBERAR} (regla ${textoRegla}, ${años.length} ${años.length === 1 ? "año" : "años"})`;
  const registros: RegistroPrecio[] = aplica
    ? [
        { fecha, precio: precioNuevo, motivo: origen, concepto: "LISTA" },
        { fecha, precio: minimoNuevo, motivo: origen, concepto: "MINIMO" },
      ]
    : [];

  return {
    ok: true,
    liberacion: {
      contratoId: contrato.id,
      localId: local.id,
      fecha,
      motivo: motivo.trim(),
      años: aplica ? años : [],
      textoRegla,
      precioAnterior: local.precioVigente,
      minimoAnterior: local.precioMinimo,
      precioNuevo,
      minimoNuevo,
      registros,
    },
  };
}
