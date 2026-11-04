import { describe, expect, it } from "vitest";
import { agruparPuntos, radioAgrupacionGrados } from "./mapa";

const puntos = [
  { id: "a", lat: 24.8, lng: -107.4 },
  { id: "b", lat: 24.81, lng: -107.39 },
  { id: "c", lat: 24.82, lng: -107.41 },
  { id: "d", lat: 23.25, lng: -106.41 },
];

describe("agruparPuntos", () => {
  it("a zoom bajo agrupa los puntos cercanos y deja aislado el lejano", () => {
    const grupos = agruparPuntos(puntos, 6);
    expect(grupos.map((g) => g.puntos.length).sort()).toEqual([1, 3]);
  });

  it("a zoom alto cada punto es su propio grupo", () => {
    const grupos = agruparPuntos(puntos, 16);
    expect(grupos).toHaveLength(4);
    expect(grupos.every((g) => g.puntos.length === 1)).toBe(true);
  });

  it("al acercar, los grupos solo se separan: nunca aparecen menos grupos", () => {
    let previo = 0;
    for (let zoom = 3; zoom <= 16; zoom++) {
      const cantidad = agruparPuntos(puntos, zoom).length;
      expect(cantidad).toBeGreaterThanOrEqual(previo);
      previo = cantidad;
    }
  });

  it("conserva todos los puntos exactamente una vez", () => {
    const grupos = agruparPuntos(puntos, 8);
    expect(grupos.flatMap((g) => g.puntos.map((p) => p.id)).sort()).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });

  it("el centro del grupo es el promedio de sus puntos", () => {
    const grupo = agruparPuntos(puntos, 6).find((g) => g.puntos.length === 3)!;
    expect(grupo.lat).toBeCloseTo((24.8 + 24.81 + 24.82) / 3, 6);
    expect(grupo.lng).toBeCloseTo((-107.4 - 107.39 - 107.41) / 3, 6);
  });

  it("es determinista sin importar el orden de entrada", () => {
    expect(agruparPuntos([...puntos].reverse(), 6)).toEqual(agruparPuntos(puntos, 6));
  });

  it("el radio se reduce a la mitad por cada nivel de zoom", () => {
    expect(radioAgrupacionGrados(5)).toBeCloseTo(radioAgrupacionGrados(4) / 2, 10);
  });
});
