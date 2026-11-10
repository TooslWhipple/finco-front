import { describe, expect, it } from "vitest";
import type { Factura } from "@/domain";
import { formatEjecucion, renderPlantilla } from "./avisos";

const factura: Factura = {
  id: "f1",
  localId: "L1",
  locatarioId: "T1",
  mes: "2026-10",
  monto: 18_740,
  vencimiento: "2026-10-29",
  folio: "A-1042",
};
const contexto = {
  locatario: "Café Aroma",
  local: "A-09",
  plaza: "Plaza Sur",
  hoy: "2026-11-03",
};

describe("renderPlantilla", () => {
  it("rellena todas las variables con los datos de la factura", () => {
    const msg = renderPlantilla(
      {
        asunto: "Factura {folio}",
        cuerpo:
          "{locatario} · {local} · {plaza} · {monto} · vence {vencimiento} · {diasAtraso} días",
      },
      factura,
      contexto,
    );
    expect(msg.asunto).toBe("Factura A-1042");
    expect(msg.cuerpo).toContain("Café Aroma · A-09 · Plaza Sur · ");
    expect(msg.cuerpo).toContain("18,740");
    expect(msg.cuerpo).toContain("· 5 días");
    expect(msg.cuerpo).not.toMatch(/\{\w+\}/);
  });

  it("deja intacta una variable desconocida y sin asunto no inventa uno", () => {
    const msg = renderPlantilla({ cuerpo: "Hola {otra}" }, factura, contexto);
    expect(msg.cuerpo).toBe("Hola {otra}");
    expect(msg.asunto).toBeUndefined();
  });

  it("usa el id si la factura no tiene folio", () => {
    const msg = renderPlantilla(
      { cuerpo: "{folio}" },
      { ...factura, folio: undefined },
      contexto,
    );
    expect(msg.cuerpo).toBe("f1");
  });
});

describe("formatEjecucion", () => {
  it("escribe día de la semana, fecha y hora", () => {
    expect(formatEjecucion({ fecha: "2026-11-06", hora: "07:00" })).toBe(
      "viernes 6 nov, 07:00",
    );
  });
});
