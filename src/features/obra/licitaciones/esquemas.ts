import {
  erroresCatalogo,
  erroresRespuesta,
  erroresRonda,
  errorAdjudicacion,
  errorDescarte,
  errorFechasContrato,
  sumarDias,
  type CanalAviso,
  type ConceptoLicitacion,
  type ContactoProveedor,
  type EntradaRonda,
  type ErroresCatalogo,
  type ErroresRespuesta,
  type ErroresRonda,
  type FechaISO,
  type FechasContrato,
  type Licitacion,
  type PrecioConcepto,
  type UnidadObra,
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

// --- licitación en línea -----------------------------------------------------

/** Dato del padrón que necesita cada canal para "enviar" la invitación. */
export const CONTACTO_DEL_CANAL: Readonly<
  Record<CanalAviso, keyof Pick<ContactoProveedor, "whatsapp" | "correo">>
> = {
  WHATSAPP: "whatsapp",
  CORREO: "correo",
};

const SIN_CONTACTO: Readonly<Record<CanalAviso, string>> = {
  WHATSAPP: "Sin WhatsApp en el padrón",
  CORREO: "Sin correo en el padrón",
};

/** Motivo por el que no se puede invitar por ese canal; `undefined` si tiene el dato. */
export function motivoSinContacto(
  contacto: ContactoProveedor | undefined,
  canal: CanalAviso,
): string | undefined {
  return contacto && contacto[CONTACTO_DEL_CANAL[canal]] !== ""
    ? undefined
    : SIN_CONTACTO[canal];
}

/** Precio unitario tecleado por concepto, tal cual lo escribió quien captura. */
export type CapturaPrecios = Readonly<Record<string, string>>;

/** La captura inicial a partir de una respuesta previa (para corregirla). */
export function capturaDePrecios(
  precios: readonly PrecioConcepto[] | undefined,
): CapturaPrecios {
  return Object.fromEntries(
    (precios ?? []).map((p) => [p.conceptoId, String(p.precioUnitario)]),
  );
}

/** Traduce lo tecleado a precios del dominio; los vacíos se omiten y los ilegibles quedan `NaN`. */
export function preciosDeCaptura(
  conceptos: readonly ConceptoLicitacion[],
  captura: CapturaPrecios,
): PrecioConcepto[] {
  return conceptos.flatMap((c) => {
    const precio = montoDeTexto(captura[c.id] ?? "");
    return precio === undefined ? [] : [{ conceptoId: c.id, precioUnitario: precio }];
  });
}

/** Errores de la respuesta: las reglas son las de `domain/licitacion.ts`. */
export function validarRespuesta(
  licitacion: Licitacion,
  proveedorId: string,
  captura: CapturaPrecios,
): ErroresRespuesta {
  return erroresRespuesta(
    licitacion,
    proveedorId,
    preciosDeCaptura(licitacion.conceptos, captura),
  );
}

/** Un renglón del editor de catálogo: el volumen se teclea como texto. */
export interface CapturaConcepto {
  id: string;
  clave: string;
  descripcion: string;
  unidad: UnidadObra;
  volumen: string;
}

export function capturaDeCatalogo(
  conceptos: readonly ConceptoLicitacion[],
): CapturaConcepto[] {
  return conceptos.map((c) => ({ ...c, volumen: String(c.volumen) }));
}

export function catalogoDeCaptura(
  captura: readonly CapturaConcepto[],
): ConceptoLicitacion[] {
  return captura.map((c) => ({ ...c, volumen: montoDeTexto(c.volumen) ?? Number.NaN }));
}

export function validarCatalogo(
  licitacion: Licitacion,
  captura: readonly CapturaConcepto[],
): ErroresCatalogo {
  return erroresCatalogo(licitacion, catalogoDeCaptura(captura));
}

/** Id del siguiente concepto: `${licitacionId}-k${n}`, con `n` mayor que los existentes. */
export function siguienteIdConcepto(
  licitacionId: string,
  conceptos: readonly { id: string }[],
): string {
  const prefijo = `${licitacionId}-k`;
  const mayor = conceptos.reduce((max, c) => {
    const n = c.id.startsWith(prefijo) ? Number(c.id.slice(prefijo.length)) : 0;
    return Number.isInteger(n) && n > max ? n : max;
  }, 0);
  return `${prefijo}${mayor + 1}`;
}

/** Fechas que propone el diálogo de adjudicar: arranca en una semana y dura 16. */
export function fechasPropuestas(hoy: FechaISO): FechasContrato {
  const inicioPlan = sumarDias(hoy, 7);
  return { inicioPlan, finPlan: sumarDias(inicioPlan, 16 * 7) };
}

export function validarFechasContrato(
  fechas: FechasContrato,
  hoy: FechaISO,
): string | undefined {
  return errorFechasContrato(fechas, hoy);
}
