import { describe, expect, it } from "vitest";
import { redondearCentavos } from "./numeros";

describe("redondearCentavos", () => {
  it("deja dos decimales", () => {
    expect(redondearCentavos(1234.5678)).toBe(1234.57);
    expect(redondearCentavos(10.004)).toBe(10);
  });
  it("no toca un monto ya en centavos ni un entero", () => {
    expect(redondearCentavos(99.99)).toBe(99.99);
    expect(redondearCentavos(42)).toBe(42);
  });
  it("redondea el medio hacia arriba, también en negativos", () => {
    expect(redondearCentavos(0.125)).toBe(0.13);
    expect(redondearCentavos(-0.125)).toBe(-0.12);
  });
});
