import { describe, expect, it } from "vitest";
import { crearContrato, crearLocal, REGLA_INPC_1PT } from "./fixtures";
import { liberarLocal, textoReglaCorto } from "./liberacion";
import { repricingAlLiberar } from "./precios";

const REGLA_2PTS = { ...REGLA_INPC_1PT, puntos: 2 };

describe("liberarLocal", () => {
  it("1 año: aplica la regla una vez y registra lista y mínimo", () => {
    const local = crearLocal({
      precioVigente: 20_000,
      precioMinimo: 18_000,
      regla: REGLA_2PTS,
      historial: [{ fecha: "2025-03-01", precio: 20_000, motivo: "Contrato firmado" }],
    });
    const r = liberarLocal(local, crearContrato(), "2026-11-10", "Fin pactado");
    if (!r.ok) throw new Error(r.error);
    const l = r.liberacion;
    expect(l.años).toEqual([2026]);
    expect(l.precioNuevo).toBe(Math.round(20_000 * (1 + (3.64 + 2) / 100)));
    expect(l.minimoNuevo).toBe(Math.round(18_000 * (1 + (3.64 + 2) / 100)));
    expect(l.registros.map((x) => x.concepto)).toEqual(["LISTA", "MINIMO"]);
    expect(l.registros[0].motivo).toBe(
      "Repricing al liberar (regla INPC + 2 pts, 1 año)",
    );
  });

  it("5 años: coincide con repricingAlLiberar y parte del mínimo vigente", () => {
    const local = crearLocal({
      precioVigente: 24_860,
      precioMinimo: 23_500,
      regla: REGLA_2PTS,
      historial: [{ fecha: "2021-11-01", precio: 18_740, motivo: "x" }],
    });
    const r = liberarLocal(local, crearContrato(), "2026-11-10", "Salida");
    if (!r.ok) throw new Error(r.error);
    const esperado = repricingAlLiberar(
      local.historial,
      local.regla,
      [2022, 2023, 2024, 2025, 2026],
      undefined,
      local.precioMinimo,
    )!;
    expect(r.liberacion.años).toHaveLength(5);
    expect(r.liberacion.minimoNuevo).toBe(esperado.minimoFinal);
    expect(r.liberacion.precioNuevo).toBe(
      Math.max(esperado.precioFinal, esperado.minimoFinal),
    );
    expect(r.liberacion.registros[0].motivo).toContain("5 años");
  });

  it("sin años por actualizar no cambia precios ni agrega registros", () => {
    const local = crearLocal({
      historial: [{ fecha: "2026-02-01", precio: 24_860, motivo: "x" }],
    });
    const r = liberarLocal(local, crearContrato(), "2026-11-10", "Salida");
    if (!r.ok) throw new Error(r.error);
    expect(r.liberacion.registros).toEqual([]);
    expect(r.liberacion.precioNuevo).toBe(local.precioVigente);
    expect(r.liberacion.minimoNuevo).toBe(local.precioMinimo);
  });

  it("un año sin INPC es un error controlado", () => {
    const local = crearLocal({
      historial: [{ fecha: "2021-11-01", precio: 18_740, motivo: "x" }],
    });
    const r = liberarLocal(local, crearContrato(), "2031-01-10", "Salida");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("Sin INPC");
  });

  it("valida contrato vigente, fecha y motivo", () => {
    const local = crearLocal();
    expect(
      liberarLocal(local, crearContrato({ estado: "TERMINADO" }), "2026-11-10", "x").ok,
    ).toBe(false);
    expect(
      liberarLocal(local, crearContrato({ localId: "otro" }), "2026-11-10", "x").ok,
    ).toBe(false);
    expect(liberarLocal(local, crearContrato(), "2023-01-01", "x").ok).toBe(false);
    expect(liberarLocal(local, crearContrato(), "2026-11-10", "  ").ok).toBe(false);
  });
});

describe("textoReglaCorto", () => {
  it("describe el incremento de cada tipo", () => {
    expect(textoReglaCorto({ ...REGLA_INPC_1PT, tipo: "INPC" })).toBe("INPC");
    expect(textoReglaCorto(REGLA_INPC_1PT)).toBe("INPC + 1 pt");
    expect(
      textoReglaCorto({ ...REGLA_INPC_1PT, tipo: "VALOR_FIJO", porcentajeFijo: 5 }),
    ).toBe("valor fijo 5%");
  });
});
