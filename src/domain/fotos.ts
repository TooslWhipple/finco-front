import type { Foto, Local } from "./tipos";

export type CategoriaFotoLocal =
  "vacio" | "alimentos" | "moda" | "salud" | "bienestar" | "servicios";

export const CATEGORIAS_FOTO_LOCAL: readonly CategoriaFotoLocal[] = [
  "vacio",
  "alimentos",
  "moda",
  "salud",
  "bienestar",
  "servicios",
];

/** Fotos que recibe cada local. */
export const FOTOS_POR_LOCAL = 3;

/** Giro → categoría visual. Cualquier giro no listado cae en `servicios`. */
export const CATEGORIA_POR_GIRO: Readonly<Record<string, CategoriaFotoLocal>> = {
  Cafetería: "alimentos",
  Restaurante: "alimentos",
  Panadería: "alimentos",
  Boutique: "moda",
  Joyería: "moda",
  Zapatería: "moda",
  Farmacia: "salud",
  Dentista: "salud",
  Óptica: "salud",
  Veterinaria: "salud",
  Nutrición: "salud",
  Gimnasio: "bienestar",
  Yoga: "bienestar",
  Estética: "bienestar",
  Barbería: "bienestar",
  Papelería: "servicios",
  Lavandería: "servicios",
  Tintorería: "servicios",
  Telefonía: "servicios",
  Banco: "servicios",
};

/** Hash FNV-1a de 32 bits, determinista y sin dependencias. */
export function hashCadena(texto: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Disponible, en preventa o sin giro → local vacío; si no, la categoría de su giro. */
export function categoriaFotoDeLocal(
  local: Pick<Local, "estatus" | "giro">,
): CategoriaFotoLocal {
  const ocupado = local.estatus === "OCUPADO" || local.estatus === "EN_COTIZACION";
  if (!ocupado || !local.giro) return "vacio";
  return CATEGORIA_POR_GIRO[local.giro] ?? "servicios";
}

/**
 * Tres fotos de la categoría del local, rotadas con un offset derivado del hash
 * de `local.id`: el mismo local siempre ve las mismas, y locales distintos
 * no suelen empezar por la misma.
 */
export function fotosDeLocal(
  local: Pick<Local, "id" | "estatus" | "giro">,
  catalogo: Readonly<Record<CategoriaFotoLocal, readonly Foto[]>>,
): Foto[] {
  const fotos = catalogo[categoriaFotoDeLocal(local)];
  if (fotos.length === 0) return [];
  const offset = hashCadena(local.id) % fotos.length;
  const n = Math.min(FOTOS_POR_LOCAL, fotos.length);
  return Array.from({ length: n }, (_, i) => fotos[(offset + i) % fotos.length]);
}
