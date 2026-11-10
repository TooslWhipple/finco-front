import { describe, expect, it } from "vitest";
import {
  avisosDelDia,
  avisosParaEnviar,
  diaSemanaDe,
  disparadorDeFactura,
  disparadorManual,
  proximaEjecucion,
} from "./avisos";
import type { EnvioAviso, Factura } from "./tipos";

const HOY = "2026-11-03";

const fac = (id: string, vencimiento: string, o: Partial<Factura> = {}): Factura => ({
  id,
  localId: "L1",
  locatarioId: "T1",
  mes: "2026-11",
  monto: 1_000,
  vencimiento,
  ...o,
});

describe("disparadorDeFactura", () => {
  it("mapea los cinco disparadores y descarta lo demás", () => {
    expect(disparadorDeFactura(fac("a", "2026-11-06"), HOY)).toBe("ANTES_3");
    expect(disparadorDeFactura(fac("b", "2026-11-03"), HOY)).toBe("DIA_PAGO");
    expect(disparadorDeFactura(fac("c", "2026-10-29"), HOY)).toBe("ATRASO_5");
    expect(disparadorDeFactura(fac("d", "2026-10-19"), HOY)).toBe("ATRASO_15");
    expect(disparadorDeFactura(fac("e", "2026-10-04"), HOY)).toBe("ATRASO_30");
    expect(disparadorDeFactura(fac("f", "2026-10-30"), HOY)).toBeNull();
    expect(
      disparadorDeFactura(fac("g", "2026-11-03", { pagadaEl: HOY }), HOY),
    ).toBeNull();
  });

  it("el manual cae al escalón de atraso más cercano", () => {
    expect(disparadorManual(fac("a", "2026-10-30"), HOY)).toBe("ATRASO_5");
    expect(disparadorManual(fac("b", "2026-10-10"), HOY)).toBe("ATRASO_15");
    expect(disparadorManual(fac("c", "2026-09-01"), HOY)).toBe("ATRASO_30");
    expect(disparadorManual(fac("d", "2026-11-03"), HOY)).toBe("DIA_PAGO");
  });
});

describe("avisosDelDia y avisosParaEnviar", () => {
  const facturas = [
    fac("a", "2026-11-06"),
    fac("b", "2026-11-03"),
    fac("c", "2026-10-29"),
    fac("d", "2026-10-19"),
    fac("x", "2026-10-30"),
  ];

  it("reparte tres de cada cuatro por WhatsApp", () => {
    const avisos = avisosDelDia(facturas, HOY);
    expect(avisos.map((a) => a.factura.id)).toEqual(["a", "b", "c", "d"]);
    expect(avisos.filter((a) => a.canal === "CORREO")).toHaveLength(1);
    expect(avisos.at(-1)?.canal).toBe("CORREO");
  });

  it("no repite a quien ya recibió aviso hoy", () => {
    const envio: EnvioAviso = {
      id: "env-1",
      facturaId: "a",
      plantillaId: "p",
      canal: "WHATSAPP",
      enviadoEl: HOY,
      hora: "07:00",
      origen: "PROGRAMADO",
    };
    const ids = avisosParaEnviar(facturas, HOY, [envio]).map((a) => a.factura.id);
    expect(ids).toEqual(["b", "c", "d"]);
    expect(
      avisosParaEnviar(facturas, HOY, [{ ...envio, enviadoEl: "2026-10-30" }]),
    ).toHaveLength(4);
  });
});

describe("proximaEjecucion", () => {
  const viernes = { activa: true, dias: ["VIE" as const], hora: "07:00" };

  it("calcula el día de la semana", () => {
    expect(diaSemanaDe("2026-11-03")).toBe("MAR");
    expect(diaSemanaDe("2026-11-08")).toBe("DOM");
  });

  it("toma el siguiente viernes", () => {
    expect(proximaEjecucion(viernes, { fecha: HOY, hora: "15:56" })).toEqual({
      fecha: "2026-11-06",
      hora: "07:00",
    });
  });

  it("el mismo día cuenta solo si la hora aún no pasó", () => {
    expect(proximaEjecucion(viernes, { fecha: "2026-11-06", hora: "06:59" })?.fecha).toBe(
      "2026-11-06",
    );
    expect(proximaEjecucion(viernes, { fecha: "2026-11-06", hora: "07:00" })?.fecha).toBe(
      "2026-11-13",
    );
  });

  it("con martes y viernes a las 08:00 gana el martes", () => {
    const p = { activa: true, dias: ["MAR" as const, "VIE" as const], hora: "08:00" };
    expect(proximaEjecucion(p, { fecha: HOY, hora: "07:00" })).toEqual({
      fecha: "2026-11-03",
      hora: "08:00",
    });
    expect(proximaEjecucion(p, { fecha: HOY, hora: "15:56" })?.fecha).toBe("2026-11-06");
  });

  it("apagada o sin días no hay próxima ejecución", () => {
    expect(
      proximaEjecucion({ ...viernes, activa: false }, { fecha: HOY, hora: "10:00" }),
    ).toBeNull();
    expect(
      proximaEjecucion({ ...viernes, dias: [] }, { fecha: HOY, hora: "10:00" }),
    ).toBeNull();
  });
});
