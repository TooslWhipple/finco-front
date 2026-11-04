import { describe, expect, it } from "vitest";
import {
  formatFecha,
  formatFechaLarga,
  formatMoneda,
  formatNumero,
  formatPorcentaje,
} from "./format";

describe("format", () => {
  it("formatea moneda MXN sin decimales", () => {
    expect(formatMoneda(18740)).toBe("$18,740");
  });

  it("formatea enteros con separador de miles", () => {
    expect(formatNumero(946)).toBe("946");
    expect(formatNumero(12345)).toBe("12,345");
  });

  it("formatea fracciones como porcentaje", () => {
    expect(formatPorcentaje(0.052)).toBe("5.2%");
    expect(formatPorcentaje(0.5)).toBe("50%");
  });

  it("formatea fechas en es-MX", () => {
    expect(formatFecha("2026-11-03")).toContain("2026");
    expect(formatFechaLarga("2026-11-03")).toBe("martes, 3 de noviembre de 2026");
  });
});
