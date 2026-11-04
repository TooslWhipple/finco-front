import { localesPorColocar, ocupacion, rangoOcupacion } from "@/domain";
import type { Ciudad, Local, Plaza, PuntoMapa, RangoOcupacion } from "@/domain";

/** Una plaza lista para el mapa: su posición, sus cifras y su rango de ocupación. */
export interface PlazaMapa extends PuntoMapa {
  plaza: Plaza;
  ciudad: Ciudad;
  totalLocales: number;
  /** Locales por colocar: disponibles más preventa. */
  disponibles: number;
  ocupados: number;
  /** Fracción 0-1 sobre todos los locales de la plaza. */
  ocupacion: number;
  /** Renta mensual promedio de los locales ocupados; 0 si no hay ninguno. */
  rentaPromedio: number;
  /** `null` en preventa: aún no tiene ocupación que clasificar. */
  rango: RangoOcupacion | null;
}

export function resumirPlazasMapa(
  ciudades: readonly Ciudad[],
  plazas: readonly Plaza[],
  locales: readonly Local[],
): PlazaMapa[] {
  const ciudadPorId = new Map(ciudades.map((c) => [c.id, c]));
  const localesPorPlaza = new Map<string, Local[]>();
  for (const l of locales) {
    const lista = localesPorPlaza.get(l.plazaId);
    if (lista) lista.push(l);
    else localesPorPlaza.set(l.plazaId, [l]);
  }
  const resumen: PlazaMapa[] = [];
  for (const plaza of plazas) {
    const ciudad = ciudadPorId.get(plaza.ciudadId);
    if (!ciudad) continue;
    const propios = localesPorPlaza.get(plaza.id) ?? [];
    const rentados = propios.filter((l) => l.estatus === "OCUPADO");
    const fraccion = ocupacion(propios);
    resumen.push({
      id: plaza.id,
      lat: plaza.coordenadas.lat,
      lng: plaza.coordenadas.lng,
      plaza,
      ciudad,
      totalLocales: propios.length,
      disponibles: localesPorColocar(propios),
      ocupados: rentados.length,
      ocupacion: fraccion,
      rentaPromedio:
        rentados.length === 0
          ? 0
          : rentados.reduce((s, l) => s + l.precioVigente, 0) / rentados.length,
      rango: plaza.estatus === "PREVENTA" ? null : rangoOcupacion(fraccion),
    });
  }
  return resumen;
}

export const TODOS = "TODOS";

export interface FiltroMapa {
  estatus: typeof TODOS | Plaza["estatus"];
  /** Id de ciudad, o `TODOS`. */
  ciudadId: string;
  rango: typeof TODOS | RangoOcupacion;
}

export const FILTRO_INICIAL: FiltroMapa = {
  estatus: TODOS,
  ciudadId: TODOS,
  rango: TODOS,
};

/** El rango de ocupación solo existe en plazas en operación: filtrarlo excluye la preventa. */
export function filtrarPlazasMapa(
  plazas: readonly PlazaMapa[],
  filtro: FiltroMapa,
): PlazaMapa[] {
  return plazas.filter(
    (p) =>
      (filtro.estatus === TODOS || p.plaza.estatus === filtro.estatus) &&
      (filtro.ciudadId === TODOS || p.ciudad.id === filtro.ciudadId) &&
      (filtro.rango === TODOS || p.rango === filtro.rango),
  );
}

export interface KpisMapa {
  plazas: number;
  ciudades: number;
  /** Fracción 0-1 sobre los locales de las plazas en operación. */
  ocupacionPromedio: number;
  enPreventa: number;
  disponibles: number;
}

export function kpisMapa(plazas: readonly PlazaMapa[]): KpisMapa {
  const operativas = plazas.filter((p) => p.plaza.estatus === "EN_OPERACION");
  const locales = operativas.reduce((s, p) => s + p.totalLocales, 0);
  const ocupados = operativas.reduce((s, p) => s + p.ocupados, 0);
  return {
    plazas: plazas.length,
    ciudades: new Set(plazas.map((p) => p.ciudad.id)).size,
    ocupacionPromedio: locales === 0 ? 0 : ocupados / locales,
    enPreventa: plazas.length - operativas.length,
    disponibles: plazas.reduce((s, p) => s + p.disponibles, 0),
  };
}

export type OrdenLista = "OCUPACION" | "DISPONIBLES" | "NOMBRE";

export function ordenarPlazasMapa(
  plazas: readonly PlazaMapa[],
  orden: OrdenLista,
): PlazaMapa[] {
  const porNombre = (a: PlazaMapa, b: PlazaMapa) =>
    a.plaza.nombre.localeCompare(b.plaza.nombre, "es");
  return [...plazas].sort((a, b) => {
    if (orden === "OCUPACION") return b.ocupacion - a.ocupacion || porNombre(a, b);
    if (orden === "DISPONIBLES") return b.disponibles - a.disponibles || porNombre(a, b);
    return porNombre(a, b);
  });
}

/** Ciudades con plazas, para el selector del filtro. */
export function ciudadesConPlazas(plazas: readonly PlazaMapa[]): Ciudad[] {
  const porId = new Map(plazas.map((p) => [p.ciudad.id, p.ciudad]));
  return [...porId.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}
