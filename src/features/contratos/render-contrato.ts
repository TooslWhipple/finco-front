import type { Machote, VariableMachote } from "@/data/machote";
import {
  ETIQUETA_DOCUMENTO,
  ETIQUETA_TIPO_PERSONA,
  diasEntre,
  type ContactoProspecto,
  type Contrato,
  type Cotizacion,
  type Local,
  type Plaza,
  type Prospecto,
  type TipoDocumentoProspecto,
} from "@/domain";
import { describirIncremento } from "@/features/plaza/resumen";
import { formatFecha, formatMoneda, formatNumero, montoEnLetra } from "@/lib/format";

/** RFC genérico del SAT para público en general: el contrato sin prospecto no tiene RFC real. */
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

/** Datos del arrendatario que trae el prospecto del que nació el contrato. */
export interface DatosArrendatario {
  rfc: string;
  /** "Persona moral" o "Persona física". */
  tipoPersona: string;
  contacto: ContactoProspecto;
  /** Documentos entregados, en el orden del catálogo, con su fecha de entrega. */
  documentos: { tipo: TipoDocumentoProspecto; etiqueta: string; entregadoEl: string }[];
}

export interface ContratoRenderizado {
  folio: string;
  titulo: string;
  proemio: string;
  /** Solo si el contrato nació de un prospecto. */
  arrendatario?: DatosArrendatario;
  clausulas: ClausulaRenderizada[];
  firmas: { rol: string; nombre: string }[];
}

const TIPOS_DOCUMENTO = Object.keys(ETIQUETA_DOCUMENTO) as TipoDocumentoProspecto[];

/** RFC, tipo de persona, contacto y documentos entregados del prospecto. */
export function datosArrendatario(prospecto: Prospecto): DatosArrendatario {
  return {
    rfc: prospecto.rfc,
    tipoPersona: ETIQUETA_TIPO_PERSONA[prospecto.tipoPersona],
    contacto: prospecto.contacto,
    documentos: TIPOS_DOCUMENTO.flatMap((tipo) => {
      const fecha = prospecto.documentos[tipo];
      return fecha
        ? [{ tipo, etiqueta: ETIQUETA_DOCUMENTO[tipo], entregadoEl: formatFecha(fecha) }]
        : [];
    }),
  };
}

function sustituir(texto: string, valores: Record<VariableMachote, string>): string {
  return texto.replace(/\{(\w+)\}/g, (completo, nombre: string) =>
    nombre in valores ? valores[nombre as VariableMachote] : completo,
  );
}

/**
 * Redacta el contrato a partir del machote. Función pura: la única fuente del
 * texto, tanto para la vista previa como para la vista imprimible. Con el
 * prospecto del que nació, imprime su RFC y el bloque del arrendatario.
 */
export function renderContrato(
  machote: Machote,
  contrato: Contrato,
  cotizacion: Cotizacion | undefined,
  local: Local,
  plaza: Plaza,
  locatario: string,
  prospecto?: Prospecto,
): ContratoRenderizado {
  const folio = contrato.folio ?? contrato.id;
  const plazoMeses =
    cotizacion?.plazoMeses ??
    Math.round(diasEntre(contrato.inicio, contrato.fin) / 30.4375);
  const regla = cotizacion?.reglaPactada ?? local.regla;
  const valores: Record<VariableMachote, string> = {
    arrendatario: locatario,
    rfc: prospecto?.rfc ?? RFC_DEMO,
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
    ...(prospecto ? { arrendatario: datosArrendatario(prospecto) } : {}),
    clausulas: machote.clausulas.map((c, i) => ({
      ordinal: ORDINALES[i] ?? `Cláusula ${i + 1}`,
      titulo: r(c.titulo),
      texto: r(c.texto),
    })),
    firmas: machote.firmas.map((f) => ({ rol: f.rol, nombre: r(f.nombre) })),
  };
}
