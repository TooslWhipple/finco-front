import { describe, expect, it } from "vitest";
import { crearContrato } from "@/domain/fixtures";
import {
  FILTRO_INICIAL,
  diasParaVencer,
  filtrarContratos,
  kpisContratos,
} from "./agregados";

const HOY = "2026-11-03";
const plazaDeLocal = new Map([
  ["A-09", "plz-alborada"],
  ["B-01", "plz-otra"],
]);

const contratos = [
  crearContrato({
    id: "lejos",
    localId: "A-09",
    fin: "2030-01-01",
    rentaMensual: 10_000,
  }),
  crearContrato({
    id: "pronto",
    localId: "A-09",
    fin: "2026-12-15",
    rentaMensual: 20_000,
  }),
  crearContrato({
    id: "pasado",
    localId: "B-01",
    fin: "2026-10-01",
    rentaMensual: 5_000,
  }),
  crearContrato({
    id: "firma",
    localId: "B-01",
    estado: "EN_FIRMA",
    rentaMensual: 99_000,
  }),
  crearContrato({ id: "borrador", localId: "B-01", estado: "BORRADOR" }),
];

const ids = (lista: readonly { id: string }[]) => lista.map((c) => c.id);

describe("kpisContratos", () => {
  it("cuenta vigentes (con los por vencer), en firma y suma la renta de los que rigen", () => {
    expect(kpisContratos(contratos, HOY)).toEqual({
      vigentes: 2,
      porVencer: 1,
      enFirma: 1,
      rentaMensual: 35_000,
    });
  });
});

describe("filtrarContratos", () => {
  it("sin filtros devuelve todo", () => {
    expect(filtrarContratos(contratos, FILTRO_INICIAL, plazaDeLocal, HOY)).toHaveLength(
      5,
    );
  });

  it("filtra por estado visible", () => {
    const f = { ...FILTRO_INICIAL, estado: "POR_VENCER" };
    expect(ids(filtrarContratos(contratos, f, plazaDeLocal, HOY))).toEqual(["pronto"]);
  });

  it("filtra por plaza", () => {
    const f = { ...FILTRO_INICIAL, plazaId: "plz-alborada" };
    expect(ids(filtrarContratos(contratos, f, plazaDeLocal, HOY))).toEqual([
      "lejos",
      "pronto",
    ]);
  });

  it("filtra por vencimiento: ventana o ya vencidos, solo contratos vigentes", () => {
    const en90 = { ...FILTRO_INICIAL, vencimiento: "90" };
    expect(ids(filtrarContratos(contratos, en90, plazaDeLocal, HOY))).toEqual(["pronto"]);
    const vencidos = { ...FILTRO_INICIAL, vencimiento: "VENCIDOS" };
    expect(ids(filtrarContratos(contratos, vencidos, plazaDeLocal, HOY))).toEqual([
      "pasado",
    ]);
  });
});

describe("diasParaVencer", () => {
  it("es negativo cuando ya venció", () => {
    expect(diasParaVencer(contratos[2], HOY)).toBeLessThan(0);
    expect(diasParaVencer(contratos[1], HOY)).toBe(42);
  });
});
