import { describe, expect, it } from "vitest";
import type { Contrato, ExcepcionPrecio, Local } from "@/domain";
import { crearContrato, crearLocal } from "@/domain/fixtures";
import {
  eventosExcepcion,
  excepcionesDeVista,
  impactoExcepcion,
  ordenarExcepciones,
  simularExcepcion,
} from "./calculos";

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
  it("pone primero lo que espera a Dirección, luego a la PMO y al final lo resuelto", () => {
    const orden = ordenarExcepciones([
      ex("EX-2", "APLICADA"),
      ex("EX-4", "AUTORIZADA_DIRECCION"),
      ex("EX-1", "PENDIENTE"),
      ex("EX-3", "RECHAZADA"),
    ]).map((e) => e.id);
    expect(orden).toEqual(["EX-1", "EX-4", "EX-3", "EX-2"]);
  });
});

describe("excepcionesDeVista", () => {
  const todas = [
    ex("EX-1", "PENDIENTE"),
    ex("EX-2", "AUTORIZADA_DIRECCION"),
    ex("EX-3", "APLICADA"),
    ex("EX-4", "RECHAZADA"),
  ];
  it("separa lo que autoriza Dirección, lo que aplica la PMO y lo resuelto", () => {
    expect(excepcionesDeVista(todas, "POR_AUTORIZAR").map((e) => e.id)).toEqual(["EX-1"]);
    expect(excepcionesDeVista(todas, "POR_APLICAR").map((e) => e.id)).toEqual(["EX-2"]);
    expect(excepcionesDeVista(todas, "RESUELTAS").map((e) => e.id)).toEqual([
      "EX-4",
      "EX-3",
    ]);
  });
});

describe("eventosExcepcion", () => {
  it("arma solicitó, autorizó y aplicó con quién, cuándo y comentario", () => {
    const eventos = eventosExcepcion({
      ...ex("EX-1", "APLICADA"),
      solicitadaEn: "2026-11-05",
      motivo: "Cliente ancla",
      autorizadaPor: "Mariana López",
      autorizadaEn: "2026-11-06",
      comentarioDireccion: "Procede",
      aplicadaPor: "Ricardo Salas",
      aplicadaEn: "2026-11-07",
    });
    expect(eventos.map((e) => e.id)).toEqual([
      "EX-1-solicitada",
      "EX-1-autorizada",
      "EX-1-aplicada",
    ]);
    expect(eventos[1]).toMatchObject({
      titulo: "Autorizada por Mariana López (Dirección)",
      detalle: "Procede",
      fecha: "2026-11-06",
    });
  });

  it("el rechazo de Dirección y el de la PMO usan su propio comentario", () => {
    const porDireccion = eventosExcepcion({
      ...ex("EX-1", "RECHAZADA"),
      rechazadaPor: "Mariana López",
      comentarioDireccion: "Fuera de rango",
    });
    expect(porDireccion.at(-1)).toMatchObject({
      titulo: "Rechazada por Mariana López (Dirección)",
      detalle: "Fuera de rango",
      tono: "coral",
    });
    const porPmo = eventosExcepcion({
      ...ex("EX-2", "RECHAZADA"),
      autorizadaPor: "Mariana López",
      rechazadaPor: "Ricardo Salas",
      comentarioPmo: "Rompe el plan",
    });
    expect(porPmo.at(-1)).toMatchObject({
      titulo: "Rechazada por Ricardo Salas (PMO)",
      detalle: "Rompe el plan",
    });
  });
});

describe("simularExcepcion", () => {
  const ocupado = (id: string, planeada: number): Local =>
    crearLocal({ id, estatus: "OCUPADO", rentaPlaneada: planeada });
  const contrato = (localId: string, renta: number): Contrato =>
    crearContrato({ localId, rentaMensual: renta, fin: "2027-06-30" });

  it("suma el local de la excepción a los ocupados de la plaza y compara con la meta", () => {
    const objetivo = crearLocal({ id: "L-9", rentaPlaneada: 10_000 });
    const r = simularExcepcion(
      { rentaSolicitada: 8_500 },
      objetivo,
      [ocupado("L-1", 30_000), objetivo],
      [contrato("L-1", 29_800)],
      98,
      36,
      "2026-11-08",
    );
    expect(r.cumplimientoActualPct).toBeCloseTo(99.33, 2);
    expect(r.cumplimientoNuevoPct).toBeCloseTo(95.75, 2);
    expect(r.impactoMensual).toBe(1_500);
    expect(r.impactoVida).toBe(54_000);
    expect(r.bajoMeta).toBe(true);
  });
});
