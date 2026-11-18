import { describe, expect, it } from "vitest";
import {
  estadisticaPorCliente,
  estadoMeta,
  kpisCasos,
  puedeEscalar,
  siguienteFolioCaso,
  transicionesPermitidas,
  validarTransicionCaso,
} from "./casos";
import type { CasoServicio } from "./tipos";

const AHORA = "2026-11-03T15:56:00";

function caso(parcial: Partial<CasoServicio> = {}): CasoServicio {
  return {
    id: "cas-1",
    folio: "CAS-2026-0001",
    plazaId: "plz-1",
    localId: "A-09",
    locatarioId: "L-1",
    tipo: "FUGA",
    prioridad: "ALTA",
    estatus: "RECIBIDO",
    canal: "TELEFONO",
    descripcion: "Fuga en el baño",
    abiertoEl: "2026-11-03T10:56:00",
    bitacora: [],
    ...parcial,
  };
}

describe("estadoMeta", () => {
  it("un caso ALTA recibido hace 5 horas sin respuesta está fuera de tiempo", () => {
    expect(estadoMeta(caso({ abiertoEl: "2026-11-03T10:56:00" }), AHORA)).toBe(
      "FUERA_DE_TIEMPO",
    );
  });

  it("un caso ALTA de 3,5 horas sin respuesta está por vencer", () => {
    expect(estadoMeta(caso({ abiertoEl: "2026-11-03T12:26:00" }), AHORA)).toBe(
      "POR_VENCER",
    );
  });

  it("un caso ALTA de 1 hora sin respuesta está en tiempo", () => {
    expect(estadoMeta(caso({ abiertoEl: "2026-11-03T14:56:00" }), AHORA)).toBe(
      "EN_TIEMPO",
    );
  });

  it("uno MEDIA respondido a las 10 horas cuenta en tiempo, aunque ya pasó su meta desde que abrió", () => {
    const respondido = caso({
      prioridad: "MEDIA",
      abiertoEl: "2026-10-30T08:00:00",
      primeraRespuestaEl: "2026-10-30T18:00:00",
      estatus: "EN_ATENCION",
    });
    expect(estadoMeta(respondido, AHORA)).toBe("EN_TIEMPO");
  });

  it("uno BAJA respondido a las 80 horas quedó fuera de tiempo", () => {
    const tarde = caso({
      prioridad: "BAJA",
      abiertoEl: "2026-10-20T08:00:00",
      primeraRespuestaEl: "2026-10-23T16:00:00",
      estatus: "EN_ATENCION",
    });
    expect(estadoMeta(tarde, AHORA)).toBe("FUERA_DE_TIEMPO");
  });
});

describe("puedeEscalar", () => {
  it("una fuga, falla o daño sin escalar ni cerrar se puede escalar", () => {
    for (const tipo of ["FUGA", "FALLA", "DANO"] as const)
      expect(puedeEscalar(caso({ tipo })), tipo).toBe(true);
  });

  it("una aclaración de factura, un caso ya escalado o uno cerrado no", () => {
    expect(puedeEscalar(caso({ tipo: "ACLARACION_FACTURA" }))).toBe(false);
    expect(puedeEscalar(caso({ tipo: "CONSULTA" }))).toBe(false);
    expect(puedeEscalar(caso({ mantenimientoId: "mnt-0001" }))).toBe(false);
    expect(puedeEscalar(caso({ estatus: "CERRADO", calificacion: 5 }))).toBe(false);
  });
});

describe("transiciones", () => {
  it("RECIBIDO no tiene destinos: solo sale al responder; no se reabre", () => {
    expect(transicionesPermitidas("RECIBIDO")).toEqual([]);
    expect(transicionesPermitidas("EN_ATENCION")).toEqual(["RESUELTO"]);
    expect(transicionesPermitidas("RESUELTO")).toEqual(["CERRADO"]);
    expect(transicionesPermitidas("CERRADO")).toEqual([]);
  });

  it("rechaza pasar de RECIBIDO a EN_ATENCION o a CERRADO", () => {
    expect(validarTransicionCaso({ estatus: "RECIBIDO" }, "EN_ATENCION").ok).toBe(false);
    expect(validarTransicionCaso({ estatus: "RECIBIDO" }, "CERRADO", 5).ok).toBe(false);
  });

  it("cerrar exige una calificación entera de 1 a 5", () => {
    expect(validarTransicionCaso({ estatus: "RESUELTO" }, "CERRADO").ok).toBe(false);
    expect(validarTransicionCaso({ estatus: "RESUELTO" }, "CERRADO", 6).ok).toBe(false);
    expect(validarTransicionCaso({ estatus: "RESUELTO" }, "CERRADO", 0).ok).toBe(false);
    expect(validarTransicionCaso({ estatus: "RESUELTO" }, "CERRADO", 4).ok).toBe(true);
    expect(validarTransicionCaso({ estatus: "EN_ATENCION" }, "RESUELTO").ok).toBe(true);
  });
});

describe("siguienteFolioCaso", () => {
  it("sigue al mayor del año y reinicia en un año nuevo", () => {
    const casos = [
      { folio: "CAS-2026-0007" },
      { folio: "CAS-2026-0003" },
      { folio: "CAS-2025-0040" },
    ];
    expect(siguienteFolioCaso(casos, 2026)).toBe("CAS-2026-0008");
    expect(siguienteFolioCaso(casos, 2027)).toBe("CAS-2027-0001");
  });
});

describe("estadisticaPorCliente", () => {
  const casos = [
    // L-1: respondido en tiempo, cerrado con 4.
    caso({
      id: "a",
      locatarioId: "L-1",
      prioridad: "MEDIA",
      abiertoEl: "2026-10-01T08:00:00",
      primeraRespuestaEl: "2026-10-01T10:00:00",
      resueltoEl: "2026-10-02T08:00:00",
      estatus: "CERRADO",
      calificacion: 4,
    }),
    // L-1: sin respuesta y fuera de tiempo: cuenta en el denominador.
    caso({ id: "b", locatarioId: "L-1", abiertoEl: "2026-11-03T08:00:00" }),
    // L-1: sin respuesta pero aún en tiempo: no cuenta.
    caso({
      id: "c",
      locatarioId: "L-1",
      tipo: "CONSULTA",
      prioridad: "BAJA",
      abiertoEl: "2026-11-03T12:00:00",
    }),
    // L-2: respondido tarde.
    caso({
      id: "d",
      locatarioId: "L-2",
      tipo: "ACLARACION_FACTURA",
      prioridad: "ALTA",
      abiertoEl: "2026-10-10T08:00:00",
      primeraRespuestaEl: "2026-10-10T20:00:00",
      estatus: "EN_ATENCION",
    }),
  ];

  it("agrupa por locatario, del que más casos tiene al que menos", () => {
    const estadistica = estadisticaPorCliente(casos, AHORA);
    expect(estadistica.map((e) => [e.locatarioId, e.total])).toEqual([
      ["L-1", 3],
      ["L-2", 1],
    ]);
  });

  it("el % en tiempo divide los respondidos en tiempo entre respondidos más sin responder fuera de tiempo", () => {
    const [l1, l2] = estadisticaPorCliente(casos, AHORA);
    expect(l1.fraccionEnTiempo).toBe(0.5);
    expect(l1.abiertos).toBe(2);
    expect(l1.horasPrimeraRespuesta).toBe(2);
    expect(l1.horasResolucion).toBe(24);
    expect(l1.calificacionPromedio).toBe(4);
    expect(l1.tipoFrecuente).toBe("FUGA");
    expect(l2.fraccionEnTiempo).toBe(0);
    expect(l2.calificacionPromedio).toBeNull();
  });

  it("los KPIs cuentan solo los casos de los últimos 30 días", () => {
    const kpis = kpisCasos(casos, AHORA);
    expect(kpis.recibidos).toBe(3);
    expect(kpis.abiertos).toBe(3);
    expect(kpis.fueraDeTiempo).toBe(2);
    expect(kpis.fraccionEnTiempo).toBe(0);
  });
});
