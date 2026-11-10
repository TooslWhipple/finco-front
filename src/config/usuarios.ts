import type { Rol, Usuario } from "@/domain";

export const USUARIOS_DEMO: readonly Usuario[] = [
  {
    id: "usr-mariana",
    nombre: "Mariana López",
    rol: "DIRECCION",
    cargo: "Dirección general",
  },
  {
    id: "usr-jorge",
    nombre: "Jorge Ramírez",
    rol: "GERENTE_COMERCIAL",
    cargo: "Gerente comercial",
  },
  { id: "usr-sofia", nombre: "Sofía Medina", rol: "VENTAS", cargo: "Asesora comercial" },
  { id: "usr-luis", nombre: "Luis Cárdenas", rol: "VENTAS", cargo: "Asesor comercial" },
  { id: "usr-laura", nombre: "Laura Fuentes", rol: "SUPERADMIN", cargo: "Superadmin" },
  { id: "usr-patricia", nombre: "Patricia Gaxiola", rol: "COBRANZA", cargo: "Cobranza" },
  {
    id: "usr-pmo",
    nombre: "Ricardo Salas",
    rol: "PMO",
    cargo: "PMO · Control de proyectos",
  },
  {
    id: "usr-supervisor",
    nombre: "Héctor Ramos",
    rol: "SUPERVISOR_OBRA",
    cargo: "Supervisor de obra",
  },
];

export const ETIQUETA_ROL: Record<Rol, string> = {
  DIRECCION: "Dirección",
  VENTAS: "Ventas",
  GERENTE_COMERCIAL: "Gerente comercial",
  SUPERADMIN: "Superadmin",
  COBRANZA: "Cobranza",
  PMO: "PMO",
  SUPERVISOR_OBRA: "Supervisor de obra",
};

export function usuarioPorId(id: string | null): Usuario | undefined {
  return USUARIOS_DEMO.find((u) => u.id === id);
}

/** Nombre del usuario por id; cadena vacía si no existe. */
export function nombreDeUsuario(id: string): string {
  return usuarioPorId(id)?.nombre ?? "";
}

/** Vendedores de la demo: quienes llevan prospectos y cotizaciones. */
export const IDS_VENDEDORES: readonly string[] = ["usr-sofia", "usr-luis", "usr-jorge"];

/** Usuario demo que representa a un rol (el selector de rol de la topbar). */
export function usuarioDeRol(rol: Rol): Usuario {
  const usuario = USUARIOS_DEMO.find((u) => u.rol === rol);
  if (!usuario) throw new Error(`Sin usuario demo para el rol ${rol}`);
  return usuario;
}
