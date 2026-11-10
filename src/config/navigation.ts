import type { Rol } from "@/domain";
import {
  BarChart3,
  Building,
  CalendarCheck,
  Cog,
  FileText,
  FileSignature,
  Home,
  Layers,
  Map,
  PlugZap,
  Receipt,
  Tag,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type IdBadge = "cobranza" | "aprobaciones";

export interface ItemNavegacion {
  id: string;
  etiqueta: string;
  ruta: string;
  icono: LucideIcon;
  /** Contador calculado que se pinta como badge. */
  badge?: IdBadge;
  /** Si existe, el ítem está activo en toda la rama de esa ruta (no solo en `ruta`). */
  prefijo?: string;
  /** Rutas que además lo activan aunque queden fuera de su prefijo. */
  tambienActivoEn?: RegExp;
  /** Rutas dentro de su prefijo que pertenecen a otro ítem. */
  inactivoEn?: RegExp;
  /** Roles que ven el ítem; si se omite, lo ven todos. */
  roles?: readonly Rol[];
}

export interface GrupoNavegacion {
  id: string;
  titulo: string;
  items: readonly ItemNavegacion[];
}

/** Roles que ven todo el menú sin tener que listarse en `roles`. */
const ROLES_VEN_TODO: readonly Rol[] = ["DIRECCION", "SUPERADMIN"];

/** Ficha de un local: la página 3 de la guía la resalta bajo "Precios y reglas". */
const RUTA_FICHA_LOCAL = /^\/plazas\/[^/]+\/locales\/[^/]+$/;

export const NAVEGACION: readonly GrupoNavegacion[] = [
  {
    id: "operacion",
    titulo: "Operación",
    items: [
      {
        id: "disponibilidad",
        roles: ["VENTAS", "GERENTE_COMERCIAL"],
        etiqueta: "Disponibilidad",
        ruta: "/disponibilidad",
        icono: CalendarCheck,
        prefijo: "/disponibilidad",
      },
      {
        id: "inicio",
        etiqueta: "Inicio",
        ruta: "/",
        icono: Home,
        roles: ["VENTAS", "GERENTE_COMERCIAL", "COBRANZA", "PMO"],
      },
      {
        id: "mapa",
        roles: ["VENTAS", "GERENTE_COMERCIAL", "PMO"],
        etiqueta: "Mapa de plazas",
        ruta: "/mapa-de-plazas",
        icono: Map,
      },
      {
        id: "plazas",
        roles: ["VENTAS", "GERENTE_COMERCIAL", "COBRANZA", "PMO"],
        etiqueta: "Plazas y locales",
        ruta: "/plazas/plz-alborada",
        icono: Building,
        prefijo: "/plazas",
        inactivoEn: RUTA_FICHA_LOCAL,
      },
      {
        id: "prospectos",
        roles: ["VENTAS", "GERENTE_COMERCIAL"],
        etiqueta: "Prospectos",
        ruta: "/prospectos",
        prefijo: "/prospectos",
        icono: Users,
      },
      {
        id: "cotizaciones",
        roles: ["VENTAS", "GERENTE_COMERCIAL"],
        etiqueta: "Cotizaciones",
        ruta: "/cotizaciones",
        icono: FileText,
        prefijo: "/cotizaciones",
      },
      {
        id: "contratos",
        roles: ["VENTAS", "GERENTE_COMERCIAL", "COBRANZA", "PMO"],
        etiqueta: "Contratos",
        ruta: "/contratos",
        icono: FileSignature,
        prefijo: "/contratos",
      },
      {
        id: "cobranza",
        roles: ["COBRANZA"],
        etiqueta: "Cobranza",
        ruta: "/cobranza",
        icono: Receipt,
        badge: "cobranza",
        prefijo: "/cobranza",
      },
      {
        id: "mantenimientos",
        roles: ["SUPERVISOR_OBRA", "PMO"],
        etiqueta: "Mantenimientos",
        ruta: "/mantenimientos",
        icono: Wrench,
        prefijo: "/mantenimientos",
      },
    ],
  },
  {
    id: "administracion",
    titulo: "Administración",
    items: [
      {
        id: "precios-y-reglas",
        roles: ["PMO"],
        etiqueta: "Precios y reglas",
        ruta: "/precios-y-reglas",
        icono: Tag,
        badge: "aprobaciones",
        prefijo: "/precios-y-reglas",
        tambienActivoEn: RUTA_FICHA_LOCAL,
      },
      {
        id: "terrenos",
        roles: ["PMO", "SUPERVISOR_OBRA"],
        etiqueta: "Terrenos y proyectos",
        ruta: "/terrenos-y-proyectos",
        icono: Layers,
        prefijo: "/terrenos-y-proyectos",
      },
      {
        id: "reportes",
        roles: ["VENTAS", "GERENTE_COMERCIAL", "COBRANZA", "PMO"],
        etiqueta: "Reportes",
        ruta: "/reportes",
        icono: BarChart3,
        prefijo: "/reportes",
      },
      {
        id: "integraciones",
        roles: ["COBRANZA", "PMO"],
        etiqueta: "Integraciones",
        ruta: "/integraciones",
        icono: PlugZap,
        prefijo: "/integraciones",
      },
      {
        id: "configuracion",
        roles: [],
        etiqueta: "Configuración",
        ruta: "/configuracion",
        icono: Cog,
        prefijo: "/configuracion",
      },
    ],
  },
];

/** ¿La ruta actual corresponde a este ítem? */
export function itemActivo(item: ItemNavegacion, ruta: string): boolean {
  if (item.inactivoEn?.test(ruta)) return false;
  if (item.tambienActivoEn?.test(ruta)) return true;
  if (!item.prefijo) return ruta === item.ruta;
  return ruta === item.prefijo || ruta.startsWith(`${item.prefijo}/`);
}

function visiblePara(item: ItemNavegacion, rol: Rol): boolean {
  return !item.roles || ROLES_VEN_TODO.includes(rol) || item.roles.includes(rol);
}

/** Grupos del menú con solo los ítems que ve el rol (los grupos vacíos se omiten). */
export function itemsVisibles(rol: Rol): GrupoNavegacion[] {
  return NAVEGACION.map((g) => ({
    ...g,
    items: g.items.filter((i) => visiblePara(i, rol)),
  })).filter((g) => g.items.length > 0);
}

/**
 * ¿Puede el rol abrir esta ruta? Se bloquea solo si la ruta pertenece (por su
 * ruta o prefijo) a ítems del menú y ninguno es visible para el rol; las rutas
 * que no pertenecen a ningún ítem (login, redirecciones) pasan.
 */
export function rutaPermitida(rol: Rol, ruta: string): boolean {
  const duenos = NAVEGACION.flatMap((g) => g.items).filter((i) =>
    i.prefijo ? ruta === i.prefijo || ruta.startsWith(`${i.prefijo}/`) : ruta === i.ruta,
  );
  return duenos.length === 0 || duenos.some((i) => visiblePara(i, rol));
}
