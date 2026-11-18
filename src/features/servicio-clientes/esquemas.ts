import { z } from "zod";
import {
  CANALES_CASO,
  ETIQUETA_TIPO_CASO,
  PRIORIDADES_CASO,
  sumarDias,
  TIPOS_CASO,
  type CasoServicio,
  type CategoriaMantenimiento,
  type FechaISO,
  type TipoCaso,
} from "@/domain";
import type { NuevoCaso, NuevoMantenimiento } from "@/store/reducers";

/** Alta de un caso. La factura solo es obligatoria en una aclaración. */
export const esquemaCaso = z
  .object({
    plazaId: z.string().min(1, "Elige la plaza"),
    localId: z.string().min(1, "Elige un local con contrato vigente"),
    tipo: z.enum(TIPOS_CASO),
    prioridad: z.enum(PRIORIDADES_CASO),
    canal: z.enum(CANALES_CASO),
    descripcion: z.string().trim().min(5, "Describe lo que reporta el locatario"),
    facturaId: z.string(),
  })
  .refine((v) => v.tipo !== "ACLARACION_FACTURA" || v.facturaId !== "", {
    path: ["facturaId"],
    message: "Elige la factura que pide aclarar",
  });

export type CasoFormulario = z.input<typeof esquemaCaso>;
export type CasoValidado = z.output<typeof esquemaCaso>;

export const CASO_VACIO: CasoFormulario = {
  plazaId: "",
  localId: "",
  tipo: "FALLA",
  prioridad: "MEDIA",
  canal: "TELEFONO",
  descripcion: "",
  facturaId: "",
};

/** Caso a registrar a partir del formulario validado y el locatario del contrato vigente. */
export function casoDesdeFormulario(v: CasoValidado, locatarioId: string): NuevoCaso {
  return {
    plazaId: v.plazaId,
    localId: v.localId,
    locatarioId,
    tipo: v.tipo,
    prioridad: v.prioridad,
    canal: v.canal,
    descripcion: v.descripcion,
    ...(v.tipo === "ACLARACION_FACTURA" ? { facturaId: v.facturaId } : {}),
  };
}

const textoObligatorio = (mensaje: string) =>
  z.object({ texto: z.string().trim().min(3, mensaje) });

/** Respuesta al locatario. */
export const esquemaRespuesta = textoObligatorio("Escribe la respuesta al locatario");
/** Comentario interno de la bitácora. */
export const esquemaComentario = textoObligatorio("Escribe el comentario");

/** Cierre del caso: la calificación del locatario, entera de 1 a 5. */
export const esquemaCierre = z.object({
  calificacion: z
    .number({ error: "Registra la calificación del locatario" })
    .int()
    .min(1, "La calificación va del 1 al 5")
    .max(5, "La calificación va del 1 al 5"),
});

/** Categoría del mantenimiento según el tipo del caso; un daño la elige quien escala. */
const CATEGORIA_POR_TIPO: Partial<Record<TipoCaso, CategoriaMantenimiento>> = {
  FUGA: "PLOMERIA",
  FALLA: "ELECTRICO",
};

/** Valores de arranque del diálogo de mantenimiento al escalar un caso. */
export type PropuestaEscalamiento = Pick<
  NuevoMantenimiento,
  "titulo" | "descripcion" | "fechaProgramada" | "costoEstimado" | "cargoA"
> &
  Partial<Pick<NuevoMantenimiento, "categoria">>;

/**
 * Prellenado del correctivo: título y descripción del caso, categoría por tipo,
 * mañana, costo 0 y cargo a la plaza. Es editable: la validación del
 * mantenimiento y el proveedor los resuelve el diálogo de mantenimiento.
 */
export function propuestaEscalamiento(
  caso: Pick<CasoServicio, "folio" | "tipo" | "descripcion">,
  hoy: FechaISO,
): PropuestaEscalamiento {
  const categoria = CATEGORIA_POR_TIPO[caso.tipo];
  return {
    titulo: `${ETIQUETA_TIPO_CASO[caso.tipo]} · caso ${caso.folio}`,
    descripcion: caso.descripcion,
    ...(categoria ? { categoria } : {}),
    fechaProgramada: sumarDias(hoy, 1),
    costoEstimado: 0,
    cargoA: "PLAZA",
  };
}
