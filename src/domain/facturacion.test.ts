import { describe, expect, it } from "vitest";
import {
  complementoDePago,
  diaDeFacturacion,
  facturasAEmitir,
  mesSiguiente,
  mezclarFacturas,
  nombreLocatario,
  proximaEmision,
  recargosPendientes,
  REGLA_RECARGO_INICIAL,
} from "./facturacion";
import { crearContrato, crearCotizacion, crearFactura, crearProspecto } from "./fixtures";

const HOY = "2026-11-03";
const DIC = "2026-12";

describe("diaDeFacturacion y mesSiguiente", () => {
  it("toma el aniversario con tope 28", () => {
    expect(diaDeFacturacion(crearContrato({ inicio: "2024-03-05" }))).toBe(5);
    expect(diaDeFacturacion(crearContrato({ inicio: "2024-03-31" }))).toBe(28);
  });
  it("cruza el año", () => {
    expect(mesSiguiente(HOY)).toBe(DIC);
    expect(mesSiguiente("2026-12-31")).toBe("2027-01");
  });
});

describe("facturasAEmitir", () => {
  const existentes = [
    crearFactura({ id: "fac-1", localId: "X-01", folio: "A-3010" }),
    crearFactura({ id: "fac-2", localId: "X-02", folio: "A-3042" }),
  ];

  it("emite la renta del mes con id, folio siguiente al máximo y vencimiento de aniversario", () => {
    const [f] = facturasAEmitir(
      [crearContrato({ localId: "A-09", inicio: "2024-01-12", rentaMensual: 7_500 })],
      existentes,
      DIC,
    );
    expect(f).toEqual({
      id: "fac-em-A-09-2026-12",
      localId: "A-09",
      locatarioId: "L-1",
      mes: DIC,
      monto: 7_500,
      vencimiento: "2026-12-12",
      folio: "A-3043",
      concepto: "RENTA",
      origen: "EMISION",
    });
  });

  it("no repite un mes ya emitido para el local", () => {
    const contratos = [crearContrato({ localId: "A-09" })];
    const primera = facturasAEmitir(contratos, existentes, DIC);
    expect(primera).toHaveLength(1);
    expect(facturasAEmitir(contratos, [...existentes, ...primera], DIC)).toEqual([]);
  });

  it("un contrato no VIGENTE o sin traslape con el mes no emite", () => {
    expect(
      facturasAEmitir(
        [
          crearContrato({ localId: "B", estado: "EN_FIRMA" }),
          crearContrato({ localId: "C", estado: "TERMINADO" }),
          crearContrato({ localId: "D", inicio: "2027-01-01", fin: "2030-01-01" }),
          crearContrato({ localId: "E", inicio: "2021-01-01", fin: "2026-11-30" }),
        ],
        [],
        DIC,
      ),
    ).toEqual([]);
    expect(
      facturasAEmitir(
        [
          crearContrato({ localId: "F", inicio: "2026-12-31", fin: "2029-12-30" }),
          crearContrato({ localId: "G", inicio: "2021-12-01", fin: "2026-12-01" }),
        ],
        [],
        DIC,
      ).map((f) => f.localId),
    ).toEqual(["F", "G"]);
  });

  it("con dos contratos elegibles en un local gana el de inicio más reciente", () => {
    const [f] = facturasAEmitir(
      [
        crearContrato({
          id: "viejo",
          inicio: "2021-12-10",
          fin: "2026-12-09",
          rentaMensual: 1,
        }),
        crearContrato({
          id: "nuevo",
          inicio: "2026-12-10",
          fin: "2029-12-09",
          rentaMensual: 2,
        }),
      ],
      [],
      DIC,
    );
    expect(f.monto).toBe(2);
    expect(f.folio).toBe("A-0001");
  });
});

describe("recargosPendientes", () => {
  const vencida = (dias: number) =>
    crearFactura({
      id: "fac-9",
      localId: "Z-1",
      locatarioId: "T-9",
      mes: "2026-08",
      monto: 10_000,
      vencimiento: new Date(Date.UTC(2026, 10, 3) - dias * 86_400_000)
        .toISOString()
        .slice(0, 10),
    });

  it("carga en los días 6 y 36 de atraso sobre la renta, sin folio", () => {
    expect(recargosPendientes([vencida(5)], REGLA_RECARGO_INICIAL, HOY)).toEqual([]);
    const renta = vencida(36);
    const recargos = recargosPendientes([renta], REGLA_RECARGO_INICIAL, HOY);
    expect(recargos).toEqual([
      {
        id: "rec-fac-9-1",
        localId: "Z-1",
        locatarioId: "T-9",
        mes: "2026-08",
        monto: 200,
        vencimiento: "2026-10-04",
        concepto: "RECARGO",
        origen: "EMISION",
        facturaOrigenId: "fac-9",
      },
      expect.objectContaining({
        id: "rec-fac-9-2",
        monto: 200,
        vencimiento: HOY,
      }),
    ]);
  });

  it("no duplica, no recarga recargos ni rentas pagadas", () => {
    const renta = vencida(40);
    const primera = recargosPendientes([renta], REGLA_RECARGO_INICIAL, HOY);
    expect(primera).toHaveLength(2);
    expect(recargosPendientes([renta, ...primera], REGLA_RECARGO_INICIAL, HOY)).toEqual(
      [],
    );
    expect(
      recargosPendientes([{ ...renta, pagadaEl: HOY }], REGLA_RECARGO_INICIAL, HOY),
    ).toEqual([]);
  });
});

describe("complementoDePago", () => {
  it("cubre la renta más sus recargos sin pagar con folio CP-", () => {
    const renta = crearFactura({ id: "fac-1", folio: "A-3001", monto: 10_000 });
    const recargos = [
      crearFactura({
        id: "r1",
        concepto: "RECARGO",
        facturaOrigenId: "fac-1",
        monto: 200,
      }),
      crearFactura({
        id: "r2",
        concepto: "RECARGO",
        facturaOrigenId: "fac-1",
        monto: 200,
      }),
      crearFactura({
        id: "r3",
        concepto: "RECARGO",
        facturaOrigenId: "otra",
        monto: 999,
      }),
    ];
    expect(complementoDePago(renta, [renta, ...recargos], HOY)).toEqual({
      id: "cp-fac-1",
      fecha: HOY,
      monto: 10_400,
      folio: "CP-A-3001",
    });
  });
});

describe("proximaEmision", () => {
  const programacion = {
    activa: true,
    dia: 28,
    hora: "07:00",
    canal: "WHATSAPP" as const,
  };

  it("con día 28 cae el 28 de este mes o el del siguiente si ya pasó", () => {
    expect(proximaEmision(programacion, { fecha: HOY, hora: "15:56" })).toEqual({
      fecha: "2026-11-28",
      hora: "07:00",
    });
    expect(
      proximaEmision(programacion, { fecha: "2026-11-28", hora: "07:00" })?.fecha,
    ).toBe("2026-12-28");
    expect(
      proximaEmision(programacion, { fecha: "2026-12-29", hora: "00:00" })?.fecha,
    ).toBe("2027-01-28");
  });

  it("apagada no hay próxima emisión", () => {
    expect(
      proximaEmision({ ...programacion, activa: false }, { fecha: HOY, hora: "10:00" }),
    ).toBeNull();
  });
});

describe("nombreLocatario", () => {
  const fuentes = {
    locatarios: [{ id: "loc-1", nombre: "Café Aroma" }],
    prospectos: [crearProspecto({ id: "prs-7", nombre: "Tacos El Güero" })],
    cotizaciones: [
      crearCotizacion({
        id: "COT-1",
        prospecto: { nombre: "Óptica Sur", documentosCompletos: true },
      }),
    ],
  };

  it("busca en locatarios, luego en el prospecto y en la cotización", () => {
    expect(nombreLocatario("loc-1", fuentes)).toBe("Café Aroma");
    expect(nombreLocatario("prs-7", fuentes)).toBe("Tacos El Güero");
    expect(nombreLocatario("COT-1", fuentes)).toBe("Óptica Sur");
  });

  it("con un id desconocido devuelve un valor no vacío", () => {
    expect(nombreLocatario("nadie", fuentes)).toBe("nadie");
  });
});

describe("mezclarFacturas", () => {
  const renta = crearFactura({ id: "fac-1", folio: "A-3001", vencimiento: "2026-09-01" });
  const pagadaSemilla = crearFactura({ id: "fac-2", pagadaEl: "2026-11-01" });
  const emitida = crearFactura({
    id: "fac-em-A-09-2026-12",
    mes: DIC,
    origen: "EMISION",
  });
  const recargos = [1, 2].map((k) =>
    crearFactura({
      id: `rec-fac-1-${k}`,
      concepto: "RECARGO",
      origen: "EMISION",
      facturaOrigenId: "fac-1",
      monto: 200,
    }),
  );
  const complemento = { id: "cp-fac-1", fecha: HOY, monto: 10_400, folio: "CP-A-3001" };

  it("une semilla, emitidas y recargos sin repetir la emitida", () => {
    const todas = mezclarFacturas([renta, emitida], [emitida], recargos, {});
    expect(todas.map((f) => f.id)).toEqual([
      "fac-1",
      "fac-em-A-09-2026-12",
      "rec-fac-1-1",
      "rec-fac-1-2",
    ]);
  });

  it("el pago de la renta liquida sus recargos y deja el complemento", () => {
    const todas = mezclarFacturas([renta, pagadaSemilla], [], recargos, {
      "fac-1": [complemento],
    });
    expect(todas[0]).toMatchObject({ pagadaEl: HOY, complementos: [complemento] });
    expect(todas[1]).toBe(pagadaSemilla);
    expect(todas.slice(2).map((f) => f.pagadaEl)).toEqual([HOY, HOY]);
    expect(todas.slice(2).every((f) => f.complementos === undefined)).toBe(true);
  });

  it("sin pagos no toca las facturas", () => {
    const todas = mezclarFacturas([renta], [], recargos, {});
    expect(todas.every((f) => f.pagadaEl === undefined)).toBe(true);
  });
});
