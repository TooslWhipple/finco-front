import { describe, expect, it } from "vitest";
import { crearContratoObra, crearCorte } from "./fixtures";
import {
  acumuladoComprometido,
  acumuladoValidado,
  alertasObra,
  aplicarResumenObra,
  avanceFisicoContrato,
  avancePlaneadoContrato,
  avancePlaneadoProyecto,
  contratosSinCaptura,
  corteSinErrores,
  curvaS,
  erroresCorte,
  firmarCorte,
  importeConcepto,
  indicadoresObra,
  resolverCorte,
  resumenObra,
  semaforoDeIndice,
  valorGanadoContrato,
  montoContrato,
  presupuestoProyecto,
} from "./obra";

const contrato = crearContratoObra();

describe("importes", () => {
  it("el importe de un concepto es volumen por precio unitario", () => {
    expect(importeConcepto(contrato.conceptos[0])).toBe(100_000);
  });

  it("el monto del contrato suma sus conceptos y vale 0 sin conceptos", () => {
    const dos = crearContratoObra({
      conceptos: [
        ...contrato.conceptos,
        {
          ...contrato.conceptos[0],
          id: "c-2",
          volumenContratado: 5,
          precioUnitario: 200,
        },
      ],
    });
    expect(montoContrato(dos)).toBe(101_000);
    expect(montoContrato(crearContratoObra({ conceptos: [] }))).toBe(0);
  });

  it("el presupuesto del proyecto suma los contratos y vale 0 sin contratos", () => {
    expect(presupuestoProyecto([contrato, crearContratoObra({ id: "co-2" })])).toBe(
      200_000,
    );
    expect(presupuestoProyecto([])).toBe(0);
  });
});

describe("avancePlaneadoContrato", () => {
  it("antes del inicio vale 0 y después del fin vale 1", () => {
    expect(avancePlaneadoContrato(contrato, "2025-12-31")).toBe(0);
    expect(avancePlaneadoContrato(contrato, "2026-01-12")).toBe(1);
  });

  it("es lineal entre el inicio y el fin", () => {
    expect(avancePlaneadoContrato(contrato, "2026-01-01")).toBe(0);
    expect(avancePlaneadoContrato(contrato, "2026-01-06")).toBeCloseTo(0.5);
    expect(avancePlaneadoContrato(contrato, "2026-01-11")).toBe(1);
  });

  it("un contrato de un solo día no divide entre cero", () => {
    const dia = crearContratoObra({ inicioPlan: "2026-01-05", finPlan: "2026-01-05" });
    expect(avancePlaneadoContrato(dia, "2026-01-04")).toBe(0);
    expect(avancePlaneadoContrato(dia, "2026-01-05")).toBe(1);
  });
});

describe("avancePlaneadoProyecto", () => {
  it("un proyecto sin contratos vale 0", () => {
    expect(avancePlaneadoProyecto([], "2026-01-06")).toBe(0);
  });

  it("pondera cada contrato por su importe", () => {
    const grande = crearContratoObra({
      id: "co-2",
      inicioPlan: "2026-01-11",
      finPlan: "2026-01-21",
      conceptos: [{ ...contrato.conceptos[0], precioUnitario: 3_000 }],
    });
    // A la mitad del primero (100k) y sin iniciar el segundo (300k): 50k / 400k.
    expect(avancePlaneadoProyecto([contrato, grande], "2026-01-06")).toBeCloseTo(0.125);
    expect(avancePlaneadoProyecto([contrato, grande], "2026-02-01")).toBe(1);
  });
});

// --- cortes y valor ganado ------------------------------------------------

// Contrato de 100 m³ a $1,000 del lunes 2026-01-05 al 2026-01-25 (20 días, 3 semanas).
const obra = crearContratoObra({ inicioPlan: "2026-01-05", finPlan: "2026-01-25" });
const pago = (monto: number, fecha = "2026-01-12") => ({
  id: "p-1",
  contratoObraId: "co-1",
  fecha,
  monto,
  folioFactura: "FAC-1",
});

describe("acumulados y valor ganado", () => {
  it("solo cuentan los cortes validados y cuya semana ya cerró", () => {
    const cortes = [
      crearCorte({ id: "a", semana: "2026-01-05" }),
      crearCorte({ id: "b", semana: "2026-01-12", estado: "FIRMADO_SUPERVISOR" }),
      crearCorte({ id: "c", semana: "2026-01-19", estado: "RECHAZADO" }),
      crearCorte({ id: "d", semana: "2026-01-19" }),
    ];
    expect(acumuladoValidado("co-1", cortes)["c-1"]).toBe(20);
    // El 2026-01-11 solo cerró la primera semana.
    expect(acumuladoValidado("co-1", cortes, "2026-01-11")["c-1"]).toBe(10);
    expect(acumuladoValidado("co-1", cortes, "2026-01-10")["c-1"]).toBeUndefined();
  });

  it("el acumulado comprometido incluye los pendientes y excluye los rechazados", () => {
    const cortes = [
      crearCorte({ id: "a" }),
      crearCorte({ id: "b", semana: "2026-01-12", estado: "FIRMADO_SUPERVISOR" }),
      crearCorte({ id: "c", semana: "2026-01-19", estado: "RECHAZADO" }),
    ];
    expect(acumuladoComprometido("co-1", cortes)["c-1"]).toBe(20);
  });

  it("sin cortes el valor ganado y el avance físico son 0", () => {
    expect(valorGanadoContrato(obra, [], "2026-01-25")).toBe(0);
    expect(avanceFisicoContrato(obra, [], "2026-01-25")).toBe(0);
  });

  it("el valor ganado es volumen validado por precio y no pasa de lo contratado", () => {
    const exceso = crearCorte({ volumenes: [{ conceptoId: "c-1", volumen: 150 }] });
    expect(valorGanadoContrato(obra, [crearCorte()], "2026-01-11")).toBe(10_000);
    expect(avanceFisicoContrato(obra, [exceso], "2026-01-11")).toBe(1);
  });
});

describe("erroresCorte", () => {
  const entrada = (volumen: number, semana = "2026-01-12") => ({
    contratoObraId: "co-1",
    semana,
    volumenes: [{ conceptoId: "c-1", volumen }],
  });

  it("una captura válida no tiene errores", () => {
    expect(corteSinErrores(erroresCorte(obra, [crearCorte()], entrada(30)))).toBe(true);
  });

  it("el acumulado no puede pasar del volumen contratado y el error va en el concepto", () => {
    const errores = erroresCorte(obra, [crearCorte()], entrada(91));
    expect(errores.volumenes["c-1"]).toContain("quedan 90 m³");
    expect(
      erroresCorte(obra, [crearCorte()], entrada(90)).volumenes["c-1"],
    ).toBeUndefined();
  });

  it("cuenta lo pendiente de validar, pero no lo rechazado", () => {
    const pendiente = crearCorte({ estado: "FIRMADO_SUPERVISOR" });
    const rechazado = crearCorte({ estado: "RECHAZADO" });
    expect(erroresCorte(obra, [pendiente], entrada(95)).volumenes["c-1"]).toBeDefined();
    expect(
      erroresCorte(obra, [rechazado], entrada(95, "2026-01-12")).volumenes["c-1"],
    ).toBeUndefined();
  });

  it("no admite dos cortes vivos de la misma semana, pero sí tras un rechazo", () => {
    expect(
      erroresCorte(obra, [crearCorte()], entrada(5, "2026-01-05")).semana,
    ).toBeDefined();
    const rechazado = crearCorte({ estado: "RECHAZADO" });
    expect(
      erroresCorte(obra, [rechazado], entrada(5, "2026-01-05")).semana,
    ).toBeUndefined();
  });

  it("la semana debe empezar en lunes", () => {
    expect(erroresCorte(obra, [], entrada(5, "2026-01-07")).semana).toBeDefined();
  });

  it("exige volumen en al menos un concepto y rechaza negativos", () => {
    expect(erroresCorte(obra, [], entrada(0)).general).toBeDefined();
    expect(erroresCorte(obra, [], entrada(-1)).volumenes["c-1"]).toBeDefined();
    expect(erroresCorte(obra, [], entrada(Number.NaN)).volumenes["c-1"]).toBeDefined();
  });
});

describe("transiciones de un corte", () => {
  const firmado = firmarCorte(
    "cor-9",
    {
      contratoObraId: "co-1",
      semana: "2026-01-12",
      volumenes: [{ conceptoId: "c-1", volumen: 5 }],
    },
    "Héctor Ramos",
    "2026-01-16",
    [],
  );

  it("capturar y firmar deja el corte firmado por el Supervisor", () => {
    expect(firmado).toMatchObject({
      estado: "FIRMADO_SUPERVISOR",
      firmadoPor: "Héctor Ramos",
      firmadoEn: "2026-01-16",
    });
  });

  it("la PMO valida un corte firmado", () => {
    expect(
      resolverCorte(firmado, "VALIDADO_PMO", "Ricardo Salas", "2026-01-19"),
    ).toMatchObject({
      estado: "VALIDADO_PMO",
      validadoPor: "Ricardo Salas",
      validadoEn: "2026-01-19",
    });
  });

  it("rechazar exige comentario", () => {
    expect(resolverCorte(firmado, "RECHAZADO", "Ricardo Salas", "2026-01-19")).toBe(
      firmado,
    );
    expect(resolverCorte(firmado, "RECHAZADO", "Ricardo Salas", "2026-01-19", "  ")).toBe(
      firmado,
    );
    expect(
      resolverCorte(firmado, "RECHAZADO", "Ricardo Salas", "2026-01-19", "No coincide"),
    ).toMatchObject({ estado: "RECHAZADO", comentario: "No coincide" });
  });

  it("un corte validado o rechazado es inmutable", () => {
    const validado = crearCorte();
    expect(
      resolverCorte(validado, "RECHAZADO", "Ricardo Salas", "2026-02-01", "tarde"),
    ).toBe(validado);
    const rechazado = crearCorte({ estado: "RECHAZADO" });
    expect(resolverCorte(rechazado, "VALIDADO_PMO", "Ricardo Salas", "2026-02-01")).toBe(
      rechazado,
    );
  });
});

describe("indicadoresObra", () => {
  // 2026-01-15 es el día 10 de 20: el plan pide el 50% ($50,000).
  const hoy = "2026-01-15";

  it("un proyecto sin contratos no tiene indicadores", () => {
    expect(indicadoresObra([], [], [], hoy)).toBeNull();
  });

  it("antes del inicio PV es 0 y los índices son nulos, sin dividir entre cero", () => {
    const i = indicadoresObra([obra], [], [], "2026-01-01");
    expect(i).toMatchObject({ pv: 0, ev: 0, ac: 0, spi: null, cpi: null, eac: null });
    expect(i?.fechaProyectada).toBeNull();
    expect(i?.desfaseTiempo).toBeNull();
  });

  it("sin pagos el CPI y el EAC son nulos aunque haya valor ganado", () => {
    const i = indicadoresObra([obra], [crearCorte()], [], hoy);
    expect(i?.ev).toBe(10_000);
    expect(i?.cpi).toBeNull();
    expect(i?.eac).toBeNull();
  });

  it("sin cortes validados el SPI es 0 y no hay fecha proyectada", () => {
    const i = indicadoresObra([obra], [], [pago(5_000)], hoy);
    expect(i?.spi).toBe(0);
    expect(i?.cpi).toBe(0);
    expect(i?.fechaProyectada).toBeNull();
  });

  it("un corte rechazado o pendiente no mueve el valor ganado", () => {
    const cortes = [
      crearCorte({ estado: "RECHAZADO" }),
      crearCorte({ id: "b", semana: "2026-01-12", estado: "FIRMADO_SUPERVISOR" }),
    ];
    expect(indicadoresObra([obra], cortes, [], hoy)?.ev).toBe(0);
  });

  it("calcula SPI, CPI, EAC y la fecha proyectada con la fórmula del plan", () => {
    const cortes = [crearCorte({ volumenes: [{ conceptoId: "c-1", volumen: 40 }] })];
    const i = indicadoresObra([obra], cortes, [pago(50_000)], hoy);
    // EV 40,000 · PV 50,000 · AC 50,000.
    expect(i?.spi).toBeCloseTo(0.8);
    expect(i?.cpi).toBeCloseTo(0.8);
    expect(i?.eac).toBeCloseTo(125_000);
    expect(i?.desfaseTiempo).toBeCloseTo(0.2);
    // 20 días / 0.8 = 25 días desde el 2026-01-05.
    expect(i?.fechaProyectada).toBe("2026-01-30");
    expect(i?.diasRetraso).toBe(5);
  });

  it("una obra terminada ya no proyecta fecha", () => {
    const cortes = [crearCorte({ volumenes: [{ conceptoId: "c-1", volumen: 100 }] })];
    expect(indicadoresObra([obra], cortes, [], "2026-01-25")?.fechaProyectada).toBeNull();
  });

  it("los pagos posteriores a la fecha de corte no cuentan", () => {
    const i = indicadoresObra([obra], [], [pago(9_000, "2026-02-01")], hoy);
    expect(i?.ac).toBe(0);
  });
});

describe("curvaS", () => {
  it("PV cubre todo el plan; EV y AC solo hasta la fecha de corte", () => {
    const puntos = curvaS([obra], [crearCorte()], [pago(10_000)], "2026-01-15");
    expect(puntos[0]).toMatchObject({ fecha: "2026-01-05", pv: 0, ev: 0 });
    expect(puntos.at(-1)).toMatchObject({
      fecha: "2026-01-25",
      pv: 100_000,
      ev: null,
      ac: null,
    });
    const hoy = puntos.find((p) => p.fecha === "2026-01-15");
    expect(hoy).toMatchObject({ pv: 50_000, ev: 10_000, ac: 10_000 });
    expect(puntos.map((p) => p.fecha)).toEqual(
      [...puntos.map((p) => p.fecha)].toSorted(),
    );
  });

  it("un proyecto sin contratos no tiene curva", () => {
    expect(curvaS([], [], [], "2026-01-15")).toEqual([]);
  });
});

describe("alertasObra", () => {
  // Lunes 2026-01-19: la semana previa es la del 2026-01-12.
  const fecha = "2026-01-19";
  const sano = [
    crearCorte({ semana: "2026-01-05", volumenes: [{ conceptoId: "c-1", volumen: 35 }] }),
    crearCorte({
      id: "b",
      semana: "2026-01-12",
      volumenes: [{ conceptoId: "c-1", volumen: 35 }],
    }),
  ];

  it("una obra al día no tiene alertas", () => {
    expect(alertasObra([obra], sano, [pago(70_000)], fecha)).toEqual([]);
  });

  it("umbrales de SPI: ámbar bajo 0.95 y rojo bajo 0.85", () => {
    const con = (volumen: number) => [
      crearCorte({ volumenes: [{ conceptoId: "c-1", volumen }] }),
      crearCorte({
        id: "b",
        semana: "2026-01-12",
        volumenes: [{ conceptoId: "c-1", volumen: 0.01 }],
      }),
    ];
    const nivelSpi = (cortes: ReturnType<typeof con>) =>
      alertasObra([obra], cortes, [], fecha).find((a) => a.tipo === "SPI")?.nivel;
    // PV a la fecha: 70,000.
    expect(nivelSpi(con(66))).toBe("AMBAR");
    expect(nivelSpi(con(57))).toBe("ROJO");
    expect(nivelSpi(con(70))).toBeUndefined();
  });

  it("CPI bajo 0.85 es rojo", () => {
    const alertas = alertasObra([obra], sano, [pago(100_000)], fecha);
    expect(alertas.find((a) => a.tipo === "CPI")?.nivel).toBe("ROJO");
  });

  it("proyectar el término después del plan es una alerta roja con los días", () => {
    const lento = [crearCorte({ volumenes: [{ conceptoId: "c-1", volumen: 50 }] })];
    const alerta = alertasObra([obra], lento, [], fecha).find((a) => a.tipo === "FECHA");
    expect(alerta?.nivel).toBe("ROJO");
    expect(alerta?.texto).toMatch(/\d+ días/);
  });

  it("un contrato activo sin corte validado la semana previa genera alerta ámbar", () => {
    const sinPrevia = [sano[0]];
    const alerta = alertasObra([obra], sinPrevia, [], fecha).find(
      (a) => a.tipo === "SIN_REPORTE",
    );
    expect(alerta).toMatchObject({ nivel: "AMBAR", contratoObraId: "co-1" });
    const pendiente = [sano[0], { ...sano[1], estado: "FIRMADO_SUPERVISOR" as const }];
    expect(
      alertasObra([obra], pendiente, [], fecha).some((a) => a.tipo === "SIN_REPORTE"),
    ).toBe(true);
  });

  it("un contrato que aún no inicia o ya terminó no debe reportar", () => {
    const futuro = crearContratoObra({ inicioPlan: "2026-02-02", finPlan: "2026-02-20" });
    expect(alertasObra([obra, futuro], sano, [pago(70_000)], fecha)).toEqual([]);
  });

  it("un corte firmado con más de 3 días esperando validación alerta; con 3 no", () => {
    const base = [
      sano[0],
      crearCorte({
        id: "b",
        semana: "2026-01-12",
        volumenes: sano[1].volumenes,
        estado: "FIRMADO_SUPERVISOR",
      }),
    ];
    const conEspera = (firmadoEn: string) =>
      alertasObra([obra], [base[0], { ...base[1], firmadoEn }], [], fecha).some(
        (a) => a.tipo === "VALIDACION_PENDIENTE",
      );
    expect(conEspera("2026-01-15")).toBe(true);
    expect(conEspera("2026-01-16")).toBe(false);
  });

  it("ordena rojas primero y señala el contrato más retrasado", () => {
    const rezagado = crearContratoObra({
      id: "co-2",
      folio: "CO-VR-02",
      partida: "MUROS",
      inicioPlan: "2026-01-05",
      finPlan: "2026-01-25",
    });
    const alertas = alertasObra([obra, rezagado], sano, [pago(70_000)], fecha);
    expect(alertas[0]).toMatchObject({
      tipo: "RETRASO_CONTRATO",
      contratoObraId: "co-2",
    });
    const niveles = alertas.map((a) => a.nivel);
    expect(niveles).toEqual(
      [...niveles].toSorted((a, b) => Number(b === "ROJO") - Number(a === "ROJO")),
    );
  });
});

describe("contratosSinCaptura", () => {
  it("lista los contratos activos sin corte vivo de la semana previa", () => {
    const fecha = "2026-01-19";
    expect(contratosSinCaptura([obra], [], fecha)).toEqual([obra]);
    expect(
      contratosSinCaptura([obra], [crearCorte({ semana: "2026-01-12" })], fecha),
    ).toEqual([]);
    const rechazado = crearCorte({ semana: "2026-01-12", estado: "RECHAZADO" });
    expect(contratosSinCaptura([obra], [rechazado], fecha)).toEqual([obra]);
  });
});

describe("semáforo derivado de la obra", () => {
  it("semaforoDeIndice separa verde, amarillo y rojo; sin dato es null", () => {
    expect(semaforoDeIndice(1.02)).toBe("VERDE");
    expect(semaforoDeIndice(0.95)).toBe("VERDE");
    expect(semaforoDeIndice(0.9)).toBe("AMARILLO");
    expect(semaforoDeIndice(0.84)).toBe("ROJO");
    expect(semaforoDeIndice(null)).toBeNull();
  });

  it("resumenObra deriva avance y semáforo; sin contratos no hay resumen", () => {
    expect(resumenObra([], [], [], "2026-01-19")).toBeNull();
    const cortes = [crearCorte({ volumenes: [{ conceptoId: "c-1", volumen: 20 }] })];
    const resumen = resumenObra([obra], cortes, [], "2026-01-19");
    expect(resumen?.avancePct).toBe(20);
    expect(resumen?.semaforo).toBe("ROJO");
  });

  it("aplicarResumenObra sustituye el avance manual y fija el semáforo; sin resumen deja el terreno igual", () => {
    const terreno = { id: "ter-1", avancePct: 38 } as Parameters<
      typeof aplicarResumenObra
    >[0];
    expect(
      aplicarResumenObra(terreno, { avancePct: 26, semaforo: "ROJO", alertas: 3 }),
    ).toMatchObject({
      avancePct: 26,
      semaforoObra: "ROJO",
    });
    expect(aplicarResumenObra(terreno, null)).toBe(terreno);
  });
});
