import { describe, expect, it } from "vitest";
import { campanaVigente, estadisticaCampanas, siguienteIdCampana } from "./campanas";
import { crearContrato, crearCotizacion, crearProspecto } from "./fixtures";
import type { Campana } from "./tipos";

function campana(parche: Partial<Campana> = {}): Campana {
  return {
    id: "cmp-01",
    nombre: "Facebook Ads",
    canal: "REDES",
    inicio: "2026-01-01",
    fin: "2026-12-31",
    inversion: 20_000,
    ...parche,
  };
}

const PROSPECTOS = [1, 2, 3, 4].map((n) =>
  crearProspecto({ id: `pro-${n}`, origen: "REDES", campanaId: "cmp-01" }),
);

describe("estadisticaCampanas", () => {
  it("cuenta el contrato nacido de la cotización de un prospecto de la campaña", () => {
    const cotizaciones = [crearCotizacion({ id: "COT-1", prospectoId: "pro-1" })];
    const contratos = [
      crearContrato({ id: "ctr-1", estado: "BORRADOR", cotizacionId: "COT-1", rentaMensual: 12_000 }),
    ];
    const [e] = estadisticaCampanas([campana()], PROSPECTOS, cotizaciones, contratos, {});
    expect(e).toEqual({
      campanaId: "cmp-01",
      prospectos: 4,
      ganados: 0,
      contratos: 1,
      conversion: 0.25,
      rentaCerrada: 12_000,
      inversion: 20_000,
      costoPorProspecto: 5_000,
      costoPorContrato: 20_000,
    });
  });

  it("no cuenta los contratos TERMINADO", () => {
    const cotizaciones = [crearCotizacion({ id: "COT-1", prospectoId: "pro-1" })];
    const contratos = [crearContrato({ estado: "TERMINADO", cotizacionId: "COT-1" })];
    const [e] = estadisticaCampanas([campana()], PROSPECTOS, cotizaciones, contratos, {});
    expect(e?.contratos).toBe(0);
  });

  it("sin contratos deja el costo por contrato en null", () => {
    const [e] = estadisticaCampanas([campana()], PROSPECTOS, [], [], {});
    expect(e?.contratos).toBe(0);
    expect(e?.conversion).toBe(0);
    expect(e?.costoPorContrato).toBeNull();
  });

  it("sin prospectos deja la conversión y el costo por prospecto en null", () => {
    const [e] = estadisticaCampanas([campana()], [], [], [], {});
    expect(e?.conversion).toBeNull();
    expect(e?.costoPorProspecto).toBeNull();
    expect(Number.isFinite(e?.inversion)).toBe(true);
  });

  it("cuenta los ganados de la campaña", () => {
    const prospectos = [
      ...PROSPECTOS.slice(0, 3),
      crearProspecto({ id: "pro-4", campanaId: "cmp-01", etapa: "GANADO" }),
    ];
    const [e] = estadisticaCampanas([campana()], prospectos, [], [], {});
    expect(e?.ganados).toBe(1);
  });

  it("cuenta un contrato sin cotización por su atribución", () => {
    const contratos = [crearContrato({ id: "ctr-9", rentaMensual: 8_000 })];
    const [e] = estadisticaCampanas([campana()], PROSPECTOS, [], contratos, {
      "ctr-9": { vendedorId: "usr-sofia", campanaId: "cmp-01" },
    });
    expect(e?.contratos).toBe(1);
    expect(e?.rentaCerrada).toBe(8_000);
  });

  it("cuenta por atribución un contrato cuya cotización no existe", () => {
    const contratos = [crearContrato({ id: "ctr-9", cotizacionId: "COT-HIST-0001" })];
    const [e] = estadisticaCampanas([campana()], PROSPECTOS, [crearCotizacion()], contratos, {
      "ctr-9": { vendedorId: "usr-sofia", campanaId: "cmp-01" },
    });
    expect(e?.contratos).toBe(1);
  });

  it("con cotización existente manda su prospecto, no la atribución", () => {
    const cotizaciones = [crearCotizacion({ id: "COT-1", prospectoId: "pro-otro" })];
    const contratos = [crearContrato({ id: "ctr-9", cotizacionId: "COT-1" })];
    const [e] = estadisticaCampanas([campana()], PROSPECTOS, cotizaciones, contratos, {
      "ctr-9": { vendedorId: "usr-sofia", campanaId: "cmp-01" },
    });
    expect(e?.contratos).toBe(0);
  });
});

describe("campanaVigente", () => {
  it("respeta inicio y fin", () => {
    const c = campana({ inicio: "2026-03-01", fin: "2026-03-31" });
    expect(campanaVigente(c, "2026-02-28")).toBe(false);
    expect(campanaVigente(c, "2026-03-01")).toBe(true);
    expect(campanaVigente(c, "2026-03-31")).toBe(true);
    expect(campanaVigente(c, "2026-04-01")).toBe(false);
  });

  it("sin fin sigue vigente", () => {
    expect(campanaVigente(campana({ fin: undefined }), "2030-01-01")).toBe(true);
  });
});

describe("siguienteIdCampana", () => {
  it("continúa tras el mayor cmp-NN", () => {
    expect(siguienteIdCampana([])).toBe("cmp-01");
    expect(siguienteIdCampana([{ id: "cmp-06" }, { id: "cmp-02" }])).toBe("cmp-07");
  });
});
