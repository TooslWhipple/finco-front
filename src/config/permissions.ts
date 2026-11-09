import { ID_TERRENO_HEROE } from "@/data/obra";
import type { Rol } from "@/domain";

export type Accion =
  | "cotizaciones.crear"
  | "contrato.generar"
  | "excepcion.solicitar"
  | "excepcion.autorizar"
  | "excepcion.aplicar"
  | "metaIngresos.editar"
  | "obra.corteCapturar"
  | "obra.corteValidar"
  | "licitacion.gestionar"
  | "precioMinimo.editar"
  | "regla.editar"
  | "actualizacionAnual.resolver"
  | "cobranza.gestionar"
  | "integraciones.sincronizar"
  | "prospectos.gestionar"
  | "contratos.gestionar"
  | "terrenos.gestionar"
  | "mantenimientos.gestionar"
  | "configuracion.editar";

const TODAS: readonly Accion[] = [
  "cotizaciones.crear",
  "contrato.generar",
  "excepcion.solicitar",
  "excepcion.autorizar",
  "excepcion.aplicar",
  "metaIngresos.editar",
  "obra.corteCapturar",
  "obra.corteValidar",
  "licitacion.gestionar",
  "precioMinimo.editar",
  "regla.editar",
  "actualizacionAnual.resolver",
  "cobranza.gestionar",
  "integraciones.sincronizar",
  "prospectos.gestionar",
  "contratos.gestionar",
  "terrenos.gestionar",
  "mantenimientos.gestionar",
  "configuracion.editar",
];

/** Matriz rol → acciones permitidas. */
export const PERMISOS: Record<Rol, readonly Accion[]> = {
  DIRECCION: ["excepcion.autorizar"],
  VENTAS: [
    "cotizaciones.crear",
    "contrato.generar",
    "excepcion.solicitar",
    "prospectos.gestionar",
    "contratos.gestionar",
  ],
  SUPERADMIN: TODAS,
  COBRANZA: ["cobranza.gestionar", "integraciones.sincronizar"],
  PMO: [
    "excepcion.aplicar",
    "precioMinimo.editar",
    "regla.editar",
    "terrenos.gestionar",
    "metaIngresos.editar",
    "obra.corteValidar",
    "licitacion.gestionar",
  ],
  SUPERVISOR_OBRA: ["obra.corteCapturar"],
};

export function can(rol: Rol | null | undefined, accion: Accion): boolean {
  return rol ? PERMISOS[rol].includes(accion) : false;
}

/** Pantalla de inicio de cada rol. */
export const INICIO_POR_ROL: Record<Rol, string> = {
  DIRECCION: "/",
  VENTAS: "/plazas/plz-alborada",
  SUPERADMIN: "/precios-y-reglas",
  COBRANZA: "/cobranza",
  PMO: "/terrenos-y-proyectos",
  SUPERVISOR_OBRA: `/terrenos-y-proyectos/${ID_TERRENO_HEROE}`,
};
