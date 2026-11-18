import type { Rol } from "@/domain";
import {
  BarChart3,
  Building,
  Building2,
  CalendarCheck,
  ClipboardList,
  Cog,
  FileText,
  FileSignature,
  HandCoins,
  Headset,
  Home,
  Layers,
  LayoutDashboard,
  Map,
  Megaphone,
  PlugZap,
  Receipt,
  Tag,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import {
  REGLAS_RUTA,
  rutaPermitida,
  visiblePara,
  type IdRegla,
  type ReglaRuta,
} from "./acceso-rutas";

export { rutaPermitida };

export type IdBadge = "cobranza" | "aprobaciones";

/** Ítem del menú: la regla de acceso de su módulo más cómo se pinta. */
export interface ItemNavegacion extends ReglaRuta {
  id: IdRegla;
  etiqueta: string;
  icono: LucideIcon;
  /** Contador calculado que se pinta como badge. */
  badge?: IdBadge;
  /** Rutas que además lo activan aunque queden fuera de su prefijo. */
  tambienActivoEn?: RegExp;
  /** Rutas dentro de su prefijo que pertenecen a otro ítem. */
  inactivoEn?: RegExp;
}

export interface GrupoNavegacion {
  id: string;
  titulo: string;
  items: readonly ItemNavegacion[];
}

/** Ítem del menú con la ruta, el prefijo y los roles de su regla de acceso. */
function itemDe(
  id: IdRegla,
  vista: Omit<ItemNavegacion, "id" | keyof ReglaRuta>,
): ItemNavegacion {
  return { id, ...REGLAS_RUTA[id], ...vista };
}

/** Ficha de un local: la página 3 de la guía la resalta bajo "Precios y reglas". */
const RUTA_FICHA_LOCAL = /^\/plazas\/[^/]+\/locales\/[^/]+$/;

export const NAVEGACION: readonly GrupoNavegacion[] = [
  {
    id: "operacion",
    titulo: "Operación",
    items: [
      itemDe("resumen-comercial", {
        etiqueta: "Resumen comercial",
        icono: LayoutDashboard,
      }),
      itemDe("disponibilidad", { etiqueta: "Disponibilidad", icono: CalendarCheck }),
      itemDe("inicio", { etiqueta: "Inicio", icono: Home }),
      itemDe("mapa", { etiqueta: "Mapa de plazas", icono: Map }),
      itemDe("plazas", {
        etiqueta: "Plazas y locales",
        icono: Building,
        inactivoEn: RUTA_FICHA_LOCAL,
      }),
      itemDe("prospectos", { etiqueta: "Prospectos", icono: Users }),
      itemDe("campanas", { etiqueta: "Campañas", icono: Megaphone }),
      itemDe("cotizaciones", { etiqueta: "Cotizaciones", icono: FileText }),
      itemDe("contratos", { etiqueta: "Contratos", icono: FileSignature }),
      itemDe("servicio-clientes", { etiqueta: "Servicio a clientes", icono: Headset }),
      itemDe("comisiones", { etiqueta: "Comisiones", icono: HandCoins }),
      itemDe("cobranza", { etiqueta: "Cobranza", icono: Receipt, badge: "cobranza" }),
      itemDe("mantenimientos", { etiqueta: "Mantenimientos", icono: Wrench }),
      itemDe("proveedores", { etiqueta: "Proveedores", icono: Building2 }),
      itemDe("mis-licitaciones", { etiqueta: "Mis licitaciones", icono: ClipboardList }),
    ],
  },
  {
    id: "administracion",
    titulo: "Administración",
    items: [
      itemDe("precios-y-reglas", {
        etiqueta: "Precios y reglas",
        icono: Tag,
        badge: "aprobaciones",
        tambienActivoEn: RUTA_FICHA_LOCAL,
      }),
      itemDe("terrenos", { etiqueta: "Terrenos y proyectos", icono: Layers }),
      itemDe("reportes", { etiqueta: "Reportes", icono: BarChart3 }),
      itemDe("integraciones", { etiqueta: "Integraciones", icono: PlugZap }),
      itemDe("configuracion", { etiqueta: "Configuración", icono: Cog }),
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

/** Grupos del menú con solo los ítems que ve el rol (los grupos vacíos se omiten). */
export function itemsVisibles(rol: Rol): GrupoNavegacion[] {
  return NAVEGACION.map((g) => ({
    ...g,
    items: g.items.filter((i) => visiblePara(i, rol)),
  })).filter((g) => g.items.length > 0);
}
