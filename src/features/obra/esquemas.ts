import {
  erroresCorte,
  erroresEstimacion,
  type ContratoObra,
  type CorteSemanal,
  type EntradaCorte,
  type EntradaEstimacion,
  type ErroresCorte,
  type ErroresEstimacion,
  type EstimacionObra,
  type FechaISO,
} from "@/domain";

/** Lo que escribe el Supervisor: un texto por concepto, tal cual lo tecleó. */
export type VolumenesTexto = Readonly<Record<string, string>>;

/** Texto vacío = 0; un texto que no es número se conserva como `NaN` para que falle la validación. */
function volumenDeTexto(texto: string | undefined): number {
  return texto === undefined || texto.trim() === "" ? 0 : Number(texto);
}

/** Convierte lo tecleado en la entrada que entiende el dominio. */
export function entradaDeCaptura(
  contrato: ContratoObra,
  semana: FechaISO,
  textos: VolumenesTexto,
): EntradaCorte {
  return {
    contratoObraId: contrato.id,
    semana,
    volumenes: contrato.conceptos.map((c) => ({
      conceptoId: c.id,
      volumen: volumenDeTexto(textos[c.id]),
    })),
  };
}

/** Errores de la captura: las reglas son las de `domain/obra.ts`, aquí solo se traduce la entrada. */
export function validarCaptura(
  contrato: ContratoObra,
  cortes: readonly CorteSemanal[],
  semana: FechaISO,
  textos: VolumenesTexto,
): ErroresCorte {
  return erroresCorte(contrato, cortes, entradaDeCaptura(contrato, semana, textos));
}

/** Un corte rechazado exige explicar por qué. */
export function errorComentarioRechazo(comentario: string): string | undefined {
  return comentario.trim() === "" ? "Escribe el motivo del rechazo." : undefined;
}

/** Convierte lo tecleado en la estimación que entiende el dominio. */
export function entradaDeEstimacion(
  contrato: ContratoObra,
  textos: VolumenesTexto,
): EntradaEstimacion {
  return {
    contratoObraId: contrato.id,
    volumenes: contrato.conceptos.map((c) => ({
      conceptoId: c.id,
      volumen: volumenDeTexto(textos[c.id]),
    })),
  };
}

/** Errores de la estimación: la regla (no pasar de lo validado en cortes) vive en `domain/estimaciones.ts`. */
export function validarEstimacion(
  contrato: ContratoObra,
  cortes: readonly CorteSemanal[],
  estimaciones: readonly EstimacionObra[],
  textos: VolumenesTexto,
): ErroresEstimacion {
  return erroresEstimacion(
    contrato,
    cortes,
    estimaciones,
    entradaDeEstimacion(contrato, textos),
  );
}
