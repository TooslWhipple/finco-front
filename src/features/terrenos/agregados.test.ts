import { describe, expect, it } from "vitest";
import { crearTerreno } from "@/domain/fixtures";
import {
  FILTRO_INICIAL,
  filtrarTerrenos,
  kpisTerrenos,
  terrenosDeEtapa,
} from "./agregados";

const HOY = "2026-11-03";

const terrenos = [
  crearTerreno({
    id: "a",
    ciudadId: "culiacan",
    etapa: "CONSTRUCCION",
    avancePct: 50,
    inicioDesarrollo: "2026-01-01",
    fechaObjetivo: "2027-09-01",
    areaM2: 1_000,
    localesProyectados: 10,
  }),
  // Fecha objetivo vencida sin terminar: rojo.
  crearTerreno({
    id: "b",
    ciudadId: "mazatlan",
    etapa: "PERMISOS",
    avancePct: 20,
    inicioDesarrollo: "2025-01-01",
    fechaObjetivo: "2026-06-01",
    areaM2: 2_000,
    localesProyectados: 20,
  }),
  crearTerreno({
    id: "c",
    ciudadId: "culiacan",
    etapa: "ABIERTO",
    avancePct: 100,
    areaM2: 9_000,
    localesProyectados: 90,
  }),
];

describe("kpisTerrenos", () => {
  it("excluye los proyectos ya abiertos y cuenta el semáforo rojo", () => {
    expect(kpisTerrenos(terrenos, HOY)).toEqual({
      activos: 2,
      m2EnDesarrollo: 3_000,
      localesProyectados: 30,
      enRiesgo: 1,
    });
  });
});

describe("filtrarTerrenos", () => {
  it("sin filtros devuelve todos", () => {
    expect(filtrarTerrenos(terrenos, FILTRO_INICIAL, HOY)).toHaveLength(3);
  });
  it("filtra por ciudad y por semáforo", () => {
    expect(
      filtrarTerrenos(terrenos, { ...FILTRO_INICIAL, ciudadId: "culiacan" }, HOY),
    ).toHaveLength(2);
    expect(
      filtrarTerrenos(terrenos, { ...FILTRO_INICIAL, semaforo: "ROJO" }, HOY).map(
        (t) => t.id,
      ),
    ).toEqual(["b"]);
  });
});

describe("terrenosDeEtapa", () => {
  it("agrupa por etapa", () => {
    expect(terrenosDeEtapa(terrenos, "PERMISOS").map((t) => t.id)).toEqual(["b"]);
  });
});
