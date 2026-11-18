import { diasEntre } from "./fechas";
import type {
  EtapaProspecto,
  ExpedienteProspecto,
  FechaISO,
  OrigenProspecto,
  Prospecto,
  TipoDocumentoProspecto,
  TipoPersona,
} from "./tipos";

/** Etapas del embudo en orden; `PERDIDO` queda fuera del avance. */
export const ETAPAS_PROSPECTO: readonly EtapaProspecto[] = [
  "NUEVO",
  "CONTACTADO",
  "VISITA",
  "COTIZADO",
  "NEGOCIACION",
  "GANADO",
  "PERDIDO",
];

export const ETIQUETA_ETAPA_PROSPECTO: Readonly<Record<EtapaProspecto, string>> = {
  NUEVO: "Nuevo",
  CONTACTADO: "Contactado",
  VISITA: "Visita",
  COTIZADO: "Cotizado",
  NEGOCIACION: "Negociación",
  GANADO: "Ganado",
  PERDIDO: "Perdido",
};

export const ETIQUETA_ORIGEN_PROSPECTO: Readonly<Record<OrigenProspecto, string>> = {
  REFERIDO: "Referido",
  SITIO_WEB: "Sitio web",
  LLAMADA: "Llamada",
  REDES: "Redes sociales",
  BROKER: "Broker",
  EVENTO: "Evento",
};

export const ORIGENES_PROSPECTO = Object.keys(
  ETIQUETA_ORIGEN_PROSPECTO,
) as readonly OrigenProspecto[];

export const ETIQUETA_TIPO_PERSONA: Readonly<Record<TipoPersona, string>> = {
  MORAL: "Persona moral",
  FISICA: "Persona física",
};

export const TIPOS_PERSONA = Object.keys(ETIQUETA_TIPO_PERSONA) as readonly TipoPersona[];

export const ETIQUETA_DOCUMENTO: Readonly<Record<TipoDocumentoProspecto, string>> = {
  IDENTIFICACION: "Identificación oficial",
  CONSTANCIA_FISCAL: "Constancia de situación fiscal",
  COMPROBANTE_DOMICILIO: "Comprobante de domicilio",
  ACTA_CONSTITUTIVA: "Acta constitutiva",
  PODER_REPRESENTANTE: "Poder del representante legal",
};

const DOCUMENTOS_PERSONA_FISICA: readonly TipoDocumentoProspecto[] = [
  "IDENTIFICACION",
  "CONSTANCIA_FISCAL",
  "COMPROBANTE_DOMICILIO",
];

/** Documentos que exige el expediente según el tipo de persona, en orden de captura. */
export const DOCUMENTOS_REQUERIDOS: Readonly<
  Record<TipoPersona, readonly TipoDocumentoProspecto[]>
> = {
  FISICA: DOCUMENTOS_PERSONA_FISICA,
  MORAL: [...DOCUMENTOS_PERSONA_FISICA, "ACTA_CONSTITUTIVA", "PODER_REPRESENTANTE"],
};

/** Largo del RFC de cada tipo de persona: 12 caracteres la moral y 13 la física. */
export const LARGO_RFC_POR_TIPO: Readonly<Record<TipoPersona, number>> = {
  MORAL: 12,
  FISICA: 13,
};

/**
 * Tipo de persona que corresponde a un RFC ya válido: el largo de la física es
 * persona física y cualquier otro (el de la moral en un RFC válido) es moral.
 */
export function tipoPersonaDeRfc(rfc: string): TipoPersona {
  return rfc.length === LARGO_RFC_POR_TIPO.FISICA ? "FISICA" : "MORAL";
}

/** Documentos requeridos que aún no se entregan, en el orden de `DOCUMENTOS_REQUERIDOS`. */
export function documentosFaltantes(
  expediente: ExpedienteProspecto,
): TipoDocumentoProspecto[] {
  return DOCUMENTOS_REQUERIDOS[expediente.tipoPersona].filter(
    (tipo) => !expediente.documentos[tipo],
  );
}

/** El expediente está completo cuando no falta ningún documento requerido. */
export function expedienteCompleto(expediente: ExpedienteProspecto): boolean {
  return documentosFaltantes(expediente).length === 0;
}

/** Un prospecto sigue vivo mientras no se gane ni se pierda. */
export function prospectoActivo(prospecto: Prospecto): boolean {
  return prospecto.etapa !== "GANADO" && prospecto.etapa !== "PERDIDO";
}

/** Etapa a la que avanza un prospecto vivo; `null` si ya se ganó o se perdió. */
export function siguienteEtapaProspecto(etapa: EtapaProspecto): EtapaProspecto | null {
  if (etapa === "GANADO" || etapa === "PERDIDO") return null;
  return ETAPAS_PROSPECTO[ETAPAS_PROSPECTO.indexOf(etapa) + 1] ?? null;
}

export interface PasoEmbudo {
  etapa: EtapaProspecto;
  cantidad: number;
  /** Fracción respecto del total de prospectos (0-1). */
  proporcion: number;
}

/** Cuántos prospectos hay en cada etapa, en el orden del embudo (con ceros). */
export function embudoProspectos(prospectos: readonly Prospecto[]): PasoEmbudo[] {
  const total = prospectos.length;
  return ETAPAS_PROSPECTO.map((etapa) => {
    const cantidad = prospectos.filter((p) => p.etapa === etapa).length;
    return { etapa, cantidad, proporcion: total === 0 ? 0 : cantidad / total };
  });
}

/** Prospectos activos con interés en cada local (solo aparecen los locales con alguno). */
export function prospectosPorLocal(
  prospectos: readonly Prospecto[],
): Map<string, Prospecto[]> {
  const porLocal = new Map<string, Prospecto[]>();
  for (const prospecto of prospectos.filter(prospectoActivo)) {
    for (const localId of prospecto.localIds) {
      const lista = porLocal.get(localId);
      if (lista) lista.push(prospecto);
      else porLocal.set(localId, [prospecto]);
    }
  }
  return porLocal;
}

/** Id (`pro-NNN`) del siguiente prospecto: continúa tras el mayor existente. */
export function siguienteIdProspecto(prospectos: readonly Prospecto[]): string {
  const mayor = prospectos.reduce((max, p) => {
    const numero = Number(p.id.replace(/^pro-/, ""));
    return Number.isFinite(numero) ? Math.max(max, numero) : max;
  }, 0);
  return `pro-${String(mayor + 1).padStart(3, "0")}`;
}

/** Días sin contacto a partir de los cuales un prospecto vivo se enfría. */
export const DIAS_TIBIO = 15;
export const DIAS_FRIO = 30;

export type TemperaturaProspecto = "AL_DIA" | "TIBIO" | "FRIO";

export const ETIQUETA_TEMPERATURA_PROSPECTO: Readonly<
  Record<TemperaturaProspecto, string>
> = {
  AL_DIA: "Al día",
  TIBIO: "Tibio",
  FRIO: "Frío",
};

/** Fecha del hecho más reciente del prospecto: su última actividad o, sin actividad, el alta. */
export function fechaUltimoHecho(prospecto: Prospecto): FechaISO {
  return prospecto.actividad.reduce(
    (max, a) => (a.fecha > max ? a.fecha : max),
    prospecto.creadoEl,
  );
}

/**
 * Días desde el último contacto (`fechaUltimoHecho`). `null` si el prospecto ya
 * se ganó o se perdió.
 */
export function diasSinContacto(prospecto: Prospecto, hoy: FechaISO): number | null {
  if (!prospectoActivo(prospecto)) return null;
  return Math.max(0, diasEntre(fechaUltimoHecho(prospecto), hoy));
}

/** Tibio desde 15 días sin contacto y frío desde 30; `null` si no aplica. */
export function temperaturaProspecto(dias: number | null): TemperaturaProspecto | null {
  if (dias === null) return null;
  if (dias >= DIAS_FRIO) return "FRIO";
  if (dias >= DIAS_TIBIO) return "TIBIO";
  return "AL_DIA";
}

export type TipoContactoProspecto = "LLAMADA" | "WHATSAPP" | "VISITA" | "CORREO";

export const ETIQUETA_TIPO_CONTACTO: Readonly<Record<TipoContactoProspecto, string>> = {
  LLAMADA: "Llamada",
  WHATSAPP: "WhatsApp",
  VISITA: "Visita",
  CORREO: "Correo",
};

export const TIPOS_CONTACTO = Object.keys(
  ETIQUETA_TIPO_CONTACTO,
) as readonly TipoContactoProspecto[];
