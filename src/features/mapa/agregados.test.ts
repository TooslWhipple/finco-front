import { describe, expect, it } from "vitest";
import { crearSeed } from "@/data/seed";
import {
  FILTRO_INICIAL,
  ciudadesConPlazas,
  filtrarPlazasMapa,
  kpisMapa,
  ordenarPlazasMapa,
  resumirPlazasMapa,
} from "./agregados";

const seed = crearSeed();
const plazas = resumirPlazasMapa(seed.ciudades, seed.plazas, seed.locales);

describe("resumen de plazas para el mapa", () => {
  it("trae una plaza por pin, con las coordenadas del seed", () => {
    expect(plazas).toHaveLength(seed.plazas.length);
    const alborada = plazas.find((p) => p.id === "plz-alborada");
    expect(alborada?.lat).toBe(alborada?.plaza.coordenadas.lat);
  });

  it("la preventa no tiene rango y la plaza en operación sí", () => {
    for (const p of plazas) {
      expect(p.rango === null).toBe(p.plaza.estatus === "PREVENTA");
    }
  });
});

describe("filtros", () => {
  it("sin filtros devuelve todo", () => {
    expect(filtrarPlazasMapa(plazas, FILTRO_INICIAL)).toHaveLength(plazas.length);
  });

  it("el filtro de preventa coincide con las plazas en preventa del seed", () => {
    const esperadas = seed.plazas.filter((p) => p.estatus === "PREVENTA").length;
    const visibles = filtrarPlazasMapa(plazas, {
      ...FILTRO_INICIAL,
      estatus: "PREVENTA",
    });
    expect(visibles).toHaveLength(esperadas);
    expect(kpisMapa(visibles).enPreventa).toBe(esperadas);
  });

  it("filtrar por rango excluye la preventa", () => {
    const altas = filtrarPlazasMapa(plazas, { ...FILTRO_INICIAL, rango: "ALTA" });
    expect(altas.every((p) => p.rango === "ALTA")).toBe(true);
  });

  it("filtrar por ciudad deja solo sus plazas", () => {
    const ciudad = ciudadesConPlazas(plazas)[0];
    const visibles = filtrarPlazasMapa(plazas, {
      ...FILTRO_INICIAL,
      ciudadId: ciudad.id,
    });
    expect(visibles.length).toBeGreaterThan(0);
    expect(visibles.every((p) => p.ciudad.id === ciudad.id)).toBe(true);
  });
});

describe("KPIs y orden", () => {
  it("las plazas y la preventa suman el total", () => {
    const k = kpisMapa(plazas);
    expect(k.plazas).toBe(plazas.length);
    expect(k.ocupacionPromedio).toBeGreaterThan(0);
    expect(k.ocupacionPromedio).toBeLessThanOrEqual(1);
  });

  it("ordena por ocupación descendente", () => {
    const orden = ordenarPlazasMapa(plazas, "OCUPACION");
    for (let i = 1; i < orden.length; i++) {
      expect(orden[i - 1].ocupacion).toBeGreaterThanOrEqual(orden[i].ocupacion);
    }
  });
});
