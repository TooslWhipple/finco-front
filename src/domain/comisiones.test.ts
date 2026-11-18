import { describe, expect, it } from "vitest";
import {
  ESQUEMA_INICIAL,
  calcularComisiones,
  cotizacionRequirioExcepcion,
  estadoDeCuenta,
  mesesCobrados,
  totalesComisiones,
} from "./comisiones";
import { mesesDeContrato } from "./contratos";
import { crearContrato } from "./fixtures";
import type { Comision, EsquemaComisiones, ExcepcionPrecio } from "./tipos";

const AHORA = "2026-11-03T10:30:00";
const SOFIA = "usr-sofia";
const JORGE = "usr-jorge";
const ESQUEMA: EsquemaComisiones = { ...ESQUEMA_INICIAL };

function excepcion(cotizacionId: string, estado: ExcepcionPrecio["estado"]): ExcepcionPrecio {
  return {
    id: `exc-${cotizacionId}`,
    cotizacionId,
    localId: "A-09",
    rentaSolicitada: 18_000,
    precioMinimo: 20_000,
    estado,
    solicitadaPor: SOFIA,
  };
}

function porConcepto(comisiones: Comision[]) {
  return Object.fromEntries(comisiones.map((c) => [`${c.concepto}:${c.usuarioId}`, c]));
}

describe("mesesCobrados", () => {
  it("toma a lo más 12 meses del primer año y descuenta la gracia", () => {
    expect(mesesCobrados(24, 2)).toBe(10);
    expect(mesesCobrados(12, 0)).toBe(12);
    expect(mesesCobrados(6)).toBe(6);
    expect(mesesCobrados(3, 5)).toBe(0);
  });
});

describe("cotizacionRequirioExcepcion", () => {
  it("solo cuenta una excepción APLICADA de esa cotización", () => {
    expect(cotizacionRequirioExcepcion("COT-1", [excepcion("COT-1", "APLICADA")])).toBe(true);
    expect(cotizacionRequirioExcepcion("COT-1", [excepcion("COT-1", "PENDIENTE")])).toBe(false);
    expect(cotizacionRequirioExcepcion("COT-1", [excepcion("COT-1", "RECHAZADA")])).toBe(false);
    expect(cotizacionRequirioExcepcion("COT-1", [excepcion("COT-2", "APLICADA")])).toBe(false);
    expect(cotizacionRequirioExcepcion(undefined, [excepcion("COT-1", "APLICADA")])).toBe(false);
  });
});

describe("calcularComisiones", () => {
  const contrato = crearContrato({ id: "ctr-1", rentaMensual: 20_000 });

  it("contrato de Sofía sin excepción: asesor, bono y mando medio de Jorge", () => {
    const comisiones = calcularComisiones(
      contrato,
      ESQUEMA,
      {
        vendedorId: SOFIA,
        vendedorComercial: true,
        requirioExcepcion: false,
        mesesCobrados: mesesCobrados(24, 2),
      },
      AHORA,
    );
    expect(comisiones).toHaveLength(3);
    const c = porConcepto(comisiones);
    expect(c[`ASESOR:${SOFIA}`]).toEqual({
      id: `com-ctr-1-ASESOR-${SOFIA}`,
      contratoId: "ctr-1",
      usuarioId: SOFIA,
      concepto: "ASESOR",
      base: 200_000,
      porcentaje: 4,
      monto: 8_000,
      generadaEl: "2026-11-03",
    });
    expect(c[`BONO_SIN_EXCEPCION:${SOFIA}`]?.monto).toBe(2_000);
    expect(c[`MANDO_MEDIO:${JORGE}`]?.monto).toBe(2_000);
    expect(c[`MANDO_MEDIO:${JORGE}`]?.id).toBe(`com-ctr-1-MANDO_MEDIO-${JORGE}`);
  });

  it("con plazo 12 y gracia 0 la base es de 12 rentas", () => {
    const [asesor] = calcularComisiones(
      contrato,
      ESQUEMA,
      { vendedorId: SOFIA, vendedorComercial: true, requirioExcepcion: false, mesesCobrados: mesesCobrados(12, 0) },
      AHORA,
    );
    expect(asesor?.base).toBe(240_000);
    expect(asesor?.monto).toBe(9_600);
  });

  it("con excepción APLICADA no hay bono; con una PENDIENTE sí", () => {
    const cierre = (estado: ExcepcionPrecio["estado"]) => ({
      vendedorId: SOFIA,
      vendedorComercial: true,
      requirioExcepcion: cotizacionRequirioExcepcion("COT-1", [excepcion("COT-1", estado)]),
      mesesCobrados: 10,
    });
    const aplicada = calcularComisiones(contrato, ESQUEMA, cierre("APLICADA"), AHORA);
    expect(aplicada.map((c) => c.concepto)).toEqual(["ASESOR", "MANDO_MEDIO"]);
    const pendiente = calcularComisiones(contrato, ESQUEMA, cierre("PENDIENTE"), AHORA);
    expect(pendiente.map((c) => c.concepto)).toEqual([
      "ASESOR",
      "BONO_SIN_EXCEPCION",
      "MANDO_MEDIO",
    ]);
  });

  it("un contrato de Jorge no le genera mando medio", () => {
    const comisiones = calcularComisiones(
      contrato,
      ESQUEMA,
      { vendedorId: JORGE, vendedorComercial: true, requirioExcepcion: false, mesesCobrados: 10 },
      AHORA,
    );
    expect(comisiones.map((c) => `${c.concepto}:${c.usuarioId}`)).toEqual([
      `ASESOR:${JORGE}`,
      `BONO_SIN_EXCEPCION:${JORGE}`,
    ]);
  });

  it("un vendedor fuera del equipo comercial no genera ninguna comisión", () => {
    expect(
      calcularComisiones(
        contrato,
        ESQUEMA,
        { vendedorId: "usr-sergio", vendedorComercial: false, requirioExcepcion: false, mesesCobrados: 10 },
        AHORA,
      ),
    ).toEqual([]);
  });

  it("contrato sin cotización (COT-HIST con excepción APLICADA): meses del contrato, gracia 0 y sin bono", () => {
    const historico = crearContrato({
      id: "ctr-hist-1",
      inicio: "2026-02-01",
      fin: "2029-02-01",
      rentaMensual: 15_000,
      cotizacionId: "COT-HIST-0001",
    });
    const comisiones = calcularComisiones(
      historico,
      ESQUEMA,
      {
        vendedorId: SOFIA,
        vendedorComercial: true,
        requirioExcepcion: cotizacionRequirioExcepcion(historico.cotizacionId, [
          excepcion("COT-HIST-0001", "APLICADA"),
        ]),
        mesesCobrados: mesesCobrados(mesesDeContrato(historico)),
      },
      `${historico.inicio}T00:00:00`,
    );
    expect(comisiones.map((c) => c.concepto)).toEqual(["ASESOR", "MANDO_MEDIO"]);
    expect(comisiones[0]?.base).toBe(180_000);
    expect(comisiones[0]?.generadaEl).toBe("2026-02-01");
  });

  it("redondea los montos a centavos y omite un concepto en 0 %", () => {
    const comisiones = calcularComisiones(
      crearContrato({ id: "ctr-2", rentaMensual: 12_345.67 }),
      { ...ESQUEMA, asesorPct: 3.333, bonoSinExcepcionPct: 0 },
      { vendedorId: SOFIA, vendedorComercial: true, requirioExcepcion: false, mesesCobrados: 1 },
      AHORA,
    );
    expect(comisiones.map((c) => c.concepto)).toEqual(["ASESOR", "MANDO_MEDIO"]);
    expect(comisiones[0]?.monto).toBe(411.48);
    expect(comisiones[1]?.monto).toBe(123.46);
  });
});

describe("estadoDeCuenta", () => {
  const comisiones = calcularComisiones(
    crearContrato({ id: "ctr-1", rentaMensual: 20_000 }),
    ESQUEMA,
    { vendedorId: SOFIA, vendedorComercial: true, requirioExcepcion: false, mesesCobrados: 10 },
    AHORA,
  ).map((c) => (c.concepto === "ASESOR" ? { ...c, pagadaEl: "2026-11-10" } : c));

  it("suma generado, pagado y pendiente por usuario", () => {
    expect(estadoDeCuenta(comisiones)).toEqual([
      { usuarioId: SOFIA, generado: 10_000, pagado: 8_000, pendiente: 2_000 },
      { usuarioId: JORGE, generado: 2_000, pagado: 0, pendiente: 2_000 },
    ]);
  });

  it("los totales globales cuadran con el estado de cuenta", () => {
    expect(totalesComisiones(comisiones)).toEqual({
      generado: 12_000,
      pagado: 8_000,
      pendiente: 4_000,
    });
    expect(estadoDeCuenta([])).toEqual([]);
  });
});
