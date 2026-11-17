import { describe, expect, it } from "vitest";
import { contratoVigenteParaApertura, validarApertura } from "./apertura";
import { DEMO_TODAY } from "./fechas";
import { crearContrato } from "./fixtures";

const hoy = DEMO_TODAY;

describe("contratoVigenteParaApertura", () => {
  it("exige estado VIGENTE e inicio ≤ hoy ≤ fin", () => {
    expect(contratoVigenteParaApertura(crearContrato(), hoy)).toBe(true);
    expect(contratoVigenteParaApertura(crearContrato({ estado: "TERMINADO" }), hoy)).toBe(
      false,
    );
    expect(contratoVigenteParaApertura(crearContrato({ fin: "2026-11-02" }), hoy)).toBe(
      false,
    );
    expect(
      contratoVigenteParaApertura(crearContrato({ inicio: "2026-11-04" }), hoy),
    ).toBe(false);
    expect(
      contratoVigenteParaApertura(crearContrato({ inicio: hoy, fin: hoy }), hoy),
    ).toBe(true);
  });
});

describe("validarApertura", () => {
  it("acepta una fecha entre el inicio y hoy, extremos incluidos", () => {
    const c = crearContrato({ inicio: "2024-01-01" });
    expect(validarApertura(c, "2024-01-01", hoy).ok).toBe(true);
    expect(validarApertura(c, "2025-06-15", hoy).ok).toBe(true);
    expect(validarApertura(c, hoy, hoy).ok).toBe(true);
  });

  it("rechaza un contrato no vigente", () => {
    const r = validarApertura(crearContrato({ estado: "TERMINADO" }), hoy, hoy);
    expect(r.ok).toBe(false);
  });

  it("rechaza un contrato ya abierto", () => {
    const c = crearContrato({
      apertura: {
        fecha: "2024-02-01",
        registradaPor: "usr-pmo",
        registradaEl: "2024-02-01",
      },
    });
    const r = validarApertura(c, hoy, hoy);
    expect(r).toEqual({
      ok: false,
      error: "La apertura de este local ya está registrada.",
    });
  });

  it("rechaza una fecha anterior al inicio", () => {
    const r = validarApertura(crearContrato({ inicio: "2024-01-01" }), "2023-12-31", hoy);
    expect(r.ok).toBe(false);
  });

  it("rechaza una fecha posterior a hoy", () => {
    const r = validarApertura(crearContrato(), "2026-11-04", hoy);
    expect(r).toEqual({ ok: false, error: "La fecha de apertura no puede ser futura." });
  });
});
