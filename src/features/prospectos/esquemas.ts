import { z } from "zod";
import {
  ETIQUETA_ORIGEN_PROSPECTO,
  ORIGENES_PROSPECTO,
  type FechaISO,
  type Prospecto,
} from "@/domain";

const RFC = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;

export const esquemaNuevoProspecto = z.object({
  nombre: z.string().trim().min(3, "Captura la razón social o el nombre"),
  rfc: z
    .string()
    .trim()
    .transform((v) => v.toUpperCase())
    .pipe(z.string().regex(RFC, "RFC inválido: 12 o 13 caracteres")),
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
  plazaId: z.string().min(1, "Elige una plaza"),
  localId: z.string().min(1, "Elige un local de interés"),
  documentosCompletos: z.boolean(),
  avalRegistrado: z.boolean(),
});

export type NuevoProspectoFormulario = z.input<typeof esquemaNuevoProspecto>;
export type NuevoProspectoValidado = z.output<typeof esquemaNuevoProspecto>;

export const OPCIONES_ORIGEN = ORIGENES_PROSPECTO.map((valor) => ({
  valor,
  etiqueta: ETIQUETA_ORIGEN_PROSPECTO[valor],
}));

/** Prospecto recién capturado: entra al embudo en `NUEVO` con su alta en la actividad. */
export function prospectoDesdeFormulario(
  v: NuevoProspectoValidado,
  id: string,
  hoy: FechaISO,
  vendedorId: string,
): Prospecto {
  return {
    id,
    nombre: v.nombre,
    rfc: v.rfc,
    giro: v.giro,
    contacto: { nombre: v.contactoNombre, telefono: v.telefono, correo: v.correo },
    origen: v.origen,
    etapa: "NUEVO",
    localIds: [v.localId],
    documentosCompletos: v.documentosCompletos,
    aval: v.avalRegistrado ? "Aval solidario registrado" : undefined,
    creadoEl: hoy,
    vendedorId,
    actividad: [
      {
        id: "alta",
        titulo: `Alta del prospecto (${ETIQUETA_ORIGEN_PROSPECTO[v.origen].toLowerCase()})`,
        fecha: hoy,
      },
    ],
  };
}
