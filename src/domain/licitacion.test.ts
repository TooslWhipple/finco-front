import { describe, expect, it } from "vitest";
import { DEMO_TODAY } from "./fechas";
import { crearContratoObra, crearLicitacion } from "./fixtures";
import {
  ahorroNegociacion,
  catalogoEditable,
  comparativoPorConcepto,
  compararAdjudicadoContraBase,
  compararContraBase,
  conCatalogo,
  conInvitaciones,
  conLicitacionAdjudicada,
  conProveedorDescartado,
  conRespuesta,
  conRondaCerrada,
  conRondaRegistrada,
  contratoDeAdjudicacion,
  errorAdjudicacion,
  errorCierreRonda,
  errorDescarte,
  erroresCatalogo,
  erroresRonda,
  errorFechasContrato,
  estadoEnPortal,
  invitadoARondaAbierta,
  licitacionesDeProveedor,
  mejorPropuestaPorRonda,
  montoDePrecios,
  pendientesDeInvitar,
  primeraPropuesta,
  proveedoresActivos,
  rondaAbierta,
  tasaRespuesta,
  ultimaRondaCerrada,
} from "./licitacion";
import type { ConceptoLicitacion, Licitacion, PrecioConcepto } from "./tipos";

const licitacion = crearLicitacion();

describe("licitación: indicadores", () => {
  it("la tasa de respuesta cuenta a los invitados que respondieron en alguna ronda", () => {
    expect(tasaRespuesta(licitacion)).toEqual({
      invitados: 4,
      respondieron: 3,
      fraccion: 0.75,
    });
  });

  it("la mejor propuesta de cada ronda es la menor", () => {
    expect(mejorPropuestaPorRonda(licitacion)).toEqual([
      { ronda: 1, proveedorId: "A", monto: 1_100_000 },
      { ronda: 2, proveedorId: "A", monto: 1_000_000 },
    ]);
  });

  it("siguen compitiendo los que respondieron la última ronda y no fueron descartados", () => {
    expect(proveedoresActivos(licitacion)).toEqual(["A", "C"]);
    expect(proveedoresActivos(crearLicitacion({ rondas: [], descartados: [] }))).toEqual([
      "A",
      "B",
      "C",
      "D",
    ]);
  });

  it("el ahorro en negociación es primera propuesta menos adjudicado, solo si está adjudicada", () => {
    expect(ahorroNegociacion(licitacion)).toBeUndefined();
    const cerrada = conLicitacionAdjudicada(
      licitacion,
      "A",
      "Mejor precio",
      "Ana",
      "2026-09-20",
    );
    expect(ahorroNegociacion(cerrada)).toBe(100_000);
  });

  it("compara contra el base en pesos y en porcentaje", () => {
    expect(compararContraBase(950_000, 1_000_000)).toEqual({
      diferencia: -50_000,
      fraccion: -0.05,
    });
    expect(compararAdjudicadoContraBase(licitacion)).toBeUndefined();
  });
});

describe("licitación: reglas", () => {
  it("la ronda necesita monto o 'no respondió' de cada participante y al menos una respuesta", () => {
    expect(erroresRonda(licitacion, { A: 900_000 }).montos.C).toBeDefined();
    expect(erroresRonda(licitacion, { A: null, C: null }).general).toBeDefined();
    expect(erroresRonda(licitacion, { A: 0, C: 1 }).montos.A).toBeDefined();
    expect(erroresRonda(licitacion, { A: 950_000, C: null })).toEqual({ montos: {} });
  });

  it("la ronda siguiente solo incluye a los activos y numera correlativamente", () => {
    const con = conRondaRegistrada(licitacion, { A: 950_000, C: null }, "2026-09-29");
    expect(con.rondas).toHaveLength(3);
    expect(con.rondas[2].numero).toBe(3);
    expect(con.rondas[2].propuestas).toEqual([
      { proveedorId: "A", respondio: true, monto: 950_000 },
      { proveedorId: "C", respondio: false },
    ]);
    expect(proveedoresActivos(con)).toEqual(["A"]);
  });

  it("una ronda inválida deja la licitación igual", () => {
    expect(conRondaRegistrada(licitacion, { A: 900_000 }, "2026-09-29")).toBe(licitacion);
  });

  it("descartar exige motivo y un proveedor activo", () => {
    expect(conProveedorDescartado(licitacion, "C", " ")).toBe(licitacion);
    expect(conProveedorDescartado(licitacion, "B", "otra vez")).toBe(licitacion);
    const con = conProveedorDescartado(licitacion, "C", "Plazo inviable");
    expect(con.descartados.at(-1)).toEqual({
      proveedorId: "C",
      ronda: 2,
      motivo: "Plazo inviable",
    });
  });

  it("adjudicar exige ganador que respondió la última ronda y motivo", () => {
    expect(errorAdjudicacion(licitacion, "D", "x")).toBeDefined();
    expect(errorAdjudicacion(licitacion, "B", "x")).toBeDefined();
    expect(errorAdjudicacion(licitacion, "A", "")).toBeDefined();
    expect(errorAdjudicacion(licitacion, "A", "Mejor precio")).toBeUndefined();
    const cerrada = conLicitacionAdjudicada(
      licitacion,
      "A",
      "Mejor precio",
      "Ana",
      "2026-09-20",
    );
    expect(cerrada).toMatchObject({
      estado: "ADJUDICADA",
      ganadorId: "A",
      montoAdjudicado: 1_000_000,
      adjudicadaPor: "Ana",
    });
    expect(conLicitacionAdjudicada(cerrada, "C", "otra", "Ana", "2026-09-21")).toBe(
      cerrada,
    );
  });
});

const CONCEPTOS: ConceptoLicitacion[] = [
  { id: "k1", clave: "ACA-01", descripcion: "Piso", unidad: "M2", volumen: 100 },
  { id: "k2", clave: "ACA-02", descripcion: "Pintura", unidad: "M2", volumen: 200 },
];

const precios = (a: number, b: number): PrecioConcepto[] => [
  { conceptoId: "k1", precioUnitario: a },
  { conceptoId: "k2", precioUnitario: b },
];

/** La licitación del fixture con catálogo y la ronda 3 abierta por WhatsApp para A y C. */
function conRondaTresAbierta(): Licitacion {
  const conCat = conCatalogo(licitacion, CONCEPTOS);
  return conInvitaciones(conCat, ["A", "C"], "WHATSAPP", "2026-10-01", "09:30");
}

describe("licitación en línea: catálogo e invitaciones", () => {
  it("el catálogo exige al menos un concepto, clave única y volumen mayor a cero", () => {
    expect(erroresCatalogo(licitacion, []).general).toBeDefined();
    const repetida = [CONCEPTOS[0], { ...CONCEPTOS[1], clave: "aca-01" }];
    expect(erroresCatalogo(licitacion, repetida).conceptos.k2).toBeDefined();
    const sinVolumen = [{ ...CONCEPTOS[0], volumen: 0 }];
    expect(erroresCatalogo(licitacion, sinVolumen).conceptos.k1).toBeDefined();
    expect(conCatalogo(licitacion, []).conceptos).toEqual([]);
    expect(conCatalogo(licitacion, CONCEPTOS).conceptos).toEqual(CONCEPTOS);
  });

  it("el catálogo ya no se edita cuando alguna ronda tiene precios", () => {
    const abierta = conRondaTresAbierta();
    const respondida = conRespuesta(
      abierta,
      "A",
      precios(4_000, 3_000),
      "PMO",
      "2026-10-02",
    );
    expect(catalogoEditable(abierta)).toBe(true);
    expect(catalogoEditable(respondida)).toBe(false);
    expect(erroresCatalogo(respondida, CONCEPTOS).general).toBeDefined();
    expect(conCatalogo(respondida, CONCEPTOS.slice(0, 1))).toBe(respondida);
  });

  it("invitar exige catálogo y abre la ronda siguiente con todos los activos", () => {
    expect(conInvitaciones(licitacion, ["A"], "WHATSAPP", "2026-10-01", "09:30")).toBe(
      licitacion,
    );
    const conCat = conCatalogo(licitacion, CONCEPTOS);
    const abierta = conInvitaciones(conCat, ["A"], "CORREO", "2026-10-01", "09:30");
    expect(abierta.rondas).toHaveLength(3);
    expect(abierta.rondas[2]).toEqual({
      numero: 3,
      fecha: "2026-10-01",
      estado: "ABIERTA",
      propuestas: [
        { proveedorId: "A", respondio: false },
        { proveedorId: "C", respondio: false },
      ],
    });
    expect(abierta.invitaciones).toEqual([
      {
        proveedorId: "A",
        canal: "CORREO",
        enviadaEl: "2026-10-01",
        hora: "09:30",
        ronda: 3,
      },
    ]);
  });

  it("conInvitaciones ignora un id fuera de proveedoresActivos", () => {
    const conCat = conCatalogo(licitacion, CONCEPTOS);
    const abierta = conInvitaciones(
      conCat,
      ["A", "B", "Z"],
      "WHATSAPP",
      "2026-10-01",
      "09:30",
    );
    expect(abierta.invitaciones.map((i) => i.proveedorId)).toEqual(["A"]);
    expect(conInvitaciones(conCat, ["B"], "WHATSAPP", "2026-10-01", "09:30")).toBe(
      conCat,
    );
  });

  it("con la ronda abierta solo agrega invitaciones a los activos que no la tienen", () => {
    const conCat = conCatalogo(licitacion, CONCEPTOS);
    const abierta = conInvitaciones(conCat, ["A"], "WHATSAPP", "2026-10-01", "09:30");
    const reenvio = conInvitaciones(abierta, ["A", "C"], "CORREO", "2026-10-02", "10:00");
    expect(reenvio.rondas).toHaveLength(3);
    expect(reenvio.invitaciones.map((i) => [i.proveedorId, i.canal, i.ronda])).toEqual([
      ["A", "WHATSAPP", 3],
      ["C", "CORREO", 3],
    ]);
    expect(conInvitaciones(reenvio, ["A"], "CORREO", "2026-10-02", "10:00")).toBe(
      reenvio,
    );
  });

  it("sin rondas, la ronda 1 se arma con los invitados", () => {
    const nueva = crearLicitacion({ rondas: [], descartados: [], conceptos: CONCEPTOS });
    const abierta = conInvitaciones(nueva, ["B", "D"], "CORREO", "2026-10-01", "08:00");
    expect(abierta.rondas[0].numero).toBe(1);
    expect(abierta.rondas[0].propuestas.map((p) => p.proveedorId)).toEqual([
      "A",
      "B",
      "C",
      "D",
    ]);
    expect(abierta.invitaciones.map((i) => i.proveedorId)).toEqual(["B", "D"]);
  });

  it("licitacionesDeProveedor solo da las en curso con catálogo e invitación suya", () => {
    const abierta = conRondaTresAbierta();
    const sinCatalogo = { ...licitacion, invitaciones: abierta.invitaciones };
    const adjudicada: Licitacion = { ...abierta, id: "otra", estado: "ADJUDICADA" };
    const todas = [abierta, sinCatalogo, adjudicada];
    expect(licitacionesDeProveedor(todas, "A").map((l) => l.id)).toEqual([abierta.id]);
    expect(licitacionesDeProveedor(todas, "D")).toEqual([]);
  });
});

describe("licitación en línea: ronda abierta", () => {
  it("una ronda abierta no cambia activos, indicadores ni la adjudicación", () => {
    const abierta = conRespuesta(
      conRondaTresAbierta(),
      "C",
      precios(4_000, 2_000),
      "CONTRATISTA",
      "2026-10-02",
    );
    expect(rondaAbierta(abierta)?.numero).toBe(3);
    expect(ultimaRondaCerrada(abierta)?.numero).toBe(2);
    expect(proveedoresActivos(abierta)).toEqual(proveedoresActivos(licitacion));
    expect(mejorPropuestaPorRonda(abierta)).toEqual(mejorPropuestaPorRonda(licitacion));
    expect(tasaRespuesta(abierta)).toEqual(tasaRespuesta(licitacion));
    expect(primeraPropuesta(abierta, "A")).toBe(primeraPropuesta(licitacion, "A"));
    expect(errorAdjudicacion(abierta, "A", "Mejor precio")).toBe(
      "Cierra la ronda abierta.",
    );
    expect(
      conLicitacionAdjudicada(abierta, "A", "Mejor precio", "Ana", "2026-10-03"),
    ).toBe(abierta);
    expect(errorDescarte(abierta, "C", "Plazo")).toBe("Cierra la ronda abierta.");
    expect(erroresRonda(abierta, { A: 1, C: 1 }).general).toBe(
      "Cierra la ronda abierta.",
    );
  });

  it("con catálogo la ronda no se registra por monto", () => {
    const conCat = conCatalogo(licitacion, CONCEPTOS);
    expect(erroresRonda(conCat, { A: 950_000, C: null }).general).toBeDefined();
  });

  it("conRespuesta guarda el total, quién capturó y respondidaEl; corrige mientras siga abierta", () => {
    const abierta = conRondaTresAbierta();
    const pmo = conRespuesta(abierta, "A", precios(4_000, 3_000), "PMO", "2026-10-02");
    expect(pmo.rondas[2].propuestas[0]).toEqual({
      proveedorId: "A",
      respondio: true,
      monto: 1_000_000,
      precios: precios(4_000, 3_000),
      capturadaPor: "PMO",
      respondidaEl: "2026-10-02",
    });
    const corregida = conRespuesta(
      pmo,
      "A",
      precios(3_500, 3_000),
      "CONTRATISTA",
      "2026-10-03",
    );
    expect(corregida.rondas[2].propuestas[0]).toMatchObject({
      monto: 950_000,
      capturadaPor: "CONTRATISTA",
      respondidaEl: "2026-10-03",
    });
  });

  it("conRespuesta rechaza a un descartado, precios faltantes o en cero y licitaciones adjudicadas", () => {
    const abierta = conRondaTresAbierta();
    expect(conRespuesta(abierta, "B", precios(1, 1), "PMO", "2026-10-02")).toBe(abierta);
    expect(
      conRespuesta(abierta, "A", precios(1, 1).slice(0, 1), "PMO", "2026-10-02"),
    ).toBe(abierta);
    expect(conRespuesta(abierta, "A", precios(1, 0), "PMO", "2026-10-02")).toBe(abierta);
    const adjudicada: Licitacion = { ...abierta, estado: "ADJUDICADA" };
    expect(conRespuesta(adjudicada, "A", precios(1, 1), "PMO", "2026-10-02")).toBe(
      adjudicada,
    );
  });

  it("cerrarRonda rechaza una ronda sin respuestas y deja fuera a quien no respondió", () => {
    const abierta = conRondaTresAbierta();
    expect(errorCierreRonda(abierta)).toBeDefined();
    expect(conRondaCerrada(abierta)).toBe(abierta);
    const respondida = conRespuesta(
      abierta,
      "A",
      precios(4_000, 3_000),
      "PMO",
      "2026-10-02",
    );
    const cerrada = conRondaCerrada(respondida);
    expect(cerrada.rondas[2].estado).toBe("CERRADA");
    expect(rondaAbierta(cerrada)).toBeUndefined();
    expect(proveedoresActivos(cerrada)).toEqual(["A"]);
  });
});

describe("licitación en línea: estado en el portal", () => {
  it("por responder, respondida, fuera de la ronda y ronda cerrada", () => {
    const conCat = conCatalogo(licitacion, CONCEPTOS);
    const abierta = conInvitaciones(conCat, ["A"], "WHATSAPP", "2026-10-01", "09:30");
    expect(estadoEnPortal(abierta, "A")).toBe("POR_RESPONDER");
    expect(estadoEnPortal(abierta, "C")).toBe("FUERA");
    expect(estadoEnPortal(abierta, "B")).toBe("FUERA");
    const respondida = conRespuesta(
      abierta,
      "A",
      precios(1, 1),
      "CONTRATISTA",
      "2026-10-02",
    );
    expect(estadoEnPortal(respondida, "A")).toBe("RESPONDIDA");
    expect(estadoEnPortal(conRondaCerrada(respondida), "A")).toBe("RONDA_CERRADA");
  });

  it("la invitación queda ligada a su ronda aunque dos rondas abran el mismo día", () => {
    const base = crearLicitacion({
      invitados: ["a", "b"],
      descartados: [],
      conceptos: CONCEPTOS,
      rondas: [
        {
          numero: 1,
          fecha: DEMO_TODAY,
          propuestas: [
            { proveedorId: "a", respondio: true, monto: 1_000_000 },
            { proveedorId: "b", respondio: true, monto: 1_100_000 },
          ],
        },
      ],
    });
    const ronda2 = conInvitaciones(base, ["a", "b"], "WHATSAPP", DEMO_TODAY, "09:00");
    const conA = conRespuesta(ronda2, "a", precios(1, 1), "CONTRATISTA", DEMO_TODAY);
    const conB = conRespuesta(conA, "b", precios(2, 2), "CONTRATISTA", DEMO_TODAY);
    const cerrada2 = conRondaCerrada(conB);
    expect(rondaAbierta(cerrada2)).toBeUndefined();
    const l = conInvitaciones(cerrada2, ["a"], "WHATSAPP", DEMO_TODAY, "10:00");
    expect(rondaAbierta(l)?.numero).toBe(3);
    expect(l.invitaciones.map((i) => [i.proveedorId, i.ronda])).toEqual([
      ["a", 2],
      ["b", 2],
      ["a", 3],
    ]);
    expect(estadoEnPortal(l, "a")).toBe("POR_RESPONDER");
    expect(estadoEnPortal(l, "b")).toBe("FUERA");
    expect(invitadoARondaAbierta(l, "b")).toBe(false);
    expect(pendientesDeInvitar(l)).toContain("b");
    const reenvio = conInvitaciones(l, ["b"], "CORREO", DEMO_TODAY, "11:00");
    expect(reenvio.invitaciones.at(-1)).toMatchObject({ proveedorId: "b", ronda: 3 });
    expect(estadoEnPortal(reenvio, "b")).toBe("POR_RESPONDER");
    expect(pendientesDeInvitar(reenvio)).toEqual([]);
  });
});

describe("licitación en línea: adjudicación con catálogo y comparativo", () => {
  /** ACABADOS del héroe: folio LIC-VR-07, con la ronda 3 respondida por precio y cerrada. */
  function acabados(): Licitacion {
    const base = crearLicitacion({
      id: "ter-09-lic-07",
      folio: "LIC-VR-07",
      terrenoId: "ter-09",
      partida: "ACABADOS",
    });
    const abierta = conInvitaciones(
      conCatalogo(base, CONCEPTOS),
      ["A", "C"],
      "WHATSAPP",
      "2026-10-01",
      "09:30",
    );
    const conA = conRespuesta(
      abierta,
      "A",
      precios(4_000, 2_500),
      "CONTRATISTA",
      "2026-10-02",
    );
    const conC = conRespuesta(conA, "C", precios(3_800, 2_800), "PMO", "2026-10-03");
    return conRondaCerrada(conC);
  }
  const contratosDelHeroe = Array.from({ length: 6 }, (_, i) =>
    crearContratoObra({ id: `ter-09-co-0${i + 1}`, terrenoId: "ter-09" }),
  );
  const fechas = { inicioPlan: "2026-12-01", finPlan: "2027-03-31" };

  it("montoDePrecios suma volumen × precio unitario", () => {
    expect(montoDePrecios(CONCEPTOS, precios(4_000, 2_500))).toBe(900_000);
  });

  it("adjudicar con catálogo exige precios del ganador para todos los conceptos", () => {
    const lic = acabados();
    expect(errorAdjudicacion(lic, "A", "Mejor precio")).toBeUndefined();
    const incompleta: Licitacion = {
      ...lic,
      conceptos: [
        ...lic.conceptos,
        { id: "k3", clave: "ACA-03", descripcion: "Zoclo", unidad: "ML", volumen: 10 },
      ],
    };
    expect(errorAdjudicacion(incompleta, "A", "Mejor precio")).toBeDefined();
    expect(
      contratoDeAdjudicacion(incompleta, { id: "A", nombre: "Alfa" }, [], fechas),
    ).toBe(undefined);
  });

  it("errorFechasContrato exige inicio después de hoy y fin en o tras el inicio", () => {
    expect(errorFechasContrato(fechas, "2026-11-17")).toBeUndefined();
    expect(
      errorFechasContrato({ ...fechas, inicioPlan: "2026-11-17" }, "2026-11-17"),
    ).toBeDefined();
    expect(
      errorFechasContrato({ ...fechas, finPlan: "2026-11-30" }, "2026-11-17"),
    ).toBeDefined();
    expect(
      errorFechasContrato(
        { inicioPlan: "2026-12-01", finPlan: "2026-12-01" },
        "2026-11-17",
      ),
    ).toBeUndefined();
  });

  it("contratoDeAdjudicacion para ACABADOS da CO-VR-07 con los PU de la última ronda cerrada", () => {
    const contrato = contratoDeAdjudicacion(
      acabados(),
      { id: "A", nombre: "Alfa" },
      contratosDelHeroe,
      fechas,
    );
    expect(contrato).toEqual({
      id: "ter-09-co-07",
      folio: "CO-VR-07",
      terrenoId: "ter-09",
      partida: "ACABADOS",
      contratista: "Alfa",
      proveedorId: "A",
      conceptos: [
        {
          id: "ter-09-co-07-c1",
          clave: "ACA-01",
          descripcion: "Piso",
          unidad: "M2",
          volumenContratado: 100,
          precioUnitario: 4_000,
        },
        {
          id: "ter-09-co-07-c2",
          clave: "ACA-02",
          descripcion: "Pintura",
          unidad: "M2",
          volumenContratado: 200,
          precioUnitario: 2_500,
        },
      ],
      inicioPlan: "2026-12-01",
      finPlan: "2027-03-31",
      anticipoPct: 0.3,
      fondoGarantiaPct: 0.05,
    });
  });

  it("el comparativo da el PU más bajo por concepto y el total, sin descartados", () => {
    const lic = acabados();
    const comparativo = comparativoPorConcepto(lic);
    expect(comparativo?.ronda).toBe(3);
    expect(comparativo?.proveedorIds).toEqual(["A", "C"]);
    expect(comparativo?.filas.map((f) => f.masBajoId)).toEqual(["C", "A"]);
    expect(comparativo?.totales).toEqual({ A: 900_000, C: 940_000 });
    expect(comparativoPorConcepto(licitacion)).toBeUndefined();
    const sinC: Licitacion = {
      ...lic,
      descartados: [...lic.descartados, { proveedorId: "C", ronda: 3, motivo: "x" }],
    };
    expect(comparativoPorConcepto(sinC)?.proveedorIds).toEqual(["A"]);
  });
});
