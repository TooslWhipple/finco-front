import { describe, expect, it } from "vitest";
import { diasEntre, sumarDias, sumarMeses } from "./fechas";

describe("sumarDias", () => {
  it("cruza fin de mes y de año", () => {
    expect(sumarDias("2026-11-03", 90)).toBe("2027-02-01");
    expect(sumarDias("2026-01-01", -1)).toBe("2025-12-31");
  });
  it("es inversa de diasEntre", () => {
    expect(diasEntre("2026-11-03", sumarDias("2026-11-03", 54))).toBe(54);
  });
});

describe("sumarMeses", () => {
  it("conserva el día", () => {
    expect(sumarMeses("2026-11-03", 36)).toBe("2029-11-03");
    expect(sumarMeses("2026-11-03", -12)).toBe("2025-11-03");
  });
  it("recorta al último día del mes destino", () => {
    expect(sumarMeses("2026-01-31", 1)).toBe("2026-02-28");
  });
});
