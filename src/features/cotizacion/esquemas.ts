import { z } from "zod";
import { PLAZO_MAX_MESES } from "@/domain";

const entero = (mensaje: string) => z.number({ error: mensaje }).int(mensaje);

/**
 * Términos editables. El plazo admite valores fuera de política (hasta 120
 * meses) a propósito: el candado de plazo es quien los marca, en vivo.
 */
export const esquemaTerminos = z
  .object({
    rentaMensual: entero("Captura una renta en pesos").min(
      1,
      "La renta debe ser mayor a 0",
    ),
    plazoMeses: entero("Captura el plazo en meses")
      .min(1, "El plazo debe ser de al menos 1 mes")
      .max(PLAZO_MAX_MESES * 2, `Máximo ${PLAZO_MAX_MESES * 2} meses`),
    depositoMeses: entero("Captura los meses de depósito")
      .min(0, "No puede ser negativo")
      .max(6, "Máximo 6 meses"),
    mesesGracia: entero("Captura los meses de gracia")
      .min(0, "No puede ser negativo")
      .max(12, "Máximo 12 meses"),
    inicioContrato: z.iso.date({ error: "Elige una fecha de inicio" }),
  })
  .refine((t) => t.mesesGracia < t.plazoMeses, {
    path: ["mesesGracia"],
    error: "La gracia debe ser menor al plazo",
  });

export const esquemaNuevaCotizacion = z.object({
  plazaId: z.string().min(1, "Elige una plaza"),
  localId: z.string().min(1, "Elige un local"),
  prospecto: z.string().trim().min(3, "Captura el nombre del prospecto"),
  documentosCompletos: z.boolean(),
  avalRegistrado: z.boolean(),
  rentaMensual: entero("Captura una renta en pesos").min(
    1,
    "La renta debe ser mayor a 0",
  ),
  plazoMeses: entero("Captura el plazo en meses")
    .min(1, "El plazo debe ser de al menos 1 mes")
    .max(PLAZO_MAX_MESES * 2, `Máximo ${PLAZO_MAX_MESES * 2} meses`),
});

export const esquemaMotivoExcepcion = z.object({
  motivo: z.string().trim().min(10, "Explica el motivo en al menos 10 caracteres"),
});

export type TerminosFormulario = z.infer<typeof esquemaTerminos>;
export type NuevaCotizacionFormulario = z.infer<typeof esquemaNuevaCotizacion>;
