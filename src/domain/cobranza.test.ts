import { describe, expect, it } from "vitest";
import { antiguedadSaldos, diasAtraso, estatusCobro, rangoAntiguedad } from "./cobranza";
import { crearFactura } from "./fixtures";
import { DEMO_TODAY, diasEntre } from "./fechas";

const conAtraso = (dias: number, monto = 1_000) => {
  const d = new Date(Date.UTC(2026, 10, 3) - dias * 86_400_000)
    .toISOString()
    .slice(0, 10);
  return crearFactura({ vencimiento: d, monto });
};

describe("fechas", () => {
  it("DEMO_TODAY es martes 3 de nov 2026", () => {
    expect(new Date(`${DEMO_TODAY}T00:00:00Z`).getUTCDay()).toBe(2);
  });
  it("diasEntre", () => {
    expect(diasEntre("2026-11-03", "2026-11-10")).toBe(7);
    expect(diasEntre("2026-11-10", "2026-11-03")).toBe(-7);
  });
});

describe("estatusCobro", () => {
  it("pagada", () => {
    expect(estatusCobro(crearFactura({ pagadaEl: "2026-10-30" }), DEMO_TODAY)).toBe(
      "PAGADA",
    );
  });
  it("vence hoy sigue vigente (atraso 0)", () => {
    const f = conAtraso(0);
    expect(estatusCobro(f, DEMO_TODAY)).toBe("VIGENTE");
    expect(diasAtraso(f, DEMO_TODAY)).toBe(0);
  });
  it("vencimiento futuro es vigente", () => {
    expect(estatusCobro(crearFactura({ vencimiento: "2026-11-20" }), DEMO_TODAY)).toBe(
      "VIGENTE",
    );
  });
  it.each([6, 19, 54, 90])("atraso de %i días es vencida", (d) => {
    const f = conAtraso(d);
    expect(estatusCobro(f, DEMO_TODAY)).toBe("VENCIDA");
    expect(diasAtraso(f, DEMO_TODAY)).toBe(d);
  });
});

describe("antiguedadSaldos", () => {
  it("agrupa 6/19/54/90 días", () => {
    const cubos = antiguedadSaldos(
      [conAtraso(6, 100), conAtraso(19, 200), conAtraso(54, 300), conAtraso(90, 400)],
      DEMO_TODAY,
    );
    expect(cubos).toEqual([
      { rango: "1-30", facturas: 2, monto: 300 },
      { rango: "31-60", facturas: 1, monto: 300 },
      { rango: "61-90", facturas: 1, monto: 400 },
      { rango: "+90", facturas: 0, monto: 0 },
    ]);
  });
  it("ignora pagadas y vigentes; 91 días es +90", () => {
    const cubos = antiguedadSaldos(
      [
        conAtraso(0),
        crearFactura({ vencimiento: "2026-01-01", pagadaEl: "2026-02-01" }),
        conAtraso(91, 50),
      ],
      DEMO_TODAY,
    );
    expect(cubos.map((c) => c.facturas)).toEqual([0, 0, 0, 1]);
  });
  it("rangoAntiguedad en los bordes", () => {
    expect([30, 31, 60, 61, 90, 91].map(rangoAntiguedad)).toEqual([
      "1-30",
      "31-60",
      "31-60",
      "61-90",
      "61-90",
      "+90",
    ]);
  });
});
