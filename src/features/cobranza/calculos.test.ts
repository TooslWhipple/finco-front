import { describe, expect, it } from "vitest";
import type { Contrato, Factura } from "@/domain";
import {
  conteoPorEstatus,
  filtrarFacturas,
  kpisCobranza,
  nivelAtraso,
  pendientesDeAviso,
  facturasPorDia,
  avisosAutomaticosHoy,
  montoAlCorriente,
} from "./calculos";

const HOY = "2026-11-03";

const fac = (id: string, o: Partial<Factura> = {}): Factura => ({
  id,
  localId: "L1",
  locatarioId: "T1",
  mes: "2026-11",
  monto: 1_000,
  vencimiento: "2026-11-10",
  ...o,
});

const facturas = [
  fac("a", { pagadaEl: "2026-11-02" }),
  fac("b"),
  fac("c", { vencimiento: "2026-10-28", mes: "2026-10" }),
  fac("d", { vencimiento: "2026-11-01", localId: "L2", monto: 500 }),
];

describe("kpisCobranza", () => {
  it("separa lo facturado del mes de la cartera arrastrada", () => {
    const k = kpisCobranza(facturas, "2026-11", HOY);
    expect(k.facturado).toBe(2_500);
    expect(k.cobrado).toBe(1_000);
    expect(k.porcentajeCobrado).toBeCloseTo(0.4);
    expect(k.carteraVencida).toBe(1_500);
    expect(k.facturasVencidas).toBe(2);
    expect(k.porVencer).toBe(1);
  });
});

describe("filtros", () => {
  it("cuenta por estatus y filtra por estatus y plaza", () => {
    expect(conteoPorEstatus(facturas, HOY)).toEqual({
      TODAS: 4,
      PAGADA: 1,
      VIGENTE: 1,
      VENCIDA: 2,
    });
    const plazas = new Map([
      ["L1", "P1"],
      ["L2", "P2"],
    ]);
    expect(filtrarFacturas(facturas, HOY, "VENCIDA", plazas, null)).toHaveLength(2);
    expect(
      filtrarFacturas(facturas, HOY, "VENCIDA", plazas, "P2").map((f) => f.id),
    ).toEqual(["d"]);
  });

  it("los avisos solo van a vencidas sin aviso previo", () => {
    expect(pendientesDeAviso(facturas, HOY, ["c"]).map((f) => f.id)).toEqual(["d"]);
  });
});

describe("nivelAtraso", () => {
  it("escalona en 30 y 60 días", () => {
    expect(nivelAtraso(6)).toBe("leve");
    expect(nivelAtraso(30)).toBe("leve");
    expect(nivelAtraso(31)).toBe("medio");
    expect(nivelAtraso(60)).toBe("medio");
    expect(nivelAtraso(61)).toBe("grave");
  });
});

describe("facturasPorDia", () => {
  const contrato = (id: string, inicio: string, fin: string): Contrato => ({
    id,
    localId: id,
    locatarioId: "T",
    inicio,
    fin,
    rentaMensual: 1,
    estado: "VIGENTE",
  });
  it("cuenta contratos vigentes por día de aniversario en una ventana de 7 días", () => {
    const dias = facturasPorDia(
      [
        contrato("a", "2024-11-05", "2029-11-05"),
        contrato("b", "2023-03-05", "2028-03-05"),
        contrato("c", "2024-01-03", "2029-01-03"),
        contrato("vencido", "2021-11-05", "2026-11-04"),
        contrato("lejos", "2024-02-20", "2029-02-20"),
      ],
      HOY,
    );
    expect(dias).toHaveLength(7);
    expect(dias[0]).toEqual({ fecha: "2026-11-03", facturas: 1 });
    expect(dias[2]).toEqual({ fecha: "2026-11-05", facturas: 2 });
    expect(dias[6].fecha).toBe("2026-11-09");
  });
});

describe("indicadores adicionales", () => {
  it("compara la cartera con el cierre del mes anterior y cuenta locatarios", () => {
    const k = kpisCobranza(facturas, "2026-11", HOY);
    expect(k.carteraVencidaMesAnterior).toBe(1_000);
    expect(k.locatariosConAtraso).toBe(1);
    expect(k.locatariosMasDe60).toBe(0);
    expect(k.facturasDelMes).toBe(3);
  });

  it("el cubo al corriente excluye lo vencido", () => {
    expect(montoAlCorriente(facturas, HOY)).toBe(2_000);
  });

  it("los avisos de hoy salen 3 días antes, el día de pago y a los 5, 15 y 30 de atraso", () => {
    const avisos = avisosAutomaticosHoy(
      [
        fac("antes", { vencimiento: "2026-11-06" }),
        fac("hoy", { vencimiento: "2026-11-03" }),
        fac("cinco", { vencimiento: "2026-10-29" }),
        fac("seis", { vencimiento: "2026-10-28" }),
        fac("pagada", { vencimiento: "2026-11-03", pagadaEl: "2026-11-01" }),
      ],
      HOY,
    );
    expect(avisos).toEqual({ total: 3, whatsapp: 3, correo: 0 });
  });
});
