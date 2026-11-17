import { localesSinAbrir, sobregirosPendientes, type Mantenimiento } from "@/domain";
import { kpisCobranza } from "@/features/cobranza/calculos";
import { kpisMapa, resumirPlazasMapa } from "@/features/mapa/agregados";
import { cumplimientoGlobal } from "@/features/reportes/calculos-rentas";
import type { DatosReporte } from "@/features/reportes/tipos";
import { MES_DEMO } from "@/lib/tiempo";

/** KPIs del inicio gerencial de Comercial, con las mismas funciones que las pantallas de detalle. */
export interface ResumenComercial {
  /** Plazas en operación (las de preventa no entran a los KPIs). */
  plazas: number;
  enPreventa: number;
  /** Fracción 0-1 de locales rentados sobre los de las plazas en operación. */
  ocupacion: number;
  localesSinAbrir: number;
  /** Fracción 0-1: Σ contratada / Σ planeada de las plazas en operación con plan. */
  cumplimiento: number;
  carteraVencida: number;
  sobregirosPendientes: number;
}

export function resumenComercial(
  datos: DatosReporte,
  mantenimientos: readonly Mantenimiento[],
): ResumenComercial {
  const mapa = kpisMapa(resumirPlazasMapa(datos.ciudades, datos.plazas, datos.locales));
  return {
    plazas: mapa.plazas - mapa.enPreventa,
    enPreventa: mapa.enPreventa,
    ocupacion: mapa.ocupacionPromedio,
    localesSinAbrir: localesSinAbrir(datos.locales, datos.contratos, datos.hoy).length,
    cumplimiento: cumplimientoGlobal(datos),
    carteraVencida: kpisCobranza([...datos.facturas], MES_DEMO, datos.hoy).carteraVencida,
    sobregirosPendientes: sobregirosPendientes(mantenimientos).length,
  };
}
