/**
 * Reglas de acceso por ruta: qué rol abre qué parte del portal.
 *
 * Módulo puro (sin iconos, React ni mocks) porque lo usan a la vez el menú
 * (`navigation.ts`), los guardas del cliente y la barrera del servidor
 * (`src/proxy.ts`). `NAVEGACION` toma de aquí la ruta, el prefijo y los roles
 * de cada ítem: una sola fuente de verdad.
 */
import type { Rol } from "@/domain";
import { ID_TERRENO_HEROE } from "./ids-demo";

export type IdRegla =
  | "resumen-comercial"
  | "disponibilidad"
  | "inicio"
  | "mapa"
  | "plazas"
  | "prospectos"
  | "campanas"
  | "cotizaciones"
  | "contratos"
  | "servicio-clientes"
  | "comisiones"
  | "cobranza"
  | "mantenimientos"
  | "proveedores"
  | "mis-licitaciones"
  | "precios-y-reglas"
  | "terrenos"
  | "reportes"
  | "integraciones"
  | "configuracion";

export interface ReglaRuta {
  /** Ruta de entrada del módulo (la del ítem del menú). */
  ruta: string;
  /** Si existe, el módulo es dueño de toda la rama de esa ruta (no solo de `ruta`). */
  prefijo?: string;
  /** Roles que abren el módulo; si se omite, lo abren todos. */
  roles?: readonly Rol[];
  /** Solo lo abren los `roles` listados: ni Dirección ni Superadmin lo heredan. */
  soloRoles?: boolean;
}

export const REGLAS_RUTA: Record<IdRegla, ReglaRuta> = {
  "resumen-comercial": {
    ruta: "/resumen-comercial",
    prefijo: "/resumen-comercial",
    roles: ["GERENTE_COMERCIAL"],
  },
  disponibilidad: {
    ruta: "/disponibilidad",
    prefijo: "/disponibilidad",
    roles: ["VENTAS", "GERENTE_COMERCIAL"],
  },
  inicio: { ruta: "/", roles: ["VENTAS", "GERENTE_COMERCIAL", "COBRANZA", "PMO"] },
  mapa: { ruta: "/mapa-de-plazas", roles: ["VENTAS", "GERENTE_COMERCIAL", "PMO"] },
  plazas: {
    ruta: "/plazas/plz-alborada",
    prefijo: "/plazas",
    roles: ["VENTAS", "GERENTE_COMERCIAL", "COBRANZA", "PMO", "ATENCION_CLIENTES"],
  },
  prospectos: {
    ruta: "/prospectos",
    prefijo: "/prospectos",
    roles: ["VENTAS", "GERENTE_COMERCIAL"],
  },
  campanas: { ruta: "/campanas", prefijo: "/campanas", roles: ["GERENTE_COMERCIAL"] },
  cotizaciones: {
    ruta: "/cotizaciones",
    prefijo: "/cotizaciones",
    roles: ["VENTAS", "GERENTE_COMERCIAL"],
  },
  contratos: {
    ruta: "/contratos",
    prefijo: "/contratos",
    roles: ["VENTAS", "GERENTE_COMERCIAL", "COBRANZA", "PMO", "ATENCION_CLIENTES"],
  },
  "servicio-clientes": {
    ruta: "/servicio-clientes",
    prefijo: "/servicio-clientes",
    roles: ["ATENCION_CLIENTES", "GERENTE_COMERCIAL", "PMO"],
  },
  comisiones: {
    ruta: "/comisiones",
    prefijo: "/comisiones",
    roles: ["VENTAS", "GERENTE_COMERCIAL"],
  },
  cobranza: { ruta: "/cobranza", prefijo: "/cobranza", roles: ["COBRANZA"] },
  mantenimientos: {
    ruta: "/mantenimientos",
    prefijo: "/mantenimientos",
    roles: ["SUPERVISOR_OBRA", "PMO"],
  },
  proveedores: {
    ruta: "/proveedores",
    prefijo: "/proveedores",
    roles: ["PMO", "SUPERVISOR_OBRA"],
  },
  "mis-licitaciones": {
    ruta: "/mis-licitaciones",
    prefijo: "/mis-licitaciones",
    roles: ["CONTRATISTA"],
    soloRoles: true,
  },
  "precios-y-reglas": {
    ruta: "/precios-y-reglas",
    prefijo: "/precios-y-reglas",
    roles: ["PMO"],
  },
  terrenos: {
    ruta: "/terrenos-y-proyectos",
    prefijo: "/terrenos-y-proyectos",
    roles: ["PMO", "SUPERVISOR_OBRA"],
  },
  reportes: {
    ruta: "/reportes",
    prefijo: "/reportes",
    roles: ["VENTAS", "GERENTE_COMERCIAL", "COBRANZA", "PMO"],
  },
  integraciones: {
    ruta: "/integraciones",
    prefijo: "/integraciones",
    roles: ["COBRANZA", "PMO"],
  },
  configuracion: { ruta: "/configuracion", prefijo: "/configuracion", roles: [] },
};

/** Roles que abren todos los módulos sin tener que listarse en `roles`. */
export const ROLES_VEN_TODO: readonly Rol[] = ["DIRECCION", "SUPERADMIN"];

/** Rutas que se abren sin sesión y que no pertenecen a ningún módulo. */
export const RUTAS_PUBLICAS: readonly string[] = ["/login"];

/** Pantalla de inicio de cada rol. */
export const INICIO_POR_ROL: Record<Rol, string> = {
  DIRECCION: "/",
  VENTAS: "/disponibilidad",
  GERENTE_COMERCIAL: "/resumen-comercial",
  SUPERADMIN: "/precios-y-reglas",
  COBRANZA: "/cobranza",
  PMO: "/terrenos-y-proyectos",
  SUPERVISOR_OBRA: `/terrenos-y-proyectos/${ID_TERRENO_HEROE}`,
  CONTRATISTA: "/mis-licitaciones",
  ATENCION_CLIENTES: "/servicio-clientes",
};

const REGLAS: readonly ReglaRuta[] = Object.values(REGLAS_RUTA);

export function visiblePara(regla: ReglaRuta, rol: Rol): boolean {
  if (!regla.roles) return true;
  if (regla.roles.includes(rol)) return true;
  return !regla.soloRoles && ROLES_VEN_TODO.includes(rol);
}

function duenosDe(ruta: string): ReglaRuta[] {
  return REGLAS.filter((r) =>
    r.prefijo ? ruta === r.prefijo || ruta.startsWith(`${r.prefijo}/`) : ruta === r.ruta,
  );
}

/**
 * ¿Puede el rol abrir esta ruta? Se bloquea solo si la ruta pertenece (por su
 * ruta o prefijo) a algún módulo y ninguno es visible para el rol; las rutas
 * que no pertenecen a ningún módulo (login, redirecciones) pasan. La barrera
 * del servidor es más estricta: cierra también las rutas sin dueño
 * (`rutaTieneDueno`).
 */
export function rutaPermitida(rol: Rol, ruta: string): boolean {
  const duenos = duenosDe(ruta);
  return duenos.length === 0 || duenos.some((r) => visiblePara(r, rol));
}

/** ¿La ruta pertenece a algún módulo del portal? */
export function rutaTieneDueno(ruta: string): boolean {
  return duenosDe(ruta).length > 0;
}

/** `rutaPermitida` sobre un href que puede traer query o hash. */
export function hrefPermitido(rol: Rol, href: string): boolean {
  const ruta = href.split(/[?#]/, 1)[0] ?? href;
  return rutaPermitida(rol, ruta);
}
