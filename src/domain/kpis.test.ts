import { describe, expect, it } from "vitest";
import {
  carteraVencida,
  contratosPorVencer,
  localesDisponibles,
  localesPorColocar,
  montoCobrado,
  ocupacion,
  porcentajeCobrado,
  variacionOcupacion,
} from "./kpis";
import { crearFactura, crearLocal } from "./fixtures";
import { DEMO_TODAY } from "./fechas";
import type { Contrato } from "./tipos";

const contrato = (fin: string): Contrato => ({
  id: fin,
  localId: "x",
  locatarioId: "y",
  inicio: "2023-01-01",
  fin,
  rentaMensual: 1,
  estado: "VIGENTE",
});

describe("kpis de locales", () => {
  const locales = [
    crearLocal({ estatus: "OCUPADO" }),
    crearLocal({ estatus: "OCUPADO" }),
    crearLocal({ estatus: "DISPONIBLE" }),
    crearLocal({ estatus: "EN_COTIZACION" }),
  ];
  it("ocupación y disponibles", () => {
    expect(ocupacion(locales)).toBe(0.5);
    expect(localesDisponibles(locales)).toBe(1);
  });
  it("lista vacía no divide entre cero", () => {
    expect(ocupacion([])).toBe(0);
  });
});

describe("contratosPorVencer", () => {
  it("incluye hoy y +90 días; excluye vencidos y +91", () => {
    const r = contratosPorVencer(
      [
        contrato("2026-11-02"),
        contrato("2026-11-03"),
        contrato("2027-02-01"),
        contrato("2027-02-02"),
      ],
      DEMO_TODAY,
    );
    expect(r.map((c) => c.fin)).toEqual(["2026-11-03", "2027-02-01"]);
  });
});

describe("cobranza kpis", () => {
  const facturas = [
    crearFactura({ monto: 1_000, pagadaEl: "2026-11-01" }),
    crearFactura({ monto: 3_000, vencimiento: "2026-10-01" }),
    crearFactura({ monto: 4_000, vencimiento: "2026-11-20" }),
    crearFactura({ monto: 2_000, vencimiento: "2026-11-03" }),
  ];
  it("cartera vencida suma solo las vencidas", () => {
    expect(carteraVencida(facturas, DEMO_TODAY)).toBe(3_000);
  });
  it("porcentaje cobrado por monto", () => {
    expect(porcentajeCobrado(facturas)).toBeCloseTo(0.1);
    expect(porcentajeCobrado([])).toBe(0);
  });
});

describe("kpis del panorama", () => {
  it("locales por colocar suma disponibles y preventa", () => {
    const locales = [
      crearLocal({ estatus: "DISPONIBLE" }),
      crearLocal({ estatus: "PREVENTA" }),
      crearLocal({ estatus: "OCUPADO" }),
    ];
    expect(localesPorColocar(locales)).toBe(2);
  });

  it("monto cobrado suma solo las pagadas", () => {
    const facturas = [
      crearFactura({ monto: 100, pagadaEl: "2026-11-02" }),
      crearFactura({ monto: 50 }),
    ];
    expect(montoCobrado(facturas)).toBe(100);
  });

  it("variación de ocupación cuenta los contratos posteriores al corte", () => {
    const a = crearLocal({ id: "a", estatus: "OCUPADO" });
    const b = crearLocal({ id: "b", estatus: "OCUPADO" });
    const contratos: Contrato[] = [
      { ...contrato("2027-01-01"), localId: "a", inicio: "2026-10-15" },
      { ...contrato("2027-01-01"), localId: "b", inicio: "2026-08-01" },
    ];
    expect(variacionOcupacion([a, b], contratos, "2026-09-30")).toBe(50);
    expect(variacionOcupacion([], contratos, "2026-09-30")).toBe(0);
  });
});
