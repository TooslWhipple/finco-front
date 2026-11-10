import { describe, expect, it } from "vitest";
import {
  acumuladoEstimado,
  anticipoPendiente,
  calcularImportes,
  erroresEstimacion,
  estimacionSinErrores,
  firmarEstimacion,
  pagoDeEstimacion,
  periodoSiguiente,
  resolverEstimacion,
  volumenPorEstimar,
} from "./estimaciones";
import { crearContratoObra, crearCorte } from "./fixtures";
import { costoRealContrato, indicadoresObra } from "./obra";
import type { EstimacionObra } from "./tipos";

// Contrato de 100 m³ a 1,000 = 100,000; anticipo 30% (30,000) y fondo 5%.
const contrato = crearContratoObra();
// El corte validado trae 10 m³.
const cortes = [crearCorte()];

const estimacion = (parcial: Partial<EstimacionObra> = {}): EstimacionObra => ({
  id: "est-0001",
  contratoObraId: contrato.id,
  numero: 1,
  periodo: { desde: "2026-01-01", hasta: "2026-01-12" },
  volumenes: [{ conceptoId: "c-1", volumen: 4 }],
  estado: "AUTORIZADA_PMO",
  importeBruto: 4_000,
  amortizacionAnticipo: 1_200,
  fondoGarantia: 200,
  importeNeto: 2_600,
  registradaPor: "Héctor Ramos",
  registradaEn: "2026-01-12",
  validadaPor: "Héctor Ramos",
  evidencia: [],
  ...parcial,
});

describe("calcularImportes", () => {
  it("bruto = volumen × PU; resta anticipo 30% y fondo 5%", () => {
    expect(calcularImportes(contrato, [{ conceptoId: "c-1", volumen: 10 }], [])).toEqual({
      importeBruto: 10_000,
      amortizacionAnticipo: 3_000,
      fondoGarantia: 500,
      importeNeto: 6_500,
    });
  });

  it("la amortización tiene tope en el anticipo pendiente", () => {
    const previa = estimacion({ amortizacionAnticipo: 29_000 });
    expect(anticipoPendiente(contrato, [previa])).toBe(1_000);
    const i = calcularImportes(contrato, [{ conceptoId: "c-1", volumen: 10 }], [previa]);
    expect(i.amortizacionAnticipo).toBe(1_000);
    expect(i.importeNeto).toBe(8_500);
  });

  it("una estimación rechazada no consume anticipo", () => {
    const previa = estimacion({ estado: "RECHAZADA", amortizacionAnticipo: 29_000 });
    expect(anticipoPendiente(contrato, [previa])).toBe(30_000);
  });

  it("un contrato sin anticipo no amortiza", () => {
    const sin = crearContratoObra({ anticipoPct: 0 });
    expect(
      calcularImportes(sin, [{ conceptoId: "c-1", volumen: 10 }], [])
        .amortizacionAnticipo,
    ).toBe(0);
  });
});

describe("erroresEstimacion", () => {
  const entrada = (volumen: number) => ({
    contratoObraId: contrato.id,
    volumenes: [{ conceptoId: "c-1", volumen }],
  });

  it("no deja estimar más de lo validado en cortes", () => {
    const e = erroresEstimacion(contrato, cortes, [], entrada(10.5));
    expect(e.volumenes["c-1"]).toMatch(/Excede lo validado/);
    expect(estimacionSinErrores(e)).toBe(false);
  });

  it("descuenta lo ya estimado y acepta el resto exacto", () => {
    const previas = [estimacion({ estado: "VALIDADA_SUPERVISOR" })];
    expect(volumenPorEstimar(contrato, cortes, previas)["c-1"]).toBe(6);
    expect(
      erroresEstimacion(contrato, cortes, previas, entrada(7)).volumenes["c-1"],
    ).toBeDefined();
    expect(
      estimacionSinErrores(erroresEstimacion(contrato, cortes, previas, entrada(6))),
    ).toBe(true);
  });

  it("un corte sin validar no cuenta, y una estimación rechazada libera el volumen", () => {
    const firmado = [crearCorte({ estado: "FIRMADO_SUPERVISOR" })];
    expect(
      erroresEstimacion(contrato, firmado, [], entrada(1)).volumenes["c-1"],
    ).toBeDefined();
    const rechazada = [estimacion({ estado: "RECHAZADA" })];
    expect(acumuladoEstimado(contrato.id, rechazada)["c-1"]).toBeUndefined();
    expect(
      estimacionSinErrores(erroresEstimacion(contrato, cortes, rechazada, entrada(10))),
    ).toBe(true);
  });

  it("exige al menos un volumen y rechaza negativos", () => {
    expect(erroresEstimacion(contrato, cortes, [], entrada(0)).general).toBeDefined();
    expect(
      erroresEstimacion(contrato, cortes, [], entrada(-1)).volumenes["c-1"],
    ).toBeDefined();
  });
});

describe("firmar, resolver y pagar", () => {
  const firmada = firmarEstimacion(
    "est-0002",
    contrato,
    { contratoObraId: contrato.id, volumenes: [{ conceptoId: "c-1", volumen: 10 }] },
    [],
    "Héctor Ramos",
    "2026-01-20",
    [],
  );

  it("nace validada por el Supervisor, con número y desglose", () => {
    expect(firmada).toMatchObject({
      numero: 1,
      estado: "VALIDADA_SUPERVISOR",
      validadaPor: "Héctor Ramos",
      importeBruto: 10_000,
      importeNeto: 6_500,
      periodo: { desde: "2026-01-01", hasta: "2026-01-20" },
    });
  });

  it("el periodo siguiente arranca el día después de la última estimación", () => {
    expect(periodoSiguiente(contrato, [firmada], "2026-01-30").desde).toBe("2026-01-21");
  });

  it("rechazar exige motivo y las resueltas no cambian", () => {
    expect(resolverEstimacion(firmada, "RECHAZADA", "Ricardo", "2026-01-21")).toBe(
      firmada,
    );
    const rechazada = resolverEstimacion(
      firmada,
      "RECHAZADA",
      "Ricardo",
      "2026-01-21",
      " Falta soporte ",
    );
    expect(rechazada).toMatchObject({ estado: "RECHAZADA", comentario: "Falta soporte" });
    expect(resolverEstimacion(rechazada, "AUTORIZADA_PMO", "Ricardo", "2026-01-22")).toBe(
      rechazada,
    );
  });

  it("el costo real (AC) usa el importe bruto, no el neto", () => {
    const autorizada = resolverEstimacion(
      firmada,
      "AUTORIZADA_PMO",
      "Ricardo",
      "2026-01-21",
    );
    const pago = pagoDeEstimacion(autorizada, contrato, "2026-01-21");
    expect(pago.monto).toBe(autorizada.importeBruto);
    expect(pago.monto).not.toBe(autorizada.importeNeto);
    expect(costoRealContrato(contrato, [pago], "2026-01-31")).toBe(10_000);
    const i = indicadoresObra([contrato], cortes, [pago], "2026-01-31");
    expect(i?.ac).toBe(10_000);
  });
});
