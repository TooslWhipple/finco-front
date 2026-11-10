import { describe, expect, it } from "vitest";
import { crearCotizacion, crearLocal } from "@/domain/fixtures";
import {
  kpisDisponibilidad,
  localesDisponibles,
  plazaInicial,
  plazasConDisponibles,
  rutaCotizar,
} from "./agregados";

const locales = [
  crearLocal({ id: "p1-B-10", plazaId: "p1", codigo: "B-10", estatus: "DISPONIBLE" }),
  crearLocal({ id: "p1-B-2", plazaId: "p1", codigo: "B-2", estatus: "DISPONIBLE" }),
  crearLocal({ id: "p1-A-1", plazaId: "p1", codigo: "A-1", estatus: "OCUPADO" }),
  crearLocal({ id: "p2-C-1", plazaId: "p2", codigo: "C-1", estatus: "EN_COTIZACION" }),
  crearLocal({ id: "p3-D-1", plazaId: "p3", codigo: "D-1", estatus: "DISPONIBLE" }),
];
const plazas = [
  { id: "p1", nombre: "Uno" },
  { id: "p2", nombre: "Dos" },
  { id: "p3", nombre: "Tres" },
];

describe("localesDisponibles", () => {
  it("deja solo los disponibles, en orden natural de código", () => {
    expect(localesDisponibles(locales).map((l) => l.codigo)).toEqual([
      "B-2",
      "B-10",
      "D-1",
    ]);
  });
});

describe("plazasConDisponibles", () => {
  it("omite las plazas sin locales disponibles y cuenta el resto", () => {
    expect(plazasConDisponibles(plazas, locales)).toEqual([
      { plazaId: "p1", nombre: "Uno", disponibles: 2 },
      { plazaId: "p3", nombre: "Tres", disponibles: 1 },
    ]);
  });
});

describe("kpisDisponibilidad", () => {
  it("suma disponibles y cuenta cotizaciones abiertas", () => {
    const opciones = plazasConDisponibles(plazas, locales);
    const cotizaciones = [
      crearCotizacion({ estado: "BORRADOR" }),
      crearCotizacion({ estado: "ENVIADA" }),
      crearCotizacion({ estado: "CONTRATO_GENERADO" }),
    ];
    expect(kpisDisponibilidad(opciones, cotizaciones)).toEqual({
      localesDisponibles: 3,
      plazasConDisponibles: 2,
      cotizacionesAbiertas: 2,
    });
  });
});

describe("plazaInicial", () => {
  const opciones = plazasConDisponibles(plazas, locales);
  it("usa la preferida si tiene disponibles; si no, la primera", () => {
    expect(plazaInicial(opciones, "p3")).toBe("p3");
    expect(plazaInicial(opciones, "p2")).toBe("p1");
    expect(plazaInicial([], "p2")).toBe("");
  });
});

describe("rutaCotizar", () => {
  it("precarga el local", () => {
    expect(rutaCotizar("plz-alborada-A-09")).toBe(
      "/cotizaciones/nueva?local=plz-alborada-A-09",
    );
  });
});
