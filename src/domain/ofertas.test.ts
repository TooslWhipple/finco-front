import { describe, expect, it } from "vitest";
import { crearCotizacion } from "./fixtures";
import {
  aplicarParcheConOferta,
  diferenciaContraAnterior,
  hayOfertaNueva,
} from "./ofertas";

const base = { rentaMensual: 20_000, plazoMeses: 36 };

describe("hayOfertaNueva", () => {
  it("detecta cambios de renta, plazo o gracia", () => {
    expect(hayOfertaNueva(base, { ...base, rentaMensual: 19_000 })).toBe(true);
    expect(hayOfertaNueva(base, { ...base, plazoMeses: 48 })).toBe(true);
    expect(hayOfertaNueva(base, { ...base, mesesGracia: 1 })).toBe(true);
  });

  it("sin cambios, o con gracia 0 contra ausente, no hay oferta", () => {
    expect(hayOfertaNueva(base, { ...base })).toBe(false);
    expect(hayOfertaNueva(base, { ...base, mesesGracia: 0 })).toBe(false);
  });
});

describe("aplicarParcheConOferta", () => {
  const actual = crearCotizacion({
    id: "COT-2026-0001",
    rentaMensual: 20_000,
    plazoMeses: 36,
    vendedorId: "usr-sofia",
    ofertas: [
      {
        id: "COT-2026-0001-of1",
        fecha: "2026-11-01",
        hora: "10:00",
        vendedorId: "usr-sofia",
        rentaMensual: 20_000,
        plazoMeses: 36,
      },
    ],
  });

  it("agrega una oferta con el vendedor de la sesión cuando cambian los términos", () => {
    const r = aplicarParcheConOferta(
      actual,
      { rentaMensual: 19_000 },
      "usr-jorge",
      "2026-11-03",
      "15:56",
    );
    expect(r.ofertas).toHaveLength(2);
    expect(r.ofertas[1]).toMatchObject({
      vendedorId: "usr-jorge",
      rentaMensual: 19_000,
      plazoMeses: 36,
      fecha: "2026-11-03",
      hora: "15:56",
    });
  });

  it("no agrega oferta si el parche no toca los términos", () => {
    const r = aplicarParcheConOferta(
      actual,
      { depositoMeses: 2 },
      "usr-sofia",
      "2026-11-03",
      "15:56",
    );
    expect(r.ofertas).toHaveLength(1);
    expect(r.depositoMeses).toBe(2);
  });
});

describe("diferenciaContraAnterior", () => {
  it("es nula en la primera y la resta en las siguientes", () => {
    const o = (rentaMensual: number) => ({
      id: "x",
      fecha: "2026-11-01",
      hora: "10:00",
      vendedorId: "u",
      rentaMensual,
      plazoMeses: 36,
    });
    expect(diferenciaContraAnterior([o(100), o(90)], 0)).toBeNull();
    expect(diferenciaContraAnterior([o(100), o(90)], 1)).toBe(-10);
  });
});
