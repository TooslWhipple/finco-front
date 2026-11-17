import { describe, expect, it } from "vitest";
import {
  DEMO_TODAY,
  localesSinAbrir,
  sobregirosPendientes,
  solicitarSobregiro,
} from "@/domain";
import { crearSeed } from "@/data/seed";
import { kpisCobranza } from "@/features/cobranza/calculos";
import { kpisMapa, resumirPlazasMapa } from "@/features/mapa/agregados";
import {
  cumplimientoGlobal,
  reporteCumplimientoPlan,
} from "@/features/reportes/calculos-rentas";
import type { DatosReporte } from "@/features/reportes/tipos";
import { MES_DEMO } from "@/lib/tiempo";
import { resumenComercial } from "./agregados";

const seed = crearSeed();
const datos: DatosReporte = {
  ciudades: seed.ciudades,
  plazas: seed.plazas,
  locales: seed.locales,
  contratos: seed.contratos,
  facturas: seed.facturas,
  prospectos: seed.prospectos,
  terrenos: seed.terrenos,
  locatarios: seed.locatarios,
  cotizaciones: seed.cotizaciones,
  excepciones: seed.excepciones,
  hoy: DEMO_TODAY,
};

describe("resumenComercial", () => {
  const r = resumenComercial(datos, seed.mantenimientos);

  it("plazas y ocupación salen de kpisMapa (solo en operación)", () => {
    const mapa = kpisMapa(resumirPlazasMapa(datos.ciudades, datos.plazas, datos.locales));
    expect(r.plazas).toBe(mapa.plazas - mapa.enPreventa);
    expect(r.enPreventa).toBe(mapa.enPreventa);
    expect(r.plazas).toBe(
      datos.plazas.filter((p) => p.estatus === "EN_OPERACION").length,
    );
    expect(r.ocupacion).toBe(mapa.ocupacionPromedio);
  });

  it("el cumplimiento es Σ contratada / Σ planeada del reporte de cumplimiento", () => {
    const filas = reporteCumplimientoPlan(datos).tabla.filas;
    const planeada = filas.reduce((s, f) => s + Number(f.planeada), 0);
    const contratada = filas.reduce((s, f) => s + Number(f.contratada), 0);
    expect(planeada).toBeGreaterThan(0);
    expect(r.cumplimiento).toBeCloseTo(contratada / planeada, 10);
    expect(r.cumplimiento).toBe(cumplimientoGlobal(datos));
  });

  it("locales sin abrir, cartera vencida y sobregiros usan las funciones del detalle", () => {
    expect(r.localesSinAbrir).toBe(
      localesSinAbrir(datos.locales, datos.contratos, datos.hoy).length,
    );
    expect(r.carteraVencida).toBe(
      kpisCobranza([...datos.facturas], MES_DEMO, datos.hoy).carteraVencida,
    );
    expect(r.sobregirosPendientes).toBe(sobregirosPendientes(seed.mantenimientos).length);
  });

  it("cuenta un sobregiro nuevo en cuanto queda pendiente", () => {
    const libre = seed.mantenimientos.find((m) => m.autorizacionSobregiro === undefined)!;
    const pendiente = solicitarSobregiro(libre, {
      solicitadoPor: "Ana",
      hoy: DEMO_TODAY,
      excedente: 100,
    });
    const otros = seed.mantenimientos.filter((m) => m.id !== libre.id);
    expect(resumenComercial(datos, [pendiente, ...otros]).sobregirosPendientes).toBe(
      sobregirosPendientes(otros).length + 1,
    );
  });
});

describe("cumplimientoGlobal", () => {
  it("es 0 sin plazas en operación con plan", () => {
    expect(cumplimientoGlobal({ ...datos, plazas: [] })).toBe(0);
  });
});
