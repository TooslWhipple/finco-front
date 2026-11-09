import { describe, expect, it } from "vitest";
import { crearTerreno } from "./fixtures";
import {
  avanceEsperado,
  enDesarrolloEn,
  esPlazaDeTerreno,
  idPlazaDeTerreno,
  rutaPlaza,
  semaforoTerreno,
} from "./terrenos";

const HOY = "2026-11-03";

describe("avanceEsperado", () => {
  it("es proporcional al tiempo entre inicio y fecha objetivo", () => {
    const t = crearTerreno({
      inicioDesarrollo: "2026-01-01",
      fechaObjetivo: "2027-01-01",
    });
    expect(avanceEsperado(t, "2026-01-01")).toBe(0);
    expect(Math.round(avanceEsperado(t, "2026-07-02"))).toBe(50);
    expect(avanceEsperado(t, "2027-06-01")).toBe(100);
  });
});

describe("semaforoTerreno", () => {
  const base = { inicioDesarrollo: "2026-01-01", fechaObjetivo: "2027-01-01" };
  // A 3 de noviembre el tiempo corrido es ~84% del plazo.

  it("verde si el avance va a la par o con holgura", () => {
    expect(semaforoTerreno(crearTerreno({ ...base, avancePct: 80 }), HOY)).toBe("VERDE");
  });

  it("amarillo si va entre 10 y 25 puntos atrás", () => {
    expect(semaforoTerreno(crearTerreno({ ...base, avancePct: 65 }), HOY)).toBe(
      "AMARILLO",
    );
  });

  it("rojo si va más de 25 puntos atrás", () => {
    expect(semaforoTerreno(crearTerreno({ ...base, avancePct: 40 }), HOY)).toBe("ROJO");
  });

  it("rojo si la fecha objetivo ya pasó sin terminar", () => {
    expect(
      semaforoTerreno(
        crearTerreno({ ...base, fechaObjetivo: "2026-10-15", avancePct: 95 }),
        HOY,
      ),
    ).toBe("ROJO");
  });

  it("con obra manda el semáforo derivado del valor ganado, sin importar el avance manual", () => {
    expect(
      semaforoTerreno(
        crearTerreno({ ...base, avancePct: 95, semaforoObra: "ROJO" }),
        HOY,
      ),
    ).toBe("ROJO");
    expect(
      semaforoTerreno(
        crearTerreno({ ...base, avancePct: 10, semaforoObra: "VERDE" }),
        HOY,
      ),
    ).toBe("VERDE");
  });

  it("un proyecto abierto siempre está en verde", () => {
    expect(
      semaforoTerreno(
        crearTerreno({ etapa: "ABIERTO", fechaObjetivo: "2026-01-01", avancePct: 100 }),
        HOY,
      ),
    ).toBe("VERDE");
  });
});

describe("enDesarrolloEn", () => {
  it("cuenta permisos y construcción iniciados en el año", () => {
    const terrenos = [
      crearTerreno({ id: "1", etapa: "CONSTRUCCION", inicioDesarrollo: "2026-02-01" }),
      crearTerreno({ id: "2", etapa: "PERMISOS", inicioDesarrollo: "2026-05-01" }),
      crearTerreno({ id: "3", etapa: "CONSTRUCCION", inicioDesarrollo: "2025-05-01" }),
      crearTerreno({ id: "4", etapa: "PREVENTA", inicioDesarrollo: "2026-05-01" }),
      crearTerreno({ id: "5", etapa: "DUE_DILIGENCE", inicioDesarrollo: "2026-05-01" }),
    ];
    expect(enDesarrolloEn(terrenos, 2026).map((t) => t.id)).toEqual(["1", "2"]);
  });
});

describe("plaza de un terreno", () => {
  it("la ruta lleva a la ficha o, sin ficha, al terreno", () => {
    expect(rutaPlaza("plz-ter-09")).toBe("/terrenos-y-proyectos?terreno=ter-09");
    expect(rutaPlaza("plz-matamoros-1")).toBe("/plazas/plz-matamoros-1");
    expect(esPlazaDeTerreno("plz-matamoros-1")).toBe(false);
    expect(rutaPlaza("culiacan-1")).toBe("/plazas/culiacan-1");
    expect(esPlazaDeTerreno(idPlazaDeTerreno("ter-09"))).toBe(true);
  });
});
