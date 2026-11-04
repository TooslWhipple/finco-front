import { diasEntre } from "./fechas";
import type { Factura, EstatusCobro } from "./tipos";

export function estatusCobro(factura: Factura, hoy: string): EstatusCobro {
  if (factura.pagadaEl) return "PAGADA";
  return diasEntre(factura.vencimiento, hoy) > 0 ? "VENCIDA" : "VIGENTE";
}

/** Días de atraso (0 si pagada o aún no vence). */
export function diasAtraso(factura: Factura, hoy: string): number {
  if (factura.pagadaEl) return 0;
  return Math.max(0, diasEntre(factura.vencimiento, hoy));
}

export type RangoAntiguedad = "1-30" | "31-60" | "61-90" | "+90";

export interface CuboAntiguedad {
  rango: RangoAntiguedad;
  facturas: number;
  monto: number;
}

export function rangoAntiguedad(dias: number): RangoAntiguedad {
  if (dias <= 30) return "1-30";
  if (dias <= 60) return "31-60";
  if (dias <= 90) return "61-90";
  return "+90";
}

/** Agrupa las facturas vencidas por antigüedad del saldo. Siempre devuelve los 4 rangos. */
export function antiguedadSaldos(facturas: Factura[], hoy: string): CuboAntiguedad[] {
  const cubos: CuboAntiguedad[] = (["1-30", "31-60", "61-90", "+90"] as const).map(
    (rango) => ({
      rango,
      facturas: 0,
      monto: 0,
    }),
  );
  for (const f of facturas) {
    const dias = diasAtraso(f, hoy);
    if (dias === 0) continue;
    const cubo = cubos.find((c) => c.rango === rangoAntiguedad(dias))!;
    cubo.facturas += 1;
    cubo.monto += f.monto;
  }
  return cubos;
}
