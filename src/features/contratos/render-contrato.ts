import type { Machote, VariableMachote } from "@/data/machote";
import {
  diasEntre,
  type Contrato,
  type Cotizacion,
  type Local,
  type Plaza,
} from "@/domain";
import { describirIncremento } from "@/features/plaza/resumen";
import { formatFecha, formatMoneda, formatNumero, montoEnLetra } from "@/lib/format";

/** RFC genérico del SAT para público en general: la demo no captura el RFC real. */
export const RFC_DEMO = "XAXX010101000";

const ORDINALES = [
  "Primera",
  "Segunda",
  "Tercera",
  "Cuarta",
  "Quinta",
  "Sexta",
  "Séptima",
  "Octava",
  "Novena",
  "Décima",
  "Décima primera",
  "Décima segunda",
  "Décima tercera",
  "Décima cuarta",
  "Décima quinta",
] as const;

export interface ClausulaRenderizada {
  /** "Primera", "Segunda"… */
  ordinal: string;
  titulo: string;
  texto: string;
}

export interface ContratoRenderizado {
  folio: string;
  titulo: string;
  proemio: string;
  clausulas: ClausulaRenderizada[];
  firmas: { rol: string; nombre: string }[];
}

function sustituir(texto: string, valores: Record<VariableMachote, string>): string {
  return texto.replace(/\{(\w+)\}/g, (completo, nombre: string) =>
    nombre in valores ? valores[nombre as VariableMachote] : completo,
  );
}

/**
 * Redacta el contrato a partir del machote. Función pura: la única fuente del
 * texto, tanto para la vista previa como para la vista imprimible.
 */
export function renderContrato(
  machote: Machote,
  contrato: Contrato,
  cotizacion: Cotizacion | undefined,
  local: Local,
  plaza: Plaza,
  locatario: string,
): ContratoRenderizado {
  const folio = contrato.folio ?? contrato.id;
  const plazoMeses =
    cotizacion?.plazoMeses ??
    Math.round(diasEntre(contrato.inicio, contrato.fin) / 30.4375);
  const regla = cotizacion?.reglaPactada ?? local.regla;
  const valores: Record<VariableMachote, string> = {
    arrendatario: locatario,
    rfc: RFC_DEMO,
    local: local.codigo,
    plaza: plaza.nombre,
    m2: formatNumero(local.areaM2),
    rentaMensual: formatMoneda(contrato.rentaMensual),
    rentaLetra: montoEnLetra(contrato.rentaMensual),
    plazoMeses: formatNumero(plazoMeses),
    inicio: formatFecha(contrato.inicio),
    fin: formatFecha(contrato.fin),
    deposito: formatMoneda(contrato.rentaMensual * (cotizacion?.depositoMeses ?? 1)),
    mesesGracia: formatNumero(cotizacion?.mesesGracia ?? 0),
    regla: describirIncremento(regla),
    folio,
  };
  const r = (t: string) => sustituir(t, valores);
  return {
    folio,
    titulo: r(machote.titulo),
    proemio: r(machote.proemio),
    clausulas: machote.clausulas.map((c, i) => ({
      ordinal: ORDINALES[i] ?? `Cláusula ${i + 1}`,
      titulo: r(c.titulo),
      texto: r(c.texto),
    })),
    firmas: machote.firmas.map((f) => ({ rol: f.rol, nombre: r(f.nombre) })),
  };
}
