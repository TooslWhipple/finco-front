import { describe, expect, it } from "vitest";
import {
  contratoDesdeCotizacion,
  estadoVigenciaContrato,
  estadoVisibleContrato,
  folioContrato,
} from "./contratos";
import { crearContrato, crearCotizacion } from "./fixtures";

const HOY = "2026-11-03";

describe("estadoVigenciaContrato", () => {
  it("vigente lejos del fin", () => {
    expect(estadoVigenciaContrato(crearContrato({ fin: "2027-06-30" }), HOY)).toBe(
      "VIGENTE",
    );
  });

  it("por vencer dentro de 90 días, incluido el día 90 y el último día", () => {
    expect(estadoVigenciaContrato(crearContrato({ fin: "2027-02-01" }), HOY)).toBe(
      "POR_VENCER",
    );
    expect(estadoVigenciaContrato(crearContrato({ fin: HOY }), HOY)).toBe("POR_VENCER");
    expect(estadoVigenciaContrato(crearContrato({ fin: "2027-02-02" }), HOY)).toBe(
      "VIGENTE",
    );
  });

  it("vencido cuando el fin ya pasó", () => {
    expect(estadoVigenciaContrato(crearContrato({ fin: "2026-11-02" }), HOY)).toBe(
      "VENCIDO",
    );
  });

  it("no aplica a contratos que no rigen", () => {
    for (const estado of ["BORRADOR", "EN_FIRMA", "TERMINADO"] as const) {
      expect(
        estadoVigenciaContrato(crearContrato({ estado, fin: "2026-12-01" }), HOY),
      ).toBe(null);
    }
  });
});

describe("estadoVisibleContrato", () => {
  it("usa el ciclo de vida mientras no rige y la vigencia derivada cuando ya rige", () => {
    expect(estadoVisibleContrato(crearContrato({ estado: "EN_FIRMA" }), HOY)).toBe(
      "EN_FIRMA",
    );
    expect(estadoVisibleContrato(crearContrato({ fin: "2026-12-01" }), HOY)).toBe(
      "POR_VENCER",
    );
    expect(estadoVisibleContrato(crearContrato({ fin: "2030-01-01" }), HOY)).toBe(
      "VIGENTE",
    );
  });
});

describe("folioContrato", () => {
  it("cambia el prefijo de la cotización", () => {
    expect(folioContrato("COT-2026-0418")).toBe("CTR-2026-0418");
  });
});

describe("contratoDesdeCotizacion", () => {
  it("nace en borrador con el plazo y el folio de la cotización", () => {
    const contrato = contratoDesdeCotizacion(
      crearCotizacion({
        id: "COT-2026-0418",
        prospectoId: "pro-007",
        inicioContrato: "2027-01-01",
        plazoMeses: 36,
        rentaMensual: 22_900,
      }),
    );
    expect(contrato).toMatchObject({
      id: "ctr-COT-2026-0418",
      estado: "BORRADOR",
      folio: "CTR-2026-0418",
      cotizacionId: "COT-2026-0418",
      locatarioId: "pro-007",
      inicio: "2027-01-01",
      fin: "2030-01-01",
      rentaMensual: 22_900,
    });
  });

  it("sin prospecto registrado usa la cotización como locatario", () => {
    const contrato = contratoDesdeCotizacion(crearCotizacion({ id: "COT-2026-0500" }));
    expect(contrato.locatarioId).toBe("COT-2026-0500");
  });
});
