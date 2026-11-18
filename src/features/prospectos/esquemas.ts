import { z } from "zod";
import {
  ETIQUETA_ORIGEN_PROSPECTO,
  ETIQUETA_TIPO_PERSONA,
  LARGO_RFC_POR_TIPO,
  ORIGENES_PROSPECTO,
  TIPOS_PERSONA,
  tipoPersonaDeRfc,
  type Campana,
  type FechaISO,
  type Prospecto,
} from "@/domain";
import { MENSAJE_RFC_INVALIDO, RFC } from "@/lib/rfc";

export const esquemaNuevoProspecto = z
  .object({
    nombre: z.string().trim().min(3, "Captura la razón social o el nombre"),
    rfc: z
      .string()
      .trim()
      .transform((v) => v.toUpperCase())
      .pipe(z.string().regex(RFC, MENSAJE_RFC_INVALIDO)),
    giro: z.string().trim().min(3, "Captura el giro del negocio"),
    contactoNombre: z.string().trim().min(3, "Captura el nombre del contacto"),
    telefono: z
      .string()
      .trim()
      .refine((v) => v.replace(/\D/g, "").length === 10, "Captura 10 dígitos"),
    correo: z.string().trim().pipe(z.email("Correo inválido")),
    origen: z.enum(ORIGENES_PROSPECTO, {
      error: "Elige el origen",
    }),
    /** Campaña de la que llegó; `""` es "Sin campaña". */
    campanaId: z.string().optional(),
    tipoPersona: z.enum(TIPOS_PERSONA, { error: "Elige el tipo de persona" }),
    plazaId: z.string().min(1, "Elige una plaza"),
    localId: z.string().min(1, "Elige un local de interés"),
    avalRegistrado: z.boolean(),
  })
  .superRefine((v, ctx) => {
    // `rfc` ya pasó el patrón: su largo distingue persona moral de física.
    if (tipoPersonaDeRfc(v.rfc) !== v.tipoPersona) {
      ctx.addIssue({
        code: "custom",
        path: ["rfc"],
        message: `El RFC de ${ETIQUETA_TIPO_PERSONA[v.tipoPersona].toLowerCase()} lleva ${LARGO_RFC_POR_TIPO[v.tipoPersona]} caracteres`,
      });
    }
  });

export type NuevoProspectoFormulario = z.input<typeof esquemaNuevoProspecto>;
export type NuevoProspectoValidado = z.output<typeof esquemaNuevoProspecto>;

export const OPCIONES_ORIGEN = ORIGENES_PROSPECTO.map((valor) => ({
  valor,
  etiqueta: ETIQUETA_ORIGEN_PROSPECTO[valor],
}));

export const OPCIONES_TIPO_PERSONA = TIPOS_PERSONA.map((valor) => ({
  valor,
  etiqueta: ETIQUETA_TIPO_PERSONA[valor],
}));

/**
 * Prospecto recién capturado: entra al embudo en `NUEVO` con su alta en la
 * actividad y el expediente vacío (los documentos se marcan en su detalle).
 * Con `campana`, el origen es su canal (se ignora el del formulario) y el
 * prospecto queda ligado a ella; sin ella, conserva el origen elegido.
 */
export function prospectoDesdeFormulario(
  v: NuevoProspectoValidado,
  id: string,
  hoy: FechaISO,
  vendedorId: string,
  campana?: Pick<Campana, "id" | "canal">,
): Prospecto {
  const origen = campana?.canal ?? v.origen;
  return {
    id,
    nombre: v.nombre,
    rfc: v.rfc,
    tipoPersona: v.tipoPersona,
    documentos: {},
    giro: v.giro,
    contacto: { nombre: v.contactoNombre, telefono: v.telefono, correo: v.correo },
    origen,
    ...(campana ? { campanaId: campana.id } : {}),
    etapa: "NUEVO",
    localIds: [v.localId],
    aval: v.avalRegistrado ? "Aval solidario registrado" : undefined,
    creadoEl: hoy,
    vendedorId,
    actividad: [
      {
        id: "alta",
        titulo: `Alta del prospecto (${ETIQUETA_ORIGEN_PROSPECTO[origen].toLowerCase()})`,
        fecha: hoy,
      },
    ],
  };
}
