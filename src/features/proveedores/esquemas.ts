import { z } from "zod";
import {
  CATEGORIAS_MANTENIMIENTO,
  ETIQUETA_CATEGORIA_MANTENIMIENTO,
  ETIQUETA_PARTIDA,
  normalizarRfc,
  PARTIDAS_OBRA,
  type Proveedor,
} from "@/domain";
import { MENSAJE_RFC_INVALIDO, RFC } from "@/lib/rfc";

/**
 * Alta o edición de un proveedor del padrón. `rfcsExistentes` son los RFC de los
 * demás proveedores (quien llama excluye al que se edita): repetir uno es un error.
 */
export function esquemaProveedor(rfcsExistentes: readonly string[]) {
  const usados = new Set(rfcsExistentes.map(normalizarRfc));
  return z.object({
    nombre: z.string().trim().min(3, "Captura la razón social o el nombre"),
    rfc: z
      .string()
      .transform(normalizarRfc)
      .pipe(
        z
          .string()
          .regex(RFC, MENSAJE_RFC_INVALIDO)
          .refine((v) => !usados.has(v), "Ya hay un proveedor con ese RFC"),
      ),
    contactoNombre: z.string().trim(),
    contactoCorreo: z
      .string()
      .trim()
      .pipe(z.union([z.literal(""), z.email("Correo inválido")])),
    contactoWhatsapp: z.string().trim(),
    especialidadesMantenimiento: z.array(z.enum(CATEGORIAS_MANTENIMIENTO)),
    partidasObra: z.array(z.enum(PARTIDAS_OBRA)),
    plazaIds: z.array(z.string()),
    activo: z.boolean(),
  });
}

type EsquemaProveedor = ReturnType<typeof esquemaProveedor>;
export type ProveedorFormulario = z.input<EsquemaProveedor>;
export type ProveedorValidado = z.output<EsquemaProveedor>;

export const PROVEEDOR_VACIO: ProveedorFormulario = {
  nombre: "",
  rfc: "",
  contactoNombre: "",
  contactoCorreo: "",
  contactoWhatsapp: "",
  especialidadesMantenimiento: [],
  partidasObra: [],
  plazaIds: [],
  activo: true,
};

export const OPCIONES_CATEGORIA = CATEGORIAS_MANTENIMIENTO.map((valor) => ({
  valor,
  etiqueta: ETIQUETA_CATEGORIA_MANTENIMIENTO[valor],
}));

export const OPCIONES_PARTIDA = PARTIDAS_OBRA.map((valor) => ({
  valor,
  etiqueta: ETIQUETA_PARTIDA[valor],
}));

/** Valores del formulario para editar un proveedor existente. */
export function formularioDeProveedor(p: Proveedor): ProveedorFormulario {
  return {
    nombre: p.nombre,
    rfc: p.rfc,
    contactoNombre: p.contacto.nombre,
    contactoCorreo: p.contacto.correo,
    contactoWhatsapp: p.contacto.whatsapp,
    especialidadesMantenimiento: [...p.especialidadesMantenimiento],
    partidasObra: [...p.partidasObra],
    plazaIds: [...p.plazaIds],
    activo: p.activo,
  };
}

/** Proveedor del padrón a partir del formulario validado. */
export function proveedorDesdeFormulario(v: ProveedorValidado, id: string): Proveedor {
  return {
    id,
    nombre: v.nombre,
    rfc: v.rfc,
    contacto: {
      nombre: v.contactoNombre,
      correo: v.contactoCorreo,
      whatsapp: v.contactoWhatsapp,
    },
    especialidadesMantenimiento: v.especialidadesMantenimiento,
    partidasObra: v.partidasObra,
    plazaIds: v.plazaIds,
    activo: v.activo,
  };
}
