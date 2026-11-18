import { describe, expect, it } from "vitest";
import { diasEntre, horasEntre, lunesDeSemana, sumarDias, sumarMeses } from "./fechas";

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

describe("lunesDeSemana", () => {
  it("devuelve el mismo día si ya es lunes", () => {
    expect(lunesDeSemana("2026-10-26")).toBe("2026-10-26");
  });
  it("retrocede hasta el lunes desde cualquier día, domingo incluido", () => {
    expect(lunesDeSemana("2026-11-03")).toBe("2026-11-02");
    expect(lunesDeSemana("2026-11-01")).toBe("2026-10-26");
  });
  it("cruza el fin de año", () => {
    expect(lunesDeSemana("2027-01-01")).toBe("2026-12-28");
  });
});

describe("horasEntre", () => {
  it("mide horas decimales del mismo día, con o sin segundos", () => {
    expect(horasEntre("2026-11-03T10:00", "2026-11-03T15:56:00")).toBeCloseTo(5.933, 3);
    expect(horasEntre("2026-11-03T10:00:00", "2026-11-03T10:30")).toBe(0.5);
  });
  it("no depende del horario de verano: cruzar el 1 de noviembre mide lo mismo", () => {
    expect(horasEntre("2026-10-31T20:00", "2026-11-01T08:00")).toBe(
      horasEntre("2026-11-10T20:00", "2026-11-11T08:00"),
    );
    expect(horasEntre("2026-10-31T20:00", "2026-11-01T08:00")).toBe(12);
  });
  it("es negativo si el orden está invertido", () => {
    expect(horasEntre("2026-11-03T15:56:00", "2026-11-03T10:00")).toBeLessThan(0);
  });
});
