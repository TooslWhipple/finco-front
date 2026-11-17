import { describe, expect, it } from "vitest";
import {
  antiguedadSaldos,
  clientesMorosos,
  conVencimientoDeRenta,
  diasAtraso,
  estatusCobro,
  facturasDelCorte,
  rangoAntiguedad,
} from "./cobranza";
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

describe("facturasDelCorte", () => {
  const nov = crearFactura({ id: "nov", mes: "2026-11", vencimiento: "2026-11-20" });
  const vieja = crearFactura({ id: "vieja", mes: "2026-08", vencimiento: "2026-08-10" });
  const viejaPagada = crearFactura({
    id: "vieja-pagada",
    mes: "2026-07",
    vencimiento: "2026-07-10",
    pagadaEl: "2026-11-03",
  });
  const pagadaAntes = crearFactura({
    id: "pagada-antes",
    mes: "2026-09",
    vencimiento: "2026-09-10",
    pagadaEl: "2026-10-01",
  });
  const dic = crearFactura({
    id: "fac-em-A-09-2026-12",
    mes: "2026-12",
    vencimiento: "2026-12-05",
    origen: "EMISION",
  });
  const recargo = crearFactura({
    id: "rec-vieja-1",
    concepto: "RECARGO",
    origen: "EMISION",
    facturaOrigenId: "vieja",
    mes: "2026-08",
    vencimiento: "2026-08-16",
    monto: 200,
  });
  const recargoHuerfano = crearFactura({
    id: "rec-pagada-antes-1",
    concepto: "RECARGO",
    facturaOrigenId: "pagada-antes",
    mes: "2026-09",
  });
  const todas = [nov, vieja, viejaPagada, pagadaAntes, dic, recargo, recargoHuerfano];
  const ids = (mes: string) => facturasDelCorte(todas, mes, DEMO_TODAY).map((f) => f.id);

  it("un mes posterior a hoy muestra solo las facturas de ese mes", () => {
    expect(ids("2026-12")).toEqual(["fac-em-A-09-2026-12"]);
  });

  it("el corte del mes arrastra las vencidas y la vieja pagada dentro del mes, con su recargo", () => {
    expect(ids("2026-11")).toEqual(["nov", "vieja", "vieja-pagada", "rec-vieja-1"]);
  });

  it("el recargo sigue a su renta: sale con ella", () => {
    const sinRenta = facturasDelCorte([nov, recargo], "2026-11", DEMO_TODAY);
    expect(sinRenta.map((f) => f.id)).toEqual(["nov"]);
  });
});

describe("recargos en los saldos", () => {
  const renta = conAtraso(40, 10_000);
  const rentaConId = { ...renta, id: "fac-r" };
  const recargo = (k: number, vencimiento: string) =>
    crearFactura({
      id: `rec-fac-r-${k}`,
      concepto: "RECARGO",
      origen: "EMISION",
      facturaOrigenId: "fac-r",
      mes: rentaConId.mes,
      monto: 200,
      vencimiento,
    });
  const recargos = [recargo(1, "2026-09-30"), recargo(2, "2026-10-30")];

  it("conVencimientoDeRenta da a cada recargo el vencimiento de su renta", () => {
    const huerfano = crearFactura({
      id: "rec-x-1",
      concepto: "RECARGO",
      facturaOrigenId: "x",
      vencimiento: "2026-10-10",
    });
    const salida = conVencimientoDeRenta([rentaConId, ...recargos, huerfano]);
    expect(salida.slice(1, 3).map((f) => f.vencimiento)).toEqual([
      rentaConId.vencimiento,
      rentaConId.vencimiento,
    ]);
    expect(salida[0]).toBe(rentaConId);
    expect(salida[3].vencimiento).toBe("2026-10-10");
  });

  it("antiguedadSaldos cuenta solo la renta y suma sus recargos en el rango de la renta", () => {
    const cubos = antiguedadSaldos([rentaConId, ...recargos], DEMO_TODAY);
    expect(cubos[1]).toEqual({ rango: "31-60", facturas: 1, monto: 10_400 });
    expect(cubos[0]).toEqual({ rango: "1-30", facturas: 0, monto: 0 });
  });
});

describe("clientesMorosos", () => {
  const renta = (id: string, locatarioId: string, dias: number, monto = 1_000) => ({
    ...conAtraso(dias, monto),
    id,
    locatarioId,
  });
  const facturas = [
    renta("a1", "A", 10),
    renta("a2", "A", 45),
    renta("b1", "B", 45, 5_000),
    renta("c1", "C", 6, 100),
    { ...renta("d1", "D", 90), pagadaEl: "2026-10-01" },
    crearFactura({ id: "e1", locatarioId: "E", vencimiento: "2026-11-20" }),
    crearFactura({ id: "a3", locatarioId: "A", monto: 500, vencimiento: "2026-11-20" }),
    { ...renta("a0", "A", 60, 7_000), pagadaEl: "2026-11-01" },
    crearFactura({
      id: "rec-a2-1",
      locatarioId: "A",
      concepto: "RECARGO",
      origen: "EMISION",
      facturaOrigenId: "a2",
      monto: 20,
      vencimiento: DEMO_TODAY,
    }),
  ];

  it("incluye a todos los morosos y ordena por atraso y luego por saldo", () => {
    const morosos = clientesMorosos(facturas, DEMO_TODAY);
    expect(morosos.map((m) => m.locatarioId)).toEqual(["B", "A", "C"]);
  });

  it("toma el máximo atraso de sus rentas vencidas y suma al saldo todo lo sin pagar", () => {
    const a = clientesMorosos(facturas, DEMO_TODAY).find((m) => m.locatarioId === "A")!;
    expect(a.dias).toBe(45);
    // Rentas vencidas (1 000 + 1 000), su recargo (20) y la renta aún vigente (500);
    // la pagada no suma.
    expect(a.saldo).toBe(2_520);
    expect(a.facturaIds).toEqual(["a2", "a1"]);
  });
});
