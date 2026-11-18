import { z } from "zod";
import { USUARIOS_DEMO } from "@/config/usuarios";
import type { ConceptoComision, EsquemaComisiones } from "@/domain";

export const ETIQUETA_CONCEPTO_COMISION: Readonly<Record<ConceptoComision, string>> = {
  ASESOR: "Asesor",
  BONO_SIN_EXCEPCION: "Bono sin excepción",
  MANDO_MEDIO: "Mando medio",
};

/** Leyenda de la pantalla mientras Finco no entregue sus esquemas. */
export const LEYENDA_ESQUEMA_EJEMPLO =
  "Esquema de ejemplo: se ajustará con el Excel de Finco.";

/**
 * Usuarios que pueden cobrar como mando medio: los de rol Gerente comercial.
 * Que uno esté aquí no lo hace cobrar: lo decide `mandosMedios` del esquema.
 */
export const MANDOS_MEDIOS_ELEGIBLES: readonly string[] = USUARIOS_DEMO.filter(
  (u) => u.rol === "GERENTE_COMERCIAL",
).map((u) => u.id);

const porcentaje = z
  .number({ error: "Captura un porcentaje" })
  .min(0, "El porcentaje no puede ser negativo")
  .max(100, "El porcentaje no puede pasar de 100");

/** Edición del esquema de comisiones: porcentajes de 0 a 100 y al menos un mando medio. */
export const esquemaComisiones = z.object({
  asesorPct: porcentaje,
  bonoSinExcepcionPct: porcentaje,
  mandoMedioPct: porcentaje,
  mandosMedios: z
    .array(
      z.string().refine((id) => MANDOS_MEDIOS_ELEGIBLES.includes(id), {
        message: "Solo un Gerente comercial puede ser mando medio",
      }),
    )
    .min(1, "Elige al menos un mando medio")
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "Un mando medio no puede repetirse",
    }),
}) satisfies z.ZodType<EsquemaComisiones>;

export type EsquemaComisionesFormulario = z.input<typeof esquemaComisiones>;
