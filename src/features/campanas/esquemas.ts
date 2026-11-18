import { z } from "zod";
import { ETIQUETA_ORIGEN_PROSPECTO, ORIGENES_PROSPECTO, type Campana } from "@/domain";

/**
 * Alta o edición de una campaña. `fin` vacío es "sin fecha de fin" y la
 * inversión llega como el texto del input y sale como número de 0 o más.
 */
export const esquemaCampana = z
  .object({
    nombre: z.string().trim().min(3, "Captura un nombre de 3 caracteres o más"),
    canal: z.enum(ORIGENES_PROSPECTO, { error: "Elige el canal" }),
    inicio: z.iso.date({ error: "Elige la fecha de inicio" }),
    fin: z
      .union([z.literal(""), z.iso.date({ error: "Fecha inválida" })])
      .optional()
      .transform((v) => (v === "" ? undefined : v)),
    inversion: z
      .string()
      .trim()
      .min(1, "Captura la inversión")
      .transform(Number)
      .pipe(
        z
          .number({ error: "Captura un monto válido" })
          .nonnegative("La inversión no puede ser negativa"),
      ),
  })
  .superRefine((v, ctx) => {
    if (v.fin !== undefined && v.fin < v.inicio) {
      ctx.addIssue({
        code: "custom",
        path: ["fin"],
        message: "El fin no puede ser anterior al inicio",
      });
    }
  });

export type CampanaFormulario = z.input<typeof esquemaCampana>;
export type CampanaValidada = z.output<typeof esquemaCampana>;

export const CAMPANA_VACIA: CampanaFormulario = {
  nombre: "",
  canal: "REDES",
  inicio: "",
  fin: "",
  inversion: "",
};

export const OPCIONES_CANAL = ORIGENES_PROSPECTO.map((valor) => ({
  valor,
  etiqueta: ETIQUETA_ORIGEN_PROSPECTO[valor],
}));

/** Valores del formulario para editar una campaña existente. */
export function formularioDeCampana(c: Campana): CampanaFormulario {
  return {
    nombre: c.nombre,
    canal: c.canal,
    inicio: c.inicio,
    fin: c.fin ?? "",
    inversion: String(c.inversion),
  };
}

/** Campaña del catálogo a partir del formulario validado (sin `fin` si quedó vacío). */
export function campanaDesdeFormulario(v: CampanaValidada, id: string): Campana {
  return {
    id,
    nombre: v.nombre,
    canal: v.canal,
    inicio: v.inicio,
    ...(v.fin === undefined ? {} : { fin: v.fin }),
    inversion: v.inversion,
  };
}
