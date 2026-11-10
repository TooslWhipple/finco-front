import { ID_TERRENO_HEROE } from "@/data/obra";
import { ROLES_VEN_EQUIPO, type Rol } from "@/domain";

export type Accion =
  | "cotizaciones.crear"
  | "comercial.verEquipo"
  | "contrato.generar"
  | "excepcion.solicitar"
  | "excepcion.autorizar"
  | "excepcion.aplicar"
  | "metaIngresos.editar"
  | "obra.corteCapturar"
  | "obra.corteValidar"
  | "obra.estimacionRegistrar"
  | "obra.estimacionAutorizar"
  | "licitacion.gestionar"
  | "precioMinimo.editar"
  | "regla.editar"
  | "actualizacionAnual.resolver"
  | "local.liberar"
  | "cobranza.gestionar"
  | "cobranza.avisosProgramar"
  | "integraciones.sincronizar"
  | "prospectos.gestionar"
  | "contratos.gestionar"
  | "terrenos.gestionar"
  | "mantenimientos.gestionar"
  | "mantenimiento.presupuestoEditar"
  | "mantenimiento.sobregiroAutorizar"
  | "configuracion.editar";

const TODAS: readonly Accion[] = [
  "cotizaciones.crear",
  "comercial.verEquipo",
  "contrato.generar",
  "excepcion.solicitar",
  "excepcion.autorizar",
  "excepcion.aplicar",
  "metaIngresos.editar",
  "obra.corteCapturar",
  "obra.corteValidar",
  "obra.estimacionRegistrar",
  "obra.estimacionAutorizar",
  "licitacion.gestionar",
  "precioMinimo.editar",
  "regla.editar",
  "actualizacionAnual.resolver",
  "local.liberar",
  "cobranza.gestionar",
  "cobranza.avisosProgramar",
  "integraciones.sincronizar",
  "prospectos.gestionar",
  "contratos.gestionar",
  "terrenos.gestionar",
  "mantenimientos.gestionar",
  "mantenimiento.presupuestoEditar",
  "mantenimiento.sobregiroAutorizar",
  "configuracion.editar",
];

const ACCIONES_VENTAS: readonly Accion[] = [
  "cotizaciones.crear",
  "contrato.generar",
  "excepcion.solicitar",
  "prospectos.gestionar",
  "contratos.gestionar",
];

/** Matriz rol → acciones permitidas. */
export const PERMISOS: Record<Rol, readonly Accion[]> = {
  DIRECCION: [
    "excepcion.autorizar",
    "comercial.verEquipo",
    "mantenimiento.sobregiroAutorizar",
  ],
  VENTAS: ACCIONES_VENTAS,
  GERENTE_COMERCIAL: [...ACCIONES_VENTAS, "comercial.verEquipo"],
  SUPERADMIN: TODAS,
  COBRANZA: [
    "local.liberar",
    "cobranza.gestionar",
    "cobranza.avisosProgramar",
    "integraciones.sincronizar",
  ],
  PMO: [
    "excepcion.aplicar",
    "precioMinimo.editar",
    "regla.editar",
    "terrenos.gestionar",
    "metaIngresos.editar",
    "obra.corteValidar",
    "obra.estimacionAutorizar",
    "licitacion.gestionar",
    "actualizacionAnual.resolver",
    "local.liberar",
    "mantenimiento.presupuestoEditar",
  ],
  SUPERVISOR_OBRA: ["obra.corteCapturar", "obra.estimacionRegistrar"],
};

export function can(rol: Rol | null | undefined, accion: Accion): boolean {
  return rol ? PERMISOS[rol].includes(accion) : false;
}

/** ¿El rol ve el trabajo de todos los vendedores y no solo el propio? */
export function veTodoElEquipo(rol: Rol): boolean {
  return ROLES_VEN_EQUIPO.includes(rol);
}

/** Pantalla de inicio de cada rol. */
export const INICIO_POR_ROL: Record<Rol, string> = {
  DIRECCION: "/",
  VENTAS: "/disponibilidad",
  GERENTE_COMERCIAL: "/disponibilidad",
  SUPERADMIN: "/precios-y-reglas",
  COBRANZA: "/cobranza",
  PMO: "/terrenos-y-proyectos",
  SUPERVISOR_OBRA: `/terrenos-y-proyectos/${ID_TERRENO_HEROE}`,
};
