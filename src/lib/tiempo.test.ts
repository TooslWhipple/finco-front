import { describe, expect, it } from "vitest";
import { haceCuanto } from "./tiempo";

describe("haceCuanto", () => {
  const ahora = "2026-11-03T15:56:00";
  it("usa minutos, horas y días", () => {
    expect(haceCuanto("2026-11-03T15:42:00", ahora)).toBe("hace 14 min");
    expect(haceCuanto("2026-11-03T12:30:00", ahora)).toBe("hace 3 h");
    expect(haceCuanto("2026-11-01T15:56:00", ahora)).toBe("hace 2 d");
  });
  it("menos de un minuto es 'hace un momento'", () => {
    expect(haceCuanto(ahora, ahora)).toBe("hace un momento");
  });
});
