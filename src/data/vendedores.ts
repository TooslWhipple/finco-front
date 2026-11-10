import {
  DEMO_TODAY,
  crearOferta,
  diasEntre,
  sumarDias,
  type Cotizacion,
  type OfertaCotizacion,
  type Prospecto,
} from "@/domain";
import { crearPrng, type Prng } from "./prng";

/** Cotización tal como la arman el héroe y el generador, antes de asignarle vendedor y ofertas. */
export type CotizacionBase = Omit<Cotizacion, "vendedorId" | "ofertas">;

const SEMILLA_OFERTAS = 7_309;

export const VENDEDOR_PRINCIPAL = "usr-sofia";

/** Reparto de 20 casillas: Sofía 9 (45%), Luis 7 (35%) y Jorge 4 (20%). */
const REPARTO: readonly string[] = [
  ...Array<string>(9).fill("usr-sofia"),
  ...Array<string>(7).fill("usr-luis"),
  ...Array<string>(4).fill("usr-jorge"),
];

/** Vendedor del elemento `indice`: reparto determinista que alterna casillas. */
export function vendedorDeIndice(indice: number): string {
  // 7 es primo con 20: recorre las 20 casillas sin agrupar a un mismo vendedor.
  return REPARTO[(indice * 7) % REPARTO.length];
}

const MINUTO = (rng: Prng) => String(rng.entero(0, 59)).padStart(2, "0");

/**
 * Entre 1 y 3 ofertas cronológicas que terminan en los términos actuales de la
 * cotización: las anteriores piden más renta y se van negociando a la baja.
 */
function ofertasDe(
  base: CotizacionBase,
  vendedorId: string,
  rng: Prng,
): OfertaCotizacion[] {
  const cantidad = rng.elegir([1, 1, 2, 2, 3]);
  const dias = Math.max(0, diasEntre(base.emitidaEl, DEMO_TODAY));
  return Array.from({ length: cantidad }, (_, i) => {
    const restantes = cantidad - 1 - i;
    const renta = base.rentaMensual + restantes * rng.elegir([200, 300, 500]);
    const fecha =
      cantidad === 1
        ? base.emitidaEl
        : sumarDias(base.emitidaEl, Math.round((i * dias) / (cantidad - 1)));
    const hora = `${String(9 + i * 2 + rng.entero(0, 1)).padStart(2, "0")}:${MINUTO(rng)}`;
    return crearOferta(
      `${base.id}-of${i + 1}`,
      { ...base, rentaMensual: restantes === 0 ? base.rentaMensual : renta },
      vendedorId,
      fecha,
      hora,
    );
  });
}

/**
 * Asigna vendedor y ofertas a las cotizaciones de la semilla. Las de
 * `paraSofia` (la héroe, la del candado y las de la demo PMO) quedan con Sofía.
 */
export function asignarVendedores(
  bases: readonly CotizacionBase[],
  paraSofia: ReadonlySet<string>,
): Cotizacion[] {
  const rng = crearPrng(SEMILLA_OFERTAS);
  return bases.map((base, i) => {
    const vendedorId = paraSofia.has(base.id) ? VENDEDOR_PRINCIPAL : vendedorDeIndice(i);
    const ofertas = ofertasDe(base, vendedorId, rng);
    return { ...base, vendedorId, ofertas };
  });
}

/** Vendedor del prospecto: el de su cotización, o el reparto determinista. */
export function vendedorDeProspecto(
  cotizacion: Pick<Cotizacion, "vendedorId"> | undefined,
  indice: number,
): Prospecto["vendedorId"] {
  return cotizacion?.vendedorId ?? vendedorDeIndice(indice + 3);
}
