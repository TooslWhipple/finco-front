import type { Cotizacion, FechaISO, OfertaCotizacion } from "./tipos";

type Terminos = Pick<Cotizacion, "rentaMensual" | "plazoMeses" | "mesesGracia">;

/** Gracia efectiva: sin dato equivale a cero meses. */
const gracia = (t: Terminos) => t.mesesGracia ?? 0;

/** ¿Cambió algún término que se ofrece (renta, plazo o gracia) entre dos versiones? */
export function hayOfertaNueva(antes: Terminos, despues: Terminos): boolean {
  return (
    antes.rentaMensual !== despues.rentaMensual ||
    antes.plazoMeses !== despues.plazoMeses ||
    gracia(antes) !== gracia(despues)
  );
}

/** Oferta con los términos vigentes de la cotización, firmada por un vendedor. */
export function crearOferta(
  id: string,
  terminos: Terminos,
  vendedorId: string,
  fecha: FechaISO,
  hora: string,
): OfertaCotizacion {
  return {
    id,
    fecha,
    hora,
    vendedorId,
    rentaMensual: terminos.rentaMensual,
    plazoMeses: terminos.plazoMeses,
    ...(terminos.mesesGracia ? { mesesGracia: terminos.mesesGracia } : {}),
  };
}

/** Aplica un parche a la cotización y agrega una oferta si cambiaron los términos. */
export function aplicarParcheConOferta(
  actual: Cotizacion,
  parche: Partial<Omit<Cotizacion, "id">>,
  vendedorId: string,
  fecha: FechaISO,
  hora: string,
): Cotizacion {
  const siguiente = { ...actual, ...parche };
  if (!hayOfertaNueva(actual, siguiente)) return siguiente;
  return {
    ...siguiente,
    ofertas: [
      ...actual.ofertas,
      crearOferta(
        `${actual.id}-of${actual.ofertas.length + 1}`,
        siguiente,
        vendedorId,
        fecha,
        hora,
      ),
    ],
  };
}

/** Diferencia de renta contra la oferta anterior; `null` en la primera. */
export function diferenciaContraAnterior(
  ofertas: readonly OfertaCotizacion[],
  indice: number,
): number | null {
  return indice > 0
    ? ofertas[indice].rentaMensual - ofertas[indice - 1].rentaMensual
    : null;
}
