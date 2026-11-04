import { describe, expect, it } from "vitest";
import { crearFactura, crearLocal } from "@/domain/fixtures";
import type { Contrato } from "@/domain";
import {
  categoriaLocal,
  crearContextoPlaza,
  describirRegla,
  proximosVencimientos,
  resumirLocalesPlaza,
} from "./resumen";

const HOY = "2026-11-03";

const contrato = (localId: string, fin: string): Contrato => ({
  id: `ctr-${localId}`,
  localId,
  locatarioId: "loc-1",
  inicio: "2024-01-01",
  fin,
  rentaMensual: 10_000,
  estado: "VIGENTE",
});

const locales = [
  crearLocal({
    id: "p-A-01",
    codigo: "A-01",
    estatus: "OCUPADO",
    areaM2: 50,
    precioVigente: 20_000,
  }),
  crearLocal({
    id: "p-A-02",
    codigo: "A-02",
    estatus: "OCUPADO",
    areaM2: 50,
    precioVigente: 30_000,
  }),
  crearLocal({
    id: "p-A-03",
    codigo: "A-03",
    estatus: "OCUPADO",
    areaM2: 50,
    precioVigente: 10_000,
  }),
  crearLocal({ id: "p-A-04", codigo: "A-04", estatus: "DISPONIBLE" }),
  crearLocal({ id: "p-A-05", codigo: "A-05", estatus: "EN_COTIZACION" }),
];
const contratos = [
  contrato("p-A-01", "2027-12-31"),
  contrato("p-A-02", "2026-11-30"),
  contrato("p-A-03", "2027-12-31"),
];
const facturas = [
  crearFactura({ id: "f1", localId: "p-A-03", vencimiento: "2026-10-20" }),
];

describe("categoriaLocal", () => {
  const ctx = crearContextoPlaza(locales, contratos, facturas, HOY);
  it("clasifica cada local", () => {
    const cat = (i: number) => categoriaLocal(locales[i], ctx, HOY);
    expect(cat(0)).toBe("RENTADO");
    expect(cat(1)).toBe("POR_VENCER");
    expect(cat(2)).toBe("CON_ATRASO");
    expect(cat(3)).toBe("DISPONIBLE");
    expect(cat(4)).toBe("EN_COTIZACION");
  });
});

describe("resumirLocalesPlaza", () => {
  it("calcula los KPIs de la plaza", () => {
    const r = resumirLocalesPlaza(locales, contratos, facturas, HOY);
    expect(r.total).toBe(5);
    expect(r.rentados).toBe(3);
    expect(r.ocupacion).toBeCloseTo(0.6);
    expect(r.disponibles).toBe(1);
    expect(r.enCotizacion).toBe(1);
    expect(r.rentaPromedioM2).toBeCloseTo(400);
    expect(r.porVencer).toBe(1);
    expect(r.conAtraso).toBe(1);
    expect(r.montoVencido).toBe(facturas[0].monto);
  });
});

describe("proximosVencimientos", () => {
  it("lista solo los de 90 días, ordenados", () => {
    const v = proximosVencimientos(locales, contratos, HOY);
    expect(v.map((x) => x.local.codigo)).toEqual(["A-02"]);
    expect(v[0].dias).toBe(27);
  });
});

describe("describirRegla", () => {
  it("describe INPC + pts en aniversario", () => {
    expect(
      describirRegla({
        tipo: "INPC_PTS",
        puntos: 1,
        cuando: "ANIVERSARIO",
        modo: "SEMIAUTOMATICO",
      }),
    ).toBe("INPC + 1 pt · en aniversario");
  });
});
