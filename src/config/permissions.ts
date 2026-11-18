import { ROLES_VEN_EQUIPO, type Rol } from "@/domain";

export type Accion =
  | "cotizaciones.crear"
  | "comercial.verEquipo"
  | "campanas.gestionar"
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
  | "licitacion.responder"
  | "precioMinimo.editar"
  | "regla.editar"
  | "actualizacionAnual.resolver"
  | "local.liberar"
  | "local.registrarApertura"
  | "cobranza.ver"
  | "cobranza.gestionar"
  | "cobranza.avisosProgramar"
  | "integraciones.sincronizar"
  | "prospectos.gestionar"
  | "contratos.gestionar"
  | "casos.gestionar"
  | "comisiones.pagar"
  | "comisiones.esquemaEditar"
  | "terrenos.ver"
  | "terrenos.gestionar"
  | "mantenimientos.gestionar"
  | "mantenimiento.presupuestoEditar"
  | "mantenimiento.sobregiroAutorizar"
  | "proveedores.gestionar"
  | "configuracion.editar";

const TODAS: readonly Accion[] = [
  "cotizaciones.crear",
  "comercial.verEquipo",
  "campanas.gestionar",
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
  "licitacion.responder",
  "precioMinimo.editar",
  "regla.editar",
  "actualizacionAnual.resolver",
  "local.liberar",
  "local.registrarApertura",
  "cobranza.ver",
  "cobranza.gestionar",
  "cobranza.avisosProgramar",
  "integraciones.sincronizar",
  "prospectos.gestionar",
  "contratos.gestionar",
  "casos.gestionar",
  "comisiones.pagar",
  "comisiones.esquemaEditar",
  "terrenos.ver",
  "terrenos.gestionar",
  "mantenimientos.gestionar",
  "mantenimiento.presupuestoEditar",
  "mantenimiento.sobregiroAutorizar",
  "proveedores.gestionar",
  "configuracion.editar",
];

const ACCIONES_VENTAS: readonly Accion[] = [
  "cotizaciones.crear",
  "contrato.generar",
  "excepcion.solicitar",
  "prospectos.gestionar",
  "contratos.gestionar",
  "local.registrarApertura",
];

/** Matriz rol → acciones permitidas. */
export const PERMISOS: Record<Rol, readonly Accion[]> = {
  DIRECCION: [
    "excepcion.autorizar",
    "comercial.verEquipo",
    "campanas.gestionar",
    "casos.gestionar",
    "comisiones.pagar",
    "comisiones.esquemaEditar",
    "mantenimiento.sobregiroAutorizar",
    "cobranza.ver",
    "terrenos.ver",
  ],
  VENTAS: ACCIONES_VENTAS,
  GERENTE_COMERCIAL: [...ACCIONES_VENTAS, "comercial.verEquipo", "campanas.gestionar"],
  SUPERADMIN: TODAS,
  COBRANZA: [
    "cobranza.ver",
    "terrenos.ver",
    "local.liberar",
    "local.registrarApertura",
    "cobranza.gestionar",
    "cobranza.avisosProgramar",
    "integraciones.sincronizar",
  ],
  PMO: [
    "excepcion.aplicar",
    "precioMinimo.editar",
    "regla.editar",
    "cobranza.ver",
    "terrenos.ver",
    "terrenos.gestionar",
    "metaIngresos.editar",
    "obra.corteValidar",
    "obra.estimacionAutorizar",
    "licitacion.gestionar",
    "actualizacionAnual.resolver",
    "local.liberar",
    "local.registrarApertura",
    "mantenimiento.presupuestoEditar",
    "proveedores.gestionar",
  ],
  SUPERVISOR_OBRA: ["terrenos.ver", "obra.corteCapturar", "obra.estimacionRegistrar"],
  CONTRATISTA: ["licitacion.responder"],
  ATENCION_CLIENTES: ["casos.gestionar"],
};

export function can(rol: Rol | null | undefined, accion: Accion): boolean {
  return rol ? PERMISOS[rol].includes(accion) : false;
}

/** ¿El rol ve el trabajo de todos los vendedores y no solo el propio? */
export function veTodoElEquipo(rol: Rol): boolean {
  return ROLES_VEN_EQUIPO.includes(rol);
}

/** Pantalla de inicio de cada rol (definida junto a las reglas de ruta). */
export { INICIO_POR_ROL } from "./acceso-rutas";
