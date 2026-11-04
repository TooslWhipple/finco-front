import { describe, expect, it } from "vitest";
import { aplicarRegla, proponerActualizacionAnual, repricingAlLiberar } from "./precios";
import { crearLocal, REGLA_INPC_1PT } from "./fixtures";
import type { ReglaActualizacion } from "./tipos";

const base = { cuando: "ANIVERSARIO", modo: "AUTOMATICO" } as const;

describe("aplicarRegla", () => {
  it("INPC puro", () => {
    expect(aplicarRegla(10_000, { ...base, tipo: "INPC" }, 4)).toBe(10_400);
  });
  it("INPC + pts", () => {
    expect(aplicarRegla(10_000, REGLA_INPC_1PT, 4)).toBe(10_500);
  });
  it("valor fijo ignora el INPC", () => {
    const r: ReglaActualizacion = { ...base, tipo: "VALOR_FIJO", porcentajeFijo: 5 };
    expect(aplicarRegla(10_000, r, 9)).toBe(10_500);
  });
});

describe("repricingAlLiberar", () => {
  it("A-09 pasa de $18,740 a $24,860 con INPC + 1 pt (2022-2026)", () => {
    const local = crearLocal();
    const res = repricingAlLiberar(
      local.historial,
      REGLA_INPC_1PT,
      [2022, 2023, 2024, 2025, 2026],
    );
    expect(res?.precioBase).toBe(18_740);
    expect(res?.precioFinal).toBe(24_860);
    expect(res?.pasos).toHaveLength(5);
  });
  it("local sin historial devuelve null", () => {
    expect(repricingAlLiberar([], REGLA_INPC_1PT, [2022])).toBeNull();
  });
  it("parte del registro más reciente", () => {
    const res = repricingAlLiberar(
      [
        { fecha: "2024-01-01", precio: 20_000, motivo: "x" },
        { fecha: "2021-01-01", precio: 10_000, motivo: "y" },
      ],
      { ...base, tipo: "VALOR_FIJO", porcentajeFijo: 10 },
      [2025],
    );
    expect(res?.precioFinal).toBe(22_000);
  });
  it("sin años no cambia el precio", () => {
    expect(
      repricingAlLiberar(
        [{ fecha: "2021-01-01", precio: 5_000, motivo: "" }],
        REGLA_INPC_1PT,
        [],
      )?.precioFinal,
    ).toBe(5_000);
  });
  it("falla si falta el INPC del año", () => {
    expect(() =>
      repricingAlLiberar(
        [{ fecha: "2021-01-01", precio: 1, motivo: "" }],
        REGLA_INPC_1PT,
        [1999],
      ),
    ).toThrow();
  });
});

describe("proponerActualizacionAnual", () => {
  it("propone según la regla y queda pendiente", () => {
    const c = proponerActualizacionAnual(
      crearLocal({ precioVigente: 20_000, precioMinimo: 18_000 }),
      2027,
    );
    expect(c.precioPropuesto).toBe(Math.round(20_000 * 1.049));
    expect(c.estado).toBe("PENDIENTE");
    expect(c.variacionPct).toBeCloseTo(4.9, 2);
  });
  it("no propone por debajo del mínimo", () => {
    const c = proponerActualizacionAnual(
      crearLocal({
        precioVigente: 20_000,
        precioMinimo: 23_500,
        regla: { ...base, tipo: "VALOR_FIJO", porcentajeFijo: 1 },
      }),
      2027,
    );
    expect(c.precioPropuesto).toBe(23_500);
  });
});
