import { describe, expect, it } from "vitest";
import {
  carteraVencida,
  contratosPorVencer,
  localesDisponibles,
  localesPorColocar,
  localesSinAbrir,
  montoCobrado,
  ocupacion,
  porcentajeCobrado,
  variacionOcupacion,
} from "./kpis";
import { antiguedadSaldos } from "./cobranza";
import { crearContrato, crearFactura, crearLocal } from "./fixtures";
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

  const recargo = (o: Parameters<typeof crearFactura>[0]) =>
    crearFactura({ concepto: "RECARGO", origen: "EMISION", monto: 60, ...o });

  it("la cartera vencida suma el recargo con el vencimiento de su renta y cuadra con la antigüedad", () => {
    const renta = crearFactura({ id: "r1", monto: 3_000, vencimiento: "2026-10-01" });
    // Cargado hoy: por su propia fecha no estaría vencido, pero envejece con su renta.
    const cargo = recargo({
      id: "rec-r1-1",
      facturaOrigenId: "r1",
      vencimiento: DEMO_TODAY,
    });
    const conRecargo = [renta, cargo];
    expect(carteraVencida(conRecargo, DEMO_TODAY)).toBe(3_060);
    const total = antiguedadSaldos(conRecargo, DEMO_TODAY).reduce(
      (s, c) => s + c.monto,
      0,
    );
    expect(total).toBe(carteraVencida(conRecargo, DEMO_TODAY));
  });

  it("un recargo pagado no suma al cobrado ni altera el porcentaje", () => {
    const renta = crearFactura({ id: "r2", monto: 1_000, pagadaEl: "2026-11-02" });
    const otra = crearFactura({ id: "r3", monto: 1_000, vencimiento: "2026-11-20" });
    const pagado = recargo({
      id: "rec-r2-1",
      facturaOrigenId: "r2",
      pagadaEl: "2026-11-02",
    });
    expect(montoCobrado([renta, otra, pagado])).toBe(1_000);
    expect(porcentajeCobrado([renta, otra, pagado])).toBeCloseTo(0.5);
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

describe("localesSinAbrir", () => {
  const hoy = DEMO_TODAY;
  const apertura = {
    fecha: "2024-02-01",
    registradaPor: "usr-pmo",
    registradaEl: "2024-02-01",
  };
  const ocupado = (id: string) => crearLocal({ id, estatus: "OCUPADO" });
  const ctr = (localId: string, parcial: Partial<Contrato> = {}) =>
    crearContrato({
      id: `ctr-${localId}-${parcial.inicio ?? "base"}`,
      localId,
      ...parcial,
    });

  it("devuelve el OCUPADO con contrato vigente sin apertura", () => {
    const r = localesSinAbrir([ocupado("a")], [ctr("a")], hoy);
    expect(r.map((l) => l.id)).toEqual(["a"]);
  });

  it("excluye abiertos, terminados, disponibles y no ocupados con contrato vigente", () => {
    const locales = [
      ocupado("abierto"),
      ocupado("terminado"),
      crearLocal({ id: "disponible", estatus: "DISPONIBLE" }),
      crearLocal({ id: "cotizacion", estatus: "EN_COTIZACION" }),
    ];
    const contratos = [
      ctr("abierto", { apertura }),
      ctr("terminado", { estado: "TERMINADO" }),
      ctr("disponible"),
      ctr("cotizacion"),
    ];
    expect(localesSinAbrir(locales, contratos, hoy)).toEqual([]);
  });

  it("excluye un OCUPADO sin contratos vigentes, vencido o futuro", () => {
    const locales = [ocupado("sin"), ocupado("vencido"), ocupado("futuro")];
    const contratos = [
      ctr("vencido", { inicio: "2020-01-01", fin: "2026-11-02" }),
      ctr("futuro", { inicio: "2026-11-04", fin: "2029-11-04" }),
    ];
    expect(localesSinAbrir(locales, contratos, hoy)).toEqual([]);
  });

  it("un local renovado con apertura en uno de sus vigentes ya está abierto", () => {
    const contratos = [
      ctr("r", { inicio: "2024-01-01", apertura }),
      ctr("r", { inicio: "2026-11-01" }),
    ];
    expect(localesSinAbrir([ocupado("r")], contratos, hoy)).toEqual([]);
  });
});
