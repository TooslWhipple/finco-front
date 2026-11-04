import { describe, expect, it } from "vitest";
import type { ExcepcionPrecio } from "@/domain";
import { impactoExcepcion, ordenarExcepciones } from "./calculos";

const ex = (id: string, estado: ExcepcionPrecio["estado"]): ExcepcionPrecio => ({
  id,
  cotizacionId: "COT-1",
  localId: "A-09",
  rentaSolicitada: 22_900,
  precioMinimo: 23_500,
  estado,
  solicitadaPor: "Jorge Ramírez",
});

describe("impactoExcepcion", () => {
  it("calcula la diferencia mensual, en la vigencia y contra el mínimo", () => {
    expect(impactoExcepcion(ex("EX-1", "PENDIENTE"), 24_860, 36)).toEqual({
      diferenciaMensual: 1_960,
      diferenciaVigencia: 70_560,
      diferenciaVsMinimo: -600,
    });
  });
});

describe("ordenarExcepciones", () => {
  it("pone las pendientes primero", () => {
    const orden = ordenarExcepciones([
      ex("EX-2", "APROBADA"),
      ex("EX-1", "PENDIENTE"),
      ex("EX-3", "RECHAZADA"),
    ]).map((e) => e.id);
    expect(orden).toEqual(["EX-1", "EX-3", "EX-2"]);
  });
});
