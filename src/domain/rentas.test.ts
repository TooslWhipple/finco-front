import { describe, expect, it } from "vitest";
import {
  cumplimientoPlan,
  impactoPlanExcepcion,
  rentasDeLocales,
  rentaVsMinimo,
} from "./rentas";

describe("rentaVsMinimo", () => {
  it("clasifica por rango contra el mínimo", () => {
    expect(rentaVsMinimo(9_000, 10_000)).toEqual({
      diferencia: -1_000,
      diferenciaPct: -10,
      rango: "BAJO_MINIMO",
    });
    expect(rentaVsMinimo(10_000, 10_000).rango).toBe("EN_MINIMO");
    expect(rentaVsMinimo(10_400, 10_000).rango).toBe("HASTA_5");
    expect(rentaVsMinimo(10_500, 10_000).rango).toBe("HASTA_10");
    expect(rentaVsMinimo(11_000, 10_000).rango).toBe("MAS_10");
  });
  it("mínimo en cero no divide entre cero", () => {
    expect(rentaVsMinimo(500, 0).diferenciaPct).toBe(0);
  });
});

describe("cumplimientoPlan", () => {
  const ocupados = [
    { renta: 9_800, rentaPlaneada: 10_000 },
    { renta: 20_000, rentaPlaneada: 20_000 },
  ];
  it("divide lo contratado entre lo planeado de los ocupados", () => {
    const r = cumplimientoPlan(ocupados);
    expect(r.planeada).toBe(30_000);
    expect(r.contratada).toBe(29_800);
    expect(r.cumplimientoPct).toBeCloseTo(99.33, 2);
    expect(r.potencialPct).toBe(r.cumplimientoPct);
  });
  it("el potencial suma los disponibles a precio de lista", () => {
    const r = cumplimientoPlan(ocupados, [
      { precioVigente: 10_000, rentaPlaneada: 9_800 },
    ]);
    expect(r.potencialPct).toBeCloseTo((39_800 / 39_800) * 100, 5);
  });
  it("sin ocupados no hay cumplimiento", () => {
    expect(cumplimientoPlan([]).cumplimientoPct).toBe(0);
  });
});

describe("impactoPlanExcepcion", () => {
  const ocupados = [{ renta: 29_800, rentaPlaneada: 30_000 }];
  it("calcula el cumplimiento nuevo y el impacto mensual y en la vida del contrato", () => {
    const r = impactoPlanExcepcion(
      { rentaSolicitada: 8_500 },
      { rentaPlaneada: 10_000 },
      ocupados,
      36,
      98,
    );
    expect(r.cumplimientoActualPct).toBeCloseTo(99.33, 2);
    expect(r.cumplimientoNuevoPct).toBeCloseTo(95.75, 2);
    expect(r.impactoMensual).toBe(1_500);
    expect(r.impactoVida).toBe(54_000);
    expect(r.bajoMeta).toBe(true);
  });
  it("no marca bajo meta si el cumplimiento sigue sobre ella", () => {
    const r = impactoPlanExcepcion(
      { rentaSolicitada: 9_900 },
      { rentaPlaneada: 10_000 },
      ocupados,
      12,
      98,
    );
    expect(r.bajoMeta).toBe(false);
  });
});

describe("rentasDeLocales", () => {
  const local = (id: string, estatus: "OCUPADO" | "DISPONIBLE" | "PREVENTA") => ({
    id,
    estatus,
    precioVigente: 10_000,
    rentaPlaneada: 9_800,
  });
  it("toma la renta del contrato vigente y manda los libres a precio de lista", () => {
    const r = rentasDeLocales(
      [local("a", "OCUPADO"), local("b", "DISPONIBLE"), local("c", "PREVENTA")],
      [{ localId: "a", fin: "2027-01-01", rentaMensual: 9_500 }],
      "2026-11-08",
    );
    expect(r.ocupados).toEqual([{ renta: 9_500, rentaPlaneada: 9_800 }]);
    expect(r.disponibles).toEqual([{ precioVigente: 10_000, rentaPlaneada: 9_800 }]);
  });
  it("un ocupado sin contrato vigente no cuenta", () => {
    const r = rentasDeLocales(
      [local("a", "OCUPADO")],
      [{ localId: "a", fin: "2026-01-01", rentaMensual: 9_500 }],
      "2026-11-08",
    );
    expect(r.ocupados).toEqual([]);
  });
});
