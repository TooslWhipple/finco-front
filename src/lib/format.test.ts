import { describe, expect, it } from "vitest";
import {
  formatFecha,
  formatFechaLarga,
  formatHoras,
  formatMoneda,
  formatMomento,
  formatNumero,
  formatPorcentaje,
  montoEnLetra,
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

  it("formatea fecha y hora de un ISO sin zona", () => {
    expect(formatMomento("2026-11-03T15:56")).toBe(`${formatFecha("2026-11-03")} · 15:56`);
    expect(formatMomento("2026-11-03T09:05:00")).toBe(`${formatFecha("2026-11-03")} · 09:05`);
  });

  it("formatea horas con un decimal", () => {
    expect(formatHoras(14.64)).toBe("14.6 h");
    expect(formatHoras(4)).toBe("4 h");
    expect(formatHoras(1234.06)).toBe("1,234.1 h");
  });
});

describe("montoEnLetra", () => {
  it("convierte montos de renta típicos", () => {
    expect(montoEnLetra(18740)).toBe(
      "dieciocho mil setecientos cuarenta pesos 00/100 M.N.",
    );
    expect(montoEnLetra(24860)).toBe(
      "veinticuatro mil ochocientos sesenta pesos 00/100 M.N.",
    );
  });

  it("aplica apócopes y casos especiales", () => {
    expect(montoEnLetra(1)).toBe("un peso 00/100 M.N.");
    expect(montoEnLetra(21000)).toBe("veintiún mil pesos 00/100 M.N.");
    expect(montoEnLetra(31)).toBe("treinta y un pesos 00/100 M.N.");
    expect(montoEnLetra(100)).toBe("cien pesos 00/100 M.N.");
    expect(montoEnLetra(101_500)).toBe("ciento un mil quinientos pesos 00/100 M.N.");
    expect(montoEnLetra(1_000_000)).toBe("un millón de pesos 00/100 M.N.");
    expect(montoEnLetra(2_350_000)).toBe(
      "dos millones trescientos cincuenta mil pesos 00/100 M.N.",
    );
  });

  it("expresa los centavos en fracción", () => {
    expect(montoEnLetra(1250.5)).toBe("mil doscientos cincuenta pesos 50/100 M.N.");
  });
});
