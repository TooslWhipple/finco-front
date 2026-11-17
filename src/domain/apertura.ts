import type { Contrato, FechaISO } from "./tipos";

/**
 * Contrato vigente para la apertura: `VIGENTE` y con `inicio ≤ hoy ≤ fin`. Es una
 * regla propia: no es `contratoVigenteDe` (solo mira fechas) ni la de los reportes.
 */
export function contratoVigenteParaApertura(contrato: Contrato, hoy: FechaISO): boolean {
  return contrato.estado === "VIGENTE" && contrato.inicio <= hoy && hoy <= contrato.fin;
}

export type ResultadoValidacionApertura = { ok: true } | { ok: false; error: string };

/**
 * Valida que se pueda registrar la apertura del local del contrato en `fecha`: el
 * contrato está vigente, aún no tiene apertura y la fecha cae en `[inicio, hoy]`.
 */
export function validarApertura(
  contrato: Contrato,
  fecha: FechaISO,
  hoy: FechaISO,
): ResultadoValidacionApertura {
  if (!contratoVigenteParaApertura(contrato, hoy)) {
    return { ok: false, error: "Solo se registra la apertura de un contrato vigente." };
  }
  if (contrato.apertura) {
    return { ok: false, error: "La apertura de este local ya está registrada." };
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha < contrato.inicio) {
    return {
      ok: false,
      error: "La fecha de apertura no puede ser anterior al inicio del contrato.",
    };
  }
  if (fecha > hoy) {
    return { ok: false, error: "La fecha de apertura no puede ser futura." };
  }
  return { ok: true };
}
