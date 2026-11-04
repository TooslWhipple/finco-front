import type { RangoOcupacion } from "@/domain";
import type { ResumenCiudad } from "./agregados";

/** Clases de Tailwind (tokens de marca) de cada rango; el índigo es preventa. */
export const FONDO_RANGO: Record<RangoOcupacion, string> = {
  ALTA: "bg-brand-primary",
  MEDIA: "bg-brand-secondary",
  BAJA: "bg-brand-cta",
};

export const FONDO_PREVENTA = "bg-brand-indigo";

export function fondoCiudad(c: ResumenCiudad): string {
  return c.soloPreventa ? FONDO_PREVENTA : FONDO_RANGO[c.rango];
}

const BORDE_RANGO: Record<RangoOcupacion, string> = {
  ALTA: "border-l-brand-primary",
  MEDIA: "border-l-brand-secondary",
  BAJA: "border-l-brand-cta",
};

/** Clase del borde izquierdo de color de la etiqueta de una ciudad en el mapa. */
export function bordeCiudad(c: ResumenCiudad): string {
  return c.soloPreventa ? "border-l-brand-indigo" : BORDE_RANGO[c.rango];
}
