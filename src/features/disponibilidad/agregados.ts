import type { Cotizacion, Local, Plaza } from "@/domain";

export interface OpcionPlazaDisponible {
  plazaId: string;
  nombre: string;
  disponibles: number;
}

export interface KpisDisponibilidad {
  /** Locales disponibles en todas las plazas. */
  localesDisponibles: number;
  /** Plazas con al menos un local disponible. */
  plazasConDisponibles: number;
  /** Cotizaciones que aún no generan contrato. */
  cotizacionesAbiertas: number;
}

/** Locales disponibles para cotizar, por código dentro de cada plaza. */
export function localesDisponibles(locales: readonly Local[]): Local[] {
  return locales
    .filter((l) => l.estatus === "DISPONIBLE")
    .sort((a, b) => a.codigo.localeCompare(b.codigo, "es", { numeric: true }));
}

/** Plazas que tienen locales disponibles, con su conteo, en el orden recibido. */
export function plazasConDisponibles(
  plazas: readonly Pick<Plaza, "id" | "nombre">[],
  locales: readonly Local[],
): OpcionPlazaDisponible[] {
  const cuenta = new Map<string, number>();
  for (const l of localesDisponibles(locales))
    cuenta.set(l.plazaId, (cuenta.get(l.plazaId) ?? 0) + 1);
  return plazas.flatMap((p) => {
    const disponibles = cuenta.get(p.id) ?? 0;
    return disponibles > 0 ? [{ plazaId: p.id, nombre: p.nombre, disponibles }] : [];
  });
}

export function kpisDisponibilidad(
  opciones: readonly OpcionPlazaDisponible[],
  cotizaciones: readonly Pick<Cotizacion, "estado">[],
): KpisDisponibilidad {
  return {
    localesDisponibles: opciones.reduce((suma, o) => suma + o.disponibles, 0),
    plazasConDisponibles: opciones.length,
    cotizacionesAbiertas: cotizaciones.filter((c) => c.estado !== "CONTRATO_GENERADO")
      .length,
  };
}

/** Plaza con la que abre la pantalla: la preferida si tiene disponibles, si no la primera que tenga. */
export function plazaInicial(
  opciones: readonly OpcionPlazaDisponible[],
  preferida: string,
): string {
  return opciones.some((o) => o.plazaId === preferida)
    ? preferida
    : (opciones[0]?.plazaId ?? "");
}

/** Ruta de nueva cotización con el local precargado. */
export function rutaCotizar(localId: string): string {
  return `/cotizaciones/nueva?local=${encodeURIComponent(localId)}`;
}
