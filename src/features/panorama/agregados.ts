import { localesPorColocar, ocupacion, rangoOcupacion } from "@/domain";
import type { Ciudad, Local, Plaza, RangoOcupacion } from "@/domain";

export interface ResumenPlaza {
  plaza: Plaza;
  ciudad: Ciudad;
  totalLocales: number;
  /** Locales por colocar: disponibles más preventa. */
  disponibles: number;
  /** Fracción 0-1. */
  ocupacion: number;
}

export interface ResumenCiudad {
  ciudad: Ciudad;
  plazas: ResumenPlaza[];
  totalPlazas: number;
  totalLocales: number;
  disponibles: number;
  /** Fracción 0-1 sobre los locales de plazas en operación. */
  ocupacion: number;
  /** Todas sus plazas están en preventa. */
  soloPreventa: boolean;
  rango: RangoOcupacion;
}

export function resumirPlazas(
  ciudades: Ciudad[],
  plazas: Plaza[],
  locales: Local[],
): ResumenPlaza[] {
  const ciudadPorId = new Map(ciudades.map((c) => [c.id, c]));
  const localesPorPlaza = new Map<string, Local[]>();
  for (const l of locales) {
    const lista = localesPorPlaza.get(l.plazaId);
    if (lista) lista.push(l);
    else localesPorPlaza.set(l.plazaId, [l]);
  }
  const resumen: ResumenPlaza[] = [];
  for (const plaza of plazas) {
    const ciudad = ciudadPorId.get(plaza.ciudadId);
    if (!ciudad) continue;
    const propios = localesPorPlaza.get(plaza.id) ?? [];
    resumen.push({
      plaza,
      ciudad,
      totalLocales: propios.length,
      disponibles: localesPorColocar(propios),
      ocupacion: ocupacion(propios),
    });
  }
  return resumen;
}

export function resumirCiudades(
  ciudades: Ciudad[],
  plazas: Plaza[],
  locales: Local[],
): ResumenCiudad[] {
  const porPlaza = resumirPlazas(ciudades, plazas, locales);
  const plazaPorId = new Map(plazas.map((p) => [p.id, p]));
  return ciudades
    .map((ciudad) => {
      const propias = porPlaza.filter((p) => p.ciudad.id === ciudad.id);
      const operativos = locales.filter(
        (l) =>
          plazaPorId.get(l.plazaId)?.ciudadId === ciudad.id &&
          plazaPorId.get(l.plazaId)?.estatus === "EN_OPERACION",
      );
      const ocupa = ocupacion(operativos);
      return {
        ciudad,
        plazas: propias,
        totalPlazas: propias.length,
        totalLocales: propias.reduce((s, p) => s + p.totalLocales, 0),
        disponibles: propias.reduce((s, p) => s + p.disponibles, 0),
        ocupacion: ocupa,
        soloPreventa:
          propias.length > 0 && propias.every((p) => p.plaza.estatus === "PREVENTA"),
        rango: rangoOcupacion(ocupa),
      };
    })
    .filter((c) => c.totalPlazas > 0);
}

/** Orden de los filtros de estado de la guía; los demás van después, alfabéticos. */
const ORDEN_ESTADOS = ["Sinaloa", "Baja California", "Baja California Sur", "Sonora"];

/** Estados distintos presentes en las ciudades, en el orden de la guía. */
export function estadosDe(ciudades: Ciudad[]): string[] {
  const posicion = (e: string) => {
    const i = ORDEN_ESTADOS.indexOf(e);
    return i === -1 ? ORDEN_ESTADOS.length : i;
  };
  return [...new Set(ciudades.map((c) => c.estado))].sort(
    (a, b) => posicion(a) - posicion(b) || a.localeCompare(b, "es"),
  );
}

export interface FiltroPanorama {
  /** `null` = todos los estados. */
  estado: string | null;
  soloDisponibilidad: boolean;
}

export function filtrarCiudades(
  ciudades: ResumenCiudad[],
  filtro: FiltroPanorama,
): ResumenCiudad[] {
  return ciudades.filter(
    (c) =>
      (filtro.estado === null || c.ciudad.estado === filtro.estado) &&
      (!filtro.soloDisponibilidad || c.disponibles > 0),
  );
}

export function filtrarPlazas(
  plazas: ResumenPlaza[],
  filtro: FiltroPanorama,
): ResumenPlaza[] {
  return plazas.filter(
    (p) =>
      (filtro.estado === null || p.ciudad.estado === filtro.estado) &&
      (!filtro.soloDisponibilidad || p.disponibles > 0),
  );
}

/** Plazas con más locales disponibles (desempata por nombre). */
export function masDisponibilidad(
  plazas: ResumenPlaza[],
  limite: number,
): ResumenPlaza[] {
  return plazas
    .filter((p) => p.disponibles > 0)
    .sort(
      (a, b) =>
        b.disponibles - a.disponibles ||
        a.plaza.nombre.localeCompare(b.plaza.nombre, "es"),
    )
    .slice(0, limite);
}
