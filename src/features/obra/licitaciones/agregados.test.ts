import { describe, expect, it } from "vitest";
import { crearLicitacion, crearProveedor } from "@/domain/fixtures";
import {
  conCatalogo,
  conInvitaciones,
  conLicitacionAdjudicada,
  conRespuesta,
} from "@/domain";
import {
  candidatoMasBajo,
  candidatosAGanar,
  datosGraficaRondas,
  descripcionContraBase,
  eventosDecision,
  matrizProveedores,
  nombreProveedor,
  resumenLicitacion,
} from "./agregados";
import { entradaDeRonda, validarRonda } from "./esquemas";

const proveedores = [
  { id: "A", nombre: "Alfa" },
  { id: "B", nombre: "Beta" },
  { id: "C", nombre: "Gama" },
  { id: "D", nombre: "Delta" },
];
const licitacion = crearLicitacion();

describe("agregados de licitación", () => {
  it("la matriz marca monto, no respondió, descartado y fuera de competencia", () => {
    const filas = matrizProveedores(licitacion, proveedores);
    const tipos = (id: string) =>
      filas.find((f) => f.proveedor.id === id)!.celdas.map((c) => c.tipo);
    expect(tipos("A")).toEqual(["MONTO", "MONTO"]);
    expect(tipos("B")).toEqual(["MONTO", "DESCARTADO"]);
    expect(tipos("D")).toEqual(["SIN_RESPUESTA", "FUERA"]);
  });

  it("la gráfica solo lleva a quienes presentaron propuesta y corta con null donde no hubo", () => {
    const { datos, series } = datosGraficaRondas(licitacion, proveedores);
    expect(series.map((s) => s.clave)).toEqual(["A", "B", "C"]);
    expect(datos[1].B).toBeNull();
  });

  it("el resumen compara la mejor propuesta contra el base mientras está en curso", () => {
    const resumen = resumenLicitacion(licitacion);
    expect(resumen.montoReferencia).toBe(1_000_000);
    expect(resumen.ahorro).toBe(100_000);
    expect(descripcionContraBase(resumen.contraBase!).tono).toBe("neutro");
  });

  it("al adjudicar, la decisión cierra la línea de tiempo", () => {
    const cerrada = conLicitacionAdjudicada(
      licitacion,
      "A",
      "Mejor precio",
      "Ana",
      "2026-09-20",
    );
    const eventos = eventosDecision(cerrada, proveedores);
    expect(eventos.at(-1)?.id).toBe("adjudicacion");
    expect(eventos.some((e) => e.id === "descarte-B")).toBe(true);
  });

  it("la captura traduce texto con formato a montos y valida con las reglas del dominio", () => {
    const captura = {
      A: { texto: "$ 950,000", noRespondio: false },
      C: { texto: "", noRespondio: true },
    };
    expect(entradaDeRonda(["A", "C"], captura)).toEqual({ A: 950_000, C: null });
    expect(validarRonda(licitacion, ["A", "C"], captura).montos).toEqual({});
    expect(
      validarRonda(licitacion, ["A", "C"], { A: { texto: "abc", noRespondio: false } })
        .montos.A,
    ).toBeDefined();
  });

  it("nombreProveedor resuelve contra el padrón completo y cae al id si no está", () => {
    const padron = [crearProveedor({ id: "X", nombre: "Equis", activo: false })];
    expect(nombreProveedor(padron, "X")).toBe("Equis");
    expect(nombreProveedor(padron, "Y")).toBe("Y");
  });
});

describe("candidatosAGanar", () => {
  it("una ronda abierta no cambia los candidatos de la última ronda cerrada", () => {
    const conCat = conCatalogo(licitacion, [
      { id: "k1", clave: "ACA-01", descripcion: "Piso", unidad: "M2", volumen: 10 },
    ]);
    const abierta = conInvitaciones(
      conCat,
      ["A", "C"],
      "WHATSAPP",
      "2026-10-01",
      "09:00",
    );
    expect(abierta.rondas).toHaveLength(3);
    expect(candidatosAGanar(abierta, proveedores)).toEqual(
      candidatosAGanar(licitacion, proveedores),
    );
    expect(candidatosAGanar(abierta, proveedores).map((c) => c.id)).toEqual(["A", "C"]);
  });
});

describe("ronda abierta en la matriz, la gráfica y la línea de tiempo", () => {
  const conCat = conCatalogo(licitacion, [
    { id: "k1", clave: "ACA-01", descripcion: "Piso", unidad: "M2", volumen: 10 },
  ]);
  const abierta = conInvitaciones(conCat, ["A", "C"], "WHATSAPP", "2026-10-01", "09:00");

  it("una ronda abierta marca POR_RESPONDER y no aparece en datosGraficaRondas", () => {
    const filas = matrizProveedores(abierta, proveedores);
    const celda = (id: string) => filas.find((f) => f.proveedor.id === id)!.celdas[2];
    expect(celda("A").tipo).toBe("POR_RESPONDER");
    expect(celda("C").tipo).toBe("POR_RESPONDER");
    expect(celda("D").tipo).toBe("FUERA");
    expect(datosGraficaRondas(abierta, proveedores)).toEqual(
      datosGraficaRondas(licitacion, proveedores),
    );
  });

  it("la respuesta del portal se distingue de la que capturó la PMO", () => {
    const respondida = conRespuesta(
      abierta,
      "A",
      [{ conceptoId: "k1", precioUnitario: 500 }],
      "CONTRATISTA",
      "2026-10-02",
    );
    const celda = matrizProveedores(respondida, proveedores)[0].celdas[2];
    expect(celda).toEqual({
      tipo: "MONTO",
      monto: 5_000,
      esMejor: false,
      capturadaPor: "CONTRATISTA",
    });
  });

  it('eventosDecision titula la ronda abierta "Ronda 3 abierta: 0 de 2 respondieron"', () => {
    const ronda3 = eventosDecision(abierta, proveedores).find((e) => e.id === "ronda-3");
    expect(ronda3?.titulo).toBe("Ronda 3 abierta: 0 de 2 respondieron");
    expect(ronda3?.detalle).toBeUndefined();
  });

  it("la gráfica y el ahorro de una licitación histórica no cambian", () => {
    expect(resumenLicitacion(abierta)).toEqual(resumenLicitacion(licitacion));
  });
});

describe("candidatoMasBajo", () => {
  it("elige la menor oferta aunque no sea la primera", () => {
    expect(
      candidatoMasBajo([
        { id: "a", monto: 300 },
        { id: "b", monto: 100 },
        { id: "c", monto: 200 },
      ]),
    ).toBe("b");
  });

  it("devuelve cadena vacía sin candidatos y el primero en empate", () => {
    expect(candidatoMasBajo([])).toBe("");
    expect(
      candidatoMasBajo([
        { id: "a", monto: 100 },
        { id: "b", monto: 100 },
      ]),
    ).toBe("a");
  });
});
