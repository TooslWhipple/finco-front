import { describe, expect, it } from "vitest";
import type { EventoSync } from "@/domain";
import { eventosRecientes, registrosUltimoSync } from "./agregados";

const evento = (
  id: string,
  integracionId: EventoSync["integracionId"],
  fecha: string,
  registros: number,
): EventoSync => ({
  id,
  integracionId,
  fecha,
  resultado: "OK",
  detalle: "",
  registros,
});

const log = [
  evento("a", "EXCEL", "2026-11-01T09:00:00", 10),
  evento("b", "MONDAY", "2026-11-02T09:00:00", 5),
  evento("c", "EXCEL", "2026-11-02T10:00:00", 12),
];

describe("eventosRecientes", () => {
  it("ordena del más reciente al más antiguo", () => {
    expect(eventosRecientes(log, "TODAS").map((e) => e.id)).toEqual(["c", "b", "a"]);
  });

  it("filtra por integración", () => {
    expect(eventosRecientes(log, "EXCEL").map((e) => e.id)).toEqual(["c", "a"]);
  });
});

describe("registrosUltimoSync", () => {
  it("toma el evento más reciente de la integración", () => {
    expect(registrosUltimoSync(log, "EXCEL")).toBe(12);
  });

  it("devuelve 0 si nunca se sincronizó", () => {
    expect(registrosUltimoSync(log, "ENKONTROL")).toBe(0);
  });
});
