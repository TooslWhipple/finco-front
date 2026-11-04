import { describe, expect, it } from "vitest";
import type { ReglaActualizacion } from "@/domain";
import {
  añosRepricing,
  construirHistorial,
  frenteLocalM,
  formatPuntosUnDecimal,
  margenSobreMinimo,
  reglaConTipo,
  validarMinimo,
} from "./calculos";

const REGLA: ReglaActualizacion = {
  tipo: "INPC_PTS",
  puntos: 1,
  cuando: "ENERO",
  modo: "SEMIAUTOMATICO",
};

describe("margenSobreMinimo", () => {
  it("calcula monto y fracción", () => {
    const m = margenSobreMinimo({ precioVigente: 24_860, precioMinimo: 23_500 });
    expect(m.monto).toBe(1_360);
    expect(m.fraccion).toBeCloseTo(0.0579, 3);
    expect(m.fraccionSobreLista).toBeCloseTo(0.0547, 3);
  });
});

describe("validarMinimo", () => {
  it("acepta un entero positivo hasta la lista", () => {
    expect(validarMinimo(24_000, 24_860)).toBeNull();
    expect(validarMinimo(24_860, 24_860)).toBeNull();
  });
  it("rechaza ceros, decimales y mínimos sobre la lista", () => {
    expect(validarMinimo(0, 24_860)).not.toBeNull();
    expect(validarMinimo(100.5, 24_860)).not.toBeNull();
    expect(validarMinimo(Number.NaN, 24_860)).not.toBeNull();
    expect(validarMinimo(25_000, 24_860)).not.toBeNull();
  });
});

describe("añosRepricing", () => {
  it("va del año siguiente al último precio hasta el año de hoy", () => {
    const h = [{ fecha: "2021-11-01", precio: 18_740, motivo: "x" }];
    expect(añosRepricing(h, "2026-11-03")).toEqual([2022, 2023, 2024, 2025, 2026]);
  });
  it("devuelve vacío sin historial o si el último precio es de este año", () => {
    expect(añosRepricing([], "2026-11-03")).toEqual([]);
    expect(
      añosRepricing([{ fecha: "2026-02-01", precio: 1, motivo: "x" }], "2026-11-03"),
    ).toEqual([]);
  });
});

describe("reglaConTipo", () => {
  it("conserva cuándo y modo y solo deja los parámetros del tipo", () => {
    const fija = reglaConTipo(REGLA, "VALOR_FIJO");
    expect(fija).toEqual({
      tipo: "VALOR_FIJO",
      porcentajeFijo: 4,
      cuando: "ENERO",
      modo: "SEMIAUTOMATICO",
    });
    expect(reglaConTipo(fija, "INPC")).not.toHaveProperty("porcentajeFijo");
  });
});

describe("construirHistorial", () => {
  it("ordena lo más reciente primero y la bitácora arriba a igual fecha", () => {
    const h = construirHistorial(
      [{ fecha: "2021-11-01", precio: 18_740, motivo: "Contrato" }],
      [
        { fecha: "2026-11-03", autor: "Laura", titulo: "A", detalle: "d" },
        { fecha: "2026-11-03", autor: "Laura", titulo: "B", detalle: "d" },
      ],
      (n) => `$${n}`,
    );
    expect(h.map((e) => e.titulo)).toEqual(["B", "A", "Precio registrado: $18740"]);
  });
});

describe("frenteLocalM", () => {
  it("deriva el frente del área con un decimal", () => {
    expect(frenteLocalM(62)).toBe(5.2);
  });
});

describe("formatPuntosUnDecimal", () => {
  it("redondea a un decimal sin ruido de flotantes", () => {
    expect(formatPuntosUnDecimal(7.82)).toBe("7.8%");
    expect(formatPuntosUnDecimal(4.640000000000001)).toBe("4.6%");
  });
});
