import {
  erroresRonda,
  errorAdjudicacion,
  errorDescarte,
  type EntradaRonda,
  type ErroresRonda,
  type Licitacion,
} from "@/domain";

/** Lo que escribe la PMO por proveedor: un monto tal cual lo tecleó y si no respondió. */
export interface CapturaProveedor {
  texto: string;
  noRespondio: boolean;
}

export type CapturaRonda = Readonly<Record<string, CapturaProveedor>>;

/** Monto tecleado ("1,250,000" o "$ 1250000"); vacío = sin capturar; ilegible = `NaN`. */
function montoDeTexto(texto: string): number | undefined {
  const limpio = texto.replace(/[\s$,]/g, "");
  return limpio === "" ? undefined : Number(limpio);
}

/** Convierte lo tecleado en la entrada que entiende el dominio. */
export function entradaDeRonda(
  participantes: readonly string[],
  captura: CapturaRonda,
): EntradaRonda {
  const entrada: Record<string, number | null> = {};
  for (const id of participantes) {
    const campo = captura[id];
    if (campo?.noRespondio) {
      entrada[id] = null;
      continue;
    }
    const monto = campo ? montoDeTexto(campo.texto) : undefined;
    if (monto !== undefined) entrada[id] = monto;
  }
  return entrada;
}

/** Errores de la captura: las reglas son las de `domain/licitacion.ts`, aquí solo se traduce la entrada. */
export function validarRonda(
  licitacion: Licitacion,
  participantes: readonly string[],
  captura: CapturaRonda,
): ErroresRonda {
  return erroresRonda(licitacion, entradaDeRonda(participantes, captura));
}

export function validarDescarte(
  licitacion: Licitacion,
  proveedorId: string,
  motivo: string,
): string | undefined {
  return errorDescarte(licitacion, proveedorId, motivo);
}

export function validarAdjudicacion(
  licitacion: Licitacion,
  ganadorId: string,
  motivo: string,
): string | undefined {
  return errorAdjudicacion(licitacion, ganadorId, motivo);
}
