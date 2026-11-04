import {
  BarChart3,
  Building,
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
}

export interface GrupoNavegacion {
  id: string;
  titulo: string;
  items: readonly ItemNavegacion[];
}

/** Ficha de un local: la página 3 de la guía la resalta bajo "Precios y reglas". */
const RUTA_FICHA_LOCAL = /^\/plazas\/[^/]+\/locales\/[^/]+$/;

export const NAVEGACION: readonly GrupoNavegacion[] = [
  {
    id: "operacion",
    titulo: "Operación",
    items: [
      { id: "inicio", etiqueta: "Inicio", ruta: "/", icono: Home },
      {
        id: "mapa",
        etiqueta: "Mapa de plazas",
        ruta: "/mapa-de-plazas",
        icono: Map,
      },
      {
        id: "plazas",
        etiqueta: "Plazas y locales",
        ruta: "/plazas/plz-alborada",
        icono: Building,
        prefijo: "/plazas",
        inactivoEn: RUTA_FICHA_LOCAL,
      },
      {
        id: "prospectos",
        etiqueta: "Prospectos",
        ruta: "/prospectos",
        prefijo: "/prospectos",
        icono: Users,
      },
      {
        id: "cotizaciones",
        etiqueta: "Cotizaciones",
        ruta: "/cotizaciones",
        icono: FileText,
        prefijo: "/cotizaciones",
      },
      {
        id: "contratos",
        etiqueta: "Contratos",
        ruta: "/contratos",
        icono: FileSignature,
        prefijo: "/contratos",
      },
      {
        id: "cobranza",
        etiqueta: "Cobranza",
        ruta: "/cobranza",
        icono: Receipt,
        badge: "cobranza",
        prefijo: "/cobranza",
      },
    ],
  },
  {
    id: "administracion",
    titulo: "Administración",
    items: [
      {
        id: "precios-y-reglas",
        etiqueta: "Precios y reglas",
        ruta: "/precios-y-reglas",
        icono: Tag,
        badge: "aprobaciones",
        prefijo: "/precios-y-reglas",
        tambienActivoEn: RUTA_FICHA_LOCAL,
      },
      {
        id: "terrenos",
        etiqueta: "Terrenos y proyectos",
        ruta: "/terrenos-y-proyectos",
        icono: Layers,
        prefijo: "/terrenos-y-proyectos",
      },
      {
        id: "reportes",
        etiqueta: "Reportes",
        ruta: "/reportes",
        icono: BarChart3,
        prefijo: "/reportes",
      },
      {
        id: "integraciones",
        etiqueta: "Integraciones",
        ruta: "/integraciones",
        icono: PlugZap,
        prefijo: "/integraciones",
      },
      {
        id: "configuracion",
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
