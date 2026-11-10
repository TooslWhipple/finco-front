import type { Rol, Usuario } from "./tipos";

/** Roles que ven el trabajo de todos los vendedores, no solo el propio. */
export const ROLES_VEN_EQUIPO: readonly Rol[] = [
  "GERENTE_COMERCIAL",
  "DIRECCION",
  "SUPERADMIN",
  "PMO",
];

/** Deja los items del usuario; quien ve a todo el equipo los conserva todos. */
export function filtrarPorVendedor<T extends { vendedorId: string }>(
  items: T[],
  usuario: Usuario,
): T[] {
  if (ROLES_VEN_EQUIPO.includes(usuario.rol)) return items;
  return items.filter((i) => i.vendedorId === usuario.id);
}
