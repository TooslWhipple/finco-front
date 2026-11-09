import { describe, expect, it } from "vitest";
import { crearLicitacion } from "./fixtures";
import {
  ahorroNegociacion,
  compararAdjudicadoContraBase,
  compararContraBase,
  conLicitacionAdjudicada,
  conProveedorDescartado,
  conRondaRegistrada,
  errorAdjudicacion,
  erroresRonda,
  mejorPropuestaPorRonda,
  proveedoresActivos,
  tasaRespuesta,
} from "./licitacion";

const licitacion = crearLicitacion();

describe("licitación: indicadores", () => {
  it("la tasa de respuesta cuenta a los invitados que respondieron en alguna ronda", () => {
    expect(tasaRespuesta(licitacion)).toEqual({
      invitados: 4,
      respondieron: 3,
      fraccion: 0.75,
    });
  });

  it("la mejor propuesta de cada ronda es la menor", () => {
    expect(mejorPropuestaPorRonda(licitacion)).toEqual([
      { ronda: 1, proveedorId: "A", monto: 1_100_000 },
      { ronda: 2, proveedorId: "A", monto: 1_000_000 },
    ]);
  });

  it("siguen compitiendo los que respondieron la última ronda y no fueron descartados", () => {
    expect(proveedoresActivos(licitacion)).toEqual(["A", "C"]);
    expect(proveedoresActivos(crearLicitacion({ rondas: [], descartados: [] }))).toEqual([
      "A",
      "B",
      "C",
      "D",
    ]);
  });

  it("el ahorro en negociación es primera propuesta menos adjudicado, solo si está adjudicada", () => {
    expect(ahorroNegociacion(licitacion)).toBeUndefined();
    const cerrada = conLicitacionAdjudicada(
      licitacion,
      "A",
      "Mejor precio",
      "Ana",
      "2026-09-20",
    );
    expect(ahorroNegociacion(cerrada)).toBe(100_000);
  });

  it("compara contra el base en pesos y en porcentaje", () => {
    expect(compararContraBase(950_000, 1_000_000)).toEqual({
      diferencia: -50_000,
      fraccion: -0.05,
    });
    expect(compararAdjudicadoContraBase(licitacion)).toBeUndefined();
  });
});

describe("licitación: reglas", () => {
  it("la ronda necesita monto o 'no respondió' de cada participante y al menos una respuesta", () => {
    expect(erroresRonda(licitacion, { A: 900_000 }).montos.C).toBeDefined();
    expect(erroresRonda(licitacion, { A: null, C: null }).general).toBeDefined();
    expect(erroresRonda(licitacion, { A: 0, C: 1 }).montos.A).toBeDefined();
    expect(erroresRonda(licitacion, { A: 950_000, C: null })).toEqual({ montos: {} });
  });

  it("la ronda siguiente solo incluye a los activos y numera correlativamente", () => {
    const con = conRondaRegistrada(licitacion, { A: 950_000, C: null }, "2026-09-29");
    expect(con.rondas).toHaveLength(3);
    expect(con.rondas[2].numero).toBe(3);
    expect(con.rondas[2].propuestas).toEqual([
      { proveedorId: "A", respondio: true, monto: 950_000 },
      { proveedorId: "C", respondio: false },
    ]);
    expect(proveedoresActivos(con)).toEqual(["A"]);
  });

  it("una ronda inválida deja la licitación igual", () => {
    expect(conRondaRegistrada(licitacion, { A: 900_000 }, "2026-09-29")).toBe(licitacion);
  });

  it("descartar exige motivo y un proveedor activo", () => {
    expect(conProveedorDescartado(licitacion, "C", " ")).toBe(licitacion);
    expect(conProveedorDescartado(licitacion, "B", "otra vez")).toBe(licitacion);
    const con = conProveedorDescartado(licitacion, "C", "Plazo inviable");
    expect(con.descartados.at(-1)).toEqual({
      proveedorId: "C",
      ronda: 2,
      motivo: "Plazo inviable",
    });
  });

  it("adjudicar exige ganador que respondió la última ronda y motivo", () => {
    expect(errorAdjudicacion(licitacion, "D", "x")).toBeDefined();
    expect(errorAdjudicacion(licitacion, "B", "x")).toBeDefined();
    expect(errorAdjudicacion(licitacion, "A", "")).toBeDefined();
    expect(errorAdjudicacion(licitacion, "A", "Mejor precio")).toBeUndefined();
    const cerrada = conLicitacionAdjudicada(
      licitacion,
      "A",
      "Mejor precio",
      "Ana",
      "2026-09-20",
    );
    expect(cerrada).toMatchObject({
      estado: "ADJUDICADA",
      ganadorId: "A",
      montoAdjudicado: 1_000_000,
      adjudicadaPor: "Ana",
    });
    expect(conLicitacionAdjudicada(cerrada, "C", "otra", "Ana", "2026-09-21")).toBe(
      cerrada,
    );
  });
});
