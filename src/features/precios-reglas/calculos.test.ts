import { describe, expect, it } from "vitest";
import { validarMeta } from "./calculos";

describe("validarMeta", () => {
  it("acepta un porcentaje con punto o coma y lo redondea a un decimal", () => {
    expect(validarMeta("98")).toBe(98);
    expect(validarMeta(" 97,55 ")).toBe(97.6);
  });
  it("rechaza vacío, texto y fuera de rango", () => {
    for (const malo of ["", "abc", "49", "121"]) {
      expect(typeof validarMeta(malo)).toBe("string");
    }
  });
});
