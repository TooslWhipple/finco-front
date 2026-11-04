import { describe, expect, it } from "vitest";
import { crearSeed } from "@/data/seed";
import { rangoOcupacion } from "@/domain";
import {
  filtrarCiudades,
  masDisponibilidad,
  resumirCiudades,
  resumirPlazas,
} from "./agregados";

const seed = crearSeed();
const ciudades = resumirCiudades(seed.ciudades, seed.plazas, seed.locales);

describe("rangos de ocupación", () => {
  it("clasifica en los umbrales", () => {
    expect(rangoOcupacion(0.9)).toBe("ALTA");
    expect(rangoOcupacion(0.89)).toBe("MEDIA");
    expect(rangoOcupacion(0.75)).toBe("MEDIA");
    expect(rangoOcupacion(0.74)).toBe("BAJA");
  });
});

describe("resumen del panorama", () => {
  it("cubre 11 ciudades, 39 plazas y 946 locales", () => {
    expect(ciudades).toHaveLength(11);
    expect(ciudades.reduce((s, c) => s + c.totalPlazas, 0)).toBe(39);
    expect(ciudades.reduce((s, c) => s + c.totalLocales, 0)).toBe(946);
  });

  it("el filtro por estado y disponibilidad reduce las ciudades", () => {
    const sonora = filtrarCiudades(ciudades, {
      estado: "Sonora",
      soloDisponibilidad: false,
    });
    expect(sonora.length).toBeGreaterThan(0);
    expect(sonora.every((c) => c.ciudad.estado === "Sonora")).toBe(true);
    const conDisp = filtrarCiudades(ciudades, { estado: null, soloDisponibilidad: true });
    expect(conDisp.every((c) => c.disponibles > 0)).toBe(true);
  });

  it("ordena la mayor disponibilidad primero", () => {
    const top = masDisponibilidad(
      resumirPlazas(seed.ciudades, seed.plazas, seed.locales),
      5,
    );
    expect(top).toHaveLength(5);
    for (let i = 1; i < top.length; i++) {
      expect(top[i - 1].disponibles).toBeGreaterThanOrEqual(top[i].disponibles);
    }
  });
});
