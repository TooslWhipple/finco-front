import { formatPuntos } from "@/lib/format";
import {
  DEMO_TODAY,
  DIAS_POR_VENCER,
  contratosPorVencer,
  diasAtraso,
  diasEntre,
  type Contrato,
  type Factura,
  type Local,
  type ReglaActualizacion,
} from "@/domain";

/** Estado visual de un local en el plano (más fino que `EstatusLocal`). */
export type CategoriaLocal =
  "DISPONIBLE" | "RENTADO" | "POR_VENCER" | "EN_COTIZACION" | "CON_ATRASO" | "PREVENTA";

export const ETIQUETA_CATEGORIA: Record<CategoriaLocal, string> = {
  DISPONIBLE: "Disponible",
  RENTADO: "Rentado",
  POR_VENCER: "Por vencer (≤90 días)",
  EN_COTIZACION: "En cotización",
  CON_ATRASO: "Rentado · con atraso",
  PREVENTA: "Preventa",
};

/** Orden de la leyenda y del filtro por estatus. */
export const CATEGORIAS: readonly CategoriaLocal[] = [
  "DISPONIBLE",
  "RENTADO",
  "POR_VENCER",
  "EN_COTIZACION",
  "CON_ATRASO",
  "PREVENTA",
];

/** Contexto de cartera de una plaza, indexado por local. */
export interface ContextoPlaza {
  contratoPorLocal: ReadonlyMap<string, Contrato>;
  /** Locales con al menos una factura vencida. */
  localesConAtraso: ReadonlySet<string>;
}

export function crearContextoPlaza(
  locales: readonly Local[],
  contratos: readonly Contrato[],
  facturas: readonly Factura[],
  hoy: string = DEMO_TODAY,
): ContextoPlaza {
  const ids = new Set(locales.map((l) => l.id));
  const contratoPorLocal = new Map<string, Contrato>();
  for (const c of contratos) {
    if (ids.has(c.localId) && diasEntre(hoy, c.fin) >= 0)
      contratoPorLocal.set(c.localId, c);
  }
  const localesConAtraso = new Set<string>();
  for (const f of facturas) {
    if (ids.has(f.localId) && diasAtraso(f, hoy) > 0) localesConAtraso.add(f.localId);
  }
  return { contratoPorLocal, localesConAtraso };
}

export function categoriaLocal(
  local: Local,
  ctx: ContextoPlaza,
  hoy: string = DEMO_TODAY,
): CategoriaLocal {
  switch (local.estatus) {
    case "DISPONIBLE":
      return "DISPONIBLE";
    case "EN_COTIZACION":
      return "EN_COTIZACION";
    case "PREVENTA":
      return "PREVENTA";
    case "OCUPADO": {
      if (ctx.localesConAtraso.has(local.id)) return "CON_ATRASO";
      const contrato = ctx.contratoPorLocal.get(local.id);
      if (contrato) {
        const dias = diasEntre(hoy, contrato.fin);
        if (dias >= 0 && dias <= DIAS_POR_VENCER) return "POR_VENCER";
      }
      return "RENTADO";
    }
  }
}

export interface ResumenPlazaLocales {
  total: number;
  porPlanta: Record<string, number>;
  rentados: number;
  /** Fracción de locales rentados (0-1). */
  ocupacion: number;
  disponibles: number;
  enCotizacion: number;
  /** Renta mensual promedio por m² de los locales rentados. */
  rentaPromedioM2: number;
  porVencer: number;
  conAtraso: number;
  montoVencido: number;
}

export function resumirLocalesPlaza(
  locales: readonly Local[],
  contratos: readonly Contrato[],
  facturas: readonly Factura[],
  hoy: string = DEMO_TODAY,
): ResumenPlazaLocales {
  const ids = new Set(locales.map((l) => l.id));
  const rentadosLista = locales.filter((l) => l.estatus === "OCUPADO");
  const m2 = rentadosLista.reduce((s, l) => s + l.areaM2, 0);
  const renta = rentadosLista.reduce((s, l) => s + l.precioVigente, 0);
  const porPlanta: Record<string, number> = {};
  for (const l of locales) porPlanta[l.plantaId] = (porPlanta[l.plantaId] ?? 0) + 1;
  const vencidas = facturas.filter((f) => ids.has(f.localId) && diasAtraso(f, hoy) > 0);
  return {
    total: locales.length,
    porPlanta,
    rentados: rentadosLista.length,
    ocupacion: locales.length === 0 ? 0 : rentadosLista.length / locales.length,
    disponibles: locales.filter((l) => l.estatus === "DISPONIBLE").length,
    enCotizacion: locales.filter((l) => l.estatus === "EN_COTIZACION").length,
    rentaPromedioM2: m2 === 0 ? 0 : renta / m2,
    porVencer: contratosPorVencer(
      contratos.filter((c) => ids.has(c.localId)),
      hoy,
    ).length,
    conAtraso: new Set(vencidas.map((f) => f.localId)).size,
    montoVencido: vencidas.reduce((s, f) => s + f.monto, 0),
  };
}

/** Incremento de la regla sin su calendario: "INPC + 1 pt". */
export function describirIncremento(regla: ReglaActualizacion): string {
  return regla.tipo === "INPC"
    ? "INPC"
    : regla.tipo === "INPC_PTS"
      ? `INPC + ${regla.puntos ?? 0} pt${regla.puntos === 1 ? "" : "s"}`
      : `Valor fijo ${formatPuntos(regla.porcentajeFijo ?? 0)}`;
}

/** Regla de actualización en una línea: "INPC + 1 pt · en aniversario". */
export function describirRegla(regla: ReglaActualizacion): string {
  const base = describirIncremento(regla);
  const cuando = regla.cuando === "ENERO" ? "cada enero" : "en aniversario";
  return `${base} · ${cuando}`;
}

export interface Vencimiento {
  contrato: Contrato;
  local: Local;
  dias: number;
}

/** Contratos de la plaza que vencen en los próximos 90 días, del más próximo al más lejano. */
export function proximosVencimientos(
  locales: readonly Local[],
  contratos: readonly Contrato[],
  hoy: string = DEMO_TODAY,
): Vencimiento[] {
  const porId = new Map(locales.map((l) => [l.id, l]));
  return contratosPorVencer(
    contratos.filter((c) => porId.has(c.localId)),
    hoy,
  )
    .map((contrato) => ({
      contrato,
      local: porId.get(contrato.localId)!,
      dias: diasEntre(hoy, contrato.fin),
    }))
    .sort((a, b) => a.dias - b.dias);
}
