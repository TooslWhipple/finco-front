import { contratoVigenteParaApertura } from "./apertura";
import { diasEntre } from "./fechas";
import { conVencimientoDeRenta, estatusCobro, soloRentas } from "./cobranza";
import type { Contrato, Factura, FechaISO, Local } from "./tipos";

export const DIAS_POR_VENCER = 90;

/** Fracción de locales ocupados (0-1). */
export function ocupacion(locales: Local[]): number {
  if (locales.length === 0) return 0;
  return locales.filter((l) => l.estatus === "OCUPADO").length / locales.length;
}

export function localesDisponibles(locales: Local[]): number {
  return locales.filter((l) => l.estatus === "DISPONIBLE").length;
}

/** Contratos que vencen desde hoy hasta dentro de 90 días (inclusive). */
export function contratosPorVencer(contratos: Contrato[], hoy: string): Contrato[] {
  return contratos.filter((c) => {
    const dias = diasEntre(hoy, c.fin);
    return dias >= 0 && dias <= DIAS_POR_VENCER;
  });
}

/** Saldo vencido: rentas y recargos sin pagar, con los recargos envejecidos por su renta. */
export function carteraVencida(facturas: Factura[], hoy: string): number {
  return conVencimientoDeRenta(facturas)
    .filter((f) => estatusCobro(f, hoy) === "VENCIDA")
    .reduce((suma, f) => suma + f.monto, 0);
}

/** Fracción del monto facturado en rentas ya cobrado (0-1); los recargos no cuentan. */
export function porcentajeCobrado(facturas: Factura[]): number {
  const total = soloRentas(facturas).reduce((s, f) => s + f.monto, 0);
  if (total === 0) return 0;
  return montoCobrado(facturas) / total;
}

/** Monto ya cobrado de las rentas dadas; los recargos no cuentan. */
export function montoCobrado(facturas: Factura[]): number {
  return soloRentas(facturas)
    .filter((f) => f.pagadaEl)
    .reduce((s, f) => s + f.monto, 0);
}

/** Locales por colocar: los disponibles más los de plazas nuevas en preventa. */
export function localesPorColocar(locales: Local[]): number {
  return locales.filter((l) => l.estatus === "DISPONIBLE" || l.estatus === "PREVENTA")
    .length;
}

/**
 * Locales rentados que el locatario aún no abre: `OCUPADO`, con al menos un contrato
 * vigente (`contratoVigenteParaApertura`) y sin apertura en ninguno de sus vigentes.
 * Un local renovado con apertura en alguno de sus vigentes ya cuenta como abierto.
 */
export function localesSinAbrir(
  locales: readonly Local[],
  contratos: readonly Contrato[],
  hoy: FechaISO,
): Local[] {
  const vigentesPorLocal = new Map<string, Contrato[]>();
  for (const c of contratos) {
    if (!contratoVigenteParaApertura(c, hoy)) continue;
    const lista = vigentesPorLocal.get(c.localId);
    if (lista) lista.push(c);
    else vigentesPorLocal.set(c.localId, [c]);
  }
  return locales.filter((l) => {
    if (l.estatus !== "OCUPADO") return false;
    const vigentes = vigentesPorLocal.get(l.id);
    return vigentes !== undefined && vigentes.every((c) => !c.apertura);
  });
}

/**
 * Cambio de la ocupación, en puntos porcentuales, desde `corte` (ISO): los locales
 * ocupados hoy cuyo contrato empezó después del corte.
 */
export function variacionOcupacion(
  locales: Local[],
  contratos: Contrato[],
  corte: string,
): number {
  if (locales.length === 0) return 0;
  const idsNuevos = new Set(
    contratos.filter((c) => c.inicio > corte).map((c) => c.localId),
  );
  const nuevos = locales.filter((l) => l.estatus === "OCUPADO" && idsNuevos.has(l.id));
  return (nuevos.length / locales.length) * 100;
}

export type RangoOcupacion = "ALTA" | "MEDIA" | "BAJA";

/** Umbrales (fracción 0-1) de los rangos de ocupación. */
export const UMBRAL_ALTA = 0.9;
export const UMBRAL_MEDIA = 0.75;

export function rangoOcupacion(fraccion: number): RangoOcupacion {
  if (fraccion >= UMBRAL_ALTA) return "ALTA";
  if (fraccion >= UMBRAL_MEDIA) return "MEDIA";
  return "BAJA";
}
